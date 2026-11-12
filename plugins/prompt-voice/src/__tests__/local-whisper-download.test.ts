import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PinnedFile } from '../server/localWhisper/artifacts.ts';
import { DISK_SPACE_MARGIN_BYTES, downloadVerified, formatBytes, removeStalePartials } from '../server/localWhisper/download.ts';

const PAYLOAD = Buffer.from('model-bytes-'.repeat(1000));
const PINNED: PinnedFile = {
  url: 'https://example.test/ggml-base.bin',
  size: PAYLOAD.length,
  sha256: createHash('sha256').update(PAYLOAD).digest('hex')
};
const PLENTY_OF_SPACE = async () => 100 * 1024 ** 3;

/** A streaming Response that yields `body` in chunks, optionally failing after `failAfter` chunks. */
function streamingResponse(body: Buffer, options: { chunk?: number; failAfter?: number; error?: unknown; status?: number } = {}) {
  const chunk = options.chunk ?? 1024;
  let sent = 0;
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (options.failAfter !== undefined && index === options.failAfter) {
        controller.error(options.error ?? new Error('stream failed'));
        return;
      }
      if (sent >= body.length) {
        controller.close();
        return;
      }
      controller.enqueue(new Uint8Array(body.subarray(sent, sent + chunk)));
      sent += chunk;
      index += 1;
    }
  });
  return new Response(stream, { status: options.status ?? 200 });
}

let dir: string;
let destination: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pv-download-'));
  destination = join(dir, 'models', 'ggml-base.bin');
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function leftovers(): Promise<string[]> {
  return readdir(join(dir, 'models')).catch(() => []);
}

describe('downloadVerified', () => {
  it('writes a verified file atomically and reports final progress', async () => {
    const onProgress = vi.fn();
    await downloadVerified({ file: PINNED, destination, fetch: async () => streamingResponse(PAYLOAD), freeBytes: PLENTY_OF_SPACE, onProgress });
    expect(await readFile(destination)).toEqual(PAYLOAD);
    expect(await leftovers()).toEqual(['ggml-base.bin']);
    expect(onProgress).toHaveBeenLastCalledWith({ receivedBytes: PAYLOAD.length, totalBytes: PAYLOAD.length });
  });

  it('throttles progress callbacks', async () => {
    const onProgress = vi.fn();
    await downloadVerified({
      file: PINNED,
      destination,
      fetch: async () => streamingResponse(PAYLOAD, { chunk: 100 }),
      freeBytes: PLENTY_OF_SPACE,
      onProgress,
      now: () => 0
    });
    // With a frozen clock no interval elapses, so only the completion is reported.
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('replaces an existing file only after the new one verifies', async () => {
    await downloadVerified({ file: PINNED, destination, fetch: async () => streamingResponse(PAYLOAD), freeBytes: PLENTY_OF_SPACE });
    const tampered = Buffer.from(PAYLOAD);
    tampered[0] ^= 1;
    await expect(
      downloadVerified({ file: PINNED, destination, fetch: async () => streamingResponse(tampered), freeBytes: PLENTY_OF_SPACE })
    ).rejects.toMatchObject({ code: 'DOWNLOAD_INTEGRITY' });
    expect(await readFile(destination)).toEqual(PAYLOAD);
    expect(await leftovers()).toEqual(['ggml-base.bin']);
  });

  it('rejects a body with the right length but wrong hash, and leaves nothing behind', async () => {
    const tampered = Buffer.alloc(PAYLOAD.length, 7);
    const error = await downloadVerified({ file: PINNED, destination, fetch: async () => streamingResponse(tampered), freeBytes: PLENTY_OF_SPACE }).catch((e) => e);
    expect(error).toMatchObject({ code: 'DOWNLOAD_INTEGRITY' });
    expect(error.userMessage).toContain('ggml-base.bin');
    expect(await leftovers()).toEqual([]);
  });

  it('rejects a truncated body', async () => {
    await expect(
      downloadVerified({ file: PINNED, destination, fetch: async () => streamingResponse(PAYLOAD.subarray(0, 100)), freeBytes: PLENTY_OF_SPACE })
    ).rejects.toMatchObject({ code: 'DOWNLOAD_INTEGRITY', detail: expect.stringContaining('received 100') });
    expect(await leftovers()).toEqual([]);
  });

  it('stops reading an oversized body as soon as it exceeds the pinned size', async () => {
    const huge = Buffer.concat([PAYLOAD, PAYLOAD, PAYLOAD]);
    const error = await downloadVerified({ file: PINNED, destination, fetch: async () => streamingResponse(huge), freeBytes: PLENTY_OF_SPACE }).catch((e) => e);
    expect(error).toMatchObject({ code: 'DOWNLOAD_INTEGRITY', detail: expect.stringContaining('more than') });
    expect(await leftovers()).toEqual([]);
  });

  it('reports HTTP failures with the status and a safe message', async () => {
    const error = await downloadVerified({ file: PINNED, destination, fetch: async () => new Response('secret body', { status: 404 }), freeBytes: PLENTY_OF_SPACE }).catch((e) => e);
    expect(error).toMatchObject({ code: 'DOWNLOAD_FAILED', status: 404 });
    expect(`${error.userMessage} ${error.detail}`).not.toContain('secret body');
  });

  it('turns transport errors into DOWNLOAD_FAILED without logging their message', async () => {
    const failing = async () => {
      throw Object.assign(new TypeError('fetch failed: private-path-marker'), { code: 'ECONNRESET' });
    };
    const error = await downloadVerified({ file: PINNED, destination, fetch: failing, freeBytes: PLENTY_OF_SPACE }).catch((e) => e);
    expect(error).toMatchObject({ code: 'DOWNLOAD_FAILED', detail: expect.stringContaining('code=ECONNRESET') });
    expect(`${error.userMessage} ${error.detail}`).not.toContain('private-path-marker');
  });

  it('maps ENOSPC during the transfer to DOWNLOAD_NO_SPACE and cleans up', async () => {
    const enospc = Object.assign(new Error('no space'), { code: 'ENOSPC' });
    await expect(
      downloadVerified({ file: PINNED, destination, fetch: async () => streamingResponse(PAYLOAD, { failAfter: 2, error: enospc }), freeBytes: PLENTY_OF_SPACE })
    ).rejects.toMatchObject({ code: 'DOWNLOAD_NO_SPACE' });
    expect(await leftovers()).toEqual([]);
  });

  it('cancels mid-transfer and removes the partial file', async () => {
    const controller = new AbortController();
    // Abort from the first progress report; the fake stream itself ignores the signal.
    const onProgress = vi.fn(() => controller.abort());
    let clock = 0;
    await expect(
      downloadVerified({
        file: PINNED,
        destination,
        fetch: async () => streamingResponse(PAYLOAD, { chunk: 100 }),
        signal: controller.signal,
        freeBytes: PLENTY_OF_SPACE,
        onProgress,
        now: () => (clock += 1000)
      })
    ).rejects.toMatchObject({ code: 'DOWNLOAD_CANCELLED' });
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(await leftovers()).toEqual([]);
  });

  it('reports cancellation when the fetch is aborted, and cleans up', async () => {
    const controller = new AbortController();
    const abortable = async () => {
      controller.abort();
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    };
    await expect(
      downloadVerified({ file: PINNED, destination, fetch: abortable as typeof fetch, signal: controller.signal, freeBytes: PLENTY_OF_SPACE })
    ).rejects.toMatchObject({ code: 'DOWNLOAD_CANCELLED' });
    expect(await leftovers()).toEqual([]);
  });

  it('does not start when already cancelled', async () => {
    const fetchSpy = vi.fn();
    const controller = new AbortController();
    controller.abort();
    await expect(
      downloadVerified({ file: PINNED, destination, fetch: fetchSpy, signal: controller.signal, freeBytes: PLENTY_OF_SPACE })
    ).rejects.toMatchObject({ code: 'DOWNLOAD_CANCELLED' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses to start without room for the file plus a safety margin', async () => {
    const fetchSpy = vi.fn();
    const error = await downloadVerified({
      file: PINNED,
      destination,
      fetch: fetchSpy,
      freeBytes: async () => PINNED.size + DISK_SPACE_MARGIN_BYTES - 1
    }).catch((e) => e);
    expect(error).toMatchObject({ code: 'DOWNLOAD_NO_SPACE' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('proceeds when free space cannot be determined', async () => {
    await downloadVerified({
      file: PINNED,
      destination,
      fetch: async () => streamingResponse(PAYLOAD),
      freeBytes: async () => {
        throw new Error('unsupported');
      }
    });
    expect(await readFile(destination)).toEqual(PAYLOAD);
  });

  it('refuses non-https sources', async () => {
    const fetchSpy = vi.fn();
    await expect(
      downloadVerified({ file: { ...PINNED, url: 'http://example.test/x.bin' }, destination, fetch: fetchSpy, freeBytes: PLENTY_OF_SPACE })
    ).rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('removeStalePartials', () => {
  it('removes only partial files left by interrupted downloads', async () => {
    const models = join(dir, 'models');
    await downloadVerified({ file: PINNED, destination, fetch: async () => streamingResponse(PAYLOAD), freeBytes: PLENTY_OF_SPACE });
    await writeFile(join(models, '.ggml-small.bin.a1b2c3.partial'), 'x');
    await writeFile(join(models, 'notes.partial.txt'), 'keep');
    expect(await removeStalePartials(models)).toBe(1);
    expect((await readdir(models)).sort()).toEqual(['ggml-base.bin', 'notes.partial.txt']);
  });

  it('treats a missing directory as nothing to clean', async () => {
    expect(await removeStalePartials(join(dir, 'missing'))).toBe(0);
  });
});

describe('formatBytes', () => {
  it('uses MB below a gigabyte and GB above', () => {
    expect(formatBytes(142 * 1024 ** 2)).toBe('142 MB');
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5 GB');
  });
});

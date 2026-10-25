import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const ADAPTER_SCRIPT = resolve(__filename, '../agy-acp.mjs');

function createAgyAcpProcess() {
  const child = spawn(process.execPath, [ADAPTER_SCRIPT, 'agy'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let buffer = '';
  const pendingRequests = new Map<number, (res: any) => void>();
  const notifications: any[] = [];

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id !== undefined && pendingRequests.has(msg.id)) {
          pendingRequests.get(msg.id)!(msg);
          pendingRequests.delete(msg.id);
        } else if (msg.method) {
          notifications.push(msg);
        }
      } catch {
        // ignore non-json
      }
    }
  });

  let nextId = 1;
  function request(method: string, params: any = {}): Promise<any> {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`Timeout waiting for response to ${method} (id ${id})`));
      }, 5000);

      pendingRequests.set(id, (msg) => {
        clearTimeout(timeout);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      });

      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  function dispose() {
    child.kill();
  }

  return { request, notifications, dispose };
}

describe('agy-acp standalone bridge protocol', () => {
  it('responds to initialize', async () => {
    const acp = createAgyAcpProcess();
    try {
      const result = await acp.request('initialize');
      expect(result).toMatchObject({
        protocolVersion: 1,
        agentInfo: {
          name: 'antigravity',
          title: 'Antigravity CLI (agy)'
        },
        agentCapabilities: {
          loadSession: true,
          promptCapabilities: {
            image: true,
            embeddedContext: true
          }
        }
      });
    } finally {
      acp.dispose();
    }
  });

  it('creates and loads sessions with models and configOptions', async () => {
    const acp = createAgyAcpProcess();
    try {
      await acp.request('initialize');
      const session = await acp.request('session/new', { cwd: process.cwd() });
      expect(session).toHaveProperty('sessionId');
      expect(session.models.availableModels.length).toBeGreaterThan(0);
      expect(session.configOptions).toHaveLength(2);

      const modelConfig = session.configOptions.find((c: any) => c.id === 'model');
      expect(modelConfig).toBeDefined();

      // Test session/load for session restoration
      const loaded = await acp.request('session/load', {
        sessionId: session.sessionId,
        cwd: process.cwd()
      });
      expect(loaded.models).toBeDefined();
      expect(loaded.configOptions).toBeDefined();
    } finally {
      acp.dispose();
    }
  });

  it('updates configuration options (model and thought_level)', async () => {
    const acp = createAgyAcpProcess();
    try {
      await acp.request('initialize');
      const session = await acp.request('session/new', { cwd: process.cwd() });

      const updated = await acp.request('session/set_config_option', {
        sessionId: session.sessionId,
        configId: 'thought_level',
        value: 'high'
      });

      const thoughtConfig = updated.configOptions.find((c: any) => c.id === 'thought_level');
      expect(thoughtConfig?.currentValue).toBe('high');
    } finally {
      acp.dispose();
    }
  });

  it('handles empty prompt by completing turn immediately', async () => {
    const acp = createAgyAcpProcess();
    try {
      await acp.request('initialize');
      const session = await acp.request('session/new', { cwd: process.cwd() });

      const result = await acp.request('session/prompt', {
        sessionId: session.sessionId,
        prompt: [{ type: 'text', text: '   ' }]
      });

      expect(result).toEqual({ stopReason: 'end_turn' });
    } finally {
      acp.dispose();
    }
  });
});

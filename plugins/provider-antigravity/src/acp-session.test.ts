import { describe, expect, it } from 'vitest';
import { NativeAcpSession, type NativeSessionOptions } from './acp-session.js';
import { FakeAcpServer, NO_REPLY, type FakeScript } from './fake-acp-server.js';

function open(script: FakeScript = {}, options: Partial<NativeSessionOptions> = {}) {
  const server = new FakeAcpServer(script);
  const session = NativeAcpSession.open({ command: 'agy', args: [], env: {}, spawnImpl: server.spawnImpl,
    timeoutMs: 1000, operation: 'test', ...options });
  return { server, session };
}

describe('NativeAcpSession', () => {
  it('reports initialize metadata and an empty method list when none is advertised', async () => {
    const { session } = open({ initialize: () => ({ protocolVersion: 1, agentInfo: { version: '1.4.3' }, authMethods: [{ id: 'oauth-personal' }, {}] }) });
    expect(await session.initialize()).toEqual({ protocolVersion: 1, agentVersion: '1.4.3', advertisedAuthMethods: ['oauth-personal'] });
    session.close();

    const bare = open({ initialize: () => ({}) });
    expect(await bare.session.initialize()).toEqual({ protocolVersion: null, agentVersion: null, advertisedAuthMethods: [] });
    bare.session.close();
  });

  it('times out an unanswered request and ends the process on close', async () => {
    const { server, session } = open({ initialize: () => NO_REPLY }, { timeoutMs: 10 });
    await expect(session.initialize()).rejects.toThrow(/timed out after 10ms/);
    session.close();
    expect(server.endedCount).toBe(1);
  });

  it('rejects pending requests when the runtime fails to spawn', async () => {
    const { server, session } = open({ initialize: () => NO_REPLY });
    const pending = session.initialize();
    server.processes[0].emit('error', new Error('spawn ENOENT'));
    await expect(pending).rejects.toThrow('spawn ENOENT');
    session.close();
  });

  it('cancels permission requests and refuses other server requests', async () => {
    const { server, session } = open();
    const child = server.processes[0] as any;
    child.stdout.emit('data', JSON.stringify({ jsonrpc: '2.0', id: 'p1', method: 'session/request_permission', params: {} }) + '\n');
    child.stdout.emit('data', JSON.stringify({ jsonrpc: '2.0', id: 'f1', method: 'fs/read_text_file', params: {} }) + '\n');
    await session.initialize();
    expect(server.clientReplies).toEqual([
      { jsonrpc: '2.0', id: 'p1', result: { outcome: { outcome: 'cancelled' } } },
      { jsonrpc: '2.0', id: 'f1', error: { code: -32601, message: 'Not supported by the diagnostic client' } }
    ]);
    session.close();
  });

  it('decodes multi-byte characters split across stdout chunks', async () => {
    const { server, session } = open({ initialize: () => NO_REPLY });
    const pending = session.initialize();
    const bytes = Buffer.from(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: 1, agentInfo: { version: 'Ünïcode' } } }) + '\n');
    const child = server.processes[0] as any;
    const split = bytes.indexOf(0xc3) + 1;
    child.stdout.emit('data', bytes.subarray(0, split));
    child.stdout.emit('data', bytes.subarray(split));
    expect((await pending).agentVersion).toBe('Ünïcode');
    session.close();
  });

  it('closes on its deadline and resolves outstanding waits', async () => {
    const { session } = open({}, { timeoutMs: 20 });
    expect(await session.waitForCommand('usage', 5_000)).toBe(false);
    await expect(session.initialize()).rejects.toThrow('already closed');
  });

  it('reports a sign-in prompt instead of a session', async () => {
    const { session } = open({
      'session/new': (_params, context) => {
        context.stderr('Launching browser login flow');
        return NO_REPLY;
      }
    });
    expect(await session.newSession()).toEqual({ kind: 'sign_in_required' });
    expect(session.signInRequested).toBe(true);
    session.close();
  });

  it('treats sign-in prompts as expected output during interactive sign-in', async () => {
    const { session } = open({
      authenticate: (_params, context) => {
        context.stderr('Open the following link to authenticate: https://accounts.google.com/o/oauth2/auth');
        return {};
      },
      // A runtime may keep prompting until the browser flow completes.
      'session/new': (_params, context) => {
        context.stderr('Launching browser login flow');
        return new Promise(resolve => context.after(10, () => resolve({ sessionId: 's1' })));
      }
    }, { interactive: true });
    await session.authenticate('oauth-personal');
    expect(await session.newSession()).toEqual({ kind: 'ready', session: { sessionId: 's1' } });
    session.close();
  });

  it('fails a command whose tool call arrives together with its reply', async () => {
    const { server, session } = open({ 'session/prompt': () => NO_REPLY });
    const run = session.runCommand('s1', 'usage', { maxTextChars: 100 });
    const child = server.processes[0] as any;
    const id = 1; // The prompt is the session's first request.
    child.stdout.emit('data', [
      JSON.stringify({ jsonrpc: '2.0', id, result: { stopReason: 'end_turn' } }),
      JSON.stringify({ jsonrpc: '2.0', method: 'session/update', params: { sessionId: 's1', update: { sessionUpdate: 'tool_call' } } })
    ].join('\n') + '\n');
    await expect(run).rejects.toThrow('unexpectedly requested tools');
  });

  it('keeps a catalog that session/new already carried without waiting', async () => {
    const { session } = open({ 'session/new': () => ({ sessionId: 's1', configOptions: [{ id: 'model', options: [{ value: 'gemini' }] }] }) });
    const started = Date.now();
    const opened = await session.newSession({ awaitCatalog: true });
    expect(Date.now() - started).toBeLessThan(500);
    expect(opened.kind === 'ready' && opened.session.configOptions[0].options[0].value).toBe('gemini');
    session.close();
  });
});

#!/usr/bin/env node
import { spawn, execFile } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import readline from 'node:readline';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Configured or passed-in executable path
const AGY_EXECUTABLE = process.argv[2] || process.env.AGY_EXECUTABLE || 'agy';

// File logger for troubleshooting
const LOG_FILE = resolve(
  process.env.USERPROFILE || process.env.HOME || '',
  '.zcc/logs/agy-acp.log'
);

function logToFile(msg) {
  try {
    const dir = dirname(LOG_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`, 'utf8');
  } catch {
    // Ignore logging errors
  }
}

function resolveExecutable(candidate) {
  if (candidate && candidate !== 'agy' && existsSync(candidate)) {
    return candidate;
  }
  if (process.platform === 'win32') {
    const localAppData =
      process.env.LOCALAPPDATA ||
      (process.env.USERPROFILE ? resolve(process.env.USERPROFILE, 'AppData/Local') : '');
    if (localAppData) {
      const standard = resolve(localAppData, 'agy/bin/agy.exe');
      if (existsSync(standard)) return standard;
    }
  }
  return candidate || 'agy';
}

const FALLBACK_MODELS = [
  { modelId: 'gemini-4-argon', name: 'Gemini 4 Argon', description: 'Google Gemini 4 Argon flagship model' },
  { modelId: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Google Gemini 3.8 Flash high-efficiency model' },
  { modelId: 'claude-opus-5-5', name: 'Claude Opus 5.5', description: 'Anthropic Claude Opus 5.5 deep reasoning' },
  { modelId: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', description: 'Anthropic Claude Sonnet 5.5 balanced model' },
  { modelId: 'gpt-oss-120b', name: 'GPT-OSS 120B', description: 'Open weights 120B model' }
];

// Active sessions map: sessionId -> session state
const sessions = new Map();

// In-memory model catalog cache to prevent re-spawning CLI repeatedly during discovery
let cachedModels = null;
let cachedModelsAt = 0;
const MODELS_CACHE_TTL_MS = 60_000;

function send(msg) {
  const payload = JSON.stringify(msg);
  process.stdout.write(payload + '\n');
}

function sendResult(id, result) {
  logToFile(`sendResult id=${id} result=${JSON.stringify(result).slice(0, 100)}`);
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  logToFile(`sendError id=${id} code=${code} message=${message}`);
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function sendNotification(method, params) {
  send({ jsonrpc: '2.0', method, params });
}

async function discoverAgyModels(executable) {
  if (cachedModels && Date.now() - cachedModelsAt < MODELS_CACHE_TTL_MS) {
    return cachedModels;
  }
  try {
    const resolvedExe = resolveExecutable(executable);
    const { stdout } = await execFileAsync(resolvedExe, ['models'], {
      timeout: 5000,
      shell: false
    });
    const discovered = [];
    const seen = new Set();
    const lines = stdout.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('Fetching')) continue;
      // agy models outputs: id \t Display Name
      const parts = line.split('\t');
      const fullId = parts[0]?.trim();
      const displayName = parts[1]?.trim() || fullId;
      if (!fullId) continue;

      // Extract base model name if it has an effort suffix e.g. gemini-4-argon-medium -> gemini-4-argon
      const baseId = fullId.replace(/-(?:low|medium|high|xhigh|max)$/, '');
      if (!seen.has(baseId)) {
        seen.add(baseId);
        discovered.push({
          modelId: baseId,
          name: displayName.replace(/\s*\((?:Low|Medium|High|XHigh|Max)\)$/i, ''),
          description: `Antigravity model (${baseId})`
        });
      }
    }

    if (discovered.length > 0) {
      cachedModels = discovered;
      cachedModelsAt = Date.now();
      return discovered;
    }
  } catch (err) {
    logToFile(`Model discovery failed: ${err.message}`);
  }
  return FALLBACK_MODELS;
}

function buildSessionStatePayload(session, models) {
  const modelOptions = models.map((m) => ({
    value: m.modelId,
    name: m.name
  }));

  return {
    modes: {
      availableModes: [
        { id: 'accept-edits', name: 'Accept Edits', description: 'Auto-approve file edits' },
        { id: 'auto', name: 'Auto', description: 'Auto-approve all actions' },
        { id: 'plan', name: 'Plan', description: 'Read-only mode' }
      ],
      currentModeId: session.mode || 'accept-edits'
    },
    models: {
      currentModelId: session.model,
      availableModels: models
    },
    configOptions: [
      {
        id: 'model',
        name: 'Model',
        category: 'model',
        type: 'select',
        currentValue: session.model,
        options: modelOptions
      },
      {
        id: 'thought_level',
        name: 'Reasoning Effort',
        category: 'thought_level',
        type: 'select',
        currentValue: session.thoughtLevel || 'medium',
        options: [
          { value: 'low', name: 'Low Effort' },
          { value: 'medium', name: 'Medium Effort' },
          { value: 'high', name: 'High Effort' }
        ]
      }
    ]
  };
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

logToFile(`agy-acp bridge started. AGY_EXECUTABLE=${AGY_EXECUTABLE}`);

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let req;
  try {
    req = JSON.parse(trimmed);
  } catch (err) {
    return;
  }

  const { id, method, params } = req;
  logToFile(`Incoming RPC: method=${method} id=${id}`);

  if (method === 'initialize') {
    return sendResult(id, {
      protocolVersion: 1,
      agentInfo: {
        name: 'antigravity',
        title: 'Antigravity CLI (agy)',
        version: '1.4.0'
      },
      agentCapabilities: {
        loadSession: true,
        promptCapabilities: {
          image: true,
          audio: false,
          embeddedContext: true
        }
      }
    });
  }

  if (method === 'session/new') {
    const sessionId = `agy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cwd = params?.cwd || process.cwd();
    const models = await discoverAgyModels(AGY_EXECUTABLE);
    const defaultModel = models[0]?.modelId || 'gemini-4-argon';

    const session = {
      id: sessionId,
      cwd,
      model: defaultModel,
      thoughtLevel: 'medium',
      mode: 'accept-edits',
      activeProc: null
    };
    sessions.set(sessionId, session);

    const state = buildSessionStatePayload(session, models);
    return sendResult(id, {
      sessionId,
      ...state
    });
  }

  if (method === 'session/load') {
    const sessionId = params?.sessionId;
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        cwd: params?.cwd || process.cwd(),
        model: 'gemini-4-argon',
        thoughtLevel: 'medium',
        mode: 'accept-edits',
        activeProc: null
      };
      sessions.set(sessionId, session);
    } else if (params?.cwd) {
      session.cwd = params.cwd;
    }

    const models = await discoverAgyModels(AGY_EXECUTABLE);
    const state = buildSessionStatePayload(session, models);
    return sendResult(id, state);
  }

  if (method === 'session/set_config_option') {
    const session = sessions.get(params?.sessionId);
    if (!session) {
      return sendError(id, -32602, 'Unknown session');
    }

    if (params.configId === 'model' && typeof params.value === 'string') {
      session.model = params.value;
      logToFile(`Updated session ${session.id} model to ${session.model}`);
    }
    if (params.configId === 'thought_level' && typeof params.value === 'string') {
      session.thoughtLevel = params.value;
      logToFile(`Updated session ${session.id} thoughtLevel to ${session.thoughtLevel}`);
    }

    const models = await discoverAgyModels(AGY_EXECUTABLE);
    const state = buildSessionStatePayload(session, models);
    return sendResult(id, {
      configOptions: state.configOptions
    });
  }

  if (method === 'session/set_mode') {
    const session = sessions.get(params?.sessionId);
    if (!session) {
      return sendError(id, -32602, 'Unknown session');
    }
    if (typeof params?.modeId === 'string') {
      session.mode = params.modeId;
      logToFile(`Updated session ${session.id} mode to ${session.mode}`);
    }
    return sendResult(id, {});
  }

  if (method === 'session/prompt') {
    const sessionId = params?.sessionId;
    const session = sessions.get(sessionId);
    if (!session) {
      return sendError(id, -32602, 'Unknown session');
    }

    // Extract prompt string from prompt content blocks
    let promptText = '';
    if (Array.isArray(params?.prompt)) {
      for (const block of params.prompt) {
        if (typeof block === 'string') {
          promptText += block;
        } else if (block?.type === 'text' && typeof block.text === 'string') {
          promptText += block.text;
        }
      }
    } else if (typeof params?.prompt === 'string') {
      promptText = params.prompt;
    }

    if (!promptText.trim()) {
      return sendResult(id, { stopReason: 'end_turn' });
    }

    const resolvedExe = resolveExecutable(AGY_EXECUTABLE);
    const args = [
      '--input-format=text',
      '--output-format=stream-json',
      `--model=${session.model || 'gemini-4-argon'}`,
      '--dangerously-skip-permissions',
      '--disable-slash-commands'
    ];
    if (session.thoughtLevel) {
      args.push(`--effort=${session.thoughtLevel}`);
    }
    if (session.mode) {
      args.push(`--mode=${session.mode}`);
    }

    logToFile(`Spawning CLI: ${resolvedExe} ${args.join(' ')}`);
    logToFile(`Prompt text length: ${promptText.length}`);

    try {
      const child = spawn(resolvedExe, args, {
        cwd: session.cwd,
        shell: false, // Critical: never use shell on Windows to prevent mangling / limit issues
        stdio: ['pipe', 'pipe', 'pipe']
      });

      session.activeProc = child;

      // Pipe prompt directly into stdin
      child.stdin.write(promptText);
      child.stdin.end();

      let stdoutBuffer = '';
      let hasEmittedDelta = false;
      let stderrBuffer = '';

      child.stdout.on('data', (chunk) => {
        stdoutBuffer += chunk.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop(); // keep partial line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const ev = JSON.parse(trimmed);
            // 1. Text deltas during model response
            if (ev.event === 'step_update' && ev.step_update?.text_delta) {
              hasEmittedDelta = true;
              sendNotification('session/update', {
                sessionId,
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: { type: 'text', text: ev.step_update.text_delta }
                }
              });
            }
            // 2. Final response fallback if no deltas were sent
            else if (ev.event === 'result' && ev.result?.response && !hasEmittedDelta) {
              hasEmittedDelta = true;
              sendNotification('session/update', {
                sessionId,
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: { type: 'text', text: ev.result.response }
                }
              });
            }
          } catch {
            // CLI output plain text or unformatted line
            hasEmittedDelta = true;
            sendNotification('session/update', {
              sessionId,
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: trimmed + '\n' }
              }
            });
          }
        }
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrBuffer += text;
        logToFile(`[CLI stderr] ${text.trim()}`);
      });

      child.on('close', (code) => {
        logToFile(`CLI process closed with code ${code}, emittedDelta=${hasEmittedDelta}`);
        session.activeProc = null;

        // Process any trailing line in buffer
        if (stdoutBuffer.trim()) {
          try {
            const ev = JSON.parse(stdoutBuffer.trim());
            if (ev.event === 'step_update' && ev.step_update?.text_delta) {
              hasEmittedDelta = true;
              sendNotification('session/update', {
                sessionId,
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: { type: 'text', text: ev.step_update.text_delta }
                }
              });
            } else if (ev.event === 'result' && ev.result?.response && !hasEmittedDelta) {
              hasEmittedDelta = true;
              sendNotification('session/update', {
                sessionId,
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: { type: 'text', text: ev.result.response }
                }
              });
            }
          } catch {
            if (!hasEmittedDelta) {
              hasEmittedDelta = true;
              sendNotification('session/update', {
                sessionId,
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: { type: 'text', text: stdoutBuffer }
                }
              });
            }
          }
        }

        // If process exited with an error or returned zero output, notify the thread
        if (code !== 0 && !hasEmittedDelta) {
          const errorMsg = stderrBuffer.trim() || `CLI exited with error code ${code}`;
          sendNotification('session/update', {
            sessionId,
            update: {
              sessionUpdate: 'agent_message_chunk',
              content: {
                type: 'text',
                text: `\n[Antigravity error: ${errorMsg}]\n`
              }
            }
          });
        }

        sendResult(id, { stopReason: 'end_turn' });
      });

      child.on('error', (err) => {
        logToFile(`CLI process spawn error: ${err.message}`);
        session.activeProc = null;
        sendNotification('session/update', {
          sessionId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: `\n[Antigravity error: ${err.message}]\n` }
          }
        });
        sendResult(id, { stopReason: 'end_turn' });
      });
    } catch (err) {
      logToFile(`Failed to spawn CLI: ${err.message}`);
      return sendError(id, -32000, `Failed to spawn Antigravity CLI: ${err.message}`);
    }
    return;
  }

  if (method === 'session/cancel') {
    const session = sessions.get(params?.sessionId);
    if (session?.activeProc) {
      logToFile(`Killing active CLI process for session ${params?.sessionId}`);
      session.activeProc.kill();
      session.activeProc = null;
    }
    return sendResult(id, {});
  }

  // Fallback for any unhandled methods
  logToFile(`Unhandled RPC method: ${method}`);
  sendError(id, -32601, `Method not supported: ${method}`);
});

import { useComposer, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REPHRASE_METHOD, TRANSCRIBE_METHOD, type RephraseResponse, type TranscribeResponse } from '../shared/protocol.ts';
import { appendTranscript } from './appendText.ts';
import { defaultStartSession, type RecordedAudio, type RecordingSession } from './recorder.ts';
import { computeWordDiff, type DiffToken } from './textDiff.ts';
import { PROMPT_STUDIO_STYLES } from './promptStudioStyles.ts';

const STORAGE_KEY = 'zcc-prompt-voice:studio-vertical-draft';

export interface PromptPreset {
  id: string;
  label: string;
  tone: string;
  prompt: string;
}

export const STUDIO_PRESETS: PromptPreset[] = [
  {
    id: 'clarity',
    label: '✨ Polish Clarity',
    tone: 'formal',
    prompt: 'Fix grammar, remove filler words (um, uh, like), and polish for maximum clarity.'
  },
  {
    id: 'brief',
    label: '⚡ Executive Brief',
    tone: 'technical',
    prompt: 'Convert this into a concise 3-bullet executive brief followed by immediate next actions.'
  },
  {
    id: 'spec',
    label: '📐 Tech Spec RFC',
    tone: 'technical',
    prompt: 'Format into an engineering RFC with sections: Overview, Architecture, Data Flow, and Tradeoffs.'
  },
  {
    id: 'friendly',
    label: '💬 Friendly Chat',
    tone: 'conversational',
    prompt: 'Rephrase to sound natural, warm, and friendly for team chat.'
  }
];

export interface PromptStudioProps {
  /** Optional custom session starter for tests */
  startSession?: () => Promise<RecordingSession>;
}

export function PromptStudio({ startSession = defaultStartSession }: PromptStudioProps): React.ReactElement {
  const rpc = useRpc();
  const composer = useComposer();

  // ─── Workspace State ─────────────────────────────────────────────────────────
  const [docTitle, setDocTitle] = useState('Prompt Spec');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isCopiedOutput, setIsCopiedOutput] = useState(false);
  const [insertNotice, setInsertNotice] = useState<string | null>(null);

  // ─── Diff & View State ───────────────────────────────────────────────────────
  const [showDiff, setShowDiff] = useState(false);

  // ─── Refinement Controls State ───────────────────────────────────────────────
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // ─── Voice Dictation State ───────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number | null>(null);
  const activeSessionRef = useRef<RecordingSession | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const customPromptInputRef = useRef<HTMLTextAreaElement>(null);

  // Load saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setDocTitle(parsed.title);
        if (parsed.inputText) setInputText(parsed.inputText);
        if (parsed.outputText) setOutputText(parsed.outputText);
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Auto-save draft on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: docTitle, inputText, outputText }));
    } catch {
      // Ignore storage write errors
    }
  }, [docTitle, inputText, outputText]);

  // Clean up recording timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);
      if (activeSessionRef.current) activeSessionRef.current.cancel();
    };
  }, []);

  // Compute telemetry
  const inputStats = useMemo(() => {
    const trimmed = inputText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return `${words} words · ${inputText.length} chars`;
  }, [inputText]);

  const outputStats = useMemo(() => {
    const trimmed = outputText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return `${words} words · ${outputText.length} chars`;
  }, [outputText]);

  // Compute token-level LCS diff between input and output
  const diffTokens: DiffToken[] = useMemo(() => {
    if (!outputText || !showDiff) return [];
    return computeWordDiff(inputText, outputText);
  }, [inputText, outputText, showDiff]);

  // ─── Voice Dictation Handler ─────────────────────────────────────────────────
  const handleToggleDictation = async () => {
    if (isRecording) {
      // Stop active recording
      setIsRecording(false);
      setAudioLevel(null);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (meterIntervalRef.current) clearInterval(meterIntervalRef.current);

      const session = activeSessionRef.current;
      activeSessionRef.current = null;
      if (!session) return;

      try {
        const audio = await session.stop();
        const response = (await rpc.call(TRANSCRIBE_METHOD, {
          audio: audio.base64,
          mimeType: audio.mimeType
        })) as TranscribeResponse;

        if (response.ok && response.status === 'ok') {
          setInputText((prev) => appendTranscript(prev, response.text));
        } else if (response.ok && response.status === 'no-speech') {
          setStatusNotice('No speech detected. Try speaking closer to the microphone.');
          setTimeout(() => setStatusNotice(null), 4000);
        } else if (!response.ok) {
          setStatusNotice(response.message);
        }
      } catch (err) {
        setStatusNotice(err instanceof Error ? err.message : 'Transcription failed.');
      }
    } else {
      // Start recording
      setStatusNotice(null);
      setRecordingSeconds(0);
      try {
        const session = await startSession();
        activeSessionRef.current = session;
        setIsRecording(true);

        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((s) => s + 1);
        }, 1000);

        if (session.getAudioLevel) {
          meterIntervalRef.current = setInterval(() => {
            const level = session.getAudioLevel?.();
            if (level !== undefined && level !== null) {
              setAudioLevel(level);
            }
          }, 100);
        }
      } catch (err) {
        setIsRecording(false);
        setStatusNotice(err instanceof Error ? err.message : 'Microphone access denied.');
      }
    }
  };

  // ─── Refinement Handler ──────────────────────────────────────────────────────
  const handleRefine = async (presetIdOverride?: string) => {
    const raw = inputText.trim();
    if (!raw || isRefining) return;

    const activePreset = STUDIO_PRESETS.find((p) => p.id === (presetIdOverride || selectedPresetId));
    const instruction = customPrompt.trim() || activePreset?.prompt || 'Polish and format for clarity.';
    const tone = activePreset?.tone || 'technical';

    setStatusNotice(null);
    setIsRefining(true);

    try {
      const response = (await rpc.call(REPHRASE_METHOD, {
        text: raw,
        tone,
        customPrompt: instruction
      })) as RephraseResponse;

      if (response.ok) {
        setOutputText(response.text);
      } else {
        setStatusNotice(response.message);
      }
    } catch (err) {
      setStatusNotice(err instanceof Error ? err.message : 'Refinement request failed.');
    } finally {
      setIsRefining(false);
    }
  };

  // ─── Canvas Actions ──────────────────────────────────────────────────────────
  const handleCopyInput = async () => {
    if (!inputText) return;
    try {
      await navigator.clipboard.writeText(inputText);
      setStatusNotice('Input draft copied to clipboard!');
      setTimeout(() => setStatusNotice(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyOutput = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setIsCopiedOutput(true);
      setTimeout(() => setIsCopiedOutput(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear both raw input and refined output?')) {
      setInputText('');
      setOutputText('');
      setShowDiff(false);
    }
  };

  const handleReplaceInput = () => {
    if (!outputText) return;
    setInputText(outputText);
    setStatusNotice('Replaced top input with refined output for further iteration.');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleInsertIntoComposer = () => {
    const textToInsert = outputText || inputText;
    if (!textToInsert) return;

    composer.updateText((draft) => appendTranscript(draft, textToInsert));
    composer.focus();
    setInsertNotice('Inserted output into thread composer!');
    setTimeout(() => setInsertNotice(null), 3000);
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        customPromptInputRef.current?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRefine();
      }
    },
    [inputText, selectedPresetId, customPrompt, isRefining]
  );

  return (
    <div className="ps-root" onKeyDown={handleKeyDown}>
      {/* Guaranteed Style Injection */}
      <style dangerouslySetInnerHTML={{ __html: PROMPT_STUDIO_STYLES }} />

      {/* ─── Top Studio Toolbar ─────────────────────────────────────────────── */}
      <header className="ps-toolbar">
        <div className="ps-brand">
          <span>✨</span>
          <span>Prompt Studio</span>
          <span className="ps-brand-badge">Vertical Workflow</span>
        </div>

        {insertNotice && (
          <span style={{ fontSize: 12, color: '#3fb950', fontWeight: 500 }}>
            ✓ {insertNotice}
          </span>
        )}
        {statusNotice && (
          <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 500 }}>
            {statusNotice}
          </span>
        )}

        <div className="ps-spacer" />

        <button
          type="button"
          className="ps-btn ps-btn-sm"
          onClick={handleClearAll}
          disabled={!inputText && !outputText}
          title="Clear all text"
        >
          <span>🗑️</span> Clear All
        </button>

        <button
          type="button"
          className="ps-btn ps-btn-primary"
          onClick={handleInsertIntoComposer}
          disabled={!inputText && !outputText}
          title="Insert refined output into active composer"
        >
          <span>💬</span> Insert Output into Composer
        </button>
      </header>

      {/* ─── Workspace Layout ───────────────────────────────────────────────── */}
      <div className="ps-workspace">

        {/* ─── Left Sidebar Controls ────────────────────────────────────────── */}
        <aside className="ps-sidebar">

          {/* Voice Dictation Card */}
          <section className="ps-section">
            <div className="ps-section-title">
              <span>Voice Dictation</span>
              <span style={{ fontSize: 10, color: 'var(--ps-text-muted)' }}>Host STT</span>
            </div>
            <div className="ps-dictation-card">
              <button
                type="button"
                className={`ps-mic-btn${isRecording ? ' recording' : ''}`}
                onClick={handleToggleDictation}
                title={isRecording ? 'Stop dictation' : 'Start dictation into input'}
              >
                <span>{isRecording ? '⏹️' : '🎙️'}</span>
                <span>{isRecording ? `Listening (${recordingSeconds}s)...` : 'Dictate into Top Input'}</span>
              </button>
              <div className="ps-audio-meter">
                <div
                  className="ps-audio-bar"
                  style={{ width: `${isRecording ? Math.min(100, (audioLevel ?? 0.3) * 100) : 0}%` }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--ps-text-muted)' }}>
                {isRecording ? 'Recording active. Transcribing into Input above...' : 'Speaks into Raw Input above. Transcribed with Zana host voice.'}
              </span>
            </div>
          </section>

          {/* Refinement Presets */}
          <section className="ps-section">
            <div className="ps-section-title">
              <span>Refinement Presets</span>
              <span style={{ fontSize: 10, color: 'var(--ps-text-muted)' }}>Instant apply</span>
            </div>
            <div className="ps-presets-list">
              {STUDIO_PRESETS.map((preset) => {
                const isActive = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`ps-preset-item${isActive ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      handleRefine(preset.id);
                    }}
                    disabled={!inputText.trim() || isRefining}
                  >
                    <div className="ps-preset-header">
                      <span className="ps-preset-name">{preset.label}</span>
                    </div>
                    <span className="ps-preset-desc">{preset.prompt}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Custom AI Instructions */}
          <section className="ps-section" style={{ borderBottom: 'none' }}>
            <div className="ps-section-title">
              <span>Custom Instructions</span>
              <span className="ps-kbd">Ctrl+K</span>
            </div>
            <textarea
              ref={customPromptInputRef}
              className="ps-instructions-input"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="E.g., Format as markdown with code examples, or restrict response to 150 words..."
              disabled={isRefining}
            />
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="ps-btn ps-btn-primary"
                style={{ width: '100%', height: 32 }}
                onClick={() => handleRefine()}
                disabled={!inputText.trim() || isRefining}
              >
                <span>✨</span> {isRefining ? 'Refining…' : 'Refine Prompt (Ctrl+Enter)'}
              </button>
            </div>
          </section>

        </aside>

        {/* ─── Center Vertical Stack: TOP INPUT, BOTTOM OUTPUT ─────────────── */}
        <main className="ps-stack-workspace">

          {/* Spec Title Sub-header */}
          <div className="ps-stack-header">
            <input
              type="text"
              className="ps-title-field"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Untitled Prompt Spec..."
            />
            <span style={{ fontSize: 11, color: 'var(--ps-text-muted)' }}>
              Input: {inputStats} · Output: {outputStats}
            </span>
          </div>

          <div className="ps-vertical-panes">

            {/* ─── TOP PANE: RAW INPUT ───────────────────────────────────────── */}
            <section className="ps-section-input">
              <div className="ps-pane-header">
                <div className="ps-pane-title">
                  <span className="ps-badge ps-badge-input">Input</span>
                  <span>Raw Draft / Speech</span>
                </div>
                <div className="ps-pane-actions">
                  <span style={{ fontSize: 11, color: 'var(--ps-text-muted)' }}>{inputStats}</span>
                  <button
                    type="button"
                    className="ps-btn ps-btn-sm"
                    onClick={handleCopyInput}
                    disabled={!inputText}
                    title="Copy input text"
                  >
                    📋 Copy
                  </button>
                  <button
                    type="button"
                    className="ps-btn ps-btn-sm"
                    onClick={() => setInputText('')}
                    disabled={!inputText}
                    title="Clear raw input"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                className="ps-input-textarea"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your raw thoughts or click Dictate in the toolbar below to capture speech..."
              />
            </section>

            {/* ─── MIDDLE ACTION BAR: TRANSFORM TRIGGER ─────────────────────── */}
            <div className="ps-mid-action-bar">
              <div className="ps-mid-info">
                <span>⬇ Transform Input into Prompt Spec</span>
              </div>
              <div className="ps-mid-actions">
                <button
                  type="button"
                  className="ps-btn ps-btn-sm ps-btn-primary"
                  onClick={() => handleRefine()}
                  disabled={!inputText.trim() || isRefining}
                  title="Refine raw input (Ctrl+Enter)"
                >
                  <span>✨ {isRefining ? 'Refining…' : 'Refine Now (Ctrl+Enter)'}</span>
                </button>
              </div>
            </div>

            {/* ─── BOTTOM PANE: REFINED OUTPUT ───────────────────────────────── */}
            <section className="ps-section-output">
              <div className="ps-pane-header">
                <div className="ps-pane-title">
                  <span className="ps-badge ps-badge-output">Output</span>
                  <span>{outputText ? 'Refined Spec (Ready)' : 'Refined Spec'}</span>
                </div>
                <div className="ps-pane-actions">
                  {outputText && (
                    <button
                      type="button"
                      className="ps-btn ps-btn-sm"
                      onClick={() => setShowDiff((v) => !v)}
                      title="Toggle difference view"
                    >
                      <span>{showDiff ? '👁️' : '🔍'}</span>
                      <span>{showDiff ? 'View Clean' : 'View Diff'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="ps-btn ps-btn-sm"
                    onClick={handleCopyOutput}
                    disabled={!outputText}
                    title="Copy refined output"
                  >
                    <span>{isCopiedOutput ? '✓' : '📋'}</span>
                    <span>{isCopiedOutput ? 'Copied!' : 'Copy Output'}</span>
                  </button>
                  <button
                    type="button"
                    className="ps-btn ps-btn-sm ps-btn-success"
                    onClick={handleReplaceInput}
                    disabled={!outputText}
                    title="Copy refined text back up to input for further iteration"
                  >
                    <span>⬆ Replace Input</span>
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {outputText ? (
                  <div className="ps-output-scroll">
                    {showDiff ? (
                      diffTokens.map((token, idx) => {
                        if (token.type === 'added') {
                          return (
                            <span key={idx} className="ps-diff-added">
                              {token.text}
                            </span>
                          );
                        }
                        if (token.type === 'removed') {
                          return (
                            <span key={idx} className="ps-diff-removed">
                              {token.text}
                            </span>
                          );
                        }
                        return (
                          <span key={idx} className="ps-diff-unchanged">
                            {token.text}
                          </span>
                        );
                      })
                    ) : (
                      outputText
                    )}
                  </div>
                ) : (
                  <div className="ps-output-empty">
                    <span style={{ fontSize: 26, opacity: 0.5 }}>✨</span>
                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ps-text)' }}>
                      No Refined Output Yet
                    </div>
                    <div style={{ fontSize: 12, maxWidth: 320, lineHeight: 1.4, color: 'var(--ps-text-muted)' }}>
                      Type your raw thoughts above or speak, then click <strong>Refine Now</strong> or select a preset on the left.
                    </div>
                    <button
                      type="button"
                      className="ps-btn ps-btn-primary"
                      style={{ marginTop: 4 }}
                      onClick={() => handleRefine()}
                      disabled={!inputText.trim() || isRefining}
                    >
                      <span>✨</span> Refine Prompt Now
                    </button>
                  </div>
                )}
              </div>
            </section>

          </div>

        </main>

      </div>

      {/* ─── Bottom IDE Status Bar ─────────────────────────────────────────── */}
      <footer className="ps-statusbar">
        <div className="ps-status-item">
          <span>●</span>
          <span>Auto-saved locally</span>
        </div>
        <div className="ps-status-item">
          <span>Model:</span>
          <span style={{ color: 'var(--ps-text)' }}>Active Thread Agent</span>
        </div>
        <div className="ps-spacer" />
        <div className="ps-status-item">
          <span>Shortcuts:</span>
          <span className="ps-kbd">Ctrl+K</span> Focus Prompt
          <span className="ps-kbd">Ctrl+Enter</span> Refine
        </div>
      </footer>
    </div>
  );
}

import { useComposer, useRpc } from '@zana-ai/zcc-plugin-sdk/app';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REPHRASE_METHOD, TRANSCRIBE_METHOD, type RephraseResponse, type TranscribeResponse } from '../shared/protocol.ts';
import { appendTranscript } from './appendText.ts';
import { defaultStartSession, type RecordedAudio, type RecordingSession } from './recorder.ts';
import { computeWordDiff, type DiffToken } from './textDiff.ts';
import { PROMPT_STUDIO_STYLES } from './promptStudioStyles.ts';

const STORAGE_KEY = 'zcc-prompt-voice:studio-draft';

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

  // ─── Canvas State ────────────────────────────────────────────────────────────
  const [docTitle, setDocTitle] = useState('Prompt Spec');
  const [content, setContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [insertNotice, setInsertNotice] = useState<string | null>(null);

  // ─── Review & Diff State ─────────────────────────────────────────────────────
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [refinedContent, setRefinedContent] = useState('');
  const [showDiff, setShowDiff] = useState(true);

  // ─── Refinement Controls State ───────────────────────────────────────────────
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Voice Dictation State ───────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const activeSessionRef = useRef<RecordingSession | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setDocTitle(parsed.title);
        if (parsed.content) setContent(parsed.content);
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Auto-save draft on change
  useEffect(() => {
    if (!isReviewMode) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: docTitle, content }));
      } catch {
        // Ignore storage write errors
      }
    }
  }, [docTitle, content, isReviewMode]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (activeSessionRef.current) activeSessionRef.current.cancel();
    };
  }, []);

  // ─── Word & Character Counts ─────────────────────────────────────────────────
  const telemetry = useMemo(() => {
    const textToCount = isReviewMode ? refinedContent : content;
    const words = textToCount.trim() ? textToCount.trim().split(/\s+/).length : 0;
    const chars = textToCount.length;
    return `${words} words · ${chars} chars`;
  }, [content, refinedContent, isReviewMode]);

  // ─── Diff Tokens ─────────────────────────────────────────────────────────────
  const diffTokens = useMemo<DiffToken[]>(() => {
    if (!isReviewMode) return [];
    return computeWordDiff(originalContent, refinedContent);
  }, [isReviewMode, originalContent, refinedContent]);

  // ─── Voice Dictation Handler ─────────────────────────────────────────────────
  const handleToggleDictation = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      const session = activeSessionRef.current;
      activeSessionRef.current = null;
      if (!session) return;

      try {
        const audio: RecordedAudio = await session.stop();
        const response = (await rpc.call(TRANSCRIBE_METHOD, {
          audio: audio.base64,
          mimeType: audio.mimeType
        })) as TranscribeResponse;

        if (response.ok && response.status === 'ok') {
          setContent((prev) => appendTranscript(prev, response.text));
        } else if (response.ok && response.status === 'no-speech') {
          setErrorMessage('No speech detected. Try speaking closer to the microphone.');
          setTimeout(() => setErrorMessage(null), 4000);
        } else if (!response.ok) {
          setErrorMessage(response.message);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Transcription failed.');
      }
    } else {
      // Start recording
      setErrorMessage(null);
      setRecordingSeconds(0);
      try {
        const session = await startSession();
        activeSessionRef.current = session;
        setIsRecording(true);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        setIsRecording(false);
        setErrorMessage(err instanceof Error ? err.message : 'Microphone access denied.');
      }
    }
  };

  // ─── Refinement Handler ──────────────────────────────────────────────────────
  const handleRunRefine = async (presetId?: string) => {
    const textToRefine = content.trim();
    if (!textToRefine || isRefining) return;

    const preset = STUDIO_PRESETS.find((p) => p.id === (presetId || selectedPresetId));
    const instruction = customPrompt.trim() || preset?.prompt || 'Polish and format for clarity.';

    setErrorMessage(null);
    setIsRefining(true);

    try {
      const response = (await rpc.call(REPHRASE_METHOD, {
        text: textToRefine,
        tone: preset?.tone || 'technical',
        customPrompt: instruction
      })) as RephraseResponse;

      if (response.ok) {
        setOriginalContent(textToRefine);
        setRefinedContent(response.text);
        setIsReviewMode(true);
        setShowDiff(true);
      } else {
        setErrorMessage(response.message);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Refinement request failed.');
    } finally {
      setIsRefining(false);
    }
  };

  // ─── Review Actions ──────────────────────────────────────────────────────────
  const handleAcceptDiff = () => {
    setContent(refinedContent);
    setIsReviewMode(false);
    setOriginalContent('');
    setRefinedContent('');
  };

  const handleDiscardDiff = () => {
    setIsReviewMode(false);
    setOriginalContent('');
    setRefinedContent('');
  };

  const handleCopy = async () => {
    const textToCopy = isReviewMode ? refinedContent : content;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleInsertIntoComposer = () => {
    const textToInsert = isReviewMode ? refinedContent : content;
    if (!textToInsert) return;

    composer.updateText((draft) => appendTranscript(draft, textToInsert));
    composer.focus();
    setInsertNotice('Inserted into thread composer!');
    setTimeout(() => setInsertNotice(null), 3000);
  };

  const handleClear = () => {
    if (isReviewMode) {
      handleDiscardDiff();
    } else if (content.trim()) {
      setContent('');
    }
  };

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (isReviewMode) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          handleAcceptDiff();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleDiscardDiff();
        }
      }
    },
    [isReviewMode, refinedContent]
  );

  return (
    <div
      className="ps-root"
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        background: '#090D16',
        color: '#F8FAFC',
        position: 'relative'
      }}
    >
      {/* Embedded Stylesheet for 100% Guaranteed Layout Isolation */}
      <style dangerouslySetInnerHTML={{ __html: PROMPT_STUDIO_STYLES }} />

      {/* ─── Top Header ───────────────────────────────────────────────────────── */}
      <header
        className="ps-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '52px',
          padding: '0 24px',
          background: '#0D111D',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0
        }}
      >
        <div className="ps-header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="ps-logo-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#FFFFFF',
              fontSize: '14px'
            }}
          >
            ✨
          </div>
          <span className="ps-title" style={{ fontSize: '15px', fontWeight: 600, color: '#F8FAFC' }}>
            Prompt Studio
          </span>
          <span
            className="ps-badge"
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#A5B4FC',
              border: '1px solid rgba(99, 102, 241, 0.25)'
            }}
          >
            Inline Canvas
          </span>
          <span
            className="ps-telemetry-tag"
            style={{
              fontSize: '12px',
              color: '#94A3B8',
              fontFamily: 'ui-monospace, monospace'
            }}
          >
            {telemetry}
          </span>
        </div>

        <div className="ps-header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {insertNotice && <span style={{ fontSize: 12, color: '#34d399', fontWeight: 500 }}>{insertNotice}</span>}

          <button
            type="button"
            className="ps-btn-ghost"
            onClick={handleCopy}
            disabled={!content && !refinedContent}
            title="Copy prompt to clipboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#CBD5E1',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {isCopied ? '✓ Copied' : '📋 Copy'}
          </button>

          <button
            type="button"
            className="ps-btn-ghost"
            onClick={handleClear}
            disabled={!content && !refinedContent}
            title="Clear prompt canvas"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#CBD5E1',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            🗑️ Clear
          </button>

          <button
            type="button"
            className="ps-btn-primary"
            onClick={handleInsertIntoComposer}
            disabled={!content && !refinedContent}
            title="Insert directly into the active chat composer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            💬 Insert into Composer
          </button>
        </div>
      </header>

      {/* ─── Document Canvas ──────────────────────────────────────────────────── */}
      <main
        className="ps-canvas-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px 24px 160px 24px',
          display: 'flex',
          justifyContent: 'center',
          background: '#090D16'
        }}
      >
        <div
          className="ps-canvas"
          style={{
            width: '100%',
            maxWidth: '800px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          <input
            type="text"
            className="ps-doc-title"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Untitled Prompt Spec..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              fontSize: '26px',
              fontWeight: 700,
              color: '#F8FAFC',
              outline: 'none',
              padding: 0,
              margin: 0
            }}
          />
          <div
            className="ps-doc-divider"
            style={{
              width: '100%',
              height: '1px',
              background: 'rgba(255, 255, 255, 0.08)'
            }}
          />

          {errorMessage && <div className="ps-status-notice">{errorMessage}</div>}

          {isReviewMode ? (
            <div className="ps-diff-container">
              {showDiff ? (
                diffTokens.map((token, index) => {
                  if (token.type === 'added') {
                    return (
                      <span key={index} className="ps-diff-added">
                        {token.text}
                      </span>
                    );
                  }
                  if (token.type === 'removed') {
                    return (
                      <span key={index} className="ps-diff-removed">
                        {token.text}
                      </span>
                    );
                  }
                  return (
                    <span key={index} className="ps-diff-unchanged">
                      {token.text}
                    </span>
                  );
                })
              ) : (
                <div style={{ color: '#E2E8F0', whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>{refinedContent}</div>
              )}
            </div>
          ) : (
            <textarea
              className="ps-doc-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your raw thoughts or click Dictate in the toolbar below to capture speech..."
              rows={12}
              style={{
                width: '100%',
                minHeight: '280px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#E2E8F0',
                fontSize: '15px',
                lineHeight: 1.7,
                resize: 'vertical',
                fontFamily: 'inherit',
                padding: 0
              }}
            />
          )}
        </div>
      </main>

      {/* ─── Floating AI Refinement Bar ───────────────────────────────────────── */}
      <footer
        className="ps-floating-bar"
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 48px)',
          maxWidth: '800px',
          background: 'rgba(13, 17, 29, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '14px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 50
        }}
      >
        {isReviewMode ? (
          <div
            className="ps-review-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              padding: '8px 12px',
              width: '100%'
            }}
          >
            <div className="ps-review-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6EE7B7' }}>
              <span>✨ Refinement Ready</span>
              <button
                type="button"
                className="ps-preset-pill"
                onClick={() => setShowDiff((v) => !v)}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                  borderRadius: '999px',
                  cursor: 'pointer'
                }}
              >
                {showDiff ? '👁️ View Clean' : '🔍 View Diff'}
              </button>
            </div>

            <div className="ps-review-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="ps-btn-ghost"
                onClick={() => handleRunRefine()}
                disabled={isRefining}
                style={{
                  fontSize: 11,
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#CBD5E1',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🔄 Try Again
              </button>
              <button
                type="button"
                className="ps-btn-discard"
                onClick={handleDiscardDiff}
                title="Discard refinement (Esc)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#FCA5A5',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                ✕ Discard (Esc)
              </button>
              <button
                type="button"
                className="ps-btn-accept"
                onClick={handleAcceptDiff}
                title="Accept refined text (Enter)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✓ Accept (Enter)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Presets Row */}
            <div className="ps-pills-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
              <span
                className="ps-pills-label"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginRight: '4px',
                  flexShrink: 0
                }}
              >
                Presets:
              </span>
              {STUDIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`ps-preset-pill${selectedPresetId === preset.id ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedPresetId(preset.id);
                    handleRunRefine(preset.id);
                  }}
                  disabled={!content.trim() || isRefining}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: selectedPresetId === preset.id ? 'rgba(99, 102, 241, 0.28)' : 'rgba(255, 255, 255, 0.05)',
                    border: selectedPresetId === preset.id ? '1px solid #6366F1' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: selectedPresetId === preset.id ? '#A5B4FC' : '#CBD5E1',
                    fontSize: '12px',
                    fontWeight: selectedPresetId === preset.id ? 600 : 500,
                    padding: '4px 11px',
                    borderRadius: '999px',
                    cursor: content.trim() && !isRefining ? 'pointer' : 'not-allowed',
                    whiteSpace: 'nowrap',
                    opacity: content.trim() && !isRefining ? 1 : 0.4
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Input & Dictation Row */}
            <div className="ps-action-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <button
                type="button"
                className={`ps-mic-toggle${isRecording ? ' recording' : ''}`}
                onClick={handleToggleDictation}
                title={isRecording ? 'Stop dictation' : 'Start dictation'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isRecording ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.14)',
                  border: isRecording ? '1px solid #EF4444' : '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#FCA5A5',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <span>🎙️</span>
                <span>{isRecording ? `Listening (${recordingSeconds}s)...` : 'Dictate'}</span>
              </button>

              <input
                ref={inputRef}
                type="text"
                className="ps-input-field"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                    e.preventDefault();
                    handleRunRefine();
                  }
                }}
                placeholder="Ask AI to refine, transform tone, or add requirements (Ctrl+K)..."
                disabled={isRefining}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#F8FAFC',
                  fontSize: '13px',
                  padding: '8px 12px',
                  outline: 'none'
                }}
              />

              <button
                type="button"
                className="ps-btn-primary"
                onClick={() => handleRunRefine()}
                disabled={!content.trim() || isRefining}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: content.trim() && !isRefining ? 'pointer' : 'not-allowed',
                  opacity: content.trim() && !isRefining ? 1 : 0.4,
                  flexShrink: 0
                }}
              >
                {isRefining ? 'Refining…' : 'Refine'}
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}

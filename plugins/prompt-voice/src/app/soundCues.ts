export type SoundCueKind = 'start' | 'stop' | 'complete' | 'error';

export interface SoundCueOptions {
  enabled: boolean;
  /** Volume percentage from 0 to 100. */
  volume: number;
}

interface ToneStep {
  frequency: number;
  offsetSec: number;
  durationSec: number;
  type?: OscillatorType;
  peakFactor?: number;
}

const MAX_GAIN = 0.2;
const STOP_TAIL_SEC = 0.02;
const TAIL_PADDING_MS = 40;
const RESUME_TIMEOUT_MS = 750;

const CUE_SEQUENCES: Record<SoundCueKind, ToneStep[]> = {
  // Bright ascending interval before mic capture begins
  start: [
    { frequency: 523.25, offsetSec: 0, durationSec: 0.11, type: 'sine', peakFactor: 0.9 },
    { frequency: 659.25, offsetSec: 0.075, durationSec: 0.14, type: 'sine', peakFactor: 1 }
  ],
  // Soft crisp tick when recording stops
  stop: [
    { frequency: 493.88, offsetSec: 0, durationSec: 0.1, type: 'sine', peakFactor: 0.85 }
  ],
  // Gentle resolving interval when transcription finishes
  complete: [
    { frequency: 659.25, offsetSec: 0, durationSec: 0.1, type: 'sine', peakFactor: 0.85 },
    { frequency: 783.99, offsetSec: 0.075, durationSec: 0.16, type: 'sine', peakFactor: 1 }
  ],
  // Muted low two-tone cue on error
  error: [
    { frequency: 329.63, offsetSec: 0, durationSec: 0.12, type: 'triangle', peakFactor: 0.9 },
    { frequency: 246.94, offsetSec: 0.095, durationSec: 0.16, type: 'triangle', peakFactor: 0.9 }
  ]
};

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new AudioCtx();
  }
  return sharedContext;
}

/** Resets the cached Web Audio context (used in tests). */
export function resetSoundCueContext(): void {
  sharedContext = null;
}

function scheduleCueSequence(
  ctx: AudioContext,
  kind: SoundCueKind,
  gainScale: number
): { finalOsc: OscillatorNode | null; totalDurationSec: number } {
  const now = ctx.currentTime;
  const steps = CUE_SEQUENCES[kind];
  let finalOsc: OscillatorNode | null = null;
  let latestStopSec = 0;

  for (const step of steps) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startAt = now + step.offsetSec;
    const stopAt = startAt + step.durationSec;
    const stepEndSec = step.offsetSec + step.durationSec + STOP_TAIL_SEC;
    const peak = gainScale * (step.peakFactor ?? 1);

    if (stepEndSec >= latestStopSec) {
      latestStopSec = stepEndSec;
      finalOsc = osc;
    }

    osc.type = step.type ?? 'sine';
    osc.frequency.setValueAtTime(step.frequency, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(stopAt + STOP_TAIL_SEC);
  }

  return { finalOsc, totalDurationSec: latestStopSec };
}

function waitForOscillatorEnd(finalOsc: OscillatorNode | null, totalDurationSec: number): Promise<void> {
  const fallbackMs = Math.ceil(totalDurationSec * 1000) + TAIL_PADDING_MS;
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      if (finalOsc && typeof finalOsc.removeEventListener === 'function') {
        finalOsc.removeEventListener('ended', settle);
      }
      resolve();
    };
    if (finalOsc && typeof finalOsc.addEventListener === 'function') {
      finalOsc.addEventListener('ended', settle, { once: true });
    } else if (finalOsc && 'onended' in finalOsc) {
      const prev = finalOsc.onended;
      finalOsc.onended = function (ev) {
        if (typeof prev === 'function') prev.call(this, ev);
        settle();
      };
    }
    timer = setTimeout(settle, fallbackMs);
  });
}

async function resumeAudioContext(ctx: AudioContext): Promise<boolean> {
  if (ctx.state !== 'suspended') return ctx.state === 'running';
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      ctx.resume(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, RESUME_TIMEOUT_MS);
      })
    ]);
    return (ctx.state as string) !== 'suspended';
  } catch {
    return false;
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

/**
 * Plays a short Web Audio chime for dictation lifecycle events.
 * Returns a Promise that resolves once playback finishes, or `null` when muted
 * or running without Web Audio support (so callers can start immediately).
 */
export function playSoundCue(kind: SoundCueKind, options: SoundCueOptions): Promise<void> | null {
  if (!options.enabled) return null;
  const clampedVolume = Math.min(100, Math.max(0, options.volume));
  if (!Number.isFinite(clampedVolume) || clampedVolume <= 0) return null;

  try {
    const ctx = getAudioContext();
    if (!ctx) return null;
    const gainScale = (clampedVolume / 100) * MAX_GAIN;

    if (ctx.state === 'suspended') {
      return (async () => {
        const resumed = await resumeAudioContext(ctx);
        if (!resumed) return;
        const { finalOsc, totalDurationSec } = scheduleCueSequence(ctx, kind, gainScale);
        await waitForOscillatorEnd(finalOsc, totalDurationSec);
      })().catch(() => undefined);
    }

    const { finalOsc, totalDurationSec } = scheduleCueSequence(ctx, kind, gainScale);
    return waitForOscillatorEnd(finalOsc, totalDurationSec);
  } catch {
    // Sound cues are non-critical feedback and must never disrupt dictation
    return null;
  }
}

/**
 * Patterns for Whisper special tokens and metadata that appear when a recording
 * contains silence, background noise, or non-verbal sounds.
 * Ported from prompt-voice `src/main/stt/cleanTranscription.ts`.
 */
const NON_SPEECH_TAG_PATTERNS = [
  // Whisper timestamps: e.g. [00:00:00.000 --> 00:00:05.000]
  /\[\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\]/g,
  // Bracketed non-speech tokens: e.g. [BLANK_AUDIO], [silence], [music]
  /\[(?:BLANK_AUDIO|_BEG_|silence|music|laughter|applause|cough|throat[- ]clearing|sigh|snort|inaudible|whispering)\]/gi,
  // Parenthesized non-speech tokens: e.g. (silence), (music)
  /\((?:silence|music|laughter|applause|cough|throat[- ]clearing|sigh|snort|inaudible|whispering)\)/gi,
  // Asterisk non-speech tokens: e.g. *silence*, *music*
  /\*(?:silence|music|laughter|applause)\*/gi
];

/** Removes non-speech artifacts and normalizes whitespace. */
export function cleanTranscription(text: string): string {
  if (!text) return '';

  let cleaned = text;
  for (const pattern of NON_SPEECH_TAG_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

/** True when the cleaned text contains at least one letter or digit in any language. */
export function isMeaningfulSpeech(text: string): boolean {
  const cleaned = cleanTranscription(text);
  if (!cleaned) return false;
  return /[\p{L}\p{N}]/u.test(cleaned);
}

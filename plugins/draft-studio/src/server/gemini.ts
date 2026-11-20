/** Gemini API settings shared by the speech-to-text and cleanup providers so they cannot drift. */

export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/** Default Gemini model for both transcription and cleanup. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/** Normal completion. Anything else (MAX_TOKENS, SAFETY, RECITATION, ...) means the output is unusable. */
export const GEMINI_FINISH_OK = 'STOP';

/** `generateContent` endpoint for a model. */
export function geminiGenerateContentUrl(model: string): string {
  return `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;
}

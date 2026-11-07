/**
 * Appends a transcript to the end of the composer draft. Caret position is not available
 * through the composer API, so the transcript always goes at the end, separated by one space.
 */
export function appendTranscript(draft: string, transcript: string): string {
  const addition = transcript.trim();
  if (!addition) return draft;
  if (!draft) return addition;
  if (/\s$/.test(draft)) return `${draft}${addition}`;
  return `${draft} ${addition}`;
}

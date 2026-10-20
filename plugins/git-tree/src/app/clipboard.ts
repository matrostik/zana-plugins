/**
 * Clipboard write with a legacy fallback. `navigator.clipboard.writeText` can
 * reject in the sandboxed Electron renderer ("Write permission denied"), so we
 * fall back to a temporary textarea + `document.execCommand('copy')`.
 */

export function copyViaTextarea(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.setAttribute('readonly', '');
  document.body.appendChild(ta);
  try {
    ta.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the execCommand fallback
  }
  return copyViaTextarea(text);
}

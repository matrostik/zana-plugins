/** Copies text to the clipboard using the async Clipboard API with an execCommand fallback. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Async clipboard failed or permission denied; fall through to execCommand.
    }
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    try {
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      if (document.execCommand('copy')) return true;
    } catch {
      // execCommand failed
    } finally {
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
    }
  }

  return false;
}

export type StudioTabId = 'studio' | 'history';

const SWITCH_TAB_EVENT = 'zcc:prompt-voice:switch-studio-tab';

let pendingTab: StudioTabId | null = null;

/**
 * Requests that the next mounted or already-mounted Prompt Studio instance switch to `tab`.
 * Used by Home and Command Palette shortcuts where host navigation may not accept a subPath.
 */
export function requestPendingStudioTab(tab: StudioTabId): void {
  pendingTab = tab;
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(SWITCH_TAB_EVENT, { detail: { tab } }));
    } catch {
      // Ignore in environments without CustomEvent
    }
  }
}

/** Consumes any pending tab target queued before Prompt Studio mounted. */
export function consumePendingStudioTab(): StudioTabId | null {
  const next = pendingTab;
  pendingTab = null;
  return next;
}

/** Subscribes a mounted Prompt Studio instance to cross-surface tab switch requests. */
export function subscribeStudioTabRequests(listener: (tab: StudioTabId) => void): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => undefined;
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ tab?: StudioTabId }>).detail;
    if (detail?.tab === 'studio' || detail?.tab === 'history') {
      pendingTab = null;
      listener(detail.tab);
    }
  };
  window.addEventListener(SWITCH_TAB_EVENT, handler);
  return () => window.removeEventListener(SWITCH_TAB_EVENT, handler);
}

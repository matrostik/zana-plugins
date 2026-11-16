import { useEffect, useMemo, useRef, useState } from 'react';
import * as ZccAppSdk from '@zana-ai/zcc-plugin-sdk/app';
import {
  setPluginSettings,
  useComposer,
  useComposerView,
  useRealtime,
  useRpc,
  useSettings,
  useZccContext,
  useZccNavigate,
  type ComposerView,
  type PluginComposerApi,
  type PluginSettingsState,
  type ZccContext,
  type ZccNavigate
} from '@zana-ai/zcc-plugin-sdk/app';
import { SETTINGS_CHANGED_EVENT } from '../shared/protocol.ts';
import {
  normalizeVisibilitySettings,
  type PromptVoiceVisibilitySettings
} from '../shared/visibility.ts';

export const PROMPT_VOICE_PLUGIN_ID = 'prompt-voice';

function getDirectCallPluginRpc():
  | ((pluginId: string, method: string, args?: unknown) => Promise<unknown>)
  | undefined {
  try {
    const fn = (
      ZccAppSdk as { callPluginRpc?: (pluginId: string, method: string, args?: unknown) => Promise<unknown> }
    ).callPluginRpc;
    return typeof fn === 'function' ? fn : undefined;
  } catch {
    return undefined;
  }
}

export function useSafeSettings(): PluginSettingsState | null {
  try {
    return typeof useSettings === 'function' ? useSettings() : null;
  } catch {
    return null;
  }
}

export function useSafeComposerView(): ComposerView | null {
  try {
    return typeof useComposerView === 'function' ? useComposerView() : null;
  } catch {
    return null;
  }
}

export function useSafeZccContext(): ZccContext | null {
  try {
    return typeof useZccContext === 'function' ? useZccContext() : null;
  } catch {
    return null;
  }
}

export function useSafeZccNavigate(): ZccNavigate | null {
  try {
    return typeof useZccNavigate === 'function' ? useZccNavigate() : null;
  } catch {
    return null;
  }
}

export function useSafeComposer(): PluginComposerApi | null {
  try {
    return typeof useComposer === 'function' ? useComposer() : null;
  } catch {
    return null;
  }
}

export function useSafeRpc(): { call<T = unknown>(method: string, input?: unknown): Promise<T> } | null {
  try {
    return typeof useRpc === 'function' ? useRpc() : null;
  } catch {
    return null;
  }
}

/**
 * Returns an RPC client targeting `prompt-voice`, falling back to `callPluginRpc('prompt-voice', ...)`
 * when a host slot boundary (such as `homepageSection`) passes a slot id instead of `'prompt-voice'`.
 */
export function usePromptVoiceRpc(slotPluginId?: string): { call<T = unknown>(method: string, input?: unknown): Promise<T> } {
  const slotRpc = useSafeRpc();
  const slotRpcRef = useRef(slotRpc);
  slotRpcRef.current = slotRpc;
  const slotPluginIdRef = useRef(slotPluginId);
  slotPluginIdRef.current = slotPluginId;

  return useMemo(
    () => ({
      async call<T = unknown>(method: string, input?: unknown): Promise<T> {
        const directCall = getDirectCallPluginRpc();
        const hasInput = input !== undefined;

        if (
          slotPluginIdRef.current &&
          slotPluginIdRef.current !== PROMPT_VOICE_PLUGIN_ID &&
          directCall
        ) {
          return (
            hasInput
              ? await directCall(PROMPT_VOICE_PLUGIN_ID, method, input)
              : await directCall(PROMPT_VOICE_PLUGIN_ID, method)
          ) as T;
        }

        const activeSlotRpc = slotRpcRef.current;
        if (activeSlotRpc) {
          try {
            return hasInput
              ? await activeSlotRpc.call<T>(method, input)
              : await activeSlotRpc.call<T>(method);
          } catch (err) {
            if (directCall && err instanceof Error && /unknown rpc/i.test(err.message)) {
              return (
                hasInput
                  ? await directCall(PROMPT_VOICE_PLUGIN_ID, method, input)
                  : await directCall(PROMPT_VOICE_PLUGIN_ID, method)
              ) as T;
            }
            throw err;
          }
        }

        if (directCall) {
          return (
            hasInput
              ? await directCall(PROMPT_VOICE_PLUGIN_ID, method, input)
              : await directCall(PROMPT_VOICE_PLUGIN_ID, method)
          ) as T;
        }

        throw new Error('Prompt Voice RPC is unavailable in this environment.');
      }
    }),
    []
  );
}

export function useSafeRealtime(channel: string, handler: (payload: unknown) => void): void {
  try {
    if (typeof useRealtime === 'function') {
      useRealtime(channel, handler);
    }
  } catch {
    // Ignore when realtime hook is unavailable in tests or older hosts.
  }
}

/**
 * Reads live Prompt Voice visibility settings from host plugin settings,
 * syncing immediately with server realtime updates when settings change.
 */
export function useVisibilitySettings(): PromptVoiceVisibilitySettings {
  const settings = useSafeSettings();
  const hostValues = settings?.values;
  const [realtimeOverride, setRealtimeOverride] = useState<PromptVoiceVisibilitySettings | null>(null);

  useEffect(() => {
    setRealtimeOverride(null);
  }, [hostValues]);

  useSafeRealtime(SETTINGS_CHANGED_EVENT, (payload) => {
    if (payload && typeof payload === 'object') {
      setRealtimeOverride(normalizeVisibilitySettings(payload as Record<string, unknown>));
    }
  });

  return realtimeOverride ?? normalizeVisibilitySettings(hostValues);
}

export async function updatePluginSettings(
  pluginId: string,
  values: Record<string, string | boolean | undefined>
): Promise<void> {
  if (typeof setPluginSettings !== 'function') {
    throw new Error('Plugin settings API is unavailable in this environment.');
  }
  await setPluginSettings(pluginId, values);
}

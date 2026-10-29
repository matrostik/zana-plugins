import type { ReviewPrompt } from '../server/settings.ts';
import { useCallback, useEffect, useState } from 'react';
import { useRealtime } from '@zana-ai/zcc-plugin-sdk/app';
import { errorText } from './format.ts';
import type { ConfigSnapshot, Rpc } from './types.ts';

/** The prompt library plus the user's choice; refetched whenever settings change. */
export function useReviewPrompts(rpc: Rpc) {
  const [prompts, setPrompts] = useState<ReviewPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [promptId, setPromptId] = useState<string | null | undefined>(undefined);
  const load = useCallback(() => {
    void rpc.call('config')
      .then((value) => { setPrompts((value as ConfigSnapshot)?.settings?.prompts ?? []); setError(null); })
      .catch((cause) => setError(`Could not load prompts: ${errorText(cause)}`));
  }, [rpc]);
  useEffect(load, [load]);
  useRealtime('codenod:changed', (payload) => {
    if (payload && typeof payload === 'object' && 'settings' in payload && payload.settings === true) load();
  });
  // Fall back to the default when the chosen prompt was deleted.
  useEffect(() => {
    if (typeof promptId === 'string' && !prompts.some((prompt) => prompt.id === promptId)) setPromptId(undefined);
  }, [prompts, promptId]);
  return { prompts, error, promptId, setPromptId };
}

export function PromptSelector(props: { prompts: ReviewPrompt[]; error?: string | null; value: string | null | undefined; onChange(value: string | null | undefined): void }) {
  return <label>Review prompt <select aria-label="Review prompt" value={props.value === undefined ? '__default' : props.value === null ? '__builtin' : props.value} onChange={(event) => props.onChange(event.target.value === '__default' ? undefined : event.target.value === '__builtin' ? null : event.target.value)}>
    <option value="__default">Default prompt</option>
    <option value="__builtin">Built-in prompt only</option>
    {props.prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.name}</option>)}
  </select>{props.error ? <span className="cn-small cn-badge-danger" role="alert"> {props.error}</span> : null}</label>;
}

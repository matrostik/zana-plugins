// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const events = vi.hoisted(() => ({ handler: (_payload: unknown) => {} }));
vi.mock('@zana-ai/zcc-plugin-sdk/app', () => ({ useRealtime: (_event: string, handler: (payload: unknown) => void) => { events.handler = handler; } }));
import { useReviewPrompts } from '../app/PromptSelector.tsx';

afterEach(cleanup);

it('reloads prompts for settings changes but not review events', async () => {
  const rpc = { call: vi.fn(async () => ({ settings: { prompts: [] } })) };
  renderHook(() => useReviewPrompts(rpc));
  await waitFor(() => expect(rpc.call).toHaveBeenCalledTimes(1));
  act(() => events.handler({ reviewId: 'review' }));
  expect(rpc.call).toHaveBeenCalledTimes(1);
  act(() => events.handler({ settings: true }));
  await waitFor(() => expect(rpc.call).toHaveBeenCalledTimes(2));
});

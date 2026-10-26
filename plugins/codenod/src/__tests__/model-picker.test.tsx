// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { addModelChoice, MAX_REVIEW_MODELS, ProviderModelPicker, removeModelChoice } from '../app/ModelSearchPicker.tsx';
import type { AvailableProvider } from '../app/types.ts';
import type { ModelChoice } from '../server/types.ts';

afterEach(cleanup);

const cursor: AvailableProvider = {
  providerId: 'cursor',
  displayName: 'Cursor',
  error: null,
  models: [
    { id: 'grok-4.6', label: 'grok-4.6', reasoningLevels: ['medium', 'high'] },
    { id: 'gpt-5.6-sol', label: 'gpt-5.6-sol', reasoningLevels: [] },
    { id: 'composer-2', label: 'Composer 2', reasoningLevels: [] }
  ]
};

function Harness({ initial = [] as ModelChoice[], showReasoning = true }) {
  const [value, setValue] = useState<ModelChoice[]>(initial);
  return <ProviderModelPicker provider={cursor} value={value} onChange={setValue} showReasoning={showReasoning} />;
}

describe('model choice helpers', () => {
  it('adds, ignores duplicates, caps at five, and removes', () => {
    let value: ModelChoice[] = [];
    for (let index = 0; index < 6; index++) value = addModelChoice(value, 'cursor', `m${index}`);
    expect(value).toHaveLength(MAX_REVIEW_MODELS);
    expect(addModelChoice(value, 'cursor', 'm0')).toEqual(value);
    expect(removeModelChoice(value, 'cursor', 'm0')).toHaveLength(4);
  });
});

describe('ProviderModelPicker', () => {
  it('filters the catalog and lists only selected models under the field', () => {
    render(<Harness />);
    const search = screen.getByLabelText('Search Cursor models');
    fireEvent.focus(search);
    expect(screen.getByRole('option', { name: /Composer 2/ })).toBeTruthy();
    fireEvent.change(search, { target: { value: 'composer' } });
    expect(screen.queryByRole('option', { name: /grok-4.6/ })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: /Composer 2/ }));
    expect(screen.getByText('Composer 2')).toBeTruthy();
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.queryByText('gpt-5.6-sol')).toBeNull();
  });

  it('sets reasoning and removes a selected model', () => {
    render(<Harness initial={[{ providerId: 'cursor', model: 'grok-4.6' }]} />);
    fireEvent.change(screen.getByLabelText('Reasoning level for grok-4.6'), { target: { value: 'high' } });
    expect((screen.getByLabelText('Reasoning level for grok-4.6') as HTMLSelectElement).value).toBe('high');
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.queryByText('grok-4.6')).toBeNull();
  });
});

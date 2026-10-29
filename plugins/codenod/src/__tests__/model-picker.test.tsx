// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { addModelChoice, MAX_REVIEW_MODELS, ModelPriorityPicker, moveModelChoice } from '../app/ModelSearchPicker.tsx';
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

const claude: AvailableProvider = {
  providerId: 'claude-code',
  displayName: 'Claude Code',
  error: null,
  models: [{ id: 'sonnet', label: 'Sonnet', reasoningLevels: [] }]
};

describe('model choice helpers', () => {
  it('adds, ignores duplicates, caps at five, and removes', () => {
    let value: ModelChoice[] = [];
    for (let index = 0; index < 6; index++) value = addModelChoice(value, 'cursor', `m${index}`);
    expect(value).toHaveLength(MAX_REVIEW_MODELS);
    expect(addModelChoice(value, 'cursor', 'm0')).toEqual(value);
    expect(value).toHaveLength(5);
  });

  it('moves priorities in either direction without mutating the source array', () => {
    const original: ModelChoice[] = [
      { providerId: 'cursor', model: 'first' },
      { providerId: 'claude-code', model: 'second' },
      { providerId: 'codex', model: 'third' }
    ];

    expect(moveModelChoice(original, 0, 1).map((item) => item.model)).toEqual(['second', 'first', 'third']);
    expect(moveModelChoice(original, 2, -1).map((item) => item.model)).toEqual(['first', 'third', 'second']);
    expect(original.map((item) => item.model)).toEqual(['first', 'second', 'third']);
  });

  it('keeps the original array for empty input, invalid indices, and boundary moves', () => {
    const original: ModelChoice[] = [{ providerId: 'cursor', model: 'first' }];
    expect(moveModelChoice([], 0, 1)).toEqual([]);
    expect(moveModelChoice(original, -1, 1)).toBe(original);
    expect(moveModelChoice(original, 1, -1)).toBe(original);
    expect(moveModelChoice(original, 0, -1)).toBe(original);
    expect(moveModelChoice(original, 0, 1)).toBe(original);
  });
});

describe('ModelPriorityPicker', () => {
  it('explains unavailable providers in plain language and tucks the raw error into details', () => {
    const unavailable: AvailableProvider = {
      providerId: 'grok-build',
      displayName: 'Grok Build',
      error: 'spawn grok ENOENT',
      models: []
    };

    render(<ModelPriorityPicker value={[]} providers={[unavailable]} onChange={() => {}} />);

    expect(screen.getByText('Some providers couldn’t be loaded, so their models aren’t available right now.')).toBeTruthy();
    expect(screen.getByText('Grok Build')).toBeTruthy();
    expect(screen.getByText(/its command-line tool couldn’t be found\. Check that it’s installed and available to Zana\./)).toBeTruthy();
    expect(screen.getByText('Technical details')).toBeTruthy();
    expect(screen.getByText('spawn grok ENOENT')).toBeTruthy();
  });

  it('commits the first available model as soon as a row provider changes', () => {
    function Harness() {
      const [value, setValue] = useState<ModelChoice[]>([{ providerId: 'cursor', model: 'grok-4.6' }]);
      return <>
        <ModelPriorityPicker value={value} providers={[cursor, claude]} onChange={setValue} />
        <output>{JSON.stringify(value)}</output>
      </>;
    }

    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Provider for priority 1'), { target: { value: 'claude-code' } });

    expect((screen.getByLabelText('Model for priority 1') as HTMLSelectElement).value).toBe('sonnet');
    expect(screen.getByText('[{"providerId":"claude-code","model":"sonnet"}]')).toBeTruthy();
  });

  it('reorders selected models with the priority controls', () => {
    function Harness() {
      const [value, setValue] = useState<ModelChoice[]>([
        { providerId: 'cursor', model: 'grok-4.6' },
        { providerId: 'claude-code', model: 'sonnet' }
      ]);
      return <>
        <ModelPriorityPicker value={value} providers={[cursor, claude]} onChange={setValue} />
        <output>{value.map((choice) => choice.model).join(',')}</output>
      </>;
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Move priority 1 down' }));

    expect(screen.getByText('sonnet,grok-4.6')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Move priority 1 up' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Move priority 2 down' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ModelChoice } from '../server/types.ts';
import type { AvailableProvider } from './types.ts';

export const MAX_REVIEW_MODELS = 5;

export function modelKey(providerId: string, model: string): string {
  return `${providerId}\u0000${model}`;
}

export function addModelChoice(current: ModelChoice[], providerId: string, model: string): ModelChoice[] {
  if (current.some((item) => item.providerId === providerId && item.model === model)) return current;
  if (current.length >= MAX_REVIEW_MODELS) return current;
  return [...current, { providerId, model }];
}

export function removeModelChoice(current: ModelChoice[], providerId: string, model: string): ModelChoice[] {
  return current.filter((item) => !(item.providerId === providerId && item.model === model));
}

export function setModelReasoning(current: ModelChoice[], providerId: string, model: string, reasoningLevel: string): ModelChoice[] {
  return current.map((item) =>
    item.providerId === providerId && item.model === model ? { ...item, ...(reasoningLevel ? { reasoningLevel } : { reasoningLevel: undefined }) } : item
  );
}

function matchesQuery(label: string, id: string, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  return label.toLowerCase().includes(needle) || id.toLowerCase().includes(needle);
}

export function ProviderModelPicker(props: { provider: AvailableProvider; value: ModelChoice[]; onChange(next: ModelChoice[]): void; showReasoning?: boolean }) {
  const { provider, value, onChange, showReasoning } = props;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const selectedHere = value.filter((item) => item.providerId === provider.providerId);
  const catalogById = useMemo(() => new Map(provider.models.map((model) => [model.id, model])), [provider.models]);
  const atCap = value.length >= MAX_REVIEW_MODELS;
  const options = useMemo(() => {
    if (atCap) return [];
    const selectedIds = new Set(selectedHere.map((item) => item.model));
    return provider.models.filter((model) => !selectedIds.has(model.id) && matchesQuery(model.label, model.id, query.trim()));
  }, [atCap, provider.models, query, selectedHere]);

  useEffect(() => setHighlight(0), [query, open, provider.providerId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const add = (modelId: string) => {
    onChange(addModelChoice(value, provider.providerId, modelId));
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => (options.length === 0 ? 0 : Math.min(current + 1, options.length - 1)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Enter' && open && options[highlight]) {
      event.preventDefault();
      add(options[highlight].id);
      return;
    }
    if (event.key === 'Escape') setOpen(false);
  };

  const emptyCatalog = provider.models.length === 0 && selectedHere.length === 0;

  return (
    <fieldset className="cn-section">
      <legend>{provider.displayName}</legend>
      {emptyCatalog ? <p className="cn-muted cn-small">{provider.error ?? 'No models reported'}</p> : null}
      {provider.models.length > 0 ? (
        <div className="cn-combobox" ref={rootRef}>
          <input
            className="cn-input"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label={`Search ${provider.displayName} models`}
            placeholder={`Search ${provider.displayName} models…`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          {open ? (
            <ul id={listId} className="cn-combobox-list" role="listbox">
              {atCap ? (
                <li className="cn-combobox-empty">You already picked {MAX_REVIEW_MODELS} models.</li>
              ) : options.length === 0 ? (
                <li className="cn-combobox-empty">{query.trim() ? 'No matching models' : selectedHere.length === provider.models.length ? 'All models from this provider are selected' : 'No models'}</li>
              ) : (
                options.map((model, index) => (
                  <li key={model.id} role="presentation">
                    <button
                      type="button"
                      className="cn-combobox-option"
                      role="option"
                      aria-selected={index === highlight}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => add(model.id)}
                    >
                      <span>{model.label}</span>
                      {model.label !== model.id ? <span className="cn-muted cn-small">{model.id}</span> : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      ) : null}
      {selectedHere.length > 0 ? (
        <ul className="cn-selected-models">
          {selectedHere.map((item) => {
            const catalog = catalogById.get(item.model);
            const label = catalog?.label ?? item.model;
            const reasoningLevels = catalog?.reasoningLevels ?? [];
            return (
              <li key={modelKey(item.providerId, item.model)} className="cn-selected-model">
                <span>{label}</span>
                {showReasoning && reasoningLevels.length > 0 ? (
                  <select
                    className="cn-select cn-small"
                    aria-label={`Reasoning level for ${label}`}
                    value={item.reasoningLevel ?? ''}
                    onChange={(event) => onChange(setModelReasoning(value, item.providerId, item.model, event.target.value))}
                  >
                    <option value="">Default reasoning</option>
                    {reasoningLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button type="button" className="cn-btn cn-small" onClick={() => onChange(removeModelChoice(value, item.providerId, item.model))}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </fieldset>
  );
}

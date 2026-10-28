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

export function moveModelChoice(current: ModelChoice[], index: number, offset: -1 | 1): ModelChoice[] {
  const target = index + offset;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
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
            <ModelOptionList
              id={listId}
              atCap={atCap}
              options={options}
              highlight={highlight}
              query={query}
              allSelected={selectedHere.length === provider.models.length}
              onHighlight={setHighlight}
              onSelect={add}
            />
          ) : null}
        </div>
      ) : null}
      {selectedHere.length > 0 ? (
        <ul className="cn-selected-models">
          {selectedHere.map((item) => (
            <SelectedModelItem
              key={modelKey(item.providerId, item.model)}
              item={item}
              label={catalogById.get(item.model)?.label ?? item.model}
              reasoningLevels={catalogById.get(item.model)?.reasoningLevels ?? []}
              showReasoning={showReasoning}
              onChange={(next) => onChange(next(value))}
            />
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}

export function ModelPriorityPicker(props: {
  value: ModelChoice[];
  providers: AvailableProvider[];
  onChange(next: ModelChoice[]): void;
}) {
  const { value, providers, onChange } = props;
  const providerById = useMemo(() => new Map(providers.map((provider) => [provider.providerId, provider])), [providers]);
  const selectableProviders = providers.filter((provider) => provider.models.length > 0);
  const [addingModel, setAddingModel] = useState(value.length === 0);
  const [addingProviderId, setAddingProviderId] = useState('');
  const unusedModels = (provider: AvailableProvider, exceptIndex = -1) => provider.models.filter((model) =>
    !value.some((choice, index) => index !== exceptIndex && choice.providerId === provider.providerId && choice.model === model.id)
  );
  const canAddModel = value.length < MAX_REVIEW_MODELS && selectableProviders.some((provider) => unusedModels(provider).length > 0);
  const addingProvider = providerById.get(addingProviderId);
  const addingModelOptions = addingProvider ? unusedModels(addingProvider) : [];

  return (
    <section className="cn-model-priority" aria-labelledby="cn-model-priority-heading">
      <h4 id="cn-model-priority-heading">Review model priority</h4>
      <p className="cn-muted cn-small">Models run together for consensus. Priority 1 is tried first for coordinator and Deep Review threads.</p>
      {providers.some((provider) => provider.models.length === 0 && provider.error) ? (
        <p className="cn-muted cn-small">
          Providers without available models are omitted: {providers.filter((provider) => provider.models.length === 0 && provider.error)
            .map((provider) => `${provider.displayName} (${provider.error})`).join('; ')}
        </p>
      ) : null}
      {value.length > 0 ? (
        <ol className="cn-priority-list">
          {value.map((item, index) => {
            const key = modelKey(item.providerId, item.model);
            const providerId = item.providerId;
            const provider = providerById.get(providerId);
            const originalProvider = providerById.get(item.providerId);
            const catalog = originalProvider?.models.find((model) => model.id === item.model);
            const modelOptions = provider ? unusedModels(provider, index) : [];
            const providerOptions = selectableProviders.filter((candidate) => unusedModels(candidate, index).length > 0);
            return (
              <li className="cn-priority-row" key={key}>
                <span className="cn-priority-rank">{index + 1}</span>
                <label className="cn-field">
                  <span className="cn-muted cn-small">Provider</span>
                  <select
                    className="cn-select"
                    aria-label={`Provider for priority ${index + 1}`}
                    value={providerId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      const nextProvider = providerById.get(nextId);
                      const nextModel = nextProvider && unusedModels(nextProvider, index)[0];
                      if (!nextProvider || !nextModel) return;
                      onChange(value.map((choice, choiceIndex) => choiceIndex === index
                        ? { providerId: nextProvider.providerId, model: nextModel.id }
                        : choice));
                    }}
                  >
                    {providerOptions.map((option) => <option key={option.providerId} value={option.providerId}>{option.displayName}</option>)}
                    {!providerOptions.some((option) => option.providerId === providerId) ? (
                      <option value={providerId} disabled>{provider?.displayName ?? providerId} (unavailable)</option>
                    ) : null}
                  </select>
                </label>
                <label className="cn-field">
                  <span className="cn-muted cn-small">Model</span>
                  <select
                    className="cn-select"
                    aria-label={`Model for priority ${index + 1}`}
                    value={item.model}
                    disabled={!provider || modelOptions.length === 0}
                    onChange={(event) => {
                      const modelId = event.target.value;
                      const nextModel = provider?.models.find((model) => model.id === modelId);
                      if (!provider || !nextModel) return;
                      onChange(value.map((choice, choiceIndex) => choiceIndex === index
                        ? { providerId: provider.providerId, model: nextModel.id, ...(choice.providerId === provider.providerId && choice.model === nextModel.id && choice.reasoningLevel ? { reasoningLevel: choice.reasoningLevel } : {}) }
                        : choice));
                    }}
                  >
                    {!provider?.models.some((model) => model.id === item.model)
                      ? <option value={item.model} disabled>{item.model} (unavailable)</option>
                      : null}
                    {modelOptions.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
                  </select>
                  {provider && provider.models.length === 0 && provider.error ? <span className="cn-muted cn-small">{provider.error}</span> : null}
                </label>
                {catalog?.reasoningLevels.length ? (
                  <label className="cn-field">
                    <span className="cn-muted cn-small">Reasoning</span>
                    <select
                      className="cn-select cn-small"
                      aria-label={`Reasoning level for ${catalog.label}`}
                      value={item.reasoningLevel ?? ''}
                      onChange={(event) => onChange(value.map((choice, choiceIndex) => choiceIndex === index
                        ? { ...choice, ...(event.target.value ? { reasoningLevel: event.target.value } : { reasoningLevel: undefined }) }
                        : choice))}
                    >
                      <option value="">Default</option>
                      {catalog.reasoningLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </label>
                ) : null}
                <span className="cn-priority-controls">
                  <button type="button" className="cn-btn cn-small" aria-label={`Move priority ${index + 1} up`} disabled={index === 0} onClick={() => onChange(moveModelChoice(value, index, -1))}>Move up</button>
                  <button type="button" className="cn-btn cn-small" aria-label={`Move priority ${index + 1} down`} disabled={index === value.length - 1} onClick={() => onChange(moveModelChoice(value, index, 1))}>Move down</button>
                  <button type="button" className="cn-btn cn-small" aria-label={`Remove priority ${index + 1}`} onClick={() => {
                    onChange(value.filter((_, choiceIndex) => choiceIndex !== index));
                  }}>Remove</button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {addingModel ? (
        <div className="cn-priority-row cn-priority-add-row">
          <span className="cn-priority-rank">{value.length + 1}</span>
          <label className="cn-field">
            <span className="cn-muted cn-small">Provider</span>
            <select className="cn-select" aria-label={`Provider for priority ${value.length + 1}`} value={addingProviderId} onChange={(event) => setAddingProviderId(event.target.value)}>
              <option value="">Choose a provider…</option>
              {selectableProviders.filter((provider) => unusedModels(provider).length > 0).map((provider) => <option key={provider.providerId} value={provider.providerId}>{provider.displayName}</option>)}
            </select>
          </label>
          <label className="cn-field">
            <span className="cn-muted cn-small">Model</span>
            <select
              className="cn-select"
              aria-label={`Model for priority ${value.length + 1}`}
              value=""
              disabled={!addingProviderId}
              onChange={(event) => {
                const model = addingProvider?.models.find((candidate) => candidate.id === event.target.value);
                if (!addingProvider || !model) return;
                onChange(addModelChoice(value, addingProvider.providerId, model.id));
                setAddingProviderId('');
                setAddingModel(false);
              }}
            >
              <option value="">Choose a model…</option>
              {addingModelOptions.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select>
          </label>
          {value.length > 0 ? <button type="button" className="cn-btn cn-small" onClick={() => { setAddingModel(false); setAddingProviderId(''); }}>Cancel</button> : null}
        </div>
      ) : canAddModel ? (
        <button type="button" className="cn-btn cn-small" onClick={() => setAddingModel(true)}>Add model</button>
      ) : null}
      {!selectableProviders.length ? <p className="cn-muted cn-small">No providers currently have available models.</p> : null}
    </section>
  );
}

function ModelOptionList(props: {
  id: string;
  atCap: boolean;
  options: AvailableProvider['models'];
  highlight: number;
  query: string;
  allSelected: boolean;
  onHighlight(index: number): void;
  onSelect(modelId: string): void;
}) {
  const { id, atCap, options, highlight, query, allSelected, onHighlight, onSelect } = props;
  let emptyText = 'No models';
  if (query.trim()) emptyText = 'No matching models';
  else if (allSelected) emptyText = 'All models from this provider are selected';
  return (
    <ul id={id} className="cn-combobox-list" role="listbox">
      {atCap ? (
        <li className="cn-combobox-empty">You already picked {MAX_REVIEW_MODELS} models.</li>
      ) : options.length === 0 ? (
        <li className="cn-combobox-empty">{emptyText}</li>
      ) : (
        options.map((model, index) => (
          <li key={model.id} role="presentation">
            <button
              type="button"
              className="cn-combobox-option"
              role="option"
              aria-selected={index === highlight}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onHighlight(index)}
              onClick={() => onSelect(model.id)}
            >
              <span>{model.label}</span>
              {model.label !== model.id ? <span className="cn-muted cn-small">{model.id}</span> : null}
            </button>
          </li>
        ))
      )}
    </ul>
  );
}

function SelectedModelItem(props: {
  item: ModelChoice;
  label: string;
  reasoningLevels: string[];
  showReasoning?: boolean;
  onChange(update: (current: ModelChoice[]) => ModelChoice[]): void;
}) {
  const { item, label, reasoningLevels, showReasoning, onChange } = props;
  return (
    <li className="cn-selected-model">
      <span className="cn-selected-model-name">{label}</span>
      {showReasoning && reasoningLevels.length > 0 ? (
        <select
          className="cn-select cn-small"
          aria-label={`Reasoning level for ${label}`}
          value={item.reasoningLevel ?? ''}
          onChange={(event) => onChange((current) => setModelReasoning(current, item.providerId, item.model, event.target.value))}
        >
          <option value="">Default reasoning</option>
          {reasoningLevels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      ) : null}
      <button type="button" className="cn-btn cn-small" onClick={() => onChange((current) => removeModelChoice(current, item.providerId, item.model))}>
        Remove
      </button>
    </li>
  );
}


import { useMemo, useState } from 'react';
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

export function moveModelChoice(current: ModelChoice[], index: number, offset: -1 | 1): ModelChoice[] {
  const target = index + offset;
  if (index < 0 || index >= current.length || target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
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
  const unusedModels = (provider: AvailableProvider, exceptIndex = -1) => provider.models.filter((model) =>
    !value.some((choice, index) => index !== exceptIndex && choice.providerId === provider.providerId && choice.model === model.id)
  );
  const canAddModel = value.length < MAX_REVIEW_MODELS && selectableProviders.some((provider) => unusedModels(provider).length > 0);
  const addableProviders = selectableProviders.filter((provider) => unusedModels(provider).length > 0);

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
          {value.map((item, index) => (
            <PriorityRow
              key={modelKey(item.providerId, item.model)}
              item={item}
              index={index}
              value={value}
              provider={providerById.get(item.providerId)}
              providerOptions={selectableProviders.filter((candidate) => unusedModels(candidate, index).length > 0)}
              modelOptions={providerById.get(item.providerId) ? unusedModels(providerById.get(item.providerId)!, index) : []}
              onChange={onChange}
            />
          ))}
        </ol>
      ) : null}
      {addingModel ? (
        <AddPriorityRow
          priority={value.length + 1}
          value={value}
          providers={addableProviders}
          providerById={providerById}
          unusedModels={unusedModels}
          onChange={(next) => { onChange(next); setAddingModel(false); }}
          onCancel={value.length > 0 ? () => setAddingModel(false) : undefined}
        />
      ) : canAddModel ? (
        <button type="button" className="cn-btn cn-small" onClick={() => setAddingModel(true)}>Add model</button>
      ) : null}
      {!selectableProviders.length ? <p className="cn-muted cn-small">No providers currently have available models.</p> : null}
    </section>
  );
}

function PriorityRow(props: {
  item: ModelChoice;
  index: number;
  value: ModelChoice[];
  provider?: AvailableProvider;
  providerOptions: AvailableProvider[];
  modelOptions: AvailableProvider['models'];
  onChange(next: ModelChoice[]): void;
}) {
  const { item, index, value, provider, providerOptions, modelOptions, onChange } = props;
  const catalog = provider?.models.find((model) => model.id === item.model);
  const changeProvider = (providerId: string) => {
    const nextProvider = providerOptions.find((candidate) => candidate.providerId === providerId);
    const nextModel = nextProvider?.models.find((model) => !value.some((choice, choiceIndex) =>
      choiceIndex !== index && choice.providerId === nextProvider.providerId && choice.model === model.id
    ));
    if (!nextProvider || !nextModel) return;
    onChange(value.map((choice, choiceIndex) => choiceIndex === index ? { providerId, model: nextModel.id } : choice));
  };
  const changeModel = (modelId: string) => {
    const nextModel = provider?.models.find((model) => model.id === modelId);
    if (!provider || !nextModel) return;
    onChange(value.map((choice, choiceIndex) => choiceIndex === index
      ? { providerId: provider.providerId, model: nextModel.id, ...(choice.model === nextModel.id && choice.reasoningLevel ? { reasoningLevel: choice.reasoningLevel } : {}) }
      : choice));
  };
  const changeReasoning = (reasoningLevel: string) => onChange(value.map((choice, choiceIndex) => choiceIndex === index
    ? { ...choice, ...(reasoningLevel ? { reasoningLevel } : { reasoningLevel: undefined }) }
    : choice));

  return (
    <li className="cn-priority-row">
      <span className="cn-priority-rank">{index + 1}</span>
      <label className="cn-field">
        <span className="cn-muted cn-small">Provider</span>
        <select className="cn-select" aria-label={`Provider for priority ${index + 1}`} value={item.providerId} onChange={(event) => changeProvider(event.target.value)}>
          {providerOptions.map((option) => <option key={option.providerId} value={option.providerId}>{option.displayName}</option>)}
          {!providerOptions.some((option) => option.providerId === item.providerId) ? (
            <option value={item.providerId} disabled>{provider?.displayName ?? item.providerId} (unavailable)</option>
          ) : null}
        </select>
      </label>
      <label className="cn-field">
        <span className="cn-muted cn-small">Model</span>
        <select className="cn-select" aria-label={`Model for priority ${index + 1}`} value={item.model} disabled={!provider || modelOptions.length === 0} onChange={(event) => changeModel(event.target.value)}>
          {!provider?.models.some((model) => model.id === item.model) ? <option value={item.model} disabled>{item.model} (unavailable)</option> : null}
          {modelOptions.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
        </select>
      </label>
      {catalog?.reasoningLevels.length ? (
        <label className="cn-field">
          <span className="cn-muted cn-small">Reasoning</span>
          <select className="cn-select cn-small" aria-label={`Reasoning level for ${catalog.label}`} value={item.reasoningLevel ?? ''} onChange={(event) => changeReasoning(event.target.value)}>
            <option value="">Default</option>
            {catalog.reasoningLevels.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
      ) : null}
      <span className="cn-priority-controls">
        <button type="button" className="cn-btn cn-small" aria-label={`Move priority ${index + 1} up`} disabled={index === 0} onClick={() => onChange(moveModelChoice(value, index, -1))}>Move up</button>
        <button type="button" className="cn-btn cn-small" aria-label={`Move priority ${index + 1} down`} disabled={index === value.length - 1} onClick={() => onChange(moveModelChoice(value, index, 1))}>Move down</button>
        <button type="button" className="cn-btn cn-small" aria-label={`Remove priority ${index + 1}`} onClick={() => onChange(value.filter((_, choiceIndex) => choiceIndex !== index))}>Remove</button>
      </span>
    </li>
  );
}

function AddPriorityRow(props: {
  priority: number;
  value: ModelChoice[];
  providers: AvailableProvider[];
  providerById: Map<string, AvailableProvider>;
  unusedModels(provider: AvailableProvider): AvailableProvider['models'];
  onChange(next: ModelChoice[]): void;
  onCancel?: () => void;
}) {
  const { priority, value, providers, providerById, unusedModels, onChange, onCancel } = props;
  const [providerId, setProviderId] = useState('');
  const provider = providerById.get(providerId);
  const modelOptions = provider ? unusedModels(provider) : [];
  const selectModel = (modelId: string) => {
    const model = provider?.models.find((candidate) => candidate.id === modelId);
    if (provider && model) onChange(addModelChoice(value, provider.providerId, model.id));
  };

  return (
    <div className="cn-priority-row cn-priority-add-row">
      <span className="cn-priority-rank">{priority}</span>
      <label className="cn-field">
        <span className="cn-muted cn-small">Provider</span>
        <select className="cn-select" aria-label={`Provider for priority ${priority}`} value={providerId} onChange={(event) => setProviderId(event.target.value)}>
          <option value="">Choose a provider…</option>
          {providers.map((candidate) => <option key={candidate.providerId} value={candidate.providerId}>{candidate.displayName}</option>)}
        </select>
      </label>
      <label className="cn-field">
        <span className="cn-muted cn-small">Model</span>
        <select className="cn-select" aria-label={`Model for priority ${priority}`} value="" disabled={!provider} onChange={(event) => selectModel(event.target.value)}>
          <option value="">Choose a model…</option>
          {modelOptions.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
        </select>
      </label>
      {onCancel ? <button type="button" className="cn-btn cn-small" onClick={onCancel}>Cancel</button> : null}
    </div>
  );
}

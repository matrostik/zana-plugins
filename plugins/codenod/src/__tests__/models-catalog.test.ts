import { describe, expect, it } from 'vitest';
import { mergeCatalogModels } from '../server/models-catalog.ts';

describe('mergeCatalogModels', () => {
  it('unions models and selectedOnlyModels by id', () => {
    const merged = mergeCatalogModels({
      models: [{ id: 'grok-4.6', model: 'grok-4.6', supportedReasoningEfforts: [] }],
      selectedOnlyModels: [
        { id: 'grok-4.6', model: 'grok-4.6', supportedReasoningEfforts: [{ reasoningEffort: 'high' }] },
        { id: 'composer-2', model: 'Composer 2', supportedReasoningEfforts: [] }
      ]
    });
    expect(merged.map((model) => model.id)).toEqual(['grok-4.6', 'composer-2']);
    expect(merged[0]).toMatchObject({ label: 'grok-4.6', reasoningLevels: ['high'] });
    expect(merged[1]).toMatchObject({ label: 'Composer 2', reasoningLevels: [] });
  });

  it('skips empty ids and missing arrays', () => {
    expect(mergeCatalogModels({})).toEqual([]);
    expect(mergeCatalogModels({ models: [{ id: '', model: 'x', supportedReasoningEfforts: [] }] })).toEqual([]);
  });
});

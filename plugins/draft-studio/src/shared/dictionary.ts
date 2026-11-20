export const DICTIONARY_MAX_TERMS = 200;
export const DICTIONARY_MAX_TERM_LENGTH = 80;

/** Splits on commas and newlines, trims, drops empties and duplicates, and enforces the size limits. */
export function parseDictionary(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const seen = new Set<string>();
  const delimiters = /[,\n]/;
  for (const raw of value.split(delimiters)) {
    const term = raw.trim().slice(0, DICTIONARY_MAX_TERM_LENGTH);
    if (term) seen.add(term);
    if (seen.size >= DICTIONARY_MAX_TERMS) break;
  }
  return [...seen];
}

/** Merges new raw input (comma- or newline-separated) into an existing term list, preserving order and limits. */
export function addDictionaryTerms(existing: readonly string[], rawInput: string): string[] {
  const incoming = parseDictionary(rawInput);
  if (incoming.length === 0) return [...existing];
  const seen = new Set(existing);
  const next = [...existing];
  for (const term of incoming) {
    if (next.length >= DICTIONARY_MAX_TERMS) break;
    if (!seen.has(term)) {
      seen.add(term);
      next.push(term);
    }
  }
  return next;
}

/** Serializes dictionary terms back into the newline-delimited setting string. */
export function formatDictionary(terms: readonly string[]): string {
  return terms.join('\n');
}

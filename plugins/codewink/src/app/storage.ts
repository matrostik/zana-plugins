/** Project tabs remember preferences separately from the global panel. */
export function storageKey(base: string, projectId?: string): string {
  return projectId ? `${base}:${projectId}` : base;
}

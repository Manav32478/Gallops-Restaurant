/** Builds the deterministic placeholder image URL for a dish. */
export function apiPlaceholder(name: string, category?: string) {
  const params = new URLSearchParams({ name });
  if (category) params.set('category', category);
  return `/api/placeholder?${params.toString()}`;
}

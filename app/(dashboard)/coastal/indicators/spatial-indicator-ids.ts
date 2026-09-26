/**
 * Comma-separated `indicator` param for `/spatial/series` and `/spatial/slice`.
 * The backend returns only the requested ids, so the request must cover every
 * id the map reads: the active choropleth indicator, the tooltip rows and the
 * vessel overlay (`vessels`), all of which live in `selectedIndicators`.
 * Sorted and de-duplicated so the string is stable, and it doubles as the
 * indicator segment of the slice cache key (one key per id set).
 */
export function buildSpatialIndicatorParam(
  active: string,
  selected: readonly string[],
  isKnown: (id: string) => boolean = () => true
): string {
  const ids = new Set<string>([active]);
  for (const id of selected) if (id && isKnown(id)) ids.add(id);
  return [...ids].sort().join(',');
}

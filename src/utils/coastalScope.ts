/**
 * Coastal scope tokens. A selection is a comma-separated list of AOI ids and
 * province tokens (`prov:<name>`). The backend resolves a province token to the
 * hexes inside that province, so an AOI that spans provinces is not split here.
 */
export const PROVINCE_SCOPE_PREFIX = 'prov:';

export function provinceScopeToken(name: string): string {
  return `${PROVINCE_SCOPE_PREFIX}${name}`;
}

export function parseScope(ids: string[]): { aois: Set<string>; provinces: Set<string> } {
  const aois = new Set<string>();
  const provinces = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (id.startsWith(PROVINCE_SCOPE_PREFIX)) {
      const name = id.slice(PROVINCE_SCOPE_PREFIX.length).trim();
      if (name) provinces.add(name);
    } else if (id) {
      aois.add(id);
    }
  }
  return { aois, provinces };
}

const nearbyProvinceRequests = new Map<string, Promise<string[]>>();

// Keep this slug format in sync with scripts/generate-coastal-nearby.mjs.
function provinceSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function fetchNearbyProvinceSuggestions(
  countryIso: string,
  provinceName: string
): Promise<string[]> {
  const country = countryIso.trim().toUpperCase();
  const slug = provinceSlug(provinceName);
  if (!/^[A-Z]{3}$/.test(country) || !slug) {
    return Promise.reject(new Error('Invalid Coastal province lookup key'));
  }

  const assetPath = `/data/coastal/nearby-provinces/${country}/${slug}.json`;
  const cachedRequest = nearbyProvinceRequests.get(assetPath);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = fetch(assetPath)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Could not load nearby provinces for ${provinceName}`);
      }

      const payload: unknown = await response.json();
      if (
        !Array.isArray(payload) ||
        payload.length > 3 ||
        payload.some((name) => typeof name !== 'string' || name.trim().length === 0)
      ) {
        throw new Error(`Invalid nearby province lookup for ${provinceName}`);
      }

      return payload as string[];
    })
    .catch((error: unknown) => {
      nearbyProvinceRequests.delete(assetPath);
      throw error;
    });

  nearbyProvinceRequests.set(assetPath, request);
  return request;
}

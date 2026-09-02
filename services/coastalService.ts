/**
 * DataBlox Coastal Waters API Service.
 * Provides typed async client methods for all coastal analytics endpoints.
 */

import {
  CoastalCountry,
  CoastalLocation,
  CoastalProvince,
  IndicatorTimelineResponse,
  GeoJSONFeatureCollection,
  SpatialSliceResponse,
  VesselTimelineResponse,
  VesselDistributionResponse,
  CoastalTimelineParams,
  SpatialSliceParams,
  VesselTimelineParams,
  VesselDistributionParams,
} from "../types/coastal";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://api.sapalo.dev";

// In-memory cache for static GeoJSON polygons to eliminate repeated network fetches
const _gridCache = new Map<string, GeoJSONFeatureCollection>();

/**
 * Helper to resolve the client access token from the active session.
 */
async function resolveAuthToken(explicitToken?: string): Promise<string | null> {
  if (explicitToken) return explicitToken;
  try {
    const { getClientAccessToken } = await import("@/app/lib/auth-utils");
    return await getClientAccessToken();
  } catch {
    return null;
  }
}

/**
 * Generic fetch wrapper for Coastal Waters API endpoints.
 */
async function fetchCoastalApi<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
  engine?: "duckdb" | "postgres",
  token?: string
): Promise<T> {
  const url = new URL(`${API_BASE_URL}/api/v1/coastal${endpoint}`);

  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      url.searchParams.append(key, String(val));
    }
  });

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  const authToken = await resolveAuthToken(token);
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  if (engine) {
    headers["X-Data-Engine"] = engine;
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // Use statusText fallback
    }
    throw new Error(
      `Coastal API Error (${response.status} ${response.statusText}): ${errorDetail}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * 1. Fetch metadata for all supported coastal countries (THA, IDN, PHL, BGD).
 */
export async function fetchCoastalCountries(
  engine?: "duckdb" | "postgres"
): Promise<CoastalCountry[]> {
  return fetchCoastalApi<CoastalCountry[]>("/countries", {}, engine);
}

/**
 * 2. Fetch all seaport locations and AOIs for a specific country.
 */
export async function fetchCoastalLocations(
  country: string,
  engine?: "duckdb" | "postgres"
): Promise<CoastalLocation[]> {
  return fetchCoastalApi<CoastalLocation[]>("/locations", { country }, engine);
}

/**
 * Fetch coastal provinces and constituent seaport AOIs for a country.
 */
export async function fetchCoastalProvinces(
  country: string,
  engine?: "duckdb" | "postgres"
): Promise<CoastalProvince[]> {
  return fetchCoastalApi<CoastalProvince[]>("/provinces", { country }, engine);
}


/**
 * 3. Fetch multi-indicator timeline data, summary cards, and percentage deltas.
 */
export async function fetchIndicatorTimeline(
  params: CoastalTimelineParams
): Promise<IndicatorTimelineResponse> {
  const indicatorsParam = Array.isArray(params.indicators)
    ? params.indicators.join(",")
    : params.indicators;

  return fetchCoastalApi<IndicatorTimelineResponse>(
    "/indicators/timeline",
    {
      country: params.country,
      aoi_id: params.aoi_id,
      start_date: params.start_date,
      end_date: params.end_date,
      grain: params.grain || "monthly",
      indicators: indicatorsParam,
      agg_func: params.agg_func || "average",
    },
    params.engine
  );
}

/**
 * 4. Fetch static H3 Resolution 7 GeoJSON polygons for a country.
 * Utilizes client-side in-memory caching to guarantee zero network latency on subsequent calls.
 */
export async function fetchSpatialGrid(
  country: string,
  bypassCache = false,
  engine?: "duckdb" | "postgres"
): Promise<GeoJSONFeatureCollection> {
  const countryKey = country.toUpperCase().trim();

  if (!bypassCache && _gridCache.has(countryKey)) {
    return _gridCache.get(countryKey)!;
  }

  const gridData = await fetchCoastalApi<GeoJSONFeatureCollection>(
    "/indicators/spatial/grid",
    { country: countryKey },
    engine
  );

  _gridCache.set(countryKey, gridData);
  return gridData;
}

/**
 * 5. Fetch lightweight key-value metric mapping for instant 60 FPS slider scrubbing.
 */
export async function fetchSpatialSlice(
  params: SpatialSliceParams
): Promise<SpatialSliceResponse> {
  return fetchCoastalApi<SpatialSliceResponse>(
    "/indicators/spatial/slice",
    {
      country: params.country,
      period_start: params.period_start,
      period_end: params.period_end,
      grain: params.grain || "monthly",
      indicator: params.indicator || "chlor_a",
    },
    params.engine
  );
}

/**
 * 6. Fetch vessel activity timeline metrics.
 */
export async function fetchVesselTimeline(
  params: VesselTimelineParams
): Promise<VesselTimelineResponse> {
  return fetchCoastalApi<VesselTimelineResponse>(
    "/vessels/timeline",
    {
      country: params.country,
      aoi_id: params.aoi_id,
      start_date: params.start_date,
      end_date: params.end_date,
      grain: params.grain || "monthly",
      metric: params.metric || "vessel_count",
    },
    params.engine
  );
}

/**
 * 7. Fetch maritime fleet distribution and drill-down classifications.
 */
export async function fetchVesselDistribution(
  params: VesselDistributionParams
): Promise<VesselDistributionResponse> {
  return fetchCoastalApi<VesselDistributionResponse>(
    "/vessels/distribution",
    {
      country: params.country,
      start_date: params.start_date,
      end_date: params.end_date,
    },
    params.engine
  );
}

/**
 * Clear cached GeoJSON grids from memory if needed.
 */
export function clearSpatialGridCache(): void {
  _gridCache.clear();
}

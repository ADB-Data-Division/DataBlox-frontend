/**
 * DataBlox Coastal Waters API Service.
 * Provides typed async client methods for all coastal analytics endpoints.
 */

import {
  CoastalCountry,
  CoastalLocation,
  CoastalProvince,
  IndicatorTimelineResponse,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  HexCellTimeSeriesResponse,
  SpatialSliceResponse,
  SpatialSeriesResponse,
  VesselTimelineResponse,
  VesselDistributionResponse,
  CoastalTimelineParams,
  SpatialSliceParams,
  SpatialSeriesParams,
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
 * Supports filtering by AOI identifier or list of AOI identifiers.
 * Utilizes client-side in-memory caching for low latency on repeated calls.
 * If the live API call fails, falls back to local static JSON grid files.
 */
export async function fetchSpatialGrid(
  country: string,
  aoi_ids?: string | string[] | boolean,
  bypassCache = false,
  engine?: "duckdb" | "postgres"
): Promise<GeoJSONFeatureCollection> {
  let targetAoiIds: string[] | undefined = undefined;
  let shouldBypassCache = bypassCache;

  if (typeof aoi_ids === "boolean") {
    shouldBypassCache = aoi_ids;
  } else if (typeof aoi_ids === "string") {
    targetAoiIds = aoi_ids ? [aoi_ids] : undefined;
  } else if (Array.isArray(aoi_ids)) {
    targetAoiIds = aoi_ids.length > 0 ? aoi_ids : undefined;
  }

  const countryKey = country.toUpperCase().trim();
  const aoiFilter = targetAoiIds ? new Set(targetAoiIds) : null;

  function filterCollection(collection: GeoJSONFeatureCollection): GeoJSONFeatureCollection {
    if (!aoiFilter || aoiFilter.size === 0) {
      return collection;
    }
    const filteredFeatures = collection.features.filter((f) =>
      aoiFilter.has(f.properties?.aoi_id)
    );
    return {
      ...collection,
      features: filteredFeatures,
      metadata: {
        ...collection.metadata,
        total_hexagons: filteredFeatures.length,
      },
    };
  }

  if (!shouldBypassCache && _gridCache.has(countryKey)) {
    return filterCollection(_gridCache.get(countryKey)!);
  }

  let fullCollection: GeoJSONFeatureCollection | null = null;

  try {
    const gridData = await fetchCoastalApi<GeoJSONFeatureCollection>(
      "/indicators/spatial/grid",
      { country: countryKey },
      engine
    );
    if (gridData && Array.isArray(gridData.features)) {
      fullCollection = gridData;
    }
  } catch {
    // API request failed. Continue to static file fallback.
  }

  if (!fullCollection) {
    let rawData: Record<
      string,
      Array<{ id: string; lat: number; lng: number; coords: [number, number][] }>
    > | null = null;

    if (typeof window === "undefined") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const filePath = path.join(
          process.cwd(),
          "public",
          "data",
          "coastal",
          "grids",
          `${countryKey}.json`
        );
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          rawData = JSON.parse(content);
        }
      } catch {
        // Continue to fetch fallback
      }
    }

    if (!rawData) {
      const localRes = await fetch(`/data/coastal/grids/${countryKey}.json`);
      if (!localRes.ok) {
        throw new Error(
          `Failed to load coastal grid for ${countryKey}: ${localRes.statusText}`
        );
      }
      rawData = await localRes.json();
    }

    const features: GeoJSONFeature[] = [];
    if (rawData) {
      for (const [aoiId, cells] of Object.entries(rawData)) {
        for (const cell of cells) {
          const ring = cell.coords.map(([lat, lng]) => [lng, lat]);
          if (
            ring.length > 0 &&
            (ring[0][0] !== ring[ring.length - 1][0] ||
              ring[0][1] !== ring[ring.length - 1][1])
          ) {
            ring.push([...ring[0]]);
          }

          features.push({
            type: "Feature",
            id: cell.id,
            geometry: {
              type: "Polygon",
              coordinates: [ring],
            },
            properties: {
              h3_index: cell.id,
              aoi_id: aoiId,
              country_iso: countryKey,
              lat: cell.lat,
              lng: cell.lng,
              coords: cell.coords,
            },
          });
        }
      }
    }

    fullCollection = {
      type: "FeatureCollection",
      features,
      metadata: {
        country_iso: countryKey,
        resolution: 7,
        total_hexagons: features.length,
      },
    };
  }

  _gridCache.set(countryKey, fullCollection);
  return filterCollection(fullCollection);
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
 * 5b. Fetch batch spatial timeline series across a date range for memory caching.
 */
export async function fetchSpatialSeries(
  params: SpatialSeriesParams
): Promise<SpatialSeriesResponse> {
  return fetchCoastalApi<SpatialSeriesResponse>(
    "/indicators/spatial/series",
    {
      country: params.country,
      start_date: params.start_date,
      end_date: params.end_date,
      grain: params.grain || "monthly",
      indicator: params.indicator || "chlor_a",
      aoi_id: params.aoi_id,
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
 * 8. Fetch historical time series observations for an individual H3 grid cell.
 */
export interface HexCellTimeSeriesParams {
  country: string;
  cell_id: string;
  start_date?: string;
  end_date?: string;
  grain?: string;
  engine?: "duckdb" | "postgres";
}

export async function fetchHexCellTimeSeries(
  params: HexCellTimeSeriesParams
): Promise<HexCellTimeSeriesResponse> {
  return fetchCoastalApi<HexCellTimeSeriesResponse>(
    "/indicators/spatial/cell/series",
    {
      country: params.country,
      cell_id: params.cell_id,
      start_date: params.start_date || "2019-01-01",
      end_date: params.end_date || "2025-12-31",
      grain: params.grain || "monthly",
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


# DataBlox Coastal Waters: Frontend Developer Handoff

This document summarizes the backend deliverables, TypeScript client, API endpoints, and integration patterns for building the Coastal Waters (Seaport & Eutrophication) module in `DataBlox-frontend`.

---

## 1. Executive Summary

- **Backend Status**: Deployed and fully operational in production.
- **Security**: Protected by Auth0 JWT Bearer token authentication (`verify_token`).
- **Production API URL**: `https://api.sapalo.dev`
- **Canonical API v1 Prefix**: `/api/v1/coastal` (Aligned with `/api/v1/migrations`, `/api/v1/tourism`)
- **Backward-Compatible Alias**: `/api/coastal`
- **Data Engine**: DuckDB in-process engine querying compressed Parquet tables and GeoPackages directly.
- **Interactive Swagger Docs**: [https://api.sapalo.dev/docs](https://api.sapalo.dev/docs)
- **Interactive ReDoc**: [https://api.sapalo.dev/redoc](https://api.sapalo.dev/redoc)
- **Supported Countries**: Thailand (`THA`), Indonesia (`IDN`), Philippines (`PHL`), Bangladesh (`BGD`).

---

## 2. Deliverables and File Locations

| Asset | File Location | Purpose |
| :--- | :--- | :--- |
| **TypeScript Types** | [`DataBlox-frontend/types/coastal.ts`](../DataBlox-frontend/types/coastal.ts) | TypeScript interfaces for all requests, responses, and metrics. |
| **TypeScript API Client** | [`DataBlox-frontend/services/coastalService.ts`](../DataBlox-frontend/services/coastalService.ts) | Drop-in async service functions with built-in caching. |
| **Integration Cookbook** | [`docs/COASTAL_API_INTEGRATION_GUIDE.md`](COASTAL_API_INTEGRATION_GUIDE.md) | Component-by-component integration recipes and formulas. |
| **Offline API Reference** | [`docs/api-reference.html`](api-reference.html) | Standalone Swagger UI viewer (opens offline in any browser). |
| **OpenAPI 3.1.0 Schema** | [`docs/openapi.json`](openapi.json) | Standard JSON schema for code generators or tools. |
| **Postman Collection** | [`docs/coastal_api_collection.json`](coastal_api_collection.json) | Importable collection with pre-saved queries for all 4 countries. |
| **Design Specification** | [`misc/Datablox_v3_Design_Specification.md`](../misc/Datablox_v3_Design_Specification.md) | 64-page Figma design specification with UI layouts and formulas. |

---

## 3. Quick Start in Frontend Code

Import the pre-configured coastal service functions in any React component:

```typescript
import {
  fetchCoastalCountries,
  fetchCoastalLocations,
  fetchIndicatorTimeline,
  fetchSpatialGrid,
  fetchSpatialSlice,
  fetchVesselDistribution,
  fetchVesselTimeline
} from "@/services/coastalService";
```

---

## 4. API Endpoints Reference

All endpoints are available under both `/api/v1/coastal` (canonical) and `/api/coastal` (alias), and return an `X-Engine-Execution-Time-Ms` response header.

### 1. `GET /api/v1/coastal/countries`
- **Purpose**: Populates the top-level Country Selector dropdown.
- **Query Parameters**: None.
- **Client Method**: `fetchCoastalCountries()`
- **Response**: Array of `CoastalCountry` objects with bounding boxes, center coordinates, and available grains.

### 2. `GET /api/v1/coastal/locations`
- **Purpose**: Populates the Seaport and Area of Interest (AOI) search combobox.
- **Query Parameters**: `country` (required, e.g. `THA`).
- **Client Method**: `fetchCoastalLocations("THA")`
- **Response**: Array of `CoastalLocation` objects with clean display names (e.g. `Pak Nam (Port 56)`).

### 3. `GET /api/v1/coastal/indicators/timeline`
- **Purpose**: Powers the 4 Summary KPI Cards and the Dual-Axis Historical Line Chart.
- **Query Parameters**:
  - `country` (required, e.g. `THA`)
  - `aoi_id` (optional, e.g. `THA_pak-nam_10km_56` for port-level, omit for national)
  - `grain` (optional, `monthly` | `weekly`, default: `monthly`)
  - `indicators` (optional, comma-separated, e.g. `mean_chlor_a,n_unique_vessels`)
  - `agg_func` (optional, `average` | `maximum`, default: `average`)
- **Client Method**: `fetchIndicatorTimeline({ country: "THA", grain: "monthly" })`
- **Response**:
  - `timeline`: Ordered time series points with Chlorophyll-a, SST (°C and K), vessel counts, and port call hours.
  - `summary`: Pre-calculated KPI card totals, averages, peaks, and period percentage deltas.

### 4. `GET /api/v1/coastal/indicators/spatial/grid`
- **Purpose**: Returns static H3 Resolution 7 hexagon polygon geometries.
- **Query Parameters**: `country` (required, e.g. `THA`).
- **Client Method**: `fetchSpatialGrid("THA")`
- **Important**: The client method automatically caches the GeoJSON FeatureCollection in memory so it is only downloaded once per session.

### 5. `GET /api/v1/coastal/indicators/spatial/slice`
- **Purpose**: Powers the 60 FPS temporal slider scrubber on the choropleth map.
- **Query Parameters**:
  - `country` (required)
  - `period_start` (required, e.g. `2024-07-01`)
  - `period_end` (optional, e.g. `2024-07-31`)
  - `grain` (optional, `monthly` | `weekly`)
  - `indicator` (optional, `chlor_a` | `sst` | `vessels`)
- **Client Method**: `fetchSpatialSlice({ country: "THA", period_start: "2024-07-01" })`
- **Response**: Lightweight mapping from `grid_index` to metric values for fast color updates.

### 6. `GET /api/v1/coastal/vessels/distribution`
- **Purpose**: Powers the Fleet Breakdown Donut Chart and Sub-Type Drill-Down Bar Chart.
- **Query Parameters**:
  - `country` (required)
  - `start_date` (optional, `YYYY-MM-DD`)
  - `end_date` (optional, `YYYY-MM-DD`)
- **Client Method**: `fetchVesselDistribution({ country: "THA" })`
- **Response**:
  - `pie_chart`: Parent category proportions (Trade, Harbor, Recreation, Miscellaneous).
  - `drilldown`: Granular sub-type counts and percentages (Cargo, Tanker, Tug, Dredge, Passenger, Fishing).

### 7. `GET /api/v1/coastal/vessels/timeline`
- **Purpose**: Powers vessel volume trend visualizations.
- **Query Parameters**: `country`, `aoi_id`, `grain`, `metric`.
- **Client Method**: `fetchVesselTimeline({ country: "THA", metric: "vessel_count" })`

---

## 5. UI Component Implementation Guidelines

### A. Four Summary KPI Cards
The `summary` object from `fetchIndicatorTimeline()` provides pre-formatted values:
- **Total Vessels Card**: Use `summary.cumulative_vessels`. Render `summary.vessels.pop_delta_pct` as the period delta badge.
- **Chlorophyll-a Card**: Use `summary.chlor_a.average` (mg/m³). Render `summary.chlor_a.pop_delta_pct` as the delta badge.
- **Sea Surface Temperature Card**: Use `summary.sea_surface_temperature.average_c` (°C). Render `summary.sea_surface_temperature.pop_delta_pct` as the delta badge.
- **Port Call Duration Card**: Use `summary.port_call_duration.average_hours` (Hours). Peak duration is in `summary.port_call_duration.peak_hours`.

### B. H3 Choropleth Map with 60 FPS Playback Scrubber
1. On component mount, call `fetchSpatialGrid(country)` once to load polygon shapes into Deck.gl or Mapbox.
2. When the user scrubs the timeline slider or clicks Play, call `fetchSpatialSlice(params)`.
3. In the Deck.gl `H3HexagonLayer` or Mapbox paint expression, map `sliceData.values[h3Index].chlor_a` to color scale RGB values.

### C. Fleet Donut and Drilldown Bar Charts
1. Bind the Donut / Pie Chart to `fleetData.pie_chart`.
2. When the user clicks a segment (e.g. `Trade`), update the horizontal bar chart with `fleetData.drilldown["Trade"]`.

---

## 6. Verification and Type Safety

All TypeScript interfaces in `DataBlox-frontend/types/coastal.ts` compile with zero errors:

```bash
cd DataBlox-frontend
npx tsc --noEmit
```

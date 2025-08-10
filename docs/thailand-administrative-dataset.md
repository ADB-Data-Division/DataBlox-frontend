# Thailand Administrative Dataset Schema

This document describes the JSON dataset schema for Thailand provinces and districts used in the capacity building visualization application.

## Overview

The dataset contains geographic and administrative information for Thai provinces and districts, designed to work with the coordinate mapping system in the node-flow-animation component.

## File Location

```
public/datasets/thailand_administrative_units.json
```

## JSON Schema

### Object Structure

The JSON file contains an array of administrative unit objects with the following properties:

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `id` | String | Yes | Unique identifier | `TH-03`, `TH-51-009` |
| `name` | String | Yes | English name | `Bangkok`, `Wiang Haeng` |
| `name_thai` | String | Yes | Thai name | `กรุงเทพมหานคร` |
| `type` | Enum | Yes | `province` or `district` | `province` |
| `latitude` | Number | Yes | Decimal degrees latitude | `13.7563` |
| `longitude` | Number | Yes | Decimal degrees longitude | `100.5018` |

### Data Types

- **String**: Text values, UTF-8 encoded
- **Number**: Decimal numbers (floating point)
- **Enum**: Restricted set of values (see below)

### Enumerated Values

#### `type`
- `province` - Provincial level administrative unit
- `district` - District level administrative unit (amphoe)

## Sample Data

```json
[
  {
    "id": "TH-03",
    "name": "Bangkok",
    "name_thai": "กรุงเทพมหานคร",
    "type": "province",
    "latitude": 13.7563,
    "longitude": 100.5018
  },
  {
    "id": "TH-17",
    "name": "Khon Kaen",
    "name_thai": "ขอนแก่น",
    "type": "province",
    "latitude": 16.4419,
    "longitude": 102.8359
  },
  {
    "id": "TH-51-009",
    "name": "Wiang Haeng",
    "name_thai": "Wiang Haeng",
    "type": "district",
    "latitude": 19.6003815,
    "longitude": 98.61606739999999
  }
]
```

## ID Format

### Province IDs
Format: `TH-{province_code}`
- `TH-03` = Bangkok
- `TH-51` = Chiang Mai  
- `TH-17` = Khon Kaen

### District IDs  
Format: `TH-{province_code}-{district_code}`
- `TH-51-009` = Wiang Haeng District, Chiang Mai
- `TH-04-010` = Wiang Kaen District, Bueng Kan

## Coordinate System

- **Coordinate System**: WGS84 (World Geodetic System 1984)
- **Format**: Decimal degrees
- **Precision**: Recommended 4+ decimal places for accuracy
- **Range**: 
  - Latitude: ~5.6 to 20.5 (covers Thailand's north-south extent)
  - Longitude: ~97.3 to 105.6 (covers Thailand's east-west extent)

## Data Requirements

### Provinces
- All 77 Thai provinces should be included
- Each province must have a unique ID in format `TH-{code}`
- Province codes are 2-digit numbers (01-77)

### Districts
- Districts (amphoe) are optional but recommended for detailed visualization
- Each district must have an ID that references its parent province: `TH-{province_code}-{district_code}`
- District codes should be 3-digit zero-padded (001, 002, etc.)
- District codes should be unique within each province

## Usage in Application

The dataset is loaded using the `loadAdministrativeData()` function in:
```
app/services/data-loader/thailand-administrative-data.ts
```

### Updated TypeScript Interface

```typescript
export interface AdministrativeUnit {
  id: string;
  name: string;
  name_thai: string;
  type: 'province' | 'district';
  latitude: number;
  longitude: number;
}

export async function loadAdministrativeData(): Promise<AdministrativeUnit[]> {
  const response = await fetch('/datasets/thailand_administrative_units.json');
  return await response.json();
}
```

### Node Generation
Coordinates are automatically converted to canvas positions using the `mapProvinceToXY()` function in:
```
components/node-flow-animation/thailand-map-utils.ts
```

### Visualization Options
- **Provinces Only**: Default visualization showing 77 provinces
- **Districts Included**: Detailed view including district-level data
- **Region Filtering**: Filter by Thai regions
- **Hierarchical Navigation**: Click provinces to show districts

## Data Sources

Recommended sources for coordinate data:
- **Official**: Royal Thai Survey Department
- **OpenStreetMap**: Community-maintained, good accuracy
- **Google Maps API**: High accuracy geocoding
- **GeoNames**: Free geographical database

## Validation Rules

1. **Unique IDs**: No duplicate `id` values
2. **Valid Coordinates**: Latitude/longitude within Thailand bounds
3. **ID Format**: Province IDs must follow `TH-{code}` format, district IDs must follow `TH-{province_code}-{district_code}` format  
4. **UTF-8 Encoding**: Thai names must be properly encoded
5. **Required Fields**: All required fields must have values
6. **JSON Validity**: Must be valid JSON array format

## Maintenance

### Adding New Entries
1. Follow the ID format conventions
2. Verify coordinates are accurate
3. Ensure parent-child relationships are correct
4. Test with the visualization component

### Updating Coordinates
1. Backup existing data
2. Verify new coordinates with multiple sources
3. Test visualization positioning
4. Update in small batches to isolate issues

## Integration

The dataset integrates with:
- **Node Flow Animation**: Main visualization component
- **Migration Flow Data**: Links to migration API data via province/district codes
- **Map Hexagons**: Overlays with Thailand hexagon map
- **Coordinate Mapping**: Automatic lat/lng to xy conversion

For implementation details, see:
- `components/node-flow-animation/thailand-map-utils.ts`
- `app/services/data-loader/thailand-administrative-data.ts`

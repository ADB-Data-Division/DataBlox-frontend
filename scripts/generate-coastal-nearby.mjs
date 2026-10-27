import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cellToLatLng, isValidCell } from 'h3-js';

// Use the backend's province-assigned H3 sidecar so every enabled Coastal
// country can be ranked from its actual province grid coverage.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const backendDataDir = path.resolve(
  frontendRoot,
  '../DataBlox-backend/app/api/v1/endpoints/coastal/data'
);
const hierarchyPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(backendDataDir, 'provinces_hierarchy.json');
const hexesPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(backendDataDir, 'provinces_hexes.parquet');
const countriesPath = process.argv[4]
  ? path.resolve(process.argv[4])
  : path.join(backendDataDir, 'countries.json');
const outputPath = path.join(
  frontendRoot,
  'app/(dashboard)/coastal/data/nearby-provinces.json'
);

const EARTH_RADIUS_KM = 6371.0088;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

function getSphericalCentroid(points) {
  let x = 0;
  let y = 0;
  let z = 0;

  for (const { lat, lng } of points) {
    const latitude = toRadians(lat);
    const longitude = toRadians(lng);
    x += Math.cos(latitude) * Math.cos(longitude);
    y += Math.cos(latitude) * Math.sin(longitude);
    z += Math.sin(latitude);
  }

  x /= points.length;
  y /= points.length;
  z /= points.length;

  return {
    lat: (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI,
    lng: (Math.atan2(y, x) * 180) / Math.PI,
  };
}

function distanceKm(from, to) {
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)))
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readProvinceHexes() {
  const readerPath = path.join(scriptDir, 'read-coastal-province-hexes.py');
  const python = spawnSync(
    process.env.PYTHON ?? 'python3',
    [readerPath, hexesPath],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );

  if (python.error || python.status !== 0) {
    const detail = python.error?.message ?? python.stderr.trim();
    throw new Error(
      `Could not read ${hexesPath}. Ensure Python has the backend DuckDB dependency installed. ${detail}`
    );
  }

  return JSON.parse(python.stdout);
}

const hierarchy = readJson(hierarchyPath);
const countryMetadata = readJson(countriesPath);
const provinceHexes = readProvinceHexes();
const enabledCountries = Object.entries(countryMetadata)
  .filter(([, metadata]) => metadata.enabled !== false)
  .map(([countryIso]) => countryIso.toUpperCase())
  .sort();
const lookup = {};

if (enabledCountries.length === 0) {
  throw new Error(`No enabled Coastal countries found in ${countriesPath}`);
}

for (const countryIso of enabledCountries) {
  const country = hierarchy[countryIso];
  const provinceHexMap = provinceHexes[countryIso];
  if (!country || !Array.isArray(country.provinces)) {
    throw new Error(`Missing province hierarchy for ${countryIso} in ${hierarchyPath}`);
  }
  if (!provinceHexMap) {
    throw new Error(`Missing province-assigned H3 cells for ${countryIso} in ${hexesPath}`);
  }

  const countryProvincePoints = new Map(
    country.provinces.map((province) => [province.name, []])
  );

  for (const [provinceName, cells] of Object.entries(provinceHexMap)) {
    const points = countryProvincePoints.get(provinceName);
    if (!points) {
      throw new Error(`${countryIso}/${provinceName} is missing from the province hierarchy`);
    }

    for (const cell of cells) {
      if (!isValidCell(cell)) {
        throw new Error(`${countryIso}/${provinceName} has invalid H3 cell ${cell}`);
      }
      const [lat, lng] = cellToLatLng(cell);
      points.push({ lat, lng });
    }
  }

  const provinceCenters = new Map();
  for (const [provinceName, points] of countryProvincePoints) {
    if (points.length === 0) {
      throw new Error(`${countryIso}/${provinceName} has no province-assigned Coastal H3 cells`);
    }
    provinceCenters.set(provinceName, getSphericalCentroid(points));
  }

  lookup[countryIso] = Object.fromEntries(
    [...provinceCenters.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([provinceName, center]) => [
        provinceName,
        [...provinceCenters.entries()]
          .filter(([otherName]) => otherName !== provinceName)
          .map(([otherName, otherCenter]) => ({
            name: otherName,
            distance: distanceKm(center, otherCenter),
          }))
          .sort(
            (first, second) =>
              first.distance - second.distance || first.name.localeCompare(second.name)
          )
          .slice(0, 3)
          .map(({ name }) => name),
      ])
  );
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(lookup, null, 2)}\n`);
console.log(
  `Generated nearby province lookup for ${enabledCountries.length} Coastal countries: ${outputPath}`
);

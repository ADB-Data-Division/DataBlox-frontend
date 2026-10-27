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
const outputDir = path.join(frontendRoot, 'public/data/coastal/nearby-provinces');

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

function provinceSlug(name) {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
const generatedAssets = new Map();

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
  if (countryProvincePoints.size !== country.provinces.length) {
    throw new Error(`${countryIso} has duplicate province names in ${hierarchyPath}`);
  }

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

  const slugOwners = new Map();
  for (const provinceName of provinceCenters.keys()) {
    const slug = provinceSlug(provinceName);
    if (!slug) {
      throw new Error(`${countryIso}/${provinceName} cannot be represented as a province asset name`);
    }
    const slugOwner = slugOwners.get(slug);
    if (slugOwner) {
      throw new Error(
        `${countryIso} has province slug collision: ${slugOwner} and ${provinceName} both map to ${slug}`
      );
    }
    slugOwners.set(slug, provinceName);
  }

  for (const [provinceName, center] of provinceCenters) {
    const nearbyNames = [...provinceCenters.entries()]
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
      .map(({ name }) => name);

    generatedAssets.set(
      path.join(countryIso, `${provinceSlug(provinceName)}.json`),
      nearbyNames
    );
  }
}

fs.mkdirSync(outputDir, { recursive: true });
for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
  const entryPath = path.join(outputDir, entry.name);
  if (entry.isDirectory() && /^[A-Z]{3}$/.test(entry.name)) {
    for (const file of fs.readdirSync(entryPath, { withFileTypes: true })) {
      const relativePath = path.join(entry.name, file.name);
      if (
        file.isFile() &&
        file.name.endsWith('.json') &&
        !generatedAssets.has(relativePath)
      ) {
        fs.unlinkSync(path.join(entryPath, file.name));
      }
    }
    if (fs.readdirSync(entryPath).length === 0) {
      fs.rmdirSync(entryPath);
    }
  } else if (entry.isFile() && /^[A-Z]{3}\.json$/.test(entry.name)) {
    // Remove province lookup files from the earlier per-country format.
    fs.unlinkSync(entryPath);
  }
}

for (const [relativePath, nearbyNames] of generatedAssets) {
  const assetPath = path.join(outputDir, relativePath);
  fs.mkdirSync(path.dirname(assetPath), { recursive: true });
  fs.writeFileSync(
    assetPath,
    `${JSON.stringify(nearbyNames)}\n`
  );
}

console.log(
  `Generated ${generatedAssets.size} province-specific nearby lookups for ${enabledCountries.length} Coastal countries: ${outputDir}`
);

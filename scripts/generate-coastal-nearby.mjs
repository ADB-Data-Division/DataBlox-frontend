import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Nearby ranking uses each province's Coastal AOIs and their H3 cell centers.
// The resulting spherical centroids approximate coastal grid coverage; they
// do not measure exact distances between province boundaries.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const hierarchyPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(
      frontendRoot,
      '../DataBlox-backend/app/api/v1/endpoints/coastal/data/provinces_hierarchy.json'
    );
const gridDir = path.join(frontendRoot, 'public/data/coastal/grids');
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

const hierarchy = readJson(hierarchyPath);
const lookup = {};
const gridFiles = fs
  .readdirSync(gridDir)
  .filter((fileName) => fileName.endsWith('.json'))
  .sort();

if (gridFiles.length === 0) {
  throw new Error(`No Coastal grid files found in ${gridDir}`);
}

for (const fileName of gridFiles) {
  const countryIso = path.basename(fileName, '.json').toUpperCase();
  const country = hierarchy[countryIso];
  if (!country || !Array.isArray(country.provinces)) {
    throw new Error(`Missing province hierarchy for ${countryIso} in ${hierarchyPath}`);
  }

  const grid = readJson(path.join(gridDir, fileName));
  const countryProvincePoints = new Map();

  for (const province of country.provinces) {
    const pointsByCell = new Map();

    for (const aoiId of province.aois ?? []) {
      const cells = grid[aoiId];
      if (!Array.isArray(cells)) {
        throw new Error(`${countryIso}/${province.name} references missing AOI ${aoiId}`);
      }

      for (const cell of cells) {
        if (
          Number.isFinite(cell.lat) &&
          Number.isFinite(cell.lng) &&
          cell.lat >= -90 &&
          cell.lat <= 90 &&
          cell.lng >= -180 &&
          cell.lng <= 180
        ) {
          const cellKey =
            typeof cell.id === 'string' ? cell.id : `${cell.lat.toFixed(6)}:${cell.lng.toFixed(6)}`;
          pointsByCell.set(cellKey, { lat: cell.lat, lng: cell.lng });
        }
      }
    }

    const points = [...pointsByCell.values()];
    if (points.length === 0) {
      throw new Error(`${countryIso}/${province.name} has no usable Coastal grid centers`);
    }
    countryProvincePoints.set(province.name, getSphericalCentroid(points));
  }

  lookup[countryIso] = Object.fromEntries(
    [...countryProvincePoints.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([provinceName, center]) => [
        provinceName,
        [...countryProvincePoints.entries()]
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
console.log(`Generated nearby province lookup for ${gridFiles.length} Coastal countries: ${outputPath}`);

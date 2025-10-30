/**
 * Static mapping of Thai provinces to their administrative regions
 * Based on Thailand's 6 administrative regions (Geographical/Academic System)
 */

export type ThailandRegion = 'central' | 'northern' | 'northeastern' | 'eastern' | 'western' | 'southern';

export interface ProvinceRegionMapping {
  [provinceId: string]: ThailandRegion;
}

/**
 * Mapping of all Thai provinces to their administrative regions
 * Province IDs are in lowercase with spaces/hyphens normalized
 */
export const PROVINCE_REGION_MAPPING: ProvinceRegionMapping = {
  // Northeastern Region (Isan) - 20 provinces
  'amnat charoen': 'northeastern',
  'bueng kan': 'northeastern',
  'buri ram': 'northeastern',
  'chaiyaphum': 'northeastern',
  'kalasin': 'northeastern',
  'khon kaen': 'northeastern',
  'loei': 'northeastern', // Correction: Was missing
  'maha sarakham': 'northeastern',
  'mukdahan': 'northeastern',
  'nakhon phanom': 'northeastern',
  'nakhon ratchasima': 'northeastern',
  'nong bua lam phu': 'northeastern',
  'nong khai': 'northeastern',
  'roi et': 'northeastern',
  'sakon nakhon': 'northeastern',
  'si sa ket': 'northeastern',
  'surin': 'northeastern',
  'ubon ratchathani': 'northeastern',
  'udon thani': 'northeastern',
  'yasothon': 'northeastern',
  
  // Northern Region - 9 provinces
  'chiang mai': 'northern',
  'chiang rai': 'northern',
  'lampang': 'northern',
  'lamphun': 'northern',
  'mae hong son': 'northern',
  'nan': 'northern',
  'phayao': 'northern',
  'phrae': 'northern',
  'uttaradit': 'northern',

  // Eastern Region - 7 provinces (+ Pattaya Special Administrative Area)
  'chachoengsao': 'eastern',
  'chanthaburi': 'eastern',
  'chon buri': 'eastern',
  'prachin buri': 'eastern',
  'pattaya': 'eastern', // Special administrative area (part of Chon Buri)
  'rayong': 'eastern',
  'sa kaeo': 'eastern',
  'trat': 'eastern',

  // Western Region - 5 provinces
  'kanchanaburi': 'western',
  'phetchaburi': 'western', // Correction: Was 'central'
  'prachuap khiri khan': 'western', // Correction: Was 'central'
  'ratchaburi': 'western',
  'tak': 'western',

  // Southern Region - 14 provinces
  'chumphon': 'southern',
  'krabi': 'southern',
  'nakhon si thammarat': 'southern',
  'narathiwat': 'southern',
  'pattani': 'southern',
  'phangnga': 'southern',
  'phatthalung': 'southern',
  'phuket': 'southern',
  'ranong': 'southern',
  'satun': 'southern',
  'songkhla': 'southern',
  'surat thani': 'southern',
  'trang': 'southern',
  'yala': 'southern',

  // Central Region (excluding Bangkok) - 21 provinces
  'ang thong': 'central',
  'bangkok': 'central', // Special Administrative Area
  'chai nat': 'central',
  'kamphaeng phet': 'central',
  'lop buri': 'central',
  'nakhon nayok': 'central',
  'nakhon pathom': 'central',
  'nakhon sawan': 'central',
  'nonthaburi': 'central',
  'pathum thani': 'central',
  'phetchabun': 'central',
  'phichit': 'central',
  'phitsanulok': 'central',
  'phra nakhon si ayutthaya': 'central',
  'samut prakan': 'central',
  'samut sakhon': 'central',
  'samut songkhram': 'central',
  'saraburi': 'central',
  'sing buri': 'central',
  'sukhothai': 'central',
  'suphan buri': 'central',
  'uthai thani': 'central',
};

/**
 * Get region for a given province ID
 */
export function getProvinceRegion(provinceId: string): ThailandRegion | null {
  // Normalize by converting to lowercase and removing leading/trailing whitespace
  const normalizedId = provinceId.toLowerCase().trim()
    // Additional normalization for common input variations
    .replace(/\s|-/g, ''); // Remove spaces and hyphens for stricter matching

  // Because the keys in PROVINCE_REGION_MAPPING use spaces, 
  // we must normalize the incoming ID to match the keys in the map,
  // which are designed to be canonical names (e.g., 'lop buri' instead of 'lopburi').
  // A simpler normalization that keeps spaces for multi-word names is better.
  const simpleNormalizedId = provinceId.toLowerCase().trim();

  // If the key is found with spaces, return it
  if (PROVINCE_REGION_MAPPING[simpleNormalizedId]) {
    return PROVINCE_REGION_MAPPING[simpleNormalizedId];
  }
  
  // Handle cases where user input might omit the space (e.g., "ChiangMai")
  // by searching the map keys for a match after removing all spaces from the key
  for (const [key, region] of Object.entries(PROVINCE_REGION_MAPPING)) {
    if (key.replace(/\s/g, '') === simpleNormalizedId.replace(/\s/g, '')) {
      return region;
    }
  }

  return null;
}

/**
 * Get all provinces in a specific region
 */
export function getProvincesInRegion(region: ThailandRegion): string[] {
  return Object.entries(PROVINCE_REGION_MAPPING)
    .filter(([, provinceRegion]) => provinceRegion === region)
    .map(([provinceId]) => provinceId);
}

/**
 * Get all available regions
 */
export function getAllRegions(): ThailandRegion[] {
  return ['central', 'northern', 'northeastern', 'eastern', 'western', 'southern'];
}

/**
 * Get user-friendly region names
 */
export function getRegionDisplayName(region: ThailandRegion): string {
  const displayNames: Record<ThailandRegion, string> = {
    central: 'Central',
    northern: 'Northern',
    northeastern: 'Northeastern',
    eastern: 'Eastern',
    western: 'Western',
    southern: 'Southern'
  };
  return displayNames[region];
}

/**
 * Check if a query string matches a region name
 */
export function isRegionQuery(query: string): ThailandRegion | null {
  const normalizedQuery = query.toLowerCase().trim();

  // Direct matches
  const directMatches: Record<string, ThailandRegion> = {
    'central': 'central',
    'northern': 'northern',
    'northeastern': 'northeastern',
    'northeast': 'northeastern',
    'eastern': 'eastern',
    'western': 'western',
    'southern': 'southern'
  };

  if (directMatches[normalizedQuery]) {
    return directMatches[normalizedQuery];
  }

  // Partial matches for common abbreviations
  if (normalizedQuery === 'north') return 'northern';
  if (normalizedQuery === 'south') return 'southern';
  if (normalizedQuery === 'east') return 'eastern';
  if (normalizedQuery === 'west') return 'western';

  return null;
}
export interface AdministrativeUnit {
  id: string;
  name: string;
  name_thai: string;
  type: 'province' | 'district';
  latitude: number;
  longitude: number;
}

export interface ProcessedAdministrativeData {
  provinces: AdministrativeUnit[];
  districts: AdministrativeUnit[];
  byId: Map<string, AdministrativeUnit>;
  byProvinceCode: Map<string, AdministrativeUnit[]>;
  all: AdministrativeUnit[];
}

/**
 * Load Thailand administrative units from JSON file
 */
export async function loadAdministrativeData(): Promise<ProcessedAdministrativeData> {
  try {
    const response = await fetch('/datasets/thailand_administrative_units.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load administrative data: ${response.status} ${response.statusText}`);
    }
    
    const units: AdministrativeUnit[] = await response.json();
    
    console.log('✅ Loaded Thailand administrative data:', {
      provinces: units.filter(u => u.type === 'province').length,
      districts: units.filter(u => u.type === 'district').length,
      total: units.length
    });
    
    return processAdministrativeData(units);
  } catch (error) {
    console.error('❌ Error loading administrative data:', error);
    throw error;
  }
}

/**
 * Process raw administrative data into organized structure
 */
function processAdministrativeData(units: AdministrativeUnit[]): ProcessedAdministrativeData {
  const provinces = units.filter(u => u.type === 'province');
  const districts = units.filter(u => u.type === 'district');
  
  // Create lookup maps
  const byId = new Map(units.map(u => [u.id, u]));
  
  // Group by province code (extracted from ID)
  const byProvinceCode = new Map<string, AdministrativeUnit[]>();
  
  units.forEach(unit => {
    // Extract province code from ID (e.g., TH-03 -> 03, TH-51-009 -> 51)
    const provinceCode = extractProvinceCode(unit.id);
    
    if (!byProvinceCode.has(provinceCode)) {
      byProvinceCode.set(provinceCode, []);
    }
    byProvinceCode.get(provinceCode)!.push(unit);
  });
  
  return {
    provinces,
    districts,
    byId,
    byProvinceCode,
    all: units
  };
}

/**
 * Extract province code from administrative unit ID
 * Examples: TH-03 -> 03, TH-51-009 -> 51
 */
function extractProvinceCode(id: string): string {
  const parts = id.split('-');
  return parts[1] || '';
}

/**
 * Get districts for a specific province
 */
export function getDistrictsForProvince(
  data: ProcessedAdministrativeData, 
  provinceId: string
): AdministrativeUnit[] {
  const provinceCode = extractProvinceCode(provinceId);
  const unitsInProvince = data.byProvinceCode.get(provinceCode) || [];
  return unitsInProvince.filter(u => u.type === 'district');
}

/**
 * Get province for a district
 */
export function getProvinceForDistrict(
  data: ProcessedAdministrativeData,
  districtId: string
): AdministrativeUnit | null {
  const provinceCode = extractProvinceCode(districtId);
  const provinceId = `TH-${provinceCode}`;
  return data.byId.get(provinceId) || null;
}

/**
 * Search administrative units by name (English or Thai)
 */
export function searchAdministrativeUnits(
  data: ProcessedAdministrativeData,
  query: string,
  type?: 'province' | 'district'
): AdministrativeUnit[] {
  const searchTerm = query.toLowerCase();
  let searchPool = data.all;
  
  if (type) {
    searchPool = type === 'province' ? data.provinces : data.districts;
  }
  
  return searchPool.filter(unit => 
    unit.name.toLowerCase().includes(searchTerm) ||
    unit.name_thai.includes(query)
  );
}

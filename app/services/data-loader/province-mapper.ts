import { metadataService } from '../api';
import { Province } from '../api/types';

// Cache for API data to avoid repeated calls
let provinceCache: Province[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get provinces from API with caching
 */
async function getProvinces(): Promise<Province[]> {
	const now = Date.now();
	
	// Return cached data if it's still fresh
	if (provinceCache && (now - cacheTimestamp) < CACHE_DURATION) {
		return provinceCache;
	}
	
	try {
		provinceCache = await metadataService.getProvinces();
		cacheTimestamp = now;
		return provinceCache;
	} catch (error) {
		console.error('Failed to fetch provinces from API:', error);
		// Return cached data if available, even if stale
		if (provinceCache) {
			return provinceCache;
		}
		// Fallback to empty array if no cache and API fails
		return [];
	}
}

/**
 * Maps a province ID to its readable name using API data
 * @param provinceId - The province ID
 * @returns The readable province name or the original ID if not found
 */
export async function getProvinceDisplayName(provinceId: string): Promise<string> {
	try {
		const provinces = await getProvinces();
		const province = provinces.find(p => p.id === provinceId || p.code === provinceId);
		return province?.name || provinceId;
	} catch (error) {
		console.error('Error getting province display name:', error);
		return provinceId;
	}
}

/**
 * Converts a province name to its API ID format
 * @param provinceName - The province name to convert
 * @returns The province API ID or null if not found
 */
export async function getProvinceId(provinceName: string): Promise<string | null> {
	try {
		const provinces = await getProvinces();
		const province = provinces.find(p => 
			p.name.toLowerCase() === provinceName.toLowerCase() ||
			p.code?.toLowerCase() === provinceName.toLowerCase()
		);
		return province?.id || null;
	} catch (error) {
		console.error('Error getting province ID:', error);
		return null;
	}
}

/**
 * A utility object with functions for province mapping using API data
 */
export const provinceMapper = {
	/**
	 * Maps an array of province IDs to their readable names
	 * @param provinceIds - Array of province IDs
	 * @returns Promise<Array> of readable province names
	 */
	mapToDisplayNames: async (provinceIds: string[]): Promise<string[]> => {
		try {
			const provinces = await getProvinces();
			return provinceIds.map(id => {
				const province = provinces.find(p => p.id === id || p.code === id);
				return province?.name || id;
			});
		} catch (error) {
			console.error('Error mapping province IDs to display names:', error);
			return provinceIds; // Return original IDs as fallback
		}
	},
	
	/**
	 * Maps an array of province names to their API ID format
	 * @param provinceNames - Array of province names
	 * @returns Promise<Array> of province IDs
	 */
	mapToIds: async (provinceNames: string[]): Promise<string[]> => {
		try {
			const provinces = await getProvinces();
			const ids: string[] = [];
			
			for (const name of provinceNames) {
				const province = provinces.find(p => 
					p.name.toLowerCase() === name.toLowerCase() ||
					p.code?.toLowerCase() === name.toLowerCase()
				);
				if (province) {
					ids.push(province.id);
				}
			}
			
			return ids;
		} catch (error) {
			console.error('Error mapping province names to IDs:', error);
			return [];
		}
	},
	
	/**
	 * Gets all province display names from API
	 * @returns Promise<Array> of all province display names
	 */
	getAllProvinceNames: async (): Promise<string[]> => {
		try {
			const provinces = await getProvinces();
			return provinces.map(p => p.name);
		} catch (error) {
			console.error('Error getting all province names:', error);
			return [];
		}
	},
	
	/**
	 * Gets all province IDs from API
	 * @returns Promise<Array> of all province IDs
	 */
	getAllProvinceIds: async (): Promise<string[]> => {
		try {
			const provinces = await getProvinces();
			return provinces.map(p => p.id);
		} catch (error) {
			console.error('Error getting all province IDs:', error);
			return [];
		}
	},
	
	/**
	 * Checks if a string is a valid province ID using API data
	 * @param id - The string to check
	 * @returns Promise<boolean> True if the string is a valid province ID
	 */
	isValidProvinceId: async (id: string): Promise<boolean> => {
		try {
			const provinces = await getProvinces();
			return provinces.some(p => p.id === id || p.code === id);
		} catch (error) {
			console.error('Error validating province ID:', error);
			return false;
		}
	},

	/**
	 * Get province by ID or code
	 * @param idOrCode - Province ID or code
	 * @returns Promise<Province | null>
	 */
	getProvinceByIdOrCode: async (idOrCode: string): Promise<Province | null> => {
		try {
			const provinces = await getProvinces();
			return provinces.find(p => p.id === idOrCode || p.code === idOrCode) || null;
		} catch (error) {
			console.error('Error getting province by ID or code:', error);
			return null;
		}
	}
};

export default provinceMapper;
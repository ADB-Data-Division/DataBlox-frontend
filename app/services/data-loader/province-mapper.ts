import provinceNames from './province-names.json';

/**
 * Maps a province ID (lowercase, no spaces) to its readable name
 * @param provinceId - The province ID in lowercase with no spaces
 * @returns The readable province name or the original ID if not found
 */
export function getProvinceDisplayName(provinceId: string): string {
	return provinceNames[provinceId as keyof typeof provinceNames] || provinceId;
}

/**
 * Converts a province name to its ID format (lowercase, no spaces)
 * @param provinceName - The province name to convert
 * @returns The province ID in lowercase with no spaces
 */
export function getProvinceId(provinceName: string): string {
	return provinceName.toLowerCase().replace(/\s+/g, '');
}

/**
 * A utility object with functions for province mapping
 */
export const provinceMapper = {
	/**
	 * Maps an array of province IDs to their readable names
	 * @param provinceIds - Array of province IDs
	 * @returns Array of readable province names
	 */
	mapToDisplayNames: (provinceIds: string[]): string[] => {
		return provinceIds.map(id => getProvinceDisplayName(id));
	},
	
	/**
	 * Maps an array of province names to their ID format
	 * @param provinceNames - Array of province names
	 * @returns Array of province IDs
	 */
	mapToIds: (provinceNames: string[]): string[] => {
		return provinceNames.map(name => getProvinceId(name));
	},
	
	/**
	 * Gets all province display names
	 * @returns Array of all province display names
	 */
	getAllProvinceNames: (): string[] => {
		return Object.values(provinceNames);
	},
	
	/**
	 * Gets all province IDs
	 * @returns Array of all province IDs
	 */
	getAllProvinceIds: (): string[] => {
		return Object.keys(provinceNames);
	},
	
	/**
	 * Checks if a string is a valid province ID
	 * @param id - The string to check
	 * @returns True if the string is a valid province ID
	 */
	isValidProvinceId: (id: string): boolean => {
		return id in provinceNames;
	}
};

export default provinceMapper;
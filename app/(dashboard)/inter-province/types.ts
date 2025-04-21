/**
 * Represents a single entry in the move-in dataset
 * Each entry contains migration counts for provinces and a month
 */
export interface ProvinceMonthlyEntry {
  // Time period is required
  month: string;
  
  // Allow any province name with numeric values
  [province: string]: string | number;
}

/**
 * The complete dataset is an array of monthly entries
 */
export type MoveInDataset = ProvinceMonthlyEntry[];

/**
 * Get province names from a dataset entry
 * @param entry A single dataset entry
 * @returns Array of province names (excluding 'month')
 */
export function getProvinceNames(entry: ProvinceMonthlyEntry): string[] {
  // Filter out the 'month' key and return all other keys as province names
  return Object.keys(entry).filter(key => key !== 'month');
}

/**
 * Get province names from an entire dataset
 * @param dataset The complete dataset
 * @returns Unique array of all province names across the dataset
 */
export function getAllProvinceNames(dataset: MoveInDataset): string[] {
  if (!dataset.length) return [];
  
  // Collect all keys from all entries
  const allKeys = new Set<string>();
  
  dataset.forEach(entry => {
    Object.keys(entry).forEach(key => {
      if (key !== 'month') {
        allKeys.add(key);
      }
    });
  });
  
  return Array.from(allKeys);
} 
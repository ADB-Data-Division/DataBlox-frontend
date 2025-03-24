import { Filter, ProvinceFilter } from "./data-loader-interface";
import provinceMapper from "./province-mapper";

export type MonthEnum = "Jan" | "Feb" | "Mar" | "Apr" | "May" | "Jun" | "Jul" | "Aug" | "Sep" | "Oct" | "Nov" | "Dec" | "Aggregated";
export type MonthNumericalEnum = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

// Interface for migration data
export interface MigrationData {
	matrix: MatrixData;
	names: string[];
  }

  export type MatrixData = number[][];

export type MonthlyMatrixData = {
	[key: number]: number[];
} & { month?: MonthEnum;	}
  
/**
   * Process the migration data based on the data selector and applied filters
   * @param data - The data to process
   * @param monthSelector - The month selector to use; if left as null, the data will be aggregated across the time periods.
   * @param appliedFilters - The applied filters
   * @returns The processed migration data
   */
export function processMigrationData(
	data: MonthlyMatrixData[], 
	monthSelector: MonthEnum | null, 
	appliedFilters: Filter[]
): MigrationData {
    // This is where we would process real data from the MigrationDataProcessor
    // For now, we'll use a sample transformation
    if (!data || data.length === 0) {
      return { matrix: [], names: [] };
    }
    
    // Extract province names using the provinceFilter and provinceMapper
    const provinceFilter = appliedFilters.find(filter => filter.type === "province") as ProvinceFilter | undefined;
    const names = provinceFilter?.province_ids ? 
      provinceMapper.mapToDisplayNames(provinceFilter.province_ids) : [];

	if (monthSelector) {
		data = data.filter(monthData => monthData.month === monthSelector);
	}
    
	const accumulator : MonthlyMatrixData[] = [
		{
			month: "Aggregated",
		}
	];

	for (let i = 0; i < names.length; i++) {
		accumulator[0][i] = new Array(names.length).fill(0);
	}

	data.reduce((acc, currentMonthData) => {
		const currentMonth = currentMonthData.month;
		
		// We deduct one because the month key is not actual data
		for (let i = 0; i < Object.keys(currentMonthData).length - 1; i++) {
			const row = currentMonthData[i];
			for (let j = 0; j < row.length; j++) {
				const currentAccumulatedValue = acc[0][i][j] ?? 0;
				const newValue = row[j];
				acc[0][i][j] = currentAccumulatedValue + newValue;
			}
		}
		
		return acc;
	}, accumulator);

	const matrix = [];
	for (let i = 0; i < names.length; i++) {
		matrix.push(accumulator[0][i]);
	}
    
    return { matrix, names };
  };
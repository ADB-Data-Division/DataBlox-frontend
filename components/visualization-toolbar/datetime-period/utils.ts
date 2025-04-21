import { DateTime } from "luxon";
import { Filter, DateTimeFilter } from "@/app/services/data-loader/data-loader-interface";

/**
 * Type guard to check if a filter is a datetime filter
 */
export const isDateTimeFilter = (filter: Filter): filter is DateTimeFilter => {
	return filter.type === 'datetime';
};

/**
 * Calculate date range for predefined time periods
 */
export const calculateDateRange = (period: string): { startDate: string, endDate: string } => {
	const today = DateTime.now();
	const endDate = today.toFormat('yyyy-MM-dd');
	
	let startDate: string;
	switch (period) {
		case 'lastYear':
			startDate = today.minus({ years: 1 }).toFormat('yyyy-MM-dd');
			break;
		case 'last6Months':
			startDate = today.minus({ months: 6 }).toFormat('yyyy-MM-dd');
			break;
		case 'last3Months':
			startDate = today.minus({ months: 3 }).toFormat('yyyy-MM-dd');
			break;
		case 'custom':
		default:
			startDate = today.minus({ months: 3 }).toFormat('yyyy-MM-dd');
			break;
	}
	
	return { startDate, endDate };
};

/**
 * Transform dates to month granularity
 */
export const transformToMonthGranularity = (dateStr: string, isEndDate: boolean): string => {
	if (!dateStr) return dateStr;
	
	const date = DateTime.fromFormat(dateStr, 'yyyy-MM-dd');
	if (!date.isValid) return dateStr;
	
	if (isEndDate) {
		// Set to last day of month
		return date.endOf('month').toFormat('yyyy-MM-dd');
	} else {
		// Set to first day of month
		return date.startOf('month').toFormat('yyyy-MM-dd');
	}
};

/**
 * Get dataset year from metadata or default to current year
 */
export const getDatasetYear = (startDateTime?: string): number => {
	if (startDateTime) {
		const dateTime = DateTime.fromISO(startDateTime);
		// Make sure the parsed date is valid
		if (dateTime.isValid) {
			return dateTime.year;
		}
	}
	return DateTime.now().year;
};

/**
 * Generate DateTimeFilter for a specific time period
 */
export const generateDateTimeFilter = (
	periodId: string, 
	datasetYear: number, 
	useMonthGranularity: boolean,
	customStartDate?: DateTime,
	customEndDate?: DateTime
): { startDate: DateTime, endDate: DateTime } => {
	// Ensure datasetYear is valid
	const year = (!isNaN(datasetYear) && datasetYear > 0) ? datasetYear : DateTime.now().year;
	
	let startDate: DateTime;
	let endDate: DateTime;
	
	switch (periodId) {
		case 'fullYear':
			startDate = DateTime.fromObject({ year: year, month: 1, day: 1 });
			endDate = DateTime.fromObject({ year: year, month: 12, day: 31 });
			break;
		case 'q1':
			startDate = DateTime.fromObject({ year: year, month: 1, day: 1 });
			endDate = DateTime.fromObject({ year: year, month: 3, day: 31 });
			break;
		case 'q2':
			startDate = DateTime.fromObject({ year: year, month: 4, day: 1 });
			endDate = DateTime.fromObject({ year: year, month: 6, day: 30 });
			break;
		case 'q3':
			startDate = DateTime.fromObject({ year: year, month: 7, day: 1 });
			endDate = DateTime.fromObject({ year: year, month: 9, day: 30 });
			break;
		case 'q4':
			startDate = DateTime.fromObject({ year: year, month: 10, day: 1 });
			endDate = DateTime.fromObject({ year: year, month: 12, day: 31 });
			break;
		case 'lastYear':
			startDate = DateTime.now().minus({ years: 1 });
			endDate = DateTime.now();
			break;
		case 'last6Months':
			startDate = DateTime.now().minus({ months: 6 });
			endDate = DateTime.now();
			break;
		case 'last3Months':
			startDate = DateTime.now().minus({ months: 3 });
			endDate = DateTime.now();
			break;
		case 'custom':
			if (customStartDate && customEndDate) {
				startDate = customStartDate;
				endDate = customEndDate;
			} else {
				startDate = DateTime.now().minus({ months: 3 });
				endDate = DateTime.now();
			}
			break;
		default:
			startDate = DateTime.now().minus({ months: 3 });
			endDate = DateTime.now();
	}
	
	// Apply month granularity transformation if enabled
	if (useMonthGranularity) {
		startDate = startDate.startOf('month');
		endDate = endDate.endOf('month');
	}
	
	return { startDate, endDate };
}; 
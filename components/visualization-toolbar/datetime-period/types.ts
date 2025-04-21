import { DateTimeFilter } from "@/app/services/data-loader/data-loader-interface";
import { DatasetMetadata } from "@/models/datasets";

export interface DateTimePeriodFilterProps {
	/**
	 * Callback function to handle filter changes
	 * @param filter - The filter to be applied
	 */
	onFilterChange: (filter: DateTimeFilter) => void;

	/**
	 * Default filter to be applied
	 */
	selectedDateTimeFilter?: DateTimeFilter;
	
	/**
	 * @deprecated Use selectedDateTimeFilter instead
	 * Default filter to be applied - for backward compatibility
	 */
	defaultFilter?: DateTimeFilter;
	
	/**
	 * Dataset metadata
	 */
	datasetMetadata: DatasetMetadata | null;
	
	/**
	 * Dark mode
	 */
	darkMode?: boolean;
} 


export interface TimePeriod {
	id: string;
	name: string;
	isEnabled: boolean;
} 
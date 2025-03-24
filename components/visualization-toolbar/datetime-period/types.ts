import { Filter, DateTimeFilter } from "@/app/services/data-loader/data-loader-interface";
import { DatasetMetadata } from "../dataset/types";

export interface DateTimePeriodFilterProps {
	/**
	 * Callback function to handle filter changes
	 * @param filter - The filter to be applied
	 */
	onFilterChange: (filter: DateTimeFilter) => void;

	/**
	 * Default filter to be applied
	 */
	defaultFilter?: Filter;
	
	/**
	 * Dataset metadata
	 */
	datasetMetadata: DatasetMetadata | null;
	
	/**
	 * Dark mode
	 */
	darkMode?: boolean;
} 
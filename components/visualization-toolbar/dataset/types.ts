import { DateTimeFilter } from "@/app/services/data-loader/data-loader-interface";

export interface DatasetMetadata {
	/**
	 * The date time filter to be applied to the dataset.
	 */
	dateTimeFilter: DateTimeFilter;
}
import { DateTimeFilter } from "@/app/store/features/datasetSlice";

export interface DatasetMetadata {
	/**
	 * The date time filter to be applied to the dataset.
	 */
	dateTimeFilter: DateTimeFilter;
}
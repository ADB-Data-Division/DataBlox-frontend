import { DatasetState } from "../features/datasetSlice";

export const datasetSelector = (state: any) => state.dataset as DatasetState;
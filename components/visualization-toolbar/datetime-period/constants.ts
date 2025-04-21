import { TimePeriod } from "./types";

export const PREDEFINED_TIME_PERIODS: TimePeriod[] = [
	{ id: 'fullYear', name: 'Full Year', isEnabled: true },
	{ id: 'q1', name: 'Q1 (Jan-Mar)', isEnabled: true },
	{ id: 'q2', name: 'Q2 (Apr-Jun)', isEnabled: true },
	{ id: 'q3', name: 'Q3 (Jul-Sep)', isEnabled: true },
	{ id: 'q4', name: 'Q4 (Oct-Dec)', isEnabled: true },
	// { id: 'lastYear', name: 'Last Year', isEnabled: true },
	// { id: 'last6Months', name: 'Last 6 Months', isEnabled: true },
	// { id: 'last3Months', name: 'Last 3 Months', isEnabled: true },
	{ id: 'custom', name: 'Custom Range', isEnabled: false }
];

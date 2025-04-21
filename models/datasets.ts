import { DateTimeFilter, ProvinceFilter, SubactionFilter } from "@/app/services/data-loader/data-loader-interface";

export type VisualizationType = 'bar' | 'map' | 'chord';

export type DatasetMetadata = {
	provinces: ProvinceFilter[];
	time_periods: DateTimeFilter[];
	subactions: SubactionFilter[];
	supported_visualization_types: VisualizationType[];
	uri: string;
};


export type Dataset = {
	id: string;
	name: string;
	subscription: 'free' | 'premium';
	metadata?: DatasetMetadata;
};

export const DATASETS : Dataset[] = [
	{ 
		id: 'migration-2019-2021-partial-move-in', 
		name: 'Move-in Dataset 2019-2021 (Partials)', 
		subscription: 'free',
		metadata: {
			uri: '/scaled_gps_movein_province.csv',
			subactions: [
				{
					subaction: 'movein',
					label: 'Move-in',
					type: 'subaction',
					filter_id: 'subaction-filter'
				}
			],
			provinces: [],
			time_periods: [
				{
					time_period: 'migration-2019-partial',
					label: '2019 (Jul - Dec)',
					start_date: '2019-07-01',
					end_date: '2019-12-31',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: 'migration-2020',
					label: '2020',
					start_date: '2020-01-01',
					end_date: '2020-12-31',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: 'migration-2021-partial',
					label: '2021 (Jan - Jun)',
					start_date: '2021-01-01',
					end_date: '2021-06-30',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: 'migration-all',
					label: 'All',
					start_date: '2019-07-01',
					end_date: '2021-06-30',
					type: 'datetime',
					filter_id: 'datetime-filter'
				}
			],
			supported_visualization_types: [
				'bar', 
				'map', 
			],
		}
	},
	{ 
		id: 'migration-2019-2021-partial-move-out', 
		name: 'Move-out Dataset 2019-2021 (Partials)', 
		subscription: 'free',
		metadata: {
			uri: '/scaled_gps_moveout_province.csv',
			subactions: [
				{
					subaction: 'moveout',
					label: 'Move-out',
					type: 'subaction',
					filter_id: 'subaction-filter'
				}
			],
			provinces: [],
			time_periods: [
				{
					time_period: 'migration-2019-partial',
					label: '2019 (Q3 - Q4)',
					start_date: '2019-07-01',
					end_date: '2019-12-31',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: 'migration-2020',
					label: '2020',
					start_date: '2020-01-01',
					end_date: '2020-12-31',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: 'migration-2021-partial',
					label: '2021 (Q1 - Q2)',
					start_date: '2021-01-01',
					end_date: '2021-06-30',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: 'migration-all',
					label: 'All (Q3 2019 - Q2 2021)',
					start_date: '2019-07-01',
					end_date: '2021-06-30',
					type: 'datetime',
					filter_id: 'datetime-filter'
				}
			],
			supported_visualization_types: [
				'bar', 
				'map', 
			],
		}
	},
	{ 
		id: 'migration-2020', 
		name: 'Province Migration Dataset 2020', 
		subscription: 'free', 
		metadata: {
			uri: '/Jan20-Dec20_sparse.json',
			subactions: [
				{
					subaction: 'raw',
					label: 'Overview',
					type: 'subaction',
					filter_id: 'subaction-filter'
				}
			],
			provinces: [],
			time_periods: [
				{
					time_period: '2020-q1',
					label: '2020 Q1',
					start_date: '2020-01-01',
					end_date: '2020-03-31',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: '2020-q2',
					label: '2020 Q2',
					start_date: '2020-04-01',
					end_date: '2020-06-30',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: '2020-q3',
					label: '2020 Q3',
					start_date: '2020-07-01',
					end_date: '2020-09-30',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: '2020-q4',
					label: '2020 Q4',
					start_date: '2020-10-01',
					end_date: '2020-12-31',
					type: 'datetime',
					filter_id: 'datetime-filter'
				},
				{
					time_period: '2020-all',
					label: 'All',
					start_date: '2020-01-01',
					end_date: '2020-12-31',
					type: 'datetime',
					filter_id: 'datetime-filter'
				}
			],
			supported_visualization_types: [
				'bar', 
				'map', 
				'chord'
			],
		}
	},
	{ id: 'premium-1', 
		name: 'Migration Dataset 2024', 
		subscription: 'premium', 
		metadata: {
			uri: '',
			subactions: [],
			provinces: [],
			time_periods: [],
			supported_visualization_types: [
				'bar', 
				'map', 
				'chord'
			],
		}
	},
	{ id: 'premium-2', 
		name: 'Migration Dataset 2025 Q1', 
		subscription: 'premium', 
		metadata: {
			uri: '',
			subactions: [],
			provinces: [],
			time_periods: [],
			
			supported_visualization_types: [
				'bar', 
				'map', 
				'chord'
			],
		}
	},
	{ 
		id: 'custom', 
		name: 'Custom Upload', 
		subscription: 'free', 
		metadata: {
			uri: '',
			subactions: [],
			provinces: [],
			time_periods: [],
			supported_visualization_types: [
				'bar', 
				'map', 
				'chord'
			],
		}
	},
];

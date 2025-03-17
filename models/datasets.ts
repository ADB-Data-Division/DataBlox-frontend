import STATIC_DATASETS from '@/public/datasets.json';

export type VisualizationType = 'bar' | 'map' | 'chord';

export type Dataset = {
	id: string;
	name: string;
	subscription: 'free' | 'premium';
	supported_visualizations: VisualizationType[];
};

export { STATIC_DATASETS };
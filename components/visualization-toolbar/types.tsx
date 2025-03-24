import { ChartBar, MapPin, ArrowsLeftRight } from "@phosphor-icons/react";

export type Subaction = 'movein' | 'moveout' | 'net' | 'raw';
export type VisualizationMethod = 'bar' | 'chord' | 'map';

export type VisualizationType = {
	id: VisualizationMethod;
	name: string;
	icon: React.ReactNode;
	supportedSubactions: Subaction[];
}

// Define visualization types
export const VISUALIZATION_TYPES: VisualizationType[] = [
	{ 
		id: 'bar', 
		name: 'Bar Chart', 
		icon: <ChartBar size={20} />, 
		supportedSubactions: ['movein', 'moveout', 'net'] 
	},
	{
		 id: 'map', 
		name: 'Map View', 
		icon: <MapPin size={20} />, 
		supportedSubactions: ['movein', 'moveout', 'net'] 
	},
	{ 
		id: 'chord', 
		name: 'Chord Diagram', 
		icon: <ArrowsLeftRight size={20} />, 
		supportedSubactions: ['raw'] 
	}
  ];
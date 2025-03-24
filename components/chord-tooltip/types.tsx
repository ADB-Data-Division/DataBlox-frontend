
// Updated tooltip interface
export interface TooltipData {
	visible: boolean;
	source?: string;
	destination?: string;
	sourceToDestValue?: number;
	sourceToDestPercent?: number;
	destToSourceValue?: number;
	destToSourcePercent?: number;
	sourceColor?: string;
	destColor?: string;
	x: number;
	y: number;
  }
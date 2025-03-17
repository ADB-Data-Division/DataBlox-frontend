import { Box, IconButton, Tooltip } from "@mui/material";
import { ChartBar, MapPin, ArrowsLeftRight } from "@phosphor-icons/react";
import { VisualizationFilters } from "./visualization-toolbar";

// Define visualization types
const VISUALIZATION_TYPES = [
	{ id: 'bar', name: 'Bar Chart', icon: <ChartBar size={20} /> },
	{ id: 'map', name: 'Map View', icon: <MapPin size={20} /> },
	{ id: 'chord', name: 'Chord Diagram', icon: <ArrowsLeftRight size={20} /> }
  ];

export type VisualizationSelectorProps = {
	filters: VisualizationFilters;
	darkMode: boolean;
	handleVisualizationTypeChange: (type: string) => void;
}

export default function VisualizationSelector({ filters, darkMode, handleVisualizationTypeChange }: VisualizationSelectorProps) {
	return (
		<>
		<Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            {VISUALIZATION_TYPES.map((type) => (
              <Tooltip key={type.id} title={type.name}>
                <IconButton
                  color={filters.visualizationType === type.id ? 'primary' : 'default'}
                  onClick={() => handleVisualizationTypeChange(type.id)}
                  sx={{ 
                    bgcolor: filters.visualizationType === type.id ? 
                      (darkMode ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)') : 
                      'transparent',
                    color: darkMode && filters.visualizationType !== type.id ? 
                      'rgba(255,255,255,0.7)' : undefined
                  }}
                >
                  {type.icon}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
		</>
	)
}
'use client';
import { Box, IconButton, Tooltip } from "@mui/material";
import { VisualizationFilters } from "./visualization-toolbar";
import { Subaction, VISUALIZATION_TYPES, VisualizationMethod, VisualizationType } from "./types";


export type VisualizationSelectorProps = {
  supportedVisualizations: VisualizationType[];
	filters: VisualizationFilters;
	darkMode: boolean;
	handleVisualizationTypeChange: (type: VisualizationMethod) => void;
}

export default function VisualizationSelector({ 
  filters, 
  darkMode, 
  handleVisualizationTypeChange,
  supportedVisualizations
}: VisualizationSelectorProps) {
	return (
		<>
		<Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            {supportedVisualizations.map((type) => (
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
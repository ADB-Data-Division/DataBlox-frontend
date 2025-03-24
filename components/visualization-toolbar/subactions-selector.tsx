'use client';
import { Box, Button } from "@mui/material";
import { Subaction } from "./types";
export type SubactionsSelectorProps = {
	selectedSubAction: string | null;
	darkMode: boolean;
	handleSubActionChange: (subAction: Subaction) => void;
  subActionOptions: {
    label: string;
    value: Subaction;
  }[];
}

export default function SubactionsSelector({ selectedSubAction, darkMode, handleSubActionChange, subActionOptions }: SubactionsSelectorProps) {
	return (
		<>
		{/* Data Type Selection */}
		<Box sx={{ display: 'flex', borderRadius: 1, overflow: 'hidden' }}>
            {subActionOptions.map((subAction) => (
              <Button
                key={subAction.value}
                variant={selectedSubAction === subAction.value ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleSubActionChange(subAction.value)}
                sx={{ 
                  borderRadius: '4px',
                  borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
                  color: selectedSubAction !== subAction.value && darkMode ? '#fff' : undefined,
                  marginRight: '4px'
                }}
              >
                {subAction.label}
              </Button>
            ))}
          </Box>
		</>
	)
}
import { Box, Button } from "@mui/material";

export type SubactionsSelectorProps = {
	selectedSubAction: string;
	darkMode: boolean;
	handleSubActionChange: (subAction: 'moveIn' | 'moveOut' | 'net') => void;
}

export default function SubactionsSelector({ selectedSubAction, darkMode, handleSubActionChange }: SubactionsSelectorProps) {
	return (
		<>
		{/* Data Type Selection */}
		<Box sx={{ display: 'flex', borderRadius: 1, overflow: 'hidden' }}>
            <Button
              variant={selectedSubAction === 'moveIn' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleSubActionChange('moveIn')}
              sx={{ 
                borderRadius: '4px 0 0 4px',
                borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
                color: selectedSubAction !== 'moveIn' && darkMode ? '#fff' : undefined
              }}
            >
              Move In
            </Button>
            <Button
              variant={selectedSubAction === 'moveOut' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleSubActionChange('moveOut')}
              sx={{ 
                borderRadius: 0,
                borderLeft: 0,
                borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
                color: selectedSubAction !== 'moveOut' && darkMode ? '#fff' : undefined
              }}
            >
              Move Out
            </Button>
            <Button
              variant={selectedSubAction === 'net' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => handleSubActionChange('net')}
              sx={{ 
                borderRadius: '0 4px 4px 0',
                borderLeft: 0,
                borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined,
                color: selectedSubAction !== 'net' && darkMode ? '#fff' : undefined
              }}
            >
              Net
            </Button>
          </Box>
		</>
	)
}
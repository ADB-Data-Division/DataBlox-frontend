import { Box, Paper, Typography } from "@mui/material";
import { TooltipData } from "./types";
// Redesigned Tooltip component
const ChordTooltip: React.FC<TooltipData & { darkMode: boolean }> = ({ 
	visible, 
	source, 
	destination, 
	sourceToDestValue,
	sourceToDestPercent,
	destToSourceValue,
	destToSourcePercent,
	sourceColor,
	destColor,
	x, 
	y, 
	darkMode 
  }) => {
	if (!visible || !source || !destination) return null;
	
	return (
	  <Paper
		elevation={3}
		sx={{
		  position: 'fixed',
		  top: 0,
		  left: 0,
		  transform: `translate(${x}px, ${y}px)`,
		  padding: '16px',
		  borderRadius: '4px',
		  width: '300px',
		  zIndex: 1000,
		  pointerEvents: 'none',
		  backgroundColor: darkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
		  color: darkMode ? '#ffffff' : '#333333',
		  transition: 'transform 0.1s ease-out',
		}}
	  >
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
		  {/* Source to Destination Flow */}
		  {sourceToDestValue !== undefined && sourceToDestPercent !== undefined && (
			<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
			  <Typography variant="body1" fontWeight="bold" sx={{ mb: 0.5 }}>
				{sourceToDestValue.toLocaleString()} ({sourceToDestPercent}%)
			  </Typography>
			  <Box sx={{ 
				display: 'flex', 
				alignItems: 'center', 
				width: '100%', 
				justifyContent: 'space-between' 
			  }}>
				<Typography variant="body2" sx={{ color: sourceColor }}>
				  {source}
				</Typography>
				<Box sx={{ 
				  flex: 1, 
				  height: '2px', 
				  backgroundColor: sourceColor || (darkMode ? '#fff' : '#000'),
				  mx: 1,
				  position: 'relative',
				  '&::after': {
					content: '""',
					position: 'absolute',
					right: 0,
					top: '-4px',
					width: 0,
					height: 0,
					borderTop: '5px solid transparent',
					borderBottom: '5px solid transparent',
					borderLeft: `8px solid ${sourceColor || (darkMode ? '#fff' : '#000')}`,
				  }
				}} />
				<Typography variant="body2" sx={{ color: destColor }}>
				  {destination}
				</Typography>
			  </Box>
			</Box>
		  )}
		  
		  {/* Destination to Source Flow - CORRECTED */}
		  {destToSourceValue !== undefined && destToSourcePercent !== undefined && (
			<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
			  <Typography variant="body1" fontWeight="bold" sx={{ mb: 0.5 }}>
				{destToSourceValue.toLocaleString()} ({destToSourcePercent}%)
			  </Typography>
			  <Box sx={{ 
				display: 'flex', 
				alignItems: 'center', 
				width: '100%', 
				justifyContent: 'space-between' 
			  }}>
				<Typography variant="body2" sx={{ color: sourceColor }}>
				  {source}
				</Typography>
				<Box sx={{ 
				  flex: 1, 
				  height: '2px', 
				  backgroundColor: destColor || (darkMode ? '#fff' : '#000'),
				  mx: 1,
				  position: 'relative',
				  '&::after': {
					content: '""',
					position: 'absolute',
					left: 0,
					top: '-4px',
					width: 0,
					height: 0,
					borderTop: '5px solid transparent',
					borderBottom: '5px solid transparent',
					borderRight: `8px solid ${destColor || (darkMode ? '#fff' : '#000')}`,
				  }
				}} />
				<Typography variant="body2" sx={{ color: destColor }}>
				  {destination}
				</Typography>
			  </Box>
			</Box>
		  )}
		</Box>
	  </Paper>
	);
  };
  

export default ChordTooltip;
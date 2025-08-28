'use client';

import { Box, Tooltip } from '@mui/material';
import { useConnectivity } from '@/app/contexts/ConnectivityContext';

export function ConnectivityStatus() {
  const { isConnected } = useConnectivity();

  return (
    <Tooltip title={isConnected ? 'API Connected' : 'API Disconnected'}>
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: isConnected ? '#4caf50' : '#f44336',
          border: '2px solid',
          borderColor: isConnected ? '#388e3c' : '#d32f2f',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.2)',
          },
        }}
      />
    </Tooltip>
  );
}
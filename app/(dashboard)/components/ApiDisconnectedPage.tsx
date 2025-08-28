'use client';

import { Box, Typography, Button, Container } from '@mui/material';
import { WifiOff, Refresh } from '@mui/icons-material';
import { useConnectivity } from '@/app/contexts/ConnectivityContext';
import { trackMigrationEvent, trackUserInteraction } from '@/src/utils/analytics';
import { useEffect } from 'react';

interface ApiDisconnectedPageProps {
  onRetry?: () => void;
}

export function ApiDisconnectedPage({ onRetry }: ApiDisconnectedPageProps) {
  const { isConnected } = useConnectivity();

  // Track disconnection event when component mounts
  useEffect(() => {
    trackMigrationEvent.trackError('api_disconnection', 'User encountered API disconnection page');
  }, []);

  const handleRetry = () => {
    trackUserInteraction('button_click', 'retry_connection');
    
    if (onRetry) {
      onRetry();
    } else {
      // Default retry action - attempt to reconnect
      window.location.reload();
    }
  };

  // Don't render if connected
  if (isConnected) return null;

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          py: 8,
        }}
      >
        <WifiOff
          sx={{
            fontSize: 80,
            color: 'error.main',
            mb: 3,
          }}
        />
        
        <Typography variant="h4" gutterBottom>
          Connection Lost
        </Typography>
        
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
          Unable to connect to the server. Please check your connection and try again.
        </Typography>

        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={handleRetry}
          size="large"
          sx={{ minWidth: 150 }}
        >
          Retry Connection
        </Button>

      </Box>
    </Container>
  );
}
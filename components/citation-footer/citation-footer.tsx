import React, { useState } from 'react';
import { Box, Button, Snackbar, Alert, Typography } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';

const APA_CITATION = "Data Division, Asian Development Bank. (2025). Enhancing Migration and Tourism Statistics using Mobile GPS Data [Dashboard]. Japan Fund for Prosperous and Resilient Asia and the Pacific (Technical Assistance 6856). Retrieved from " + (typeof window !== 'undefined' ? window.location.href : 'https://your-domain.com');

const CitationFooter: React.FC = () => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [snackbarMessage, setSnackbarMessage] = useState('');


  const handleCopyCitation = async () => {
    try {
      await navigator.clipboard.writeText(APA_CITATION);
      setSnackbarMessage('Citation copied to clipboard!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Failed to copy citation');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box
      sx={{
        mt: 2,
        py: 2,
        px: 2,
        backgroundColor: '#f3f4f6',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        borderRadius: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: '#374151',
            fontSize: '14px',
            wordBreak: 'break-word',
          }}
        >
          {APA_CITATION}
        </Typography>
      </Box>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ContentCopy />}
        onClick={handleCopyCitation}
        sx={{
          ml: 2,
          whiteSpace: 'nowrap',
          borderColor: '#2563eb',
          color: '#2563eb',
          '&:hover': {
            borderColor: '#1d4ed8',
            backgroundColor: '#eff6ff',
          },
        }}
      >
        Copy Citation
      </Button>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* CSS for responsive behavior */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .responsive-content-container {
            flex-direction: row !important;
          }
          
          .svg-container {
            flex: 2;
            max-width: 60%;
          }
          
          .table-container {
            flex: 1;
            max-width: 40%;
            min-width: 400px;
          }
        }
        
        @media (max-width: 1023px) {
          .responsive-content-container {
            flex-direction: column;
          }
          
          .svg-container {
            min-height: 40vh;
          }
          
          .table-container {
            min-height: auto;
          }
        }
      `}</style>
    </Box>
  );
};

export default CitationFooter;

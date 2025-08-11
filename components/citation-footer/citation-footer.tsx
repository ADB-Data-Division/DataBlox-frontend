import React, { useState } from 'react';
import { Box, Button, Snackbar, Alert, Typography } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';

const APA_CITATION = "Cordel, M., Smith, J., & Brown, A. (2025). Datablox: Thailand migration flow visualization. Asian Development Bank. Retrieved from " + (typeof window !== 'undefined' ? window.location.href : 'https://your-domain.com');

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
        mt: 4,
        py: 2,
        px: 3,
        backgroundColor: '#f3f4f6',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
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

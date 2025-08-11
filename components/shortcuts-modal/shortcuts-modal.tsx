'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, useTheme } from '@mui/material';
import { getCommandKey } from '../../src/utils/search';

export interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography component="span" variant="subtitle1" fontWeight="bold">
          Keyboard Shortcuts
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">Focus search bar</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: theme.palette.grey[100],
                  border: `1px solid ${theme.palette.grey[300]}`,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                {getCommandKey()}
              </Box>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: theme.palette.grey[100],
                  border: `1px solid ${theme.palette.grey[300]}`,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                K
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">Select first result</Typography>
            <Box
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: theme.palette.grey[100],
                border: `1px solid ${theme.palette.grey[300]}`,
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}
            >
              Enter
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">View Migration Trends</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: theme.palette.grey[100],
                  border: `1px solid ${theme.palette.grey[300]}`,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                Shift
              </Box>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: theme.palette.grey[100],
                  border: `1px solid ${theme.palette.grey[300]}`,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                Enter
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">Remove last selection</Typography>
            <Box
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                backgroundColor: theme.palette.grey[100],
                border: `1px solid ${theme.palette.grey[300]}`,
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}
            >
              Backspace
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">Show this help</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: theme.palette.grey[100],
                  border: `1px solid ${theme.palette.grey[300]}`,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                {getCommandKey()}
              </Box>
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: theme.palette.grey[100],
                  border: `1px solid ${theme.palette.grey[300]}`,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}
              >
                /
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}



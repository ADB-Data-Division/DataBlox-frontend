import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Popover,
  Grid,
  Tooltip
} from '@mui/material';
import { Palette } from '@phosphor-icons/react/dist/ssr';

// Predefined color palette (6x5 grid = 30 colors, organized by rows to display columns with same color shades)
const COLOR_PALETTE = [
  // Row 1 - Darkest shades
  '#1e40af', '#166534', '#991b1b', '#581c87', '#ea580c',
  // Row 2 - Dark shades
  '#2563eb', '#16a34a', '#dc2626', '#7c3aed', '#f97316',
  // Row 3 - Medium shades
  '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#fb923c',
  // Row 4 - Light shades
  '#60a5fa', '#4ade80', '#f87171', '#a78bfa', '#fdba74',
  // Row 5 - Lighter shades
  '#93c5fd', '#86efac', '#fca5a5', '#c4b5fd', '#fed7aa',
  // Row 6 - Lightest shades
  '#dbeafe', '#dcfce7', '#fee2e2', '#ede9fe', '#fff7ed'
];

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  label?: string;
  disabled?: boolean;
}

export default function ColorPicker({ 
  currentColor, 
  onColorChange, 
  label = "Edge Color",
  disabled = false 
}: ColorPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [hexValue, setHexValue] = useState(currentColor);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
      setHexValue(currentColor);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setHexValue(color);
    handleClose();
  };

  const handleHexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setHexValue(value);
    
    // Validate hex color format
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onColorChange(value);
    }
  };

  const handleHexBlur = () => {
    // If invalid hex, revert to current color
    if (!/^#[0-9A-F]{6}$/i.test(hexValue)) {
      setHexValue(currentColor);
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'color-picker-popover' : undefined;

  return (
    <>
      <Tooltip title={disabled ? "No edge selected" : `Change ${label}`}>
        <span>
          <IconButton
            aria-describedby={id}
            onClick={handleClick}
            disabled={disabled}
            sx={{
              width: 32,
              height: 32,
              border: 2,
              borderColor: disabled ? 'action.disabled' : 'divider',
              backgroundColor: disabled ? 'action.disabled' : currentColor,
              '&:hover': {
                backgroundColor: disabled ? 'action.disabled' : currentColor,
                opacity: disabled ? 1 : 0.8,
              }
            }}
          >
            <Palette size={16} color={disabled ? '#9ca3af' : '#ffffff'} />
          </IconButton>
        </span>
      </Tooltip>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Paper sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="subtitle2" gutterBottom>
            Choose {label}
          </Typography>
          
          {/* Color Grid */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 0.5,
              width: 150
            }}>
              {COLOR_PALETTE.map((color, index) => (
                <Box
                  key={index}
                  onClick={() => handleColorSelect(color)}
                  sx={{
                    width: 28,
                    height: 28,
                    backgroundColor: color,
                    border: currentColor === color ? 3 : 1,
                    borderColor: currentColor === color ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      boxShadow: 2
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Hex Input */}
          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
            Or enter hex color:
          </Typography>
          <TextField
            size="small"
            value={hexValue}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            placeholder="#000000"
            inputProps={{
              maxLength: 7,
              style: { fontFamily: 'monospace' }
            }}
            sx={{ width: '100%' }}
          />
        </Paper>
      </Popover>
    </>
  );
}

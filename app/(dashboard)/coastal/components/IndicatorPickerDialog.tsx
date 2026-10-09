'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  TextField,
  Typography,
} from '@mui/material';
import { COASTAL_INDICATOR_GROUPS, getIndicatorMeta } from '../indicators';

export interface IndicatorPickerDialogProps {
  open: boolean;
  onClose: () => void;
  selectedIndicators: string[];
  maxCount: number;
  onToggleIndicator: (indicatorId: string) => void;
}

export function IndicatorPickerDialog({
  open: dialogOpen,
  onClose,
  selectedIndicators,
  maxCount,
  onToggleIndicator,
}: IndicatorPickerDialogProps) {
  const [search, setSearch] = useState('');
  const atMax = selectedIndicators.length >= maxCount;
  const query = search.trim().toLowerCase();

  const visibleGroups = useMemo(
    () =>
      COASTAL_INDICATOR_GROUPS.map(({ group, ids }) => ({
        group,
        ids: ids.filter((id) => {
          if (!query) return true;
          const meta = getIndicatorMeta(id);
          return (
            meta?.label.toLowerCase().includes(query) ||
            id.toLowerCase().includes(query) ||
            meta?.unit.toLowerCase().includes(query)
          );
        }),
      })).filter(({ ids }) => ids.length > 0),
    [query],
  );

  return (
    <Dialog open={dialogOpen} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {`Indicators (${selectedIndicators.length}/${maxCount})`}
      </DialogTitle>
      <DialogContent>
        <TextField
          size="small"
          fullWidth
          placeholder="Search indicators"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 1, mt: 0.5 }}
          aria-label="Search indicators"
        />
        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {visibleGroups.map(({ group, ids }) => (
            <Box key={group} sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                component="div"
                sx={{
                  py: 0.75,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: 'text.secondary',
                }}
              >
                {group} ({ids.length})
              </Typography>
              <FormGroup>
                {ids.map((id) => {
                  const meta = getIndicatorMeta(id);
                  if (!meta) return null;
                  const isSelected = selectedIndicators.includes(id);
                  const disabled = !isSelected && atMax;
                  return (
                    <FormControlLabel
                      key={id}
                      control={
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => onToggleIndicator(id)}
                          sx={{
                            py: 0.25,
                            '&.Mui-checked': {
                              color: meta.color,
                            },
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {meta.label}{' '}
                          <Typography component="span" variant="caption" color="text.secondary">
                            · {meta.unit}
                          </Typography>
                        </Typography>
                      }
                    />
                  );
                })}
              </FormGroup>
            </Box>
          ))}
          {visibleGroups.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No indicators match “{search}”.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default IndicatorPickerDialog;

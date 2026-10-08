'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
  // Explicit user toggles per group. Unset = open only if the group holds a selection.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
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
        <Box sx={{ minHeight: 320, maxHeight: '60vh', overflowY: 'auto' }}>
          {visibleGroups.map(({ group, ids }) => {
            const hasSelected = ids.some((id) => selectedIndicators.includes(id));
            const open = query ? true : openGroups[group] ?? hasSelected;
            return (
              <Box key={group}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  component="button"
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group]: !open }))}
                  sx={{
                    width: '100%',
                    py: 0.75,
                    px: 0,
                    border: 0,
                    background: 'none',
                    cursor: 'pointer',
                    color: 'text.secondary',
                    textAlign: 'left',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    {group} ({ids.length})
                  </Typography>
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  />
                </Stack>
                <Collapse in={open} unmountOnExit>
                  <FormGroup sx={{ mb: 1 }}>
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
                </Collapse>
              </Box>
            );
          })}
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

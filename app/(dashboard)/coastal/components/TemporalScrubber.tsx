import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, IconButton, Slider, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';

export interface TemporalScrubberProps {
  periods: string[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  grain: string;
  disabled?: boolean;
}

export default function TemporalScrubber({
  periods,
  currentIndex,
  onChangeIndex,
  grain,
  disabled = false,
}: TemporalScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleJumpToStart = useCallback(() => {
    onChangeIndex(0);
  }, [onChangeIndex]);

  const handleJumpToEnd = useCallback(() => {
    if (periods.length > 0) {
      onChangeIndex(periods.length - 1);
    }
  }, [periods, onChangeIndex]);

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    onChangeIndex(newValue as number);
  };

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        if (currentIndexRef.current >= periods.length - 1) {
          setIsPlaying(false);
        } else {
          onChangeIndex(currentIndexRef.current + 1);
        }
      }, 800);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, periods.length, onChangeIndex]);

  useEffect(() => {
    if (currentIndex >= periods.length - 1 && isPlaying) {
      setIsPlaying(false);
    }
  }, [currentIndex, periods.length, isPlaying]);

  const marks = periods.map((_, index) => ({ value: index }));

  const startYearMatch = periods.length > 0 ? periods[0].match(/\d{4}/) : null;
  const startYear = startYearMatch ? startYearMatch[0] : '2024';

  const endYearMatch = periods.length > 0 ? periods[periods.length - 1].match(/\d{4}/) : null;
  const endYear = endYearMatch ? endYearMatch[0] : '2025';

  return (
    <Box sx={{ width: '100%', p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <IconButton onClick={handleJumpToStart} disabled={disabled || currentIndex === 0} size="small" aria-label="Jump to start">
          <SkipPreviousIcon />
        </IconButton>
        <IconButton onClick={handlePlayPause} disabled={disabled || periods.length === 0 || (currentIndex === periods.length - 1 && !isPlaying)} size="small" aria-label="Play or pause">
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>

        <Box sx={{ flexGrow: 1, px: 2, position: 'relative' }}>
          <Slider
            value={currentIndex}
            min={0}
            max={Math.max(0, periods.length - 1)}
            step={1}
            marks={marks}
            onChange={handleSliderChange}
            disabled={disabled || periods.length === 0}
            valueLabelDisplay="on"
            valueLabelFormat={(value) => periods[value] || ''}
            sx={{
              '& .MuiSlider-valueLabel': {
                fontSize: 12,
                fontWeight: 'normal',
                top: -6,
                backgroundColor: 'background.paper',
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1,
                py: 0.5,
                '&::before': {
                  display: 'none',
                },
              },
              '& .MuiSlider-mark': {
                backgroundColor: 'currentColor',
                height: 4,
                width: 4,
                borderRadius: '50%',
                '&.MuiSlider-markActive': {
                  opacity: 1,
                  backgroundColor: 'currentColor',
                },
              },
            }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: -1 }}>
            <Typography variant="caption" color="text.secondary">{startYear}</Typography>
            <Typography variant="caption" color="text.secondary">{endYear}</Typography>
          </Stack>
        </Box>

        <IconButton onClick={handleJumpToEnd} disabled={disabled || currentIndex === periods.length - 1} size="small" aria-label="Jump to end">
          <SkipNextIcon />
        </IconButton>
      </Stack>
    </Box>
  );
}

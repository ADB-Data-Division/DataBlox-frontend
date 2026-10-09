import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, IconButton, Slider, Stack, Typography, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TemporalScrubberPopover from './TemporalScrubberPopover';

export interface TemporalScrubberProps {
  periods: string[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  grain: string;
  disabled?: boolean;
  activeYear?: number;
  onPrevYear?: () => void;
  onNextYear?: () => void;
  canPrevYear?: boolean;
  canNextYear?: boolean;
}

export default function TemporalScrubber({
  periods,
  currentIndex,
  onChangeIndex,
  grain,
  disabled = false,
  activeYear,
  onPrevYear,
  onNextYear,
  canPrevYear = true,
  canNextYear = true,
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

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
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
      }, 700);
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

  const isWeekly = grain.toLowerCase() === 'weekly';

  const marks = useMemo(() => {
    if (isWeekly) {
      return periods
        .map((_, index) => ({ value: index }))
        .filter((m) => m.value === 0 || m.value === periods.length - 1 || m.value % 4 === 0);
    }
    if (periods.length <= 24) {
      return periods.map((_, index) => ({ value: index }));
    }
    const interval = periods.length > 60 ? 12 : 6;
    return periods
      .map((_, index) => ({ value: index }))
      .filter((m) => m.value === 0 || m.value === periods.length - 1 || m.value % interval === 0);
  }, [periods, isWeekly]);

  const startYearMatch = periods.length > 0 ? periods[0].match(/\d{4}/) : null;
  const derivedStartYear = activeYear ? String(activeYear) : startYearMatch ? startYearMatch[0] : '';
  const derivedEndYear = activeYear
    ? String(activeYear + 1)
    : periods.length > 0
    ? periods[periods.length - 1].match(/\d{4}/)?.[0] || ''
    : '';

  return (
    <Box
      sx={{
        width: '100%',
        px: 1.5,
        py: 0,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        {isWeekly && onPrevYear ? (
          <Tooltip title="Previous Year">
            <span>
              <IconButton
                onClick={onPrevYear}
                disabled={disabled || !canPrevYear}
                size="small"
                aria-label="Previous year"
              >
                <ChevronLeftIcon />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <IconButton
            onClick={handleJumpToStart}
            disabled={disabled || currentIndex === 0}
            size="small"
            aria-label="Jump to start"
          >
            <SkipPreviousIcon />
          </IconButton>
        )}

        <IconButton
          onClick={handlePlayPause}
          disabled={disabled || periods.length === 0 || (currentIndex === periods.length - 1 && !isPlaying)}
          size="small"
          aria-label="Play or pause"
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>

        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
          {derivedStartYear}
        </Typography>

        <Box sx={{ flexGrow: 1, mx: 1.5, height: 20, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Slider
            value={currentIndex}
            min={0}
            max={Math.max(0, periods.length - 1)}
            step={1}
            marks={marks}
            onChange={handleSliderChange}
            disabled={disabled || periods.length === 0}
            sx={{
              py: 0,
              width: '100%',
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
          {periods.length > 0 && (
            <TemporalScrubberPopover
              percent={(currentIndex / Math.max(1, periods.length - 1)) * 100}
              label={periods[currentIndex] || ''}
            />
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
          {derivedEndYear}
        </Typography>

        {isWeekly && onNextYear ? (
          <Tooltip title="Next Year">
            <span>
              <IconButton
                onClick={onNextYear}
                disabled={disabled || !canNextYear}
                size="small"
                aria-label="Next year"
              >
                <ChevronRightIcon />
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <IconButton
            onClick={handleJumpToEnd}
            disabled={disabled || currentIndex === periods.length - 1}
            size="small"
            aria-label="Jump to end"
          >
            <SkipNextIcon />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
}

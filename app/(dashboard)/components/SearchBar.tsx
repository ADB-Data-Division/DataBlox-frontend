'use client';

import { KeyboardEvent, RefObject } from 'react';
import { 
  TextField, 
  InputAdornment, 
  Box, 
  Button, 
  useTheme 
} from '@mui/material';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr';
import { getCommandKey } from '../../../src/utils/search';
import { Location } from '../helper';

interface SearchBarProps {
  inputRef: RefObject<HTMLInputElement>;
  searchQuery: string;
  selectedLocations: Location[];
  highlightedForDeletion: number | null;
  isLoading: boolean;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onExecuteQuery: () => void;
}

export function SearchBar({
  inputRef,
  searchQuery,
  selectedLocations,
  highlightedForDeletion,
  isLoading,
  onSearchChange,
  onKeyDown,
  onExecuteQuery
}: SearchBarProps) {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'flex-start' }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        placeholder="Search for provinces or districts"
        value={searchQuery}
        onChange={onSearchChange}
        onKeyDown={onKeyDown}
        variant="outlined"
        size="medium"
        disabled={isLoading}
        sx={{ 
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          }
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <MagnifyingGlassIcon size={20} color={theme.palette.text.secondary} />
              </InputAdornment>
            ),
          }
        }}
        helperText={
          <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <span>Press Enter to select. {getCommandKey()}+/ for help.</span>
            {selectedLocations.length > 0 && (
              <span style={{ color: theme.palette.primary.main }}>
                {selectedLocations.length} location{selectedLocations.length > 1 ? 's' : ''} selected
                {highlightedForDeletion && (
                  <span style={{ color: theme.palette.error.main, marginLeft: '8px' }}>
                    (Press Backspace again to delete)
                  </span>
                )}
              </span>
            )}
          </Box>
        }
      />

      {selectedLocations.length > 0 && (
        <Button
          variant="contained"
          size="large"
          onClick={onExecuteQuery}
          disabled={isLoading}
          sx={{
            px: 3,
            py: 1.75,
            fontSize: '14px',
            fontWeight: 'bold',
            borderRadius: 2,
            textTransform: 'none',
            boxShadow: 2,
            minWidth: '240px',
            height: '56px',
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          View Migration Trends
        </Button>
      )}
    </Box>
  );
}
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
import { ThailandRegion, getRegionDisplayName } from '../../services/api/province-regions';

interface SearchBarProps {
  inputRef: RefObject<HTMLInputElement>;
  searchQuery: string;
  selectedLocations: Location[];
  highlightedForDeletion: number | null;
  isLoading: boolean;
  allowedType?: string | null;
  searchedRegion?: ThailandRegion | null;
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
  allowedType,
  searchedRegion,
  onSearchChange,
  onKeyDown,
  onExecuteQuery
}: SearchBarProps) {
  const theme = useTheme();

  const getLocationTypeLabel = (locations: Location[]) => {
    if (locations.length === 0) return 'location';
    
    // Get unique location types
    const types = [...new Set(locations.map(loc => loc.type))];
    
    // If all locations are the same type, use that type's label
    if (types.length === 1) {
      const type = types[0];
      switch (type) {
        case 'province': return `province${locations.length > 1 ? 's' : ''}`;
        case 'district': return `district${locations.length > 1 ? 's' : ''}`;
        case 'subDistrict': return `sub-district${locations.length > 1 ? 's' : ''}`;
      }
    }
    
    // If mixed types, use generic "location" with plural if needed
    return `location${locations.length > 1 ? 's' : ''}`;
  };

  const getSearchPlaceholder = () => {
    if (searchedRegion) {
      const regionName = getRegionDisplayName(searchedRegion);
      return `Search for provinces in ${regionName}`;
    }
    
    if (allowedType) {
      switch (allowedType) {
        case 'province': return 'Search for provinces';
        case 'district': return 'Search for districts';
        case 'subDistrict': return 'Search for sub-districts';
        default: return 'Search for locations';
      }
    }
    return 'Search for provinces, districts, or sub-districts';
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'flex-start' }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        placeholder={getSearchPlaceholder()}
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
                {selectedLocations.length} {getLocationTypeLabel(selectedLocations)} selected
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
'use client';

import { FormControl, InputLabel, Select, OutlinedInput, Box, Chip, MenuItem, SelectChangeEvent, CircularProgress } from "@mui/material";
import { Province } from "@/models/province-district-subdistrict";
import { useAppDispatch } from "@/app/store/hooks";
import { addFilter } from "@/app/store/features/datasetSlice";
import { ProvinceFilter } from "@/app/services/data-loader/data-loader-interface";
import { metadataService } from "@/app/services/api";
import { Province as APIProvince } from "@/app/services/api/types";
import { useState, useEffect } from "react";
export type ProvinceFilterProps = {
  provinceFilter: ProvinceFilter;
	darkMode: boolean;
	onProvinceChange?: (provinces: string[]) => void;
}

export default function ProvinceFilterUI({ 
  darkMode, 
  onProvinceChange,
  provinceFilter
}: ProvinceFilterProps) {
	const dispatch = useAppDispatch();
	const [provinces, setProvinces] = useState<APIProvince[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch provinces from metadata API
	useEffect(() => {
		const fetchProvinces = async () => {
			try {
				setLoading(true);
				setError(null);
				const provincesData = await metadataService.getProvinces();
				setProvinces(provincesData);
			} catch (error) {
				console.error('Failed to fetch provinces:', error);
				setError('Failed to load provinces');
			} finally {
				setLoading(false);
			}
		};

		fetchProvinces();
	}, []);
	
	const handleProvinceChange = (event: SelectChangeEvent<string[]>) => {
		const value = event.target.value;
		const selectedProvinces = typeof value === 'string' ? value.split(',') : value;
		
		// Update Redux state
		dispatch(addFilter({
      filter_id: 'province-filter',
      type: 'province',
      province_ids: selectedProvinces
    } as ProvinceFilter));
		
		// Call optional callback for backward compatibility
		if (onProvinceChange) {
			onProvinceChange(selectedProvinces);
		}
	};
	
	return (
		<FormControl 
          sx={{ 
            width: 400,
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: darkMode ? 'rgba(255,255,255,0.3)' : undefined
            },
            '.MuiInputLabel-root': {
              color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
            },
            '.MuiSelect-icon': {
              color: darkMode ? 'rgba(255,255,255,0.7)' : undefined
            }
          }}
        >
          <InputLabel id="province-select-label" shrink sx={{ color: darkMode ? '#fff' : undefined }}>
            Province
          </InputLabel>
          <Select
            labelId="province-select-label"
            multiple
            value={provinceFilter?.province_ids ?? []}
            onChange={handleProvinceChange}
            input={<OutlinedInput label="Provinces" />}
            renderValue={(selected: string[]) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value: string) => {
                  const province = provinces.find((p: APIProvince) => p.id === value);
                  return (
                    <Chip 
                      key={value} 
                      label={province?.name || value} 
                      size="small"
                      sx={{ 
                        bgcolor: 'primary.main',
                        color: '#fff'
                      }}
                    />
                  );
                })}
              </Box>
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 250
                }
              }
            }}
            sx={{ color: darkMode ? '#fff' : undefined }}
            disabled={loading}
          >
            {loading ? (
              <MenuItem disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  Loading provinces...
                </Box>
              </MenuItem>
            ) : error ? (
              <MenuItem disabled>
                <Box sx={{ color: 'error.main' }}>
                  {error}
                </Box>
              </MenuItem>
            ) : provinces.length === 0 ? (
              <MenuItem disabled>
                No provinces available
              </MenuItem>
            ) : (
              provinces.map((province) => (
                <MenuItem key={province.id} value={province.id}>
                  {province.name} {province.code && `(${province.code})`}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
	)
}
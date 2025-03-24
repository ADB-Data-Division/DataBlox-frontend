'use client';

import { FormControl, InputLabel, Select, OutlinedInput, Box, Chip, MenuItem, Typography, SelectChangeEvent } from "@mui/material";
import PROVINCES from "@/public/provinces.json";
import { Province } from "@/models/province-district-subdistrict";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { addFilter } from "@/app/store/features/datasetSlice";
import { ProvinceFilter } from "@/app/services/data-loader/data-loader-interface";
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
	
	const handleProvinceChange = (event: SelectChangeEvent<string[]>) => {
		const value = event.target.value;
		const selectedProvinces = typeof value === 'string' ? value.split(',') : value;
		
		// Update Redux state
		dispatch(addFilter({
      filter_id: 'province',
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
                  const province = PROVINCES.find((p: Province) => p.id === value);
                  return (
                    <Chip 
                      key={value} 
                      label={province?.name} 
                      size="small"
                      sx={{ 
                        bgcolor: province?.category === 'industrial' ? 
                          'primary.main' : 'success.main',
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
          >
            <MenuItem disabled>
              <Typography variant="caption" fontWeight="bold">
                Industrial
              </Typography>
            </MenuItem>
            {PROVINCES.filter((p: Province) => p.category === 'industrial').map((province) => (
              <MenuItem key={province.id} value={province.id}>
                {province.name}
              </MenuItem>
            ))}
            <MenuItem disabled>
              <Typography variant="caption" fontWeight="bold">
                Agricultural
              </Typography>
            </MenuItem>
            {PROVINCES.filter(p => p.category === 'agricultural').map((province) => (
              <MenuItem key={province.id} value={province.id}>
                {province.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
	)
}
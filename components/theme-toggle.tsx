'use client';

import React from 'react';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Tooltip,
  useTheme
} from '@mui/material';
import { 
  Sun, 
  Moon, 
  Desktop 
} from '@phosphor-icons/react';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { setThemeMode, ThemeMode } from '@/app/store/features/userPreferencesSlice';

export default function ThemeToggle() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { themeMode } = useAppSelector(state => state.userPreferences);
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleThemeChange = (mode: ThemeMode) => {
	console.log('handleThemeChange', mode);
    dispatch(setThemeMode(mode));
    handleClose();
  };
  
  // Determine which icon to show based on current theme mode
  const getThemeIcon = () => {
    const isDarkMode = theme.palette.mode === 'dark';
    
    if (themeMode === 'system') {
      return <Desktop size={24} weight="regular" />;
    } else if (isDarkMode) {
      return <Moon size={24} weight="regular" />;
    } else {
      return <Sun size={24} weight="regular" />;
    }
  };
  
  return (
    <>
      <Tooltip title="Theme settings">
        <IconButton
          onClick={handleClick}
          size="small"
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          sx={{ 
            color: theme.palette.mode === 'dark' ? '#fff' : undefined,
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          {getThemeIcon()}
        </IconButton>
      </Tooltip>
      
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 180,
            borderRadius: 2,
            mt: 1,
            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : undefined
          }
        }}
      >
        <MenuItem 
          onClick={() => handleThemeChange('light')}
          selected={themeMode === 'light'}
        >
          <ListItemIcon>
            <Sun size={20} weight="regular" />
          </ListItemIcon>
          <ListItemText>Light</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleThemeChange('dark')}
          selected={themeMode === 'dark'}
        >
          <ListItemIcon>
            <Moon size={20} weight="regular" />
          </ListItemIcon>
          <ListItemText>Dark</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => handleThemeChange('system')}
          selected={themeMode === 'system'}
        >
          <ListItemIcon>
            <Desktop size={20} weight="regular" />
          </ListItemIcon>
          <ListItemText>System</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
} 
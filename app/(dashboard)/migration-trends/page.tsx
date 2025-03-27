'use client';

import { useTheme } from '@mui/material/styles';
import IndustryMigration from './page-content';

export default function IndustryMigrationPage() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  return <IndustryMigration darkMode={isDarkMode} />;
}

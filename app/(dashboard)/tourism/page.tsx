import * as React from 'react';
import Typography from '@mui/material/Typography';
import { auth } from '../../../auth';
import { Box } from '@mui/material';
import PageContent from './page-content';

export default async function HomePage() {
  const session = await auth();

  return (    
      <PageContent />
  );
}

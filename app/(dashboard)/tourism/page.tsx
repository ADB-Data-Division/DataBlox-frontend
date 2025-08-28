import * as React from 'react';
import { auth } from '../../../auth';
import PageContent from './page-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tourism Analysis - Datablox',
  description: 'Interactive tourism migration analysis with bar charts and time series filtering'
};


export default async function HomePage() {
  const session = await auth();

  return (    
      <PageContent />
  );
}

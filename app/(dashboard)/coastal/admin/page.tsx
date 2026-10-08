import React, { Suspense } from 'react';
import { Metadata } from 'next';
import PageContent from './page-content';

export const metadata: Metadata = {
  title: 'Coastal Admin Dashboard | DataBlox',
};

export default function CoastalAdminDashboardPage() {
  return (
    <Suspense fallback={<div>Loading page content...</div>}>
      <PageContent />
    </Suspense>
  );
}

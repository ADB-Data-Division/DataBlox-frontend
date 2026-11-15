import React, { Suspense } from 'react';
import { Metadata } from 'next';
import PageContent from './page-content';

export const metadata: Metadata = {
  title: 'Coastal Upload Portal | Data Division Dashboard',
};

export default function CoastalAdminUploadPage() {
  return (
    <Suspense fallback={<div>Loading page content...</div>}>
      <PageContent />
    </Suspense>
  );
}

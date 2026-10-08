import React, { Suspense } from 'react';
import { Metadata } from 'next';
import PageContent from './page-content';

export const metadata: Metadata = {
  title: 'Coastal Admin Preview | DataBlox',
};

export default function CoastalAdminPreviewPage() {
  return (
    <Suspense fallback={<div>Loading page content...</div>}>
      <PageContent />
    </Suspense>
  );
}

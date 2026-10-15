import React, { Suspense } from 'react';
import { Metadata } from 'next';
import PageContent from './page-content';

export const metadata: Metadata = {
  title: 'Coastal Admin Users | DataBlox',
};

export default function CoastalAdminUsersPage() {
  return (
    <Suspense fallback={<div>Loading page content...</div>}>
      <PageContent />
    </Suspense>
  );
}

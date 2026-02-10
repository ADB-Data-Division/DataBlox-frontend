import * as React from 'react';
import { auth } from '../../../auth';
import PageContent from './page-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Migration Flows - Datablox',
  description: 'Datablox is a platform for analyzing migration data'
};


export default async function MigrationFlowsPage() {
  const session = await auth();

  return (    
      <PageContent />
  );
}

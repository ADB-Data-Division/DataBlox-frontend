import type { Metadata } from 'next';
import PageContent from './page-content';

export const metadata: Metadata = {
  title: 'Migration Trends - Datablox',
  description: 'Interactive migration data analysis with bar charts and time series filtering'
};

export default function MigrationAnalysisPage() {
  return <PageContent />;
}
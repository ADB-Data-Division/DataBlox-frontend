import type { Metadata } from 'next';
import PageContent from './page-content';

export const metadata: Metadata = {
  title: 'Tourism Trend Over Time - Datablox',
  description: 'Interactive tourism trend analysis with bar charts and time series filtering'
};

export default function TourismTrendPage() {
  return <PageContent />;
}
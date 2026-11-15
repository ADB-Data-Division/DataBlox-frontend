import type { Metadata } from 'next';
import PageContent from './page-content';

export const metadata: Metadata = {
  title: 'Tourism Trends - Data Division Dashboard',
  description: 'Interactive tourism trend analysis with bar charts and time series filtering'
};

export default function TourismTrendPage() {
  return <PageContent />;
}
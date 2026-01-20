import type { Metadata } from 'next';
import PageContent from './page-content';

export const metadata: Metadata = {
  title: 'Overtourism Analysis - Datablox',
  description: 'Analyze overtourism metrics including Irritation Index and Environmental Stress across Thai provinces.'
};

export default function OvertourismPage() {
  return <PageContent />;
}

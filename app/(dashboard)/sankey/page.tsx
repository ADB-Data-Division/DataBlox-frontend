import type { Metadata } from 'next';
import PageContent from './page-content';

export const metadata: Metadata = {
  title: 'Sankey Diagram - Capacity Building Visualization',
  description: 'Interactive sankey-style migration flow visualization using chord diagrams'
};

export default function SankeyPage() {
  return <PageContent />;
}

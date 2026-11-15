import * as React from 'react';
import PageContent from './page-content';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home - Data Division Dashboard',
  description: 'Data Division Dashboard is a platform for analyzing migration and tourism data',
};

export default function HomePage() {
  return <PageContent />;
}

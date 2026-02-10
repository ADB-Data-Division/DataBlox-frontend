import * as React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Datablox',
  description: 'Datablox is a platform for analyzing migration data'
};


export default function HomePage() {
  redirect('/home');
}

'use client';

import React from 'react';
import { useUserType } from '../app/contexts/UserTypeContext';
import UnifiedFooter from './UnifiedFooter';

export default function FooterWrapper() {
  const userTypeContext = useUserType();

  return <UnifiedFooter userTypeContext={userTypeContext} />;
}
'use client';

import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './index';
import { isBrowser } from './utils';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  // Add state to track if we're hydrated
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Update hydrated state once the component mounts
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // In SSR or before hydration, render a minimal version
  if (!isBrowser() || !persistor || !isHydrated) {
    return <Provider store={store}>{children}</Provider>;
  }
  
  // In browser environment after hydration, use PersistGate
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
} 
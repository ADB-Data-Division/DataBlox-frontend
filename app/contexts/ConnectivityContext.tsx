'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/app/services/api/client';

interface ConnectivityContextType {
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

interface ConnectivityProviderProps {
  children: React.ReactNode;
}

export function ConnectivityProvider({ children }: ConnectivityProviderProps) {
  const [isConnected, setIsConnected] = useState(true);

  const setConnected = (connected: boolean) => {
    setIsConnected(connected);
  };

  useEffect(() => {
    // Register the connectivity callback with the API client
    apiClient.setConnectivityCallback(setConnected);
  }, []);

  const value = {
    isConnected,
    setConnected,
  };

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (context === undefined) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
}
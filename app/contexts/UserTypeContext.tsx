'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { UserTypeData } from '../../components/user-type-modal';
import { trackMigrationEvent } from '../../src/utils/analytics';

interface UserTypeContextType {
  userType: UserTypeData | null;
  showModal: boolean;
  setUserType: (data: UserTypeData) => void;
  openModal: () => void;
  closeModal: () => void;
}

const UserTypeContext = createContext<UserTypeContextType | undefined>(undefined);

interface UserTypeProviderProps {
  children: ReactNode;
}

const USER_TYPE_STORAGE_KEY = 'datablox-user-type';
const USER_TYPE_EXPIRY_KEY = 'datablox-user-type-expiry';
const EXPIRY_DAYS = 30;

interface StoredUserType {
  data: UserTypeData;
  timestamp: number;
}

export function UserTypeProvider({ children }: UserTypeProviderProps) {
  const [userType, setUserTypeState] = useState<UserTypeData | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Load user type from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_TYPE_STORAGE_KEY);
      if (stored) {
        const parsed: StoredUserType = JSON.parse(stored);
        const now = Date.now();
        const expiryTime = parsed.timestamp + (EXPIRY_DAYS * 24 * 60 * 60 * 1000); // 30 days in milliseconds
        
        if (now < expiryTime) {
          // Data is still valid
          setUserTypeState(parsed.data);
        } else {
          // Data has expired, clean up and show modal
          localStorage.removeItem(USER_TYPE_STORAGE_KEY);
          localStorage.removeItem(USER_TYPE_EXPIRY_KEY); // Clean up legacy key if it exists
          const timer = setTimeout(() => {
            setShowModal(true);
          }, 1000);
          return () => clearTimeout(timer);
        }
      } else {
        // If no user type is stored, show modal after a short delay
        const timer = setTimeout(() => {
          setShowModal(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Failed to load user type from localStorage:', error);
      // Clean up corrupted data and show modal
      localStorage.removeItem(USER_TYPE_STORAGE_KEY);
      localStorage.removeItem(USER_TYPE_EXPIRY_KEY);
      setShowModal(true);
    }
  }, []);

  const setUserType = useCallback((data: UserTypeData) => {
    setUserTypeState(data);
    try {
      const storedData: StoredUserType = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(USER_TYPE_STORAGE_KEY, JSON.stringify(storedData));
      
      // Track the user type selection with GA4
      trackMigrationEvent.selectUserType(data.orgType, data.role, data.firmSize);
    } catch (error) {
      console.error('Failed to save user type to localStorage:', error);
    }
  }, []);

  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const contextValue: UserTypeContextType = {
    userType,
    showModal,
    setUserType,
    openModal,
    closeModal,
  };

  return (
    <UserTypeContext.Provider value={contextValue}>
      {children}
    </UserTypeContext.Provider>
  );
}

export function useUserType() {
  const context = useContext(UserTypeContext);
  if (context === undefined) {
    throw new Error('useUserType must be used within a UserTypeProvider');
  }
  return context;
}
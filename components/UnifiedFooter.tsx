'use client';

import React from 'react';
import { Button } from '@mui/material';
import { GearSix } from '@phosphor-icons/react';

const USER_TYPE_STORAGE_KEY = 'datablox-user-type';
const USER_TYPE_EXPIRY_KEY = 'datablox-user-type-expiry';

interface SettingsButtonProps {
  openModal: () => void;
}

const SettingsButton = ({ openModal }: SettingsButtonProps) => {
  const handleReconfigure = () => {
    // Clear user type data from localStorage
    localStorage.removeItem(USER_TYPE_STORAGE_KEY);
    localStorage.removeItem(USER_TYPE_EXPIRY_KEY);
    
    // Open the user type modal
    openModal();
  };

  return (
    <Button
      size="small"
      startIcon={<GearSix size={14} />}
      onClick={handleReconfigure}
      sx={{
        fontSize: '11px',
        textTransform: 'none',
        color: '#666666',
        '&:hover': {
          backgroundColor: 'rgba(0, 119, 190, 0.1)',
          color: '#0077BE'
        }
      }}
    >
      User Settings
    </Button>
  );
};

interface UnifiedFooterProps {
  userTypeContext?: {
    openModal: () => void;
  };
}

export default function UnifiedFooter({ userTypeContext }: UnifiedFooterProps) {
  return (
    <footer style={{
      padding: '16px',
      textAlign: 'center',
      fontSize: '12px',
      color: '#666666',
      borderTop: '1px solid #E5E7EB',
      backgroundColor: '#FAFBFD',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a 
          href="/privacy-policy" 
          style={{ 
            color: '#0077BE', 
            textDecoration: 'none'
          }}
        >
          Privacy Policy
        </a>
        <span>© 2025 Datablox. All rights reserved.</span>
      </div>
      
      {userTypeContext && (
        <SettingsButton openModal={userTypeContext.openModal} />
      )}
    </footer>
  );
}
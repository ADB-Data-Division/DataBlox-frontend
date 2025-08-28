'use client';

import React from 'react';
import { GearSix } from '@phosphor-icons/react';

interface SettingsButtonProps {
  openModal: () => void;
}

const SettingsButton = ({ openModal }: SettingsButtonProps) => {
  const handleOpenSettings = () => {
    // Just open the modal without clearing user data
    openModal();
  };

  return (
    <button
      onClick={handleOpenSettings}
      style={{
        background: 'none',
        border: 'none',
        fontSize: '12px',
        color: '#0077BE',
        textDecoration: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.textDecoration = 'underline';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.textDecoration = 'none';
      }}
    >
      <GearSix size={14} />
      User Settings
    </button>
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
          target="_blank"
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
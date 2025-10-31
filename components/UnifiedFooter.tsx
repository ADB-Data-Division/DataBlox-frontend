'use client';

import React, { useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { GearSixIcon, SignOutIcon } from '@phosphor-icons/react';

interface SettingsButtonProps {
  openModal: () => void;
}
function SettingsButton({ openModal }: SettingsButtonProps) {
  const handleOpenSettings = () => {
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
      <GearSixIcon size={14} />
      User Settings
    </button>
  );
};

function LogoutButton() {
  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  }, []);

  return (
    <button
      onClick={handleLogout}
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
      <SignOutIcon size={14} />
      Log Out
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SettingsButton openModal={userTypeContext.openModal} />
          <LogoutButton />
        </div>
      )}
    </footer>
  );
}
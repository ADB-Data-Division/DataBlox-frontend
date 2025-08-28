'use client';

import React from 'react';
import { UserTypeModal } from './';
import { useUserType } from '../../app/contexts/UserTypeContext';

export default function UserTypeModalWrapper() {
  const { showModal, closeModal, setUserType } = useUserType();

  const handleSubmit = (data: any) => {
    setUserType(data);
    closeModal();
  };

  // Prevent closing modal - only allow through form submission
  const handleClose = () => {
    // Do nothing - modal must be completed
    return;
  };

  return (
    <UserTypeModal
      open={showModal}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  );
}
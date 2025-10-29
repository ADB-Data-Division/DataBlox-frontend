'use client';

import React from 'react';
import { Box, Container } from '@mui/material';
import { Header } from '../(dashboard)/components/Header';
import FooterWrapper from '../../components/FooterWrapper';
import { ConnectivityProvider } from '../contexts/ConnectivityContext';
import { UserTypeProvider } from '../contexts/UserTypeContext';

export default function LandingSampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConnectivityProvider>
      <UserTypeProvider>
        <Box
          sx={{
            minHeight: '100vh',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Container maxWidth="xl" sx={{ flex: 1, py: 4 }}>
            <Header />
            <Box sx={{ mt: 4 }}>
              {children}
            </Box>
          </Container>
          <FooterWrapper />
        </Box>
      </UserTypeProvider>
    </ConnectivityProvider>
  );
}
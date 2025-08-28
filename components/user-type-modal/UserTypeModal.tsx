'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  useTheme
} from '@mui/material';

export interface UserTypeData {
  orgType: 'regulator/government-agency' | 'private-sector';
  role: 'data-analyst' | 'legislator' | 'executive';
  firmSize: '<10' | '<25' | '<50' | '50+';
}

export interface UserTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserTypeData) => void;
}

export default function UserTypeModal({ open, onClose, onSubmit }: UserTypeModalProps) {
  const theme = useTheme();
  const [orgType, setOrgType] = useState<UserTypeData['orgType']>('regulator/government-agency');
  const [role, setRole] = useState<UserTypeData['role']>('data-analyst');
  const [firmSize, setFirmSize] = useState<UserTypeData['firmSize']>('<10');

  const handleSubmit = () => {
    onSubmit({
      orgType,
      role,
      firmSize
    });
    onClose();
  };

  const handleClose = () => {
    // Prevent closing modal without completing the form
    // Only allow closing after form is submitted
    return;
  };

  const isFormValid = orgType && role && firmSize;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      disableEscapeKeyDown
      BackdropProps={{
        sx: { 
          backgroundColor: 'rgba(0, 0, 0, 0.7)' 
        },
        onClick: (e) => e.stopPropagation() // Prevent backdrop click from closing
      }}
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle>
        <Typography component="span" variant="h6" fontWeight="bold">
          Tell us about yourself
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please share some information about your background to continue. All fields are required.
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Organization Type */}
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'medium' }}>
              Organization Type
            </FormLabel>
            <RadioGroup
              value={orgType}
              onChange={(e) => setOrgType(e.target.value as UserTypeData['orgType'])}
            >
              <FormControlLabel
                value="regulator/government-agency"
                control={<Radio />}
                label="Regulator / Government Agency"
              />
              <FormControlLabel
                value="private-sector"
                control={<Radio />}
                label="Private Sector"
              />
            </RadioGroup>
          </FormControl>

          {/* Role */}
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'medium' }}>
              Your Role
            </FormLabel>
            <RadioGroup
              value={role}
              onChange={(e) => setRole(e.target.value as UserTypeData['role'])}
            >
              <FormControlLabel
                value="data-analyst"
                control={<Radio />}
                label="Data Analyst"
              />
              <FormControlLabel
                value="legislator"
                control={<Radio />}
                label="Legislator"
              />
              <FormControlLabel
                value="executive"
                control={<Radio />}
                label="Executive"
              />
            </RadioGroup>
          </FormControl>

          {/* Firm Size */}
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'medium' }}>
              Organization Size
            </FormLabel>
            <RadioGroup
              value={firmSize}
              onChange={(e) => setFirmSize(e.target.value as UserTypeData['firmSize'])}
            >
              <FormControlLabel
                value="<10"
                control={<Radio />}
                label="Less than 10 employees"
              />
              <FormControlLabel
                value="<25"
                control={<Radio />}
                label="Less than 25 employees"
              />
              <FormControlLabel
                value="<50"
                control={<Radio />}
                label="Less than 50 employees"
              />
              <FormControlLabel
                value="50+"
                control={<Radio />}
                label="50+ employees"
              />
            </RadioGroup>
          </FormControl>

        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!isFormValid}
          fullWidth
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
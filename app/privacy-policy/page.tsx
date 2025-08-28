'use client';

import React from 'react';
import { Box, Container, Typography, Paper, Divider } from '@mui/material';

export default function PrivacyPolicyPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
          Privacy Policy
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: {new Date().toLocaleDateString()}
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
            1. Information We Collect
          </Typography>
          <Typography variant="body1" paragraph>
            We collect limited information to improve your experience with Datablox:
          </Typography>
          <Box component="ul" sx={{ ml: 2, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              <strong>User Demographics:</strong> Organization type (regulator/government agency or private sector), 
              your role (data analyst, legislator, or executive), and organization size
            </Typography>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              <strong>Platform Usage:</strong> Search queries, selected locations, visualization interactions, 
              and feature usage patterns
            </Typography>
            <Typography component="li" variant="body1">
              <strong>Technical Data:</strong> Browser type, device information, and session data for 
              performance optimization
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
            2. How We Use Your Information
          </Typography>
          <Typography variant="body1" paragraph>
            Your information helps us provide and improve our services:
          </Typography>
          <Box component="ul" sx={{ ml: 2, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              Customize your experience based on your role and organization type
            </Typography>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              Analyze usage patterns to improve platform features and performance
            </Typography>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              Generate aggregated analytics reports to understand user behavior
            </Typography>
            <Typography component="li" variant="body1">
              Ensure platform security and prevent misuse
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
            3. Data Storage and Retention
          </Typography>
          <Typography variant="body1">
            <strong>Local Storage:</strong> Your demographic preferences are stored locally in your browser 
            for 30 days to avoid repeatedly asking for the same information.
          </Typography>
          <Typography variant="body1">
            <strong>Analytics Data:</strong> Usage data is processed through Google Analytics 4 and 
            retained according to Google&apos;s data retention policies (up to 26 months for event data).
          </Typography>
          <Typography variant="body1">
            <strong>Session Data:</strong> Technical session information is retained for up to 90 days 
            for performance monitoring and security purposes.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
            4. Data Sharing and Third Parties
          </Typography>
          <Typography variant="body1" paragraph>
            We do not sell or share your personal information with third parties for marketing purposes. 
            We only share data with:
          </Typography>
          <Box component="ul" sx={{ ml: 2, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              <strong>Google Analytics:</strong> For usage analytics and platform improvement
            </Typography>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              <strong>Service Providers:</strong> Trusted partners who help us operate and improve the platform
            </Typography>
            <Typography component="li" variant="body1">
              <strong>Legal Requirements:</strong> When required by law or to protect our rights and users
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
            5. Your Rights and Choices
          </Typography>
          <Typography variant="body1">
            You have control over your information:
          </Typography>
          <Box component="ul" sx={{ ml: 2, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              Clear your browser&apos;s local storage to remove stored preferences
            </Typography>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              Use browser settings to disable cookies and tracking
            </Typography>
            <Typography component="li" variant="body1" sx={{ mb: 1 }}>
              Opt out of Google Analytics tracking using browser extensions or settings
            </Typography>
            <Typography component="li" variant="body1">
              Contact us to request information about your data or its deletion
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
            6. Security
          </Typography>
          <Typography variant="body1">
            We implement appropriate technical and organizational measures to protect your information 
            against unauthorized access, alteration, disclosure, or destruction. However, no internet 
            transmission is completely secure, and we cannot guarantee absolute security.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
            7. Changes to This Policy
          </Typography>
          <Typography variant="body1" paragraph>
            We may update this privacy policy from time to time. We will notify you of any material 
            changes by updating the &quot;Last updated&quot; date at the top of this policy.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
            8. Contact Us
          </Typography>
          <Typography variant="body1" paragraph>
            If you have any questions about this privacy policy or our data practices, please contact us 
            through the platform or reach out to our support team.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
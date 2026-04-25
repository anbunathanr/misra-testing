import React from 'react';
import { Box, Typography, Paper, Container } from '@mui/material';
import { API_URL } from '../config/api-config';

function DebugPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Debug Information
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          API Configuration:
        </Typography>
        <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
          API_URL: {API_URL}
        </Typography>
        
        <Typography variant="h6" gutterBottom>
          Environment Variables:
        </Typography>
        <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          <div>VITE_API_URL: {import.meta.env.VITE_API_URL}</div>
          <div>VITE_ENVIRONMENT: {import.meta.env.VITE_ENVIRONMENT}</div>
          <div>VITE_USE_MOCK_BACKEND: {import.meta.env.VITE_USE_MOCK_BACKEND}</div>
          <div>NODE_ENV: {import.meta.env.NODE_ENV}</div>
          <div>MODE: {import.meta.env.MODE}</div>
        </Box>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          Test API Call:
        </Typography>
        <button
          onClick={async () => {
            try {
              console.log('Making test API call to:', `${API_URL}/auth/generate-otp`);
              const response = await fetch(`${API_URL}/auth/generate-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test@example.com' })
              });
              console.log('Response status:', response.status);
              const data = await response.json();
              console.log('Response data:', data);
            } catch (error) {
              console.error('API call error:', error);
            }
          }}
        >
          Test API Call
        </button>
      </Paper>
    </Container>
  );
}

export default DebugPage;
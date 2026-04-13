import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  Box, 
  Alert,
  Typography 
} from '@mui/material';
import { environments } from '../config/environments';

interface EnvironmentSelectorProps {
  selectedEnvironment: string;
  appUrl: string;
  backendUrl: string;
  onEnvironmentChange: (env: string) => void;
  onAppUrlChange: (url: string) => void;
  onBackendUrlChange: (url: string) => void;
  disabled?: boolean;
  onValidationError?: (error: string) => void;
}

const EnvironmentSelector: React.FC<EnvironmentSelectorProps> = ({
  selectedEnvironment,
  appUrl,
  backendUrl,
  onEnvironmentChange,
  onAppUrlChange,
  onBackendUrlChange,
  disabled = false,
  onValidationError
}) => {
  const handleEnvironmentChange = (envName: string) => {
    const env = environments[envName];
    if (env) {
      onEnvironmentChange(envName);
      onAppUrlChange(env.appUrl);
      onBackendUrlChange(env.backendUrl);
    }
  };

  const validateUrl = (url: string, fieldName: string) => {
    if (!url) {
      onValidationError?.(`${fieldName} is required`);
      return false;
    }
    
    if (url !== 'mock') {
      try {
        new URL(url);
      } catch (e) {
        onValidationError?.(`Invalid ${fieldName} format. Please use complete URLs (e.g., https://example.com)`);
        return false;
      }
    }
    return true;
  };

  const handleAppUrlChange = (url: string) => {
    onAppUrlChange(url);
    if (url) {
      validateUrl(url, 'Application URL');
    }
  };

  const handleBackendUrlChange = (url: string) => {
    onBackendUrlChange(url);
    if (url) {
      validateUrl(url, 'Backend API URL');
    }
  };

  const isDemoMode = selectedEnvironment === 'demo';

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Configuration
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Environment</InputLabel>
          <Select
            value={selectedEnvironment}
            label="Environment"
            onChange={(e) => handleEnvironmentChange(e.target.value)}
            disabled={disabled}
          >
            {Object.entries(environments).map(([key, env]) => (
              <MenuItem key={key} value={key}>
                {env.description}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Application URL"
          value={appUrl}
          onChange={(e) => handleAppUrlChange(e.target.value)}
          disabled={disabled}
          size="small"
          fullWidth
          error={appUrl !== '' && !validateUrl(appUrl, 'Application URL')}
          helperText={appUrl !== '' && !validateUrl(appUrl, 'Application URL') ? 'Please enter a valid URL' : ''}
        />

        <TextField
          label="Backend API URL"
          value={backendUrl}
          onChange={(e) => handleBackendUrlChange(e.target.value)}
          disabled={disabled}
          size="small"
          fullWidth
          error={backendUrl !== '' && backendUrl !== 'mock' && !validateUrl(backendUrl, 'Backend API URL')}
          helperText={backendUrl !== '' && backendUrl !== 'mock' && !validateUrl(backendUrl, 'Backend API URL') ? 'Please enter a valid URL or "mock"' : ''}
        />

        {isDemoMode && (
          <Alert severity="success" sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              ✅ Demo Mode Active
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Demo Mode uses a mock backend that runs entirely in your browser. No real backend deployment needed!
            </Typography>
            <Typography variant="body2">
              <strong>🔧 Need Real Backend?</strong><br />
              Switch to "Local Development" and run: <code>sam local start-api --port 3001</code><br />
              Or deploy to AWS and use Development/Staging/Production environments.
            </Typography>
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default EnvironmentSelector;
import React from 'react';
import {
  Paper,
  Typography,
  TextField,
  Grid,
  Alert,
  Box,
  Chip
} from '@mui/material';
import { AutoFixHigh as AutoIcon } from '@mui/icons-material';

interface SampleFile {
  id: string;
  name: string;
  description: string;
  language: 'C' | 'CPP';
  expectedViolations: number;
  size: number;
}

interface AutomatedQuickStartFormProps {
  email: string;
  name: string;
  onEmailChange: (email: string) => void;
  onNameChange: (name: string) => void;
  selectedSampleFile?: SampleFile | null;
  isRunning: boolean;
  visible: boolean;
}

const AutomatedQuickStartForm: React.FC<AutomatedQuickStartFormProps> = ({
  email,
  name,
  onEmailChange,
  onNameChange,
  selectedSampleFile,
  isRunning,
  visible
}) => {
  if (!visible) return null;

  return (
    <Paper sx={{ backgroundColor: '#f8f9fa', borderRadius: 2, p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, color: '#333' }}>
        📋 Quick Start - Fully Automated Analysis
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={isRunning}
            size="small"
            required
            helperText="Required for account creation and results delivery"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Name (Optional)"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={isRunning}
            size="small"
            helperText="Used for personalized experience"
          />
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          🚀 <strong>Fully Automated Process:</strong> Click "Start MISRA Analysis" and we'll handle everything:
        </Typography>
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
          <li>🔐 Automatic account registration/login</li>
          <li>📄 Smart selection of sample C/C++ file with known violations</li>
          <li>☁️ Secure upload to AWS infrastructure</li>
          <li>🔍 Comprehensive MISRA compliance analysis</li>
          <li>📊 Detailed results with compliance scores and violation reports</li>
        </Box>
      </Alert>

      {selectedSampleFile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, color: '#666', fontWeight: 500 }}>
            🎯 Auto-Selected Sample File:
          </Typography>
          <Chip
            icon={<AutoIcon />}
            label={`${selectedSampleFile.name} - ${selectedSampleFile.description}`}
            color="primary"
            variant="outlined"
            sx={{ 
              maxWidth: '100%',
              height: 'auto',
              '& .MuiChip-label': {
                whiteSpace: 'normal',
                textAlign: 'left',
                py: 1
              }
            }}
          />
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#666' }}>
            Language: {selectedSampleFile.language} • Expected Violations: {selectedSampleFile.expectedViolations} • Size: {selectedSampleFile.size} bytes
          </Typography>
        </Box>
      )}

      <Alert severity="success" sx={{ mt: 2 }}>
        <Typography variant="body2">
          ✨ <strong>No File Upload Required:</strong> Our system automatically selects educational sample files 
          with known MISRA violations to demonstrate the analysis capabilities. Perfect for testing and learning!
        </Typography>
      </Alert>
    </Paper>
  );
};

export default AutomatedQuickStartForm;
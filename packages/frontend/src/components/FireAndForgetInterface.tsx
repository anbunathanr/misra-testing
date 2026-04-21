import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  RocketLaunch as RocketIcon,
  Email as EmailIcon,
  AutoAwesome as AutoIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface FireAndForgetInterfaceProps {
  onStartWorkflow: (email: string, name?: string) => void;
  isRunning: boolean;
  error?: string | null;
  onRetry?: () => void;
  demoMode?: boolean;
}

const FireAndForgetInterface: React.FC<FireAndForgetInterfaceProps> = ({
  onStartWorkflow,
  isRunning,
  error,
  onRetry,
  demoMode = false
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleStart = () => {
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    onStartWorkflow(email, name);
  };

  const features = [
    {
      icon: <AutoIcon color="primary" />,
      title: 'Fully Automated',
      description: 'Zero manual intervention required'
    },
    {
      icon: <SpeedIcon color="success" />,
      title: '60-Second Analysis',
      description: 'Complete MISRA compliance check'
    },
    {
      icon: <SecurityIcon color="warning" />,
      title: 'Production AWS',
      description: 'Real CloudWatch logs & metrics'
    },
    {
      icon: <AnalyticsIcon color="info" />,
      title: 'Professional Reports',
      description: 'Detailed compliance analysis'
    }
  ];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Paper
        sx={{
          p: 4,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center'
        }}
      >
        <RocketIcon sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Fire & Forget Workflow
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
          Automated MISRA Compliance Analysis
        </Typography>
        {demoMode && (
          <Chip
            label="Demo Mode Active"
            color="warning"
            sx={{ backgroundColor: 'rgba(255,193,7,0.2)', color: 'white' }}
          />
        )}
      </Paper>

      {/* Features Grid */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent>
                <Box sx={{ mb: 1 }}>{feature.icon}</Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Interface */}
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6">
            Start Automated Analysis
          </Typography>
          <Tooltip title="Enter your email to begin the fully automated MISRA compliance workflow">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              onRetry && (
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={onRetry}
                >
                  Retry
                </Button>
              )
            }
          >
            {error}
          </Alert>
        )}

        {/* Input Form */}
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            error={!!emailError}
            helperText={emailError || 'Required for authentication and results delivery'}
            disabled={isRunning}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />

          <TextField
            fullWidth
            label="Name (Optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isRunning}
            helperText="Optional - for personalized reports"
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<RocketIcon />}
            onClick={handleStart}
            disabled={isRunning || !email || !!emailError}
            sx={{
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
              },
              '&:disabled': {
                opacity: 0.6,
                transform: 'none'
              }
            }}
          >
            {isRunning ? 'Analysis Running...' : 'Start Fire & Forget Analysis'}
          </Button>
        </Box>

        {/* Progress Indicator */}
        {isRunning && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }
              }} 
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Automated workflow in progress...
            </Typography>
          </Box>
        )}

        {/* Workflow Steps Info */}
        <Box sx={{ mt: 4, p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Automated Workflow Steps:
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <Box component="ol" sx={{ pl: 2, m: 0 }}>
              <li>🔐 Auto-Authentication with AWS Cognito</li>
              <li>📁 Intelligent Sample File Selection</li>
              <li>☁️ Automated S3 Upload & Processing</li>
              <li>🔍 Real-time MISRA Compliance Analysis</li>
              <li>📊 Professional Report Generation</li>
            </Box>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            ⚡ Target completion time: ~60 seconds
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default FireAndForgetInterface;
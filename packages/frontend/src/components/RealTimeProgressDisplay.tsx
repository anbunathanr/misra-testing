import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon,
  Error as ErrorIcon,
  PlayArrow as ActiveIcon
} from '@mui/icons-material';

interface ProgressStep {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
  duration?: number;
}

interface RealTimeProgressDisplayProps {
  currentStep: number;
  completedSteps: number[];
  analysisProgress: number;
  isRunning: boolean;
  visible: boolean;
  estimatedTimeRemaining?: number;
  rulesProcessed?: number;
  totalRules?: number;
}

const RealTimeProgressDisplay: React.FC<RealTimeProgressDisplayProps> = ({
  currentStep,
  completedSteps,
  analysisProgress,
  isRunning,
  visible,
  estimatedTimeRemaining,
  rulesProcessed = 0,
  totalRules = 50
}) => {
  if (!visible) return null;

  const steps: ProgressStep[] = [
    { 
      id: 1, 
      label: '1. Authentication', 
      description: 'Quick registration and login',
      status: 'pending'
    },
    { 
      id: 2, 
      label: '2. File Selection', 
      description: 'Automatic sample file selection and upload',
      status: 'pending'
    },
    { 
      id: 3, 
      label: '3. MISRA Analysis', 
      description: 'Comprehensive code compliance analysis',
      status: 'pending'
    },
    { 
      id: 4, 
      label: '4. Results Verification', 
      description: 'Processing and formatting results',
      status: 'pending'
    }
  ];

  const getStepStatus = (step: ProgressStep): ProgressStep['status'] => {
    if (completedSteps.includes(step.id)) return 'completed';
    if (step.id === currentStep) return 'active';
    return 'pending';
  };

  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckIcon sx={{ color: '#4caf50', fontSize: 20 }} />;
      case 'active':
        return <ActiveIcon sx={{ color: '#2196f3', fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336', fontSize: 20 }} />;
      default:
        return <PendingIcon sx={{ color: '#999', fontSize: 20 }} />;
    }
  };

  const getStepColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'active':
        return '#2196f3';
      case 'error':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Paper sx={{ p: 3, mb: 3, backgroundColor: '#fafafa' }}>
      <Typography variant="h6" sx={{ mb: 2, color: '#333' }}>
        📊 Real-Time Progress
      </Typography>

      {/* Step Progress Indicators */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {steps.map((step) => {
          const status = getStepStatus(step);
          const color = getStepColor(status);
          
          return (
            <Grid item xs={12} sm={6} md={3} key={step.id}>
              <Card 
                sx={{ 
                  border: `2px solid ${color}`,
                  backgroundColor: status === 'active' ? `${color}10` : 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {getStepIcon(status)}
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        ml: 1, 
                        color,
                        fontWeight: status === 'active' ? 600 : 400
                      }}
                    >
                      {step.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    {step.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Analysis Progress Bar (only show during step 3) */}
      {isRunning && currentStep === 3 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              🔍 MISRA Analysis Progress
            </Typography>
            <Chip 
              label={`${analysisProgress}%`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={analysisProgress} 
            sx={{ 
              height: 10, 
              borderRadius: 5,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
              }
            }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Rules Processed: {rulesProcessed}/{totalRules}
            </Typography>
            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
              <Typography variant="caption" sx={{ color: '#666' }}>
                Est. Time Remaining: {formatTime(estimatedTimeRemaining)}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Overall Progress Summary */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2,
        backgroundColor: '#f5f5f5',
        borderRadius: 1
      }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Overall Progress: {completedSteps.length}/{steps.length} Steps Complete
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isRunning && (
            <Chip 
              label="Running" 
              size="small" 
              sx={{ 
                backgroundColor: '#ffc107', 
                color: '#000',
                fontWeight: 600
              }}
            />
          )}
          {completedSteps.length === steps.length && !isRunning && (
            <Chip 
              label="Complete" 
              size="small" 
              sx={{ 
                backgroundColor: '#4caf50', 
                color: 'white',
                fontWeight: 600
              }}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default RealTimeProgressDisplay;
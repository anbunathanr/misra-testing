import React from 'react';
import { Box, Typography } from '@mui/material';

export interface StepDefinition {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface StepIndicatorProps {
  steps: StepDefinition[];
  currentStep: number;
  completedSteps: number[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep, completedSteps }) => {
  const getStepStatus = (step: StepDefinition): StepDefinition['status'] => {
    // Use the step's own status if it's set to error
    if (step.status === 'error') return 'error';
    
    if (completedSteps.includes(step.id)) return 'completed';
    if (step.id === currentStep) return 'active';
    return 'pending';
  };

  const getStepColor = (status: StepDefinition['status']) => {
    switch (status) {
      case 'active':
        return '#667eea';
      case 'completed':
        return '#28a745';
      case 'error':
        return '#dc3545';
      default:
        return '#999';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        mb: 2.5,
        fontSize: '12px'
      }}
    >
      {steps.map((step) => {
        const status = getStepStatus(step);
        const color = getStepColor(status);
        
        return (
          <Box
            key={step.id}
            sx={{
              flex: 1,
              textAlign: 'center',
              color,
              fontWeight: status === 'active' ? 600 : 400,
              px: 0.5
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'inherit',
                fontWeight: 'inherit',
                fontSize: '12px'
              }}
            >
              {step.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default StepIndicator;
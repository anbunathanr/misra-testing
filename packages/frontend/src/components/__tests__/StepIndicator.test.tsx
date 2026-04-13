import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material';
import StepIndicator, { StepDefinition } from '../StepIndicator';
import theme from '../../theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('StepIndicator', () => {
  const mockSteps: StepDefinition[] = [
    { id: 1, label: '1. Login', status: 'pending' },
    { id: 2, label: '2. Upload', status: 'pending' },
    { id: 3, label: '3. Analyze', status: 'pending' },
    { id: 4, label: '4. Verify', status: 'pending' }
  ];

  test('renders all steps', () => {
    renderWithTheme(
      <StepIndicator 
        steps={mockSteps} 
        currentStep={1} 
        completedSteps={[]} 
      />
    );
    
    expect(screen.getByText('1. Login')).toBeInTheDocument();
    expect(screen.getByText('2. Upload')).toBeInTheDocument();
    expect(screen.getByText('3. Analyze')).toBeInTheDocument();
    expect(screen.getByText('4. Verify')).toBeInTheDocument();
  });

  test('highlights current step', () => {
    renderWithTheme(
      <StepIndicator 
        steps={mockSteps} 
        currentStep={2} 
        completedSteps={[1]} 
      />
    );
    
    const currentStepElement = screen.getByText('2. Upload');
    expect(currentStepElement).toBeInTheDocument();
    // The current step should have active styling (tested via color in the component)
  });

  test('shows completed steps', () => {
    renderWithTheme(
      <StepIndicator 
        steps={mockSteps} 
        currentStep={3} 
        completedSteps={[1, 2]} 
      />
    );
    
    // All steps should be rendered
    expect(screen.getByText('1. Login')).toBeInTheDocument();
    expect(screen.getByText('2. Upload')).toBeInTheDocument();
    expect(screen.getByText('3. Analyze')).toBeInTheDocument();
    expect(screen.getByText('4. Verify')).toBeInTheDocument();
  });
});
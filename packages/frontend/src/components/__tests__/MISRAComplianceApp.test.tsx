import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material';
import MISRAComplianceApp from '../MISRAComplianceApp';
import theme from '../../theme';

// Mock the logging service
jest.mock('../../services/logging', () => ({
  loggingService: {
    subscribe: jest.fn(() => jest.fn()),
    clearLogs: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn()
  }
}));

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MISRAComplianceApp', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  test('renders the main components', () => {
    renderWithTheme(<MISRAComplianceApp />);
    
    // Check for main title
    expect(screen.getByText('🧪 MISRA Compliance Test')).toBeInTheDocument();
    
    // Check for subtitle
    expect(screen.getByText('Automated E2E Testing for MISRA Analysis Platform')).toBeInTheDocument();
    
    // Check for info alert
    expect(screen.getByText('ℹ️ Test Mode')).toBeInTheDocument();
    
    // Check for run test button
    expect(screen.getByRole('button', { name: /run test/i })).toBeInTheDocument();
  });

  test('displays step indicators', () => {
    renderWithTheme(<MISRAComplianceApp />);
    
    // Check for all 4 steps
    expect(screen.getByText('1. Login')).toBeInTheDocument();
    expect(screen.getByText('2. Upload')).toBeInTheDocument();
    expect(screen.getByText('3. Analyze')).toBeInTheDocument();
    expect(screen.getByText('4. Verify')).toBeInTheDocument();
  });

  test('displays environment configuration', () => {
    renderWithTheme(<MISRAComplianceApp />);
    
    // Check for configuration section
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    
    // Check for environment selector by role
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    
    // Check for URL inputs
    expect(screen.getByLabelText('Application URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Backend API URL')).toBeInTheDocument();
  });

  test('shows demo mode alert by default', () => {
    renderWithTheme(<MISRAComplianceApp />);
    
    expect(screen.getByText('✅ Demo Mode Active')).toBeInTheDocument();
    expect(screen.getByText(/Demo Mode uses a mock backend/)).toBeInTheDocument();
  });

  test('calls onStepChange callback when step changes', async () => {
    const mockOnStepChange = jest.fn();
    renderWithTheme(<MISRAComplianceApp onStepChange={mockOnStepChange} />);
    
    const runButton = screen.getByRole('button', { name: /run test/i });
    fireEvent.click(runButton);
    
    // Wait for the first step change
    await waitFor(() => {
      expect(mockOnStepChange).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  test('disables run button when test is running', async () => {
    renderWithTheme(<MISRAComplianceApp />);
    
    const runButton = screen.getByRole('button', { name: /run test/i });
    
    // Button should be enabled initially
    expect(runButton).not.toBeDisabled();
    
    // Click the button to start the test
    fireEvent.click(runButton);
    
    // Button should be disabled while running
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /running test/i })).toBeDisabled();
    });
  });

  test('validates URLs before running test', () => {
    renderWithTheme(<MISRAComplianceApp />);
    
    // Clear the default URLs
    const appUrlInput = screen.getByLabelText('Application URL');
    const backendUrlInput = screen.getByLabelText('Backend API URL');
    
    fireEvent.change(appUrlInput, { target: { value: '' } });
    fireEvent.change(backendUrlInput, { target: { value: '' } });
    
    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    const runButton = screen.getByRole('button', { name: /run test/i });
    fireEvent.click(runButton);
    
    expect(alertSpy).toHaveBeenCalledWith('Please enter an Application URL');
    
    alertSpy.mockRestore();
  });
});
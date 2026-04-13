import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material';
import MISRAComplianceApp from '../MISRAComplianceApp';
import theme from '../../theme';

// Mock the logging service
const mockLoggingService = {
  subscribe: jest.fn(() => jest.fn()),
  clearLogs: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn()
};

jest.mock('../../services/logging', () => ({
  loggingService: mockLoggingService
}));

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Workflow State Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Step Transitions', () => {
    test('should transition through steps sequentially during successful workflow', async () => {
      const mockOnStepChange = jest.fn();
      
      // Mock successful API responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'test-token',
          testOtp: '123456'
        })
      });

      renderWithTheme(<MISRAComplianceApp onStepChange={mockOnStepChange} />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      // Should start at step 0, then progress through 1, 2, 3, 4
      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(1);
      }, { timeout: 1000 });

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(2);
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(3);
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(mockOnStepChange).toHaveBeenCalledWith(4);
      }, { timeout: 4000 });
    });

    test('should handle step transition failures gracefully', async () => {
      const mockOnError = jest.fn();
      
      // Mock failed API response
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithTheme(<MISRAComplianceApp onError={mockOnError} />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      // Should call error handler when step fails
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      }, { timeout: 2000 });

      const errorCall = mockOnError.mock.calls[0][0];
      expect(errorCall).toHaveProperty('code');
      expect(errorCall).toHaveProperty('message');
      expect(errorCall).toHaveProperty('recoverable');
    });

    test('should reset workflow state when clearOutput is called', async () => {
      const mockOnStepChange = jest.fn();
      
      renderWithTheme(<MISRAComplianceApp onStepChange={mockOnStepChange} />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      // Wait for workflow to start
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
      }, { timeout: 1000 });

      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);

      // Should reset to initial state
      expect(mockLoggingService.clearLogs).toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });
  });

  describe('State Updates', () => {
    test('should update completed steps correctly', async () => {
      // Mock successful responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'test-token',
          testOtp: '123456'
        })
      });

      renderWithTheme(<MISRAComplianceApp />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      // Wait for first step to complete
      await waitFor(() => {
        expect(mockLoggingService.success).toHaveBeenCalledWith(
          expect.stringContaining('Step 1 completed')
        );
      }, { timeout: 2000 });

      // Wait for second step to complete
      await waitFor(() => {
        expect(mockLoggingService.success).toHaveBeenCalledWith(
          expect.stringContaining('Step 2 completed')
        );
      }, { timeout: 4000 });
    });

    test('should handle running state correctly', async () => {
      renderWithTheme(<MISRAComplianceApp />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      
      // Initially not running
      expect(runButton).not.toBeDisabled();
      expect(runButton).toHaveTextContent('Run Test');

      fireEvent.click(runButton);

      // Should be running
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /running test/i });
        expect(button).toBeDisabled();
      });
    });

    test('should maintain environment state during workflow', async () => {
      renderWithTheme(<MISRAComplianceApp environment="local" />);
      
      // Environment should be set to local
      const environmentSelect = screen.getByRole('combobox');
      expect(environmentSelect).toHaveValue('local');

      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      // Environment should remain unchanged during workflow
      await waitFor(() => {
        expect(environmentSelect).toHaveValue('local');
      }, { timeout: 1000 });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle authentication errors appropriately', async () => {
      const mockOnError = jest.fn();
      
      // Mock 401 error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Authentication failed')
      });

      renderWithTheme(<MISRAComplianceApp onError={mockOnError} />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      }, { timeout: 2000 });

      const errorCall = mockOnError.mock.calls[0][0];
      expect(errorCall.userMessage).toContain('Authentication failed');
      expect(errorCall.recoverable).toBe(true);
    });

    test('should handle network errors with appropriate messaging', async () => {
      const mockOnError = jest.fn();
      
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('fetch failed'));

      renderWithTheme(<MISRAComplianceApp onError={mockOnError} />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      }, { timeout: 2000 });

      const errorCall = mockOnError.mock.calls[0][0];
      expect(errorCall.userMessage).toContain('Network error');
    });

    test('should handle timeout errors correctly', async () => {
      const mockOnError = jest.fn();
      
      // Mock timeout error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('timeout'));

      renderWithTheme(<MISRAComplianceApp onError={mockOnError} />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      }, { timeout: 2000 });

      const errorCall = mockOnError.mock.calls[0][0];
      expect(errorCall.userMessage).toContain('timed out');
    });

    test('should display error messages in UI', async () => {
      // Mock error response
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Test error'));

      renderWithTheme(<MISRAComplianceApp />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      // Should display error alert
      await waitFor(() => {
        expect(screen.getByText('❌ Workflow Error')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Should show user-friendly error message
      expect(screen.getByText(/Network error during/)).toBeInTheDocument();
      expect(screen.getByText('You can try running the test again.')).toBeInTheDocument();
    });

    test('should allow retry after recoverable errors', async () => {
      // First call fails, second succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            accessToken: 'test-token',
            testOtp: '123456'
          })
        });

      renderWithTheme(<MISRAComplianceApp />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      
      // First attempt fails
      fireEvent.click(runButton);
      
      await waitFor(() => {
        expect(screen.getByText('❌ Workflow Error')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Should be able to retry
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run test/i })).not.toBeDisabled();
      });

      // Second attempt should work
      fireEvent.click(screen.getByRole('button', { name: /run test/i }));
      
      await waitFor(() => {
        expect(mockLoggingService.success).toHaveBeenCalledWith(
          expect.stringContaining('Got access token')
        );
      }, { timeout: 2000 });
    });
  });

  describe('Workflow Completion', () => {
    test('should call onComplete with correct results', async () => {
      const mockOnComplete = jest.fn();
      
      // Mock successful responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'test-token',
          testOtp: '123456'
        })
      });

      renderWithTheme(<MISRAComplianceApp onComplete={mockOnComplete} />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      // Wait for completion
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled();
      }, { timeout: 8000 });

      const results = mockOnComplete.mock.calls[0][0];
      expect(results).toHaveProperty('analysisId');
      expect(results).toHaveProperty('complianceScore', 92);
      expect(results).toHaveProperty('violations', 3);
      expect(results).toHaveProperty('success', true);
      expect(results).toHaveProperty('duration');
      expect(results).toHaveProperty('timestamp');
    });

    test('should log successful completion', async () => {
      // Mock successful responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'test-token',
          testOtp: '123456'
        })
      });

      renderWithTheme(<MISRAComplianceApp />);
      
      const runButton = screen.getByRole('button', { name: /run test/i });
      fireEvent.click(runButton);

      // Wait for completion message
      await waitFor(() => {
        expect(mockLoggingService.success).toHaveBeenCalledWith(
          '✓ All tests passed successfully!'
        );
      }, { timeout: 8000 });
    });
  });
});
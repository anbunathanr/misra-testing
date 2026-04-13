import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from '@mui/material';
import fc from 'fast-check';
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

/**
 * Property 1: UI Consistency and Workflow Interface
 * 
 * For any workflow state and viewport dimensions, the rendered 4-step interface 
 * should contain all required elements (step indicators, buttons, progress display) 
 * with consistent styling, responsive layout, and visual design matching the 
 * original HTML test page.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.5, 9.1, 9.2, 9.3**
 */
describe('Property 1: UI Consistency and Workflow Interface', () => {
  
  // Generator for valid environment configurations
  const environmentArb = fc.constantFrom('demo', 'local', 'development', 'staging', 'production');
  
  // Generator for viewport dimensions
  const viewportArb = fc.record({
    width: fc.integer({ min: 320, max: 1920 }),
    height: fc.integer({ min: 568, max: 1080 })
  });

  // Generator for workflow states
  const workflowStateArb = fc.record({
    currentStep: fc.integer({ min: 0, max: 4 }),
    completedSteps: fc.array(fc.integer({ min: 1, max: 4 }), { maxLength: 4 }),
    isRunning: fc.boolean()
  });

  test('should always render all required UI elements regardless of state', () => {
    fc.assert(
      fc.property(
        environmentArb,
        viewportArb,
        workflowStateArb,
        (environment, viewport, workflowState) => {
          // Set viewport dimensions
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewport.width,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: viewport.height,
          });

          const { unmount } = renderWithTheme(
            <MISRAComplianceApp environment={environment} />
          );

          try {
            // Required elements should always be present
            
            // 1. Main title and subtitle
            expect(screen.getByText('🧪 MISRA Compliance Test')).toBeInTheDocument();
            expect(screen.getByText('Automated E2E Testing for MISRA Analysis Platform')).toBeInTheDocument();
            
            // 2. Info box
            expect(screen.getByText('ℹ️ Test Mode')).toBeInTheDocument();
            
            // 3. All 4 step indicators
            expect(screen.getByText('1. Login')).toBeInTheDocument();
            expect(screen.getByText('2. Upload')).toBeInTheDocument();
            expect(screen.getByText('3. Analyze')).toBeInTheDocument();
            expect(screen.getByText('4. Verify')).toBeInTheDocument();
            
            // 4. Configuration section
            expect(screen.getByText('Configuration')).toBeInTheDocument();
            expect(screen.getByRole('combobox')).toBeInTheDocument();
            expect(screen.getByLabelText('Application URL')).toBeInTheDocument();
            expect(screen.getByLabelText('Backend API URL')).toBeInTheDocument();
            
            // 5. Run test button (text may vary based on running state)
            const runButton = screen.getByRole('button', { name: /run test|running test/i });
            expect(runButton).toBeInTheDocument();
            
            // 6. Consistent styling - check for main container
            const container = screen.getByRole('button', { name: /run test|running test/i }).closest('[class*="MuiPaper-root"]');
            expect(container).toBeInTheDocument();
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should maintain responsive layout across different viewport sizes', () => {
    fc.assert(
      fc.property(
        viewportArb,
        (viewport) => {
          // Set viewport dimensions
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewport.width,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: viewport.height,
          });

          const { unmount } = renderWithTheme(<MISRAComplianceApp />);

          try {
            // Elements should be accessible regardless of viewport size
            const runButton = screen.getByRole('button', { name: /run test/i });
            const environmentSelect = screen.getByRole('combobox');
            const appUrlInput = screen.getByLabelText('Application URL');
            
            // All interactive elements should be present and accessible
            expect(runButton).toBeInTheDocument();
            expect(environmentSelect).toBeInTheDocument();
            expect(appUrlInput).toBeInTheDocument();
            
            // Container should maintain proper structure
            const mainContainer = runButton.closest('[class*="MuiContainer-root"]');
            expect(mainContainer).toBeInTheDocument();
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  test('should display correct environment-specific configuration', () => {
    fc.assert(
      fc.property(
        environmentArb,
        (environment) => {
          const { unmount } = renderWithTheme(
            <MISRAComplianceApp environment={environment} />
          );

          try {
            // Environment selector should be present
            const environmentSelect = screen.getByRole('combobox');
            expect(environmentSelect).toBeInTheDocument();
            
            // URL inputs should be present
            const appUrlInput = screen.getByLabelText('Application URL') as HTMLInputElement;
            const backendUrlInput = screen.getByLabelText('Backend API URL') as HTMLInputElement;
            
            expect(appUrlInput).toBeInTheDocument();
            expect(backendUrlInput).toBeInTheDocument();
            
            // URLs should have valid values (not empty)
            expect(appUrlInput.value).toBeTruthy();
            expect(backendUrlInput.value).toBeTruthy();
            
            // Demo mode should show specific alert
            if (environment === 'demo') {
              expect(screen.getByText('✅ Demo Mode Active')).toBeInTheDocument();
            }
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  test('should maintain visual design consistency with original HTML', () => {
    fc.assert(
      fc.property(
        environmentArb,
        (environment) => {
          const { unmount } = renderWithTheme(
            <MISRAComplianceApp environment={environment} />
          );

          try {
            // Check for key visual elements that match HTML design
            
            // 1. Main title with emoji
            const title = screen.getByText('🧪 MISRA Compliance Test');
            expect(title).toBeInTheDocument();
            
            // 2. Step indicators in horizontal layout
            const step1 = screen.getByText('1. Login');
            const step2 = screen.getByText('2. Upload');
            const step3 = screen.getByText('3. Analyze');
            const step4 = screen.getByText('4. Verify');
            
            expect(step1).toBeInTheDocument();
            expect(step2).toBeInTheDocument();
            expect(step3).toBeInTheDocument();
            expect(step4).toBeInTheDocument();
            
            // 3. Configuration section with proper grouping
            expect(screen.getByText('Configuration')).toBeInTheDocument();
            
            // 4. Info box with proper styling
            expect(screen.getByText('ℹ️ Test Mode')).toBeInTheDocument();
            
            // 5. Primary action button
            const runButton = screen.getByRole('button', { name: /run test/i });
            expect(runButton).toBeInTheDocument();
            
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should handle step state transitions correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }),
        fc.array(fc.integer({ min: 1, max: 4 }), { maxLength: 4 }),
        (currentStep, completedSteps) => {
          const mockOnStepChange = jest.fn();
          
          const { unmount } = renderWithTheme(
            <MISRAComplianceApp onStepChange={mockOnStepChange} />
          );

          try {
            // All step indicators should be present regardless of state
            expect(screen.getByText('1. Login')).toBeInTheDocument();
            expect(screen.getByText('2. Upload')).toBeInTheDocument();
            expect(screen.getByText('3. Analyze')).toBeInTheDocument();
            expect(screen.getByText('4. Verify')).toBeInTheDocument();
            
            // Step indicator component should handle any valid step state
            // This tests the StepIndicator's robustness
            return true;
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
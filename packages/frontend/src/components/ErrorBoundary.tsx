/**
 * Error Boundary Component
 * Catches JavaScript errors in React component tree and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * Error Boundary for catching and handling React errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Send error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  /**
   * Report error to monitoring service
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    try {
      // In a real application, you would send this to your error monitoring service
      // For now, we'll just log it
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId
      };

      console.error('Error Report:', errorReport);
      
      // You could send this to services like Sentry, LogRocket, etc.
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Handle retry action
   */
  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  /**
   * Handle page reload
   */
  private handleReload = (): void => {
    window.location.reload();
  };

  /**
   * Copy error details to clipboard
   */
  private copyErrorDetails = async (): Promise<void> => {
    try {
      const errorDetails = {
        errorId: this.state.errorId,
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      alert('Error details copied to clipboard');
    } catch (error) {
      console.error('Failed to copy error details:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3
          }}
        >
          <Paper
            sx={{
              maxWidth: 600,
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
              boxShadow: 3
            }}
          >
            {/* Error Icon and Title */}
            <Box sx={{ mb: 3 }}>
              <ErrorIcon
                sx={{
                  fontSize: 64,
                  color: 'error.main',
                  mb: 2
                }}
              />
              <Typography variant="h4" sx={{ mb: 1, color: 'error.main' }}>
                Something went wrong
              </Typography>
              <Typography variant="body1" color="text.secondary">
                We encountered an unexpected error. Don't worry, your data is safe.
              </Typography>
            </Box>

            {/* Error ID */}
            <Box sx={{ mb: 3 }}>
              <Chip
                label={`Error ID: ${this.state.errorId}`}
                variant="outlined"
                size="small"
                sx={{ fontFamily: 'monospace' }}
              />
            </Box>

            {/* User-friendly error message */}
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>What happened:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {this.getErrorMessage()}
              </Typography>
              <Typography variant="body2">
                <strong>What you can do:</strong>
              </Typography>
              <Typography variant="body2">
                • Try refreshing the page<br />
                • Clear your browser cache<br />
                • Contact support if the problem persists
              </Typography>
            </Alert>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRetry}
                color="primary"
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
            </Box>

            {/* Technical Details (Expandable) */}
            {this.props.showDetails && this.state.error && (
              <Accordion sx={{ textAlign: 'left' }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="error-details-content"
                  id="error-details-header"
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BugReportIcon fontSize="small" />
                    <Typography variant="body2">
                      Technical Details
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Error Message:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        backgroundColor: 'grey.100',
                        p: 1,
                        borderRadius: 1,
                        wordBreak: 'break-word'
                      }}
                    >
                      {this.state.error.message}
                    </Typography>
                  </Box>

                  {this.state.error.stack && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Stack Trace:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          backgroundColor: 'grey.100',
                          p: 1,
                          borderRadius: 1,
                          maxHeight: 200,
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {this.state.error.stack}
                      </Typography>
                    </Box>
                  )}

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={this.copyErrorDetails}
                    sx={{ mt: 1 }}
                  >
                    Copy Error Details
                  </Button>
                </AccordionDetails>
              </Accordion>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(): string {
    if (!this.state.error) return 'An unknown error occurred.';

    const message = this.state.error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'There was a problem connecting to our servers. Please check your internet connection.';
    }

    if (message.includes('timeout')) {
      return 'The operation took too long to complete. Please try again.';
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You don\'t have permission to perform this action. Please log in and try again.';
    }

    if (message.includes('not found') || message.includes('404')) {
      return 'The requested resource could not be found.';
    }

    if (message.includes('server') || message.includes('500')) {
      return 'Our servers are experiencing issues. Please try again in a few minutes.';
    }

    // Default message for unknown errors
    return 'An unexpected error occurred while processing your request.';
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default ErrorBoundary;
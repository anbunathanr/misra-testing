/**
 * Frontend Error Handling Service
 * Provides comprehensive error handling for the React frontend
 */

export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  suggestion: string;
  recoverable: boolean;
  retryable: boolean;
  contactSupport: boolean;
  correlationId?: string;
  timestamp: string;
}

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ErrorHandlingConfig {
  enableRetry: boolean;
  enableUserFriendlyMessages: boolean;
  enableErrorReporting: boolean;
  retryOptions: RetryOptions;
}

/**
 * Frontend error handling service
 */
export class ErrorHandlingService {
  private config: ErrorHandlingConfig = {
    enableRetry: true,
    enableUserFriendlyMessages: true,
    enableErrorReporting: true,
    retryOptions: {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    }
  };

  private errorListeners: ((error: ErrorDetails) => void)[] = [];

  constructor(config?: Partial<ErrorHandlingConfig>) {
    this.config = { ...this.config, ...config };
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason, { operation: 'unhandled-promise' });
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('JavaScript error:', event.error);
      this.handleError(event.error, { operation: 'javascript-error' });
    });
  }

  /**
   * Handle API errors from fetch responses
   */
  async handleApiError(response: Response): Promise<ErrorDetails> {
    let errorData: any = {};
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
      errorData = { message: 'Failed to parse error response' };
    }

    const errorDetails: ErrorDetails = {
      code: errorData.error?.code || `HTTP_${response.status}`,
      message: errorData.error?.message || errorData.message || response.statusText,
      userMessage: errorData.error?.userMessage || this.getUserFriendlyMessage(response.status),
      suggestion: errorData.error?.suggestion || this.getSuggestion(response.status),
      recoverable: errorData.error?.recoverable ?? this.isRecoverable(response.status),
      retryable: errorData.error?.retryable ?? this.isRetryable(response.status),
      contactSupport: errorData.error?.contactSupport ?? this.shouldContactSupport(response.status),
      correlationId: errorData.error?.correlationId || response.headers.get('X-Correlation-ID') || undefined,
      timestamp: new Date().toISOString()
    };

    this.notifyErrorListeners(errorDetails);
    return errorDetails;
  }

  /**
   * Handle general errors
   */
  handleError(error: any, context?: { operation?: string }): ErrorDetails {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const errorDetails: ErrorDetails = {
      code: this.getErrorCode(errorMessage),
      message: errorMessage,
      userMessage: this.getUserFriendlyMessageFromError(errorMessage),
      suggestion: this.getSuggestionFromError(errorMessage),
      recoverable: this.isRecoverableError(errorMessage),
      retryable: this.isRetryableError(errorMessage),
      contactSupport: this.shouldContactSupportForError(errorMessage),
      timestamp: new Date().toISOString()
    };

    this.notifyErrorListeners(errorDetails);
    return errorDetails;
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    if (!this.config.enableRetry) {
      return fn();
    }

    const retryOptions = { ...this.config.retryOptions, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        const errorDetails = this.handleError(error);
        if (!errorDetails.retryable || attempt === retryOptions.maxAttempts) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryOptions.initialDelay * Math.pow(retryOptions.backoffMultiplier, attempt - 1),
          retryOptions.maxDelay
        );

        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Enhanced fetch with error handling and retry
   */
  async fetchWithErrorHandling(
    url: string,
    options?: RequestInit,
    retryOptions?: Partial<RetryOptions>
  ): Promise<Response> {
    return this.executeWithRetry(async () => {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorDetails = await this.handleApiError(response);
        const error = new Error(errorDetails.userMessage);
        (error as any).errorDetails = errorDetails;
        throw error;
      }
      
      return response;
    }, retryOptions);
  }

  /**
   * Add error listener
   */
  addErrorListener(listener: (error: ErrorDetails) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(listener: (error: ErrorDetails) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  /**
   * Notify all error listeners
   */
  private notifyErrorListeners(error: ErrorDetails): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Get error code from error message
   */
  private getErrorCode(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    if (lowerMessage.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
      return 'UNAUTHORIZED';
    }
    if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
      return 'FORBIDDEN';
    }
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      return 'NOT_FOUND';
    }
    if (lowerMessage.includes('server') || lowerMessage.includes('500')) {
      return 'INTERNAL_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Get user-friendly message for HTTP status
   */
  private getUserFriendlyMessage(status: number): string {
    switch (status) {
      case 400:
        return 'The request was invalid. Please check your input and try again.';
      case 401:
        return 'You need to log in to access this resource.';
      case 403:
        return 'You don\'t have permission to access this resource.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'The request timed out. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Our servers are experiencing issues. Please try again later.';
      case 502:
        return 'We\'re having trouble connecting to our servers.';
      case 503:
        return 'The service is temporarily unavailable. Please try again later.';
      case 504:
        return 'The request timed out. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get user-friendly message from error message
   */
  private getUserFriendlyMessageFromError(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'There was a problem connecting to our servers. Please check your internet connection.';
    }
    if (lowerMessage.includes('timeout')) {
      return 'The operation took too long to complete. Please try again.';
    }
    if (lowerMessage.includes('unauthorized')) {
      return 'You need to log in to perform this action.';
    }
    if (lowerMessage.includes('forbidden')) {
      return 'You don\'t have permission to perform this action.';
    }
    if (lowerMessage.includes('not found')) {
      return 'The requested resource could not be found.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get suggestion for HTTP status
   */
  private getSuggestion(status: number): string {
    switch (status) {
      case 400:
        return 'Please check your input and try again.';
      case 401:
        return 'Please log in and try again.';
      case 403:
        return 'Contact your administrator if you believe this is an error.';
      case 404:
        return 'Please check the URL or try navigating from the home page.';
      case 408:
      case 504:
        return 'Please try again. If the problem persists, try with a smaller file.';
      case 429:
        return 'Please wait a few minutes before trying again.';
      case 500:
      case 502:
      case 503:
        return 'Please try again in a few minutes. If the problem persists, contact support.';
      default:
        return 'Please try again. If the problem persists, contact support.';
    }
  }

  /**
   * Get suggestion from error message
   */
  private getSuggestionFromError(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'Please check your internet connection and try again.';
    }
    if (lowerMessage.includes('timeout')) {
      return 'Please try again. If the problem persists, try with a smaller file.';
    }
    if (lowerMessage.includes('unauthorized')) {
      return 'Please log in and try again.';
    }
    if (lowerMessage.includes('forbidden')) {
      return 'Contact your administrator if you believe this is an error.';
    }
    
    return 'Please try again. If the problem persists, contact support.';
  }

  /**
   * Check if HTTP status is recoverable
   */
  private isRecoverable(status: number): boolean {
    return ![403, 404, 410].includes(status);
  }

  /**
   * Check if HTTP status is retryable
   */
  private isRetryable(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * Check if should contact support for HTTP status
   */
  private shouldContactSupport(status: number): boolean {
    return [500, 502, 503].includes(status);
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return !lowerMessage.includes('forbidden') && !lowerMessage.includes('not found');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('network') || 
           lowerMessage.includes('timeout') || 
           lowerMessage.includes('server') ||
           lowerMessage.includes('unavailable');
  }

  /**
   * Check if should contact support for error
   */
  private shouldContactSupportForError(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('server') || lowerMessage.includes('internal');
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global error handling service instance
export const errorHandlingService = new ErrorHandlingService();
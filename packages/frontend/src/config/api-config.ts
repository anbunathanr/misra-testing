/**
 * API Configuration
 * Handles environment variable configuration for API endpoints
 * Supports both development and production environments
 */

interface ApiConfig {
  baseUrl: string;
  environment: 'development' | 'production' | 'staging';
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  useMockBackend: boolean;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

interface EndpointConfig {
  login: string;
  register: string;
  verifyEmail: string;
  verifyEmailWithOTP: string;
  completeOTPSetup: string;
  refresh: string;
  changePassword: string;
  forgotPassword: string;
  confirmPassword: string;
  getProfile: string;
  getFiles: string;
  uploadFile: string;
  getProjects: string;
  createProject: string;
  getTestCases: string;
  createTestCase: string;
  getTestSuites: string;
  createTestSuite: string;
  getAnalysisResults: string;
  analyzeFile: string;
  getUsage: string;
  generateInsights: string;
}

class ApiConfigManager {
  private config: ApiConfig;
  private endpoints: EndpointConfig;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private circuitBreakerFailures = 0;
  private lastFailureTime: number | null = null;

  constructor() {
    // Load environment variables
    const env = import.meta.env.VITE_ENVIRONMENT || 'development';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const useMock = import.meta.env.VITE_USE_MOCK_BACKEND === 'true';
    
    this.config = {
      baseUrl,
      environment: env as 'development' | 'production' | 'staging',
      timeout: 30000, // 30 seconds default timeout
      maxRetries: 3,
      retryDelay: 1000, // 1 second base delay
      useMockBackend: useMock,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000, // 30 seconds before retry
    };

    this.endpoints = {
      login: '/auth/login',
      register: '/auth/register',
      verifyEmail: '/auth/verify-email',
      verifyEmailWithOTP: '/auth/verify-email-with-otp',
      completeOTPSetup: '/auth/complete-otp-setup',
      refresh: '/auth/refresh',
      changePassword: '/auth/change-password',
      forgotPassword: '/auth/forgot-password',
      confirmPassword: '/auth/confirm-password',
      getProfile: '/auth/get-profile',
      getFiles: '/file/get-files',
      uploadFile: '/file/upload',
      getProjects: '/projects/get-projects',
      createProject: '/projects/create-project',
      getTestCases: '/test-cases/get-test-cases',
      createTestCase: '/test-cases/create-test-case',
      getTestSuites: '/test-suites/get-suites',
      createTestSuite: '/test-suites/create-suite',
      getAnalysisResults: '/analysis/get-analysis-results',
      analyzeFile: '/analysis/analyze-file',
      getUsage: '/ai-test-generation/get-usage',
      generateInsights: '/ai/generate-insights',
    };
  }

  /**
   * Get base API URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Get full URL for an endpoint
   */
  getEndpoint(endpoint: keyof EndpointConfig): string {
    return `${this.config.baseUrl}${this.endpoints[endpoint]}`;
  }

  /**
   * Get current environment
   */
  getEnvironment(): 'development' | 'production' | 'staging' {
    return this.config.environment;
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  /**
   * Check if mock backend is enabled
   */
  isMockBackendEnabled(): boolean {
    return this.config.useMockBackend;
  }

  /**
   * Get API configuration
   */
  getConfig(): ApiConfig {
    return this.config;
  }

  /**
   * Get endpoint configuration
   */
  getEndpoints(): EndpointConfig {
    return this.endpoints;
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    if (!this.config.enableCircuitBreaker) {
      return false;
    }

    if (this.circuitBreakerState === 'closed') {
      return false;
    }

    if (this.circuitBreakerState === 'open') {
      // Check if timeout has passed
      if (this.lastFailureTime && 
          Date.now() - this.lastFailureTime > this.config.circuitBreakerTimeout) {
        this.circuitBreakerState = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    if (this.circuitBreakerState === 'half-open') {
      this.circuitBreakerState = 'closed';
      this.circuitBreakerFailures = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.circuitBreakerFailures++;
    this.lastFailureTime = Date.now();

    if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
      this.circuitBreakerState = 'open';
    }
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = 'closed';
    this.circuitBreakerFailures = 0;
    this.lastFailureTime = null;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(retryCount: number): number {
    const baseDelay = this.config.retryDelay;
    const maxDelay = 10000; // 10 seconds max
    const delay = baseDelay * Math.pow(2, retryCount);
    return Math.min(delay, maxDelay);
  }

  /**
   * Get current retry count
   */
  getRetryCount(): number {
    return this.config.maxRetries;
  }

  /**
   * Get timeout value
   */
  getTimeout(): number {
    return this.config.timeout;
  }
}

// Singleton instance
const apiConfigManager = new ApiConfigManager();

export default apiConfigManager;

/**
 * Authentication Service
 * Handles user authentication via backend API with Cognito fallback
 * Implements retry logic, circuit breaker pattern, and proper error handling
 */

import apiConfig from '../config/api-config';
import { frontendAuthMonitoringService, AuthEventType } from './auth-monitoring-service';

const API_URL = apiConfig.getBaseUrl();

export interface UserInfo {
  email: string;
  name: string;
  sub: string;
}

export interface LoginResponse {
  user: {
    userId: string;
    email: string;
    name: string;
    role: string;
    organizationId?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export interface AuthError {
  message: string;
  code: string;
  retryable: boolean;
  suggestion?: string;
  timestamp: Date;
  endpoint?: string;
}

export class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiration
  private readonly MAX_RETRY_COUNT = 3;
  private retryCount = 0;

  /**
   * Login user via backend API with retry logic
   */
  async login(email: string, password: string): Promise<{ token: string; user: UserInfo }> {
    const startTime = Date.now();
    const maxRetries = apiConfig.getRetryCount();
    
    // Monitor login start
    frontendAuthMonitoringService.logAuthEvent(
      AuthEventType.AUTH_FLOW_INITIATED,
      email,
      'login',
      true
    );

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker before making request
        if (apiConfig.isCircuitBreakerOpen()) {
          throw new Error('Service temporarily unavailable (circuit breaker open)');
        }

        const response = await this.fetchWithTimeout(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }, apiConfig.getTimeout());

        apiConfig.recordSuccess();

        const data = await response.json();

        if (!response.ok) {
          const error = this.createAuthError(data.error?.message || 'Login failed', response.status);
          frontendAuthMonitoringService.logError(email, data.error?.message || 'Login failed', 'login');
          throw error;
        }

        const userInfo: UserInfo = {
          email: data.user.email,
          name: data.user.name,
          sub: data.user.userId,
        };

        // Monitor session creation
        const durationMs = Date.now() - startTime;
        frontendAuthMonitoringService.logSessionCreated(email, userInfo.sub, durationMs);

        // Store tokens with lifecycle management
        this.storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
        
        // Also store user info
        localStorage.setItem('user', JSON.stringify(userInfo));

        return { token: data.accessToken, user: userInfo };
      } catch (error: any) {
        // Record failure for circuit breaker
        apiConfig.recordFailure();

        // Check if we should retry
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delay = apiConfig.calculateRetryDelay(this.retryCount);
          console.log(`Login attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
          this.retryCount++;
          await this.sleep(delay);
          continue;
        }

        // If API fails, fall back to Cognito
        console.log('API login failed after retries, falling back to Cognito:', error.message);
        return this.loginWithCognito(email, password);
      }
    }

    throw new Error('Login failed after all retry attempts');
  }

  /**
   * Register a new user via backend API with retry logic
   */
  async register(email: string, password: string, name: string): Promise<void> {
    const startTime = Date.now();
    const maxRetries = apiConfig.getRetryCount();
    
    // Monitor registration start
    frontendAuthMonitoringService.logAuthEvent(
      AuthEventType.AUTH_FLOW_INITIATED,
      email,
      'registration',
      true
    );

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker before making request
        if (apiConfig.isCircuitBreakerOpen()) {
          throw new Error('Service temporarily unavailable (circuit breaker open)');
        }

        const response = await this.fetchWithTimeout(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name }),
        }, apiConfig.getTimeout());

        apiConfig.recordSuccess();

        const data = await response.json();

        if (!response.ok) {
          const error = this.createAuthError(data.error?.message || 'Registration failed', response.status);
          frontendAuthMonitoringService.logError(email, data.error?.message || 'Registration failed', 'registration');
          throw error;
        }
        
        // Monitor registration completion
        const durationMs = Date.now() - startTime;
        frontendAuthMonitoringService.logAuthEvent(
          AuthEventType.AUTH_FLOW_INITIATED,
          email,
          'registration',
          true,
          durationMs
        );
        
        return;
      } catch (error: any) {
        // Record failure for circuit breaker
        apiConfig.recordFailure();

        // Check if we should retry
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delay = apiConfig.calculateRetryDelay(this.retryCount);
          console.log(`Registration attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
          this.retryCount++;
          await this.sleep(delay);
          continue;
        }

        // If API fails, fall back to Cognito
        console.log('API register failed after retries, falling back to Cognito:', error.message);
        return this.registerWithCognito(email, password, name);
      }
    }

    throw new Error('Registration failed after all retry attempts');
  }

  /**
   * Confirm registration with verification code via backend API
   */
  async confirmRegistration(_email: string, _code: string): Promise<void> {
    // For now, this is a placeholder since the backend doesn't have email verification
  }

  /**
   * Resend verification code via backend API
   */
  async resendConfirmationCode(_email: string): Promise<void> {
    // For now, this is a placeholder since the backend doesn't have email verification
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    // Clear all stored tokens and user data
    this.clearTokens();
    localStorage.removeItem('user');
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserInfo | null {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
    return null;
  }

  /**
   * Get current session token from localStorage
   */
  async getToken(): Promise<string | null> {
    return localStorage.getItem('token');
  }

  /**
   * Get current user info from localStorage
   */
  async getUserInfo(): Promise<UserInfo | null> {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
    return null;
  }

  /**
   * Change password via backend API with retry logic
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const startTime = Date.now();
    const maxRetries = apiConfig.getRetryCount();
    
    // Monitor password change start
    const userInfo = this.getCurrentUser();
    if (userInfo) {
      frontendAuthMonitoringService.logAuthEvent(
        AuthEventType.AUTH_FLOW_INITIATED,
        userInfo.email,
        'password_change',
        true
      );
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token available');
        }

        // Check circuit breaker before making request
        if (apiConfig.isCircuitBreakerOpen()) {
          throw new Error('Service temporarily unavailable (circuit breaker open)');
        }

        const response = await this.fetchWithTimeout(`${API_URL}/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ oldPassword, newPassword }),
        }, apiConfig.getTimeout());

        apiConfig.recordSuccess();

        const data = await response.json();

        if (!response.ok) {
          const error = this.createAuthError(data.error?.message || 'Password change failed', response.status);
          if (userInfo) {
            frontendAuthMonitoringService.logError(userInfo.email, data.error?.message || 'Password change failed', 'password_change');
          }
          throw error;
        }
        
        // Monitor password change completion
        const durationMs = Date.now() - startTime;
        if (userInfo) {
          frontendAuthMonitoringService.logAuthEvent(
            AuthEventType.AUTH_FLOW_INITIATED,
            userInfo.email,
            'password_change',
            true,
            durationMs
          );
        }
        
        return;
      } catch (error: any) {
        // Record failure for circuit breaker
        apiConfig.recordFailure();

        // Check if we should retry
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delay = apiConfig.calculateRetryDelay(this.retryCount);
          console.log(`Change password attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
          this.retryCount++;
          await this.sleep(delay);
          continue;
        }

        throw new Error(error.message || 'Password change failed');
      }
    }

    throw new Error('Password change failed after all retry attempts');
  }

  /**
   * Initiate forgot password flow via backend API with retry logic
   */
  async forgotPassword(email: string): Promise<void> {
    const startTime = Date.now();
    const maxRetries = apiConfig.getRetryCount();
    
    // Monitor forgot password start
    frontendAuthMonitoringService.logAuthEvent(
      AuthEventType.AUTH_FLOW_INITIATED,
      email,
      'forgot_password',
      true
    );

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker before making request
        if (apiConfig.isCircuitBreakerOpen()) {
          throw new Error('Service temporarily unavailable (circuit breaker open)');
        }

        const response = await this.fetchWithTimeout(`${API_URL}/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }, apiConfig.getTimeout());

        apiConfig.recordSuccess();

        const data = await response.json();

        if (!response.ok) {
          const error = this.createAuthError(data.error?.message || 'Forgot password failed', response.status);
          frontendAuthMonitoringService.logError(email, data.error?.message || 'Forgot password failed', 'forgot_password');
          throw error;
        }
        
        // Monitor forgot password completion
        const durationMs = Date.now() - startTime;
        frontendAuthMonitoringService.logAuthEvent(
          AuthEventType.AUTH_FLOW_INITIATED,
          email,
          'forgot_password',
          true,
          durationMs
        );
        
        return;
      } catch (error: any) {
        // Record failure for circuit breaker
        apiConfig.recordFailure();

        // Check if we should retry
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delay = apiConfig.calculateRetryDelay(this.retryCount);
          console.log(`Forgot password attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
          this.retryCount++;
          await this.sleep(delay);
          continue;
        }

        throw new Error(error.message || 'Forgot password failed');
      }
    }

    throw new Error('Forgot password failed after all retry attempts');
  }

  /**
   * Confirm forgot password with code via backend API with retry logic
   */
  async confirmPassword(email: string, code: string, newPassword: string): Promise<void> {
    const startTime = Date.now();
    const maxRetries = apiConfig.getRetryCount();
    
    // Monitor confirm password start
    frontendAuthMonitoringService.logAuthEvent(
      AuthEventType.AUTH_FLOW_INITIATED,
      email,
      'confirm_password',
      true
    );

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker before making request
        if (apiConfig.isCircuitBreakerOpen()) {
          throw new Error('Service temporarily unavailable (circuit breaker open)');
        }

        const response = await this.fetchWithTimeout(`${API_URL}/auth/confirm-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, code, newPassword }),
        }, apiConfig.getTimeout());

        apiConfig.recordSuccess();

        const data = await response.json();

        if (!response.ok) {
          const error = this.createAuthError(data.error?.message || 'Confirm password failed', response.status);
          frontendAuthMonitoringService.logError(email, data.error?.message || 'Confirm password failed', 'confirm_password');
          throw error;
        }
        
        // Monitor confirm password completion
        const durationMs = Date.now() - startTime;
        frontendAuthMonitoringService.logAuthEvent(
          AuthEventType.AUTH_FLOW_INITIATED,
          email,
          'confirm_password',
          true,
          durationMs
        );
        
        return;
      } catch (error: any) {
        // Record failure for circuit breaker
        apiConfig.recordFailure();

        // Check if we should retry
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delay = apiConfig.calculateRetryDelay(this.retryCount);
          console.log(`Confirm password attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
          this.retryCount++;
          await this.sleep(delay);
          continue;
        }

        throw new Error(error.message || 'Confirm password failed');
      }
    }

    throw new Error('Confirm password failed after all retry attempts');
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * Store tokens with expiration tracking
   */
  storeTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
    const expiresAt = Date.now() + (expiresIn || 3600) * 1000; // Default 1 hour
    
    const tokenData: TokenData = {
      accessToken,
      refreshToken,
      expiresAt
    };

    localStorage.setItem('token', accessToken);
    localStorage.setItem('tokenData', JSON.stringify(tokenData));
    
    // Schedule automatic token refresh
    this.scheduleTokenRefresh(expiresAt);
  }

  /**
   * Get stored token data with expiration info
   */
  getTokenData(): TokenData | null {
    try {
      const tokenDataStr = localStorage.getItem('tokenData');
      if (!tokenDataStr) return null;
      
      const tokenData: TokenData = JSON.parse(tokenDataStr);
      
      // Check if token is expired
      if (Date.now() >= tokenData.expiresAt) {
        console.log('Token expired, clearing stored data');
        this.clearTokens();
        return null;
      }
      
      return tokenData;
    } catch (error) {
      console.error('Error parsing token data:', error);
      return null;
    }
  }

  /**
   * Check if token needs refresh (within buffer time of expiration)
   */
  needsRefresh(): boolean {
    const tokenData = this.getTokenData();
    if (!tokenData) return false;
    
    const timeUntilExpiry = tokenData.expiresAt - Date.now();
    return timeUntilExpiry <= this.TOKEN_REFRESH_BUFFER;
  }

  /**
   * Refresh access token using refresh token with retry logic
   */
  async refreshAccessToken(): Promise<string | null> {
    const startTime = Date.now();
    const maxRetries = apiConfig.getRetryCount();
    
    // Monitor token refresh start
    const userInfo = this.getCurrentUser();
    if (userInfo) {
      frontendAuthMonitoringService.logAuthEvent(
        AuthEventType.TOKEN_REFRESHED,
        userInfo.email,
        'token_refresh',
        true
      );
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const tokenData = this.getTokenData();
        if (!tokenData) {
          console.log('No token data available for refresh');
          return null;
        }

        console.log('Refreshing access token...');
        
        // Check circuit breaker before making request
        if (apiConfig.isCircuitBreakerOpen()) {
          throw new Error('Service temporarily unavailable (circuit breaker open)');
        }

        const response = await this.fetchWithTimeout(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: tokenData.refreshToken }),
        }, apiConfig.getTimeout());

        apiConfig.recordSuccess();

        if (!response.ok) {
          console.error('Token refresh failed:', response.status);
          if (userInfo) {
            frontendAuthMonitoringService.logError(userInfo.email, 'Token refresh failed', 'token_refresh');
          }
          this.clearTokens();
          return null;
        }

        const data = await response.json();
        
        // Monitor token refresh completion
        const durationMs = Date.now() - startTime;
        if (userInfo) {
          frontendAuthMonitoringService.logAuthEvent(
            AuthEventType.TOKEN_REFRESHED,
            userInfo.email,
            'token_refresh',
            true,
            durationMs
          );
        }
        
        // Store new tokens
        this.storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
        
        console.log('Token refreshed successfully');
        return data.accessToken;
      } catch (error: any) {
        // Record failure for circuit breaker
        apiConfig.recordFailure();

        // Check if we should retry
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delay = apiConfig.calculateRetryDelay(this.retryCount);
          console.log(`Token refresh attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
          this.retryCount++;
          await this.sleep(delay);
          continue;
        }

        console.error('Error refreshing token:', error);
        if (userInfo) {
          frontendAuthMonitoringService.logError(userInfo.email, error.message || 'Token refresh failed', 'token_refresh');
        }
        this.clearTokens();
        return null;
      }
    }

    console.error('Token refresh failed after all retry attempts');
    this.clearTokens();
    return null;
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const timeUntilRefresh = expiresAt - Date.now() - this.TOKEN_REFRESH_BUFFER;
    
    if (timeUntilRefresh <= 0) {
      // Token expires soon, refresh immediately
      console.log('Token expires soon, refreshing immediately');
      this.refreshAccessToken();
      return;
    }

    console.log(`Scheduling token refresh in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
    
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, timeUntilRefresh);
  }

  /**
   * Restore session from localStorage on page load
   */
  async restoreSession(): Promise<{ token: string; user: UserInfo } | null> {
    try {
      const tokenData = this.getTokenData();
      const userInfo = this.getCurrentUser();
      
      if (!tokenData || !userInfo) {
        console.log('No valid session to restore');
        return null;
      }

      // Monitor session restoration
      frontendAuthMonitoringService.logAuthEvent(
        AuthEventType.AUTH_FLOW_INITIATED,
        userInfo.email,
        'session_restoration',
        true
      );

      // Check if token needs refresh
      if (this.needsRefresh()) {
        console.log('Token needs refresh during session restoration');
        const newToken = await this.refreshAccessToken();
        if (!newToken) {
          return null;
        }
        return { token: newToken, user: userInfo };
      }

      // Monitor successful session restoration
      frontendAuthMonitoringService.logSessionCreated(
        userInfo.email,
        userInfo.sub,
        0 // Session restoration is instant
      );
      
      console.log('Session restored successfully');
      return { token: tokenData.accessToken, user: userInfo };
    } catch (error: any) {
      console.error('Error restoring session:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Validate current token and refresh if needed
   */
  async validateAndRefreshToken(): Promise<string | null> {
    const tokenData = this.getTokenData();
    
    if (!tokenData) {
      console.log('No token to validate');
      return null;
    }

    // If token needs refresh, refresh it
    if (this.needsRefresh()) {
      console.log('Token needs refresh');
      return await this.refreshAccessToken();
    }

    // Token is still valid
    return tokenData.accessToken;
  }

  /**
   * Clear all stored tokens and cancel refresh timer
   */
  clearTokens(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenData');
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // Monitor session termination
    const userInfo = this.getCurrentUser();
    if (userInfo) {
      frontendAuthMonitoringService.logSessionTerminated(userInfo.email, userInfo.sub);
    }
  }

  // Helper methods

  /**
   * Create a standardized auth error
   */
  private createAuthError(message: string, statusCode: number): AuthError {
    return {
      message,
      code: this.mapStatusCodeToErrorCode(statusCode),
      retryable: this.isRetryableStatusCode(statusCode),
      suggestion: this.getSuggestionForErrorCode(this.mapStatusCodeToErrorCode(statusCode)),
      timestamp: new Date(),
    };
  }

  /**
   * Map HTTP status code to error code
   */
  private mapStatusCodeToErrorCode(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 429:
        return 'RATE_LIMITED';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Check if status code is retryable
   */
  private isRetryableStatusCode(statusCode: number): boolean {
    return [429, 500, 502, 503, 504].includes(statusCode);
  }

  /**
   * Get suggestion for error code
   */
  private getSuggestionForErrorCode(errorCode: string): string | undefined {
    switch (errorCode) {
      case 'RATE_LIMITED':
        return 'Please wait a moment and try again';
      case 'SERVICE_UNAVAILABLE':
        return 'Service is temporarily unavailable. Please try again later';
      case 'INTERNAL_SERVER_ERROR':
        return 'An unexpected error occurred. Please try again';
      default:
        return undefined;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Check if error has retryable flag
    if (error.retryable !== undefined) {
      return error.retryable;
    }

    // Check for network errors
    if (!navigator.onLine) {
      return true;
    }

    // Check for timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
      return true;
    }

    // Check for network-related errors
    const networkErrors = [
      'NetworkError',
      'FetchError',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
    ];

    return networkErrors.some(err => error.message?.includes(err));
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cognito fallback methods
  private async loginWithCognito(email: string, password: string): Promise<{ token: string; user: UserInfo }> {
    // Import Cognito dynamically to avoid bundling issues
    const { CognitoUserPool, CognitoUser, AuthenticationDetails } = await import('amazon-cognito-identity-js');
    
    const poolData = {
      UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_yTX8thfy9',
      ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '7ltt7flg73m2or3lfq534fbmee',
    };

    const userPool = new CognitoUserPool(poolData);
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    return new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: (session: any) => {
          // Use access token instead of ID token for API calls
          const token = session.getAccessToken().getJwtToken();
          const idTokenPayload = session.getIdToken().payload;
          resolve({ token, user: { email: idTokenPayload.email, name: idTokenPayload.name || idTokenPayload.email, sub: idTokenPayload.sub } });
        },
        onFailure: (err: any) => reject(err),
        newPasswordRequired: () => reject(new Error('New password required')),
      });
    });
  }

  private async registerWithCognito(email: string, password: string, name: string): Promise<void> {
    // Import Cognito dynamically to avoid bundling issues
    const { CognitoUserPool, CognitoUserAttribute } = await import('amazon-cognito-identity-js');
    
    const poolData = {
      UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_yTX8thfy9',
      ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '7ltt7flg73m2or3lfq534fbmee',
    };

    const userPool = new CognitoUserPool(poolData);
    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'name', Value: name }),
    ];

    return new Promise((resolve, reject) => {
      userPool.signUp(email, password, attributes, [], (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const authService = new AuthService();

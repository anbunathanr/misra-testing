/**
 * Authentication Service
 * Handles user authentication via backend API
 */

import { API_URL } from '../config/api-config';
import { frontendAuthMonitoringService, AuthEventType } from './auth-monitoring-service';

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
  expiresAt: number;
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
  private readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;

  /**
   * Login user via backend API
   */
  async login(email: string, password: string): Promise<{ token: string; user: UserInfo }> {
    try {
      frontendAuthMonitoringService.logAuthEvent(
        AuthEventType.AUTH_FLOW_INITIATED,
        email,
        'login',
        true
      );

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      const userInfo: UserInfo = {
        email: data.user.email,
        name: data.user.name,
        sub: data.user.userId,
      };

      this.storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
      localStorage.setItem('user', JSON.stringify(userInfo));

      frontendAuthMonitoringService.logSessionCreated(email, userInfo.sub, 0);

      return { token: data.accessToken, user: userInfo };
    } catch (error: any) {
      frontendAuthMonitoringService.logError(email, error.message, 'login');
      throw error;
    }
  }

  /**
   * Register a new user via backend API
   */
  async register(email: string, password: string, name: string): Promise<void> {
    try {
      frontendAuthMonitoringService.logAuthEvent(
        AuthEventType.AUTH_FLOW_INITIATED,
        email,
        'registration',
        true
      );

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      return;
    } catch (error: any) {
      frontendAuthMonitoringService.logError(email, error.message, 'registration');
      throw error;
    }
  }

  /**
   * Confirm registration with verification code
   */
  async confirmRegistration(_email: string, _code: string): Promise<void> {
    // Placeholder
  }

  /**
   * Resend verification code
   */
  async resendConfirmationCode(_email: string): Promise<void> {
    // Placeholder
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
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
   * Get current session token
   */
  async getToken(): Promise<string | null> {
    return localStorage.getItem('token');
  }

  /**
   * Get current user info
   */
  async getUserInfo(): Promise<UserInfo | null> {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
    return null;
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Password change failed');
      }

      return;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Initiate forgot password flow
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Forgot password failed');
      }

      return;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Confirm forgot password with code
   */
  async confirmPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/auth/confirm-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Confirm password failed');
      }

      return;
    } catch (error: any) {
      throw error;
    }
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
    const expiresAt = Date.now() + (expiresIn || 3600) * 1000;
    
    const tokenData: TokenData = {
      accessToken,
      refreshToken,
      expiresAt
    };

    localStorage.setItem('token', accessToken);
    localStorage.setItem('tokenData', JSON.stringify(tokenData));
    
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
      
      if (Date.now() >= tokenData.expiresAt) {
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
   * Check if token needs refresh
   */
  needsRefresh(): boolean {
    const tokenData = this.getTokenData();
    if (!tokenData) return false;
    
    const timeUntilExpiry = tokenData.expiresAt - Date.now();
    return timeUntilExpiry <= this.TOKEN_REFRESH_BUFFER;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      const tokenData = this.getTokenData();
      if (!tokenData) {
        return null;
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokenData.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      this.storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
      
      return data.accessToken;
    } catch (error: any) {
      console.error('Error refreshing token:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const timeUntilRefresh = expiresAt - Date.now() - this.TOKEN_REFRESH_BUFFER;
    
    if (timeUntilRefresh <= 0) {
      this.refreshAccessToken();
      return;
    }

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
        return null;
      }

      if (this.needsRefresh()) {
        const newToken = await this.refreshAccessToken();
        if (!newToken) {
          return null;
        }
        return { token: newToken, user: userInfo };
      }

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
      return null;
    }

    if (this.needsRefresh()) {
      return await this.refreshAccessToken();
    }

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
    
    const userInfo = this.getCurrentUser();
    if (userInfo) {
      frontendAuthMonitoringService.logSessionTerminated(userInfo.email, userInfo.sub);
    }
  }
}

export const authService = new AuthService();

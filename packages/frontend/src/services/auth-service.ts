/**
 * Authentication Service
 * Handles user authentication via backend API with Cognito fallback
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

export class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiration

  /**
   * Login user via backend API
   */
  async login(email: string, password: string): Promise<{ token: string; user: UserInfo }> {
    try {
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

      // Store tokens with lifecycle management
      this.storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
      
      // Also store user info
      localStorage.setItem('user', JSON.stringify(userInfo));

      return { token: data.accessToken, user: userInfo };
    } catch (error: any) {
      // If API fails, fall back to Cognito
      console.log('API login failed, falling back to Cognito:', error.message);
      return this.loginWithCognito(email, password);
    }
  }

  /**
   * Register a new user via backend API
   */
  async register(email: string, password: string, name: string): Promise<void> {
    try {
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
    } catch (error: any) {
      // If API fails, fall back to Cognito
      console.log('API register failed, falling back to Cognito:', error.message);
      return this.registerWithCognito(email, password, name);
    }
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
  getCurrentUser(): null {
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
   * Change password via backend API
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
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
    } catch (error: any) {
      throw new Error(error.message || 'Password change failed');
    }
  }

  /**
   * Initiate forgot password flow via backend API
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
    } catch (error: any) {
      throw new Error(error.message || 'Forgot password failed');
    }
  }

  /**
   * Confirm forgot password with code via backend API
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
    } catch (error: any) {
      throw new Error(error.message || 'Confirm password failed');
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
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      const tokenData = this.getTokenData();
      if (!tokenData) {
        console.log('No token data available for refresh');
        return null;
      }

      console.log('Refreshing access token...');
      
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: tokenData.refreshToken }),
      });

      if (!response.ok) {
        console.error('Token refresh failed:', response.status);
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      
      // Store new tokens
      this.storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
      
      console.log('Token refreshed successfully');
      return data.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearTokens();
      return null;
    }
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
      const userInfo = await this.getUserInfo();
      
      if (!tokenData || !userInfo) {
        console.log('No valid session to restore');
        return null;
      }

      // Check if token needs refresh
      if (this.needsRefresh()) {
        console.log('Token needs refresh during session restoration');
        const newToken = await this.refreshAccessToken();
        if (!newToken) {
          return null;
        }
        return { token: newToken, user: userInfo };
      }

      // Schedule refresh for valid token
      this.scheduleTokenRefresh(tokenData.expiresAt);
      
      console.log('Session restored successfully');
      return { token: tokenData.accessToken, user: userInfo };
    } catch (error) {
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
  }

  // Cognito fallback methods
  private async loginWithCognito(email: string, password: string): Promise<{ token: string; user: UserInfo }> {
    // Import Cognito dynamically to avoid bundling issues
    const { CognitoUserPool, CognitoUser, AuthenticationDetails } = await import('amazon-cognito-identity-js');
    
    const poolData = {
      UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_yTX8thfy9',
      ClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '7ltt7flg73m2or3lfq534fbmee',
    };

    const userPool = new CognitoUserPool(poolData);
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    return new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: (session: any) => {
          const token = session.getIdToken().getJwtToken();
          const payload = session.getIdToken().payload;
          resolve({ token, user: { email: payload.email, name: payload.name || payload.email, sub: payload.sub } });
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
      ClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '7ltt7flg73m2or3lfq534fbmee',
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

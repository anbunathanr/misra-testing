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

export class AuthService {
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
    // Clear any stored tokens
    localStorage.removeItem('token');
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

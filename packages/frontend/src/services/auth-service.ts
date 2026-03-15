/**
 * Authentication Service
 * Handles user authentication with AWS Cognito
 */

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';

// Cognito configuration from environment variables
const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  ClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
};

const userPool = new CognitoUserPool(poolData);

export interface UserInfo {
  email: string;
  name: string;
  sub: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const attributes = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: name }),
      ];

      userPool.signUp(email, password, attributes, [], (err: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Confirm registration with verification code
   */
  async confirmRegistration(email: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      user.confirmRegistration(code, true, (err: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Resend verification code
   */
  async resendConfirmationCode(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      user.resendConfirmationCode((err: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ token: string; user: UserInfo }> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      user.authenticateUser(authDetails, {
        onSuccess: (session: CognitoUserSession) => {
          const token = session.getIdToken().getJwtToken();
          const payload = session.getIdToken().payload;
          
          const userInfo: UserInfo = {
            email: payload.email,
            name: payload.name || payload.email,
            sub: payload.sub,
          };

          resolve({ token, user: userInfo });
        },
        onFailure: (err: any) => {
          reject(err);
        },
        newPasswordRequired: () => {
          // Handle new password required scenario
          reject(new Error('New password required'));
        },
      });
    });
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const user = userPool.getCurrentUser();
    if (user) {
      user.signOut();
    }
    // Clear any stored tokens
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Get current user
   */
  getCurrentUser(): CognitoUser | null {
    return userPool.getCurrentUser();
  }

  /**
   * Get current session token
   */
  async getToken(): Promise<string | null> {
    return new Promise((resolve) => {
      const user = this.getCurrentUser();
      if (!user) {
        resolve(null);
        return;
      }

      user.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null);
          return;
        }
        resolve(session.getIdToken().getJwtToken());
      });
    });
  }

  /**
   * Get current user info
   */
  async getUserInfo(): Promise<UserInfo | null> {
    return new Promise((resolve) => {
      const user = this.getCurrentUser();
      if (!user) {
        resolve(null);
        return;
      }

      user.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null);
          return;
        }

        const payload = session.getIdToken().payload;
        resolve({
          email: payload.email,
          name: payload.name || payload.email,
          sub: payload.sub,
        });
      });
    });
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = this.getCurrentUser();
      if (!user) {
        reject(new Error('No user logged in'));
        return;
      }

      user.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          reject(err || new Error('No valid session'));
          return;
        }

        user.changePassword(oldPassword, newPassword, (err: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * Initiate forgot password flow
   */
  async forgotPassword(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      user.forgotPassword({
        onSuccess: () => {
          resolve();
        },
        onFailure: (err: any) => {
          reject(err);
        },
      });
    });
  }

  /**
   * Confirm forgot password with code
   */
  async confirmPassword(email: string, code: string, newPassword: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const user = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      user.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve();
        },
        onFailure: (err: any) => {
          reject(err);
        },
      });
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }
}

export const authService = new AuthService();

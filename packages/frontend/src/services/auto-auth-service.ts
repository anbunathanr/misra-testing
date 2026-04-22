/**
 * Automatic Authentication Service
 * 
 * Handles fully automated authentication flow:
 * 1. Auto-register user with email
 * 2. Auto-fetch OTP from email (via backend)
 * 3. Auto-verify OTP
 * 4. Auto-login user
 * 
 * This enables one-click MISRA analysis without manual authentication steps.
 */

import { authService } from './auth-service';

export interface AutoAuthResult {
  success: boolean;
  token?: string;
  user?: any;
  error?: string;
  logs: string[];
}

export interface AutoAuthProgress {
  step: 'registering' | 'fetching_otp' | 'verifying_otp' | 'logging_in' | 'complete';
  message: string;
  progress: number;
}

export type AutoAuthProgressCallback = (progress: AutoAuthProgress) => void;

export class AutoAuthService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || '';
  }

  /**
   * Fully automated authentication flow
   * Registers, fetches OTP, verifies, and logs in user
   */
  public async autoAuthenticate(
    email: string,
    name: string = 'User',
    onProgress?: AutoAuthProgressCallback
  ): Promise<AutoAuthResult> {
    const logs: string[] = [];
    const startTime = Date.now();
    let tempPassword = '';
    let session: string | undefined;

    try {
      // Step 1: Check if user already exists and is authenticated
      const existingAuth = await this.checkExistingAuth(email, logs);
      if (existingAuth.success) {
        this.reportProgress(onProgress, 'complete', 'Already authenticated', 100);
        return {
          success: true,
          token: existingAuth.token,
          user: existingAuth.user,
          logs
        };
      }

      // Step 2: Auto-register user
      this.reportProgress(onProgress, 'registering', 'Registering user...', 20);
      const registerResult = await this.autoRegister(email, name, logs);
      if (!registerResult.success) {
        return {
          success: false,
          error: registerResult.error,
          logs
        };
      }
      tempPassword = registerResult.password || '';

      // Step 3: If user exists (409), we skip login and go directly to OTP
      // The verify-otp endpoint will handle authentication for existing users
      if (registerResult.userExists) {
        logs.push(`ℹ️ User already exists, skipping login and proceeding to OTP verification`);
        // Don't set session - verify-otp will authenticate directly
      }

      // Step 4: Auto-fetch OTP from email
      this.reportProgress(onProgress, 'fetching_otp', 'Fetching OTP from email...', 40);
      const otpResult = await this.autoFetchOTP(email, logs);
      if (!otpResult.success) {
        return {
          success: false,
          error: otpResult.error,
          logs
        };
      }

      // Step 5: Auto-verify OTP (pass session if available)
      this.reportProgress(onProgress, 'verifying_otp', 'Verifying OTP...', 60);
      const verifyResult = await this.autoVerifyOTP(email, otpResult.otp!, tempPassword, logs, session);
      if (!verifyResult.success) {
        return {
          success: false,
          error: verifyResult.error,
          logs
        };
      }

      // Step 6: Auto-login user
      this.reportProgress(onProgress, 'logging_in', 'Logging in...', 80);
      const loginResult = await this.autoLogin(email, logs);
      if (!loginResult.success) {
        return {
          success: false,
          error: loginResult.error,
          logs
        };
      }

      // Complete
      this.reportProgress(onProgress, 'complete', 'Authentication complete', 100);
      const executionTime = Date.now() - startTime;
      logs.push(`✅ Full authentication completed in ${executionTime}ms`);

      return {
        success: true,
        token: loginResult.token,
        user: loginResult.user,
        logs
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`❌ Authentication failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
        logs
      };
    }
  }

  /**
   * Check if user is already authenticated
   */
  private async checkExistingAuth(
    email: string,
    logs: string[]
  ): Promise<{ success: boolean; token?: string; user?: any }> {
    try {
      const isAuthenticated = await authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();

      if (isAuthenticated && currentUser && currentUser.email === email) {
        logs.push(`✅ User already authenticated: ${email}`);
        const token = await authService.getToken();
        return {
          success: true,
          token: token || undefined,
          user: currentUser
        };
      }

      return { success: false };
    } catch (error) {
      logs.push(`⚠️ Error checking existing auth: ${error}`);
      return { success: false };
    }
  }

  /**
   * Auto-register user
   */
  private async autoRegister(
    email: string,
    name: string,
    logs: string[]
  ): Promise<{ success: boolean; password?: string; userExists?: boolean; error?: string }> {
    try {
      logs.push(`📝 Auto-registering user: ${email}`);

      // Generate a unique, high-entropy password for this user
      // This password is only used for the autonomous workflow
      const tempPassword = this.generateTemporaryPassword();

      // Call backend register endpoint
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password: tempPassword,
          name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // If user already exists, that's okay - we'll just verify
        const errorMessage = typeof data.error === 'string' ? data.error : data.error?.message || '';
        if (response.status === 409 || errorMessage.includes('already exists')) {
          logs.push(`ℹ️ User already exists: ${email}`);
          // For existing users, we need to use a default password or passwordless flow
          // Try with a common test password first
          return { success: true, password: 'TestPass123!@#', userExists: true };
        }
        throw new Error(errorMessage || 'Registration failed');
      }

      logs.push(`✅ User registered successfully: ${email}`);
      return { success: true, password: tempPassword, userExists: false };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      logs.push(`❌ Registration failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Initiate login to get a valid session
   * Called when user already exists (409 from registration)
   */
  private async initiateLogin(
    email: string,
    password: string,
    logs: string[]
  ): Promise<{ success: boolean; session?: string; error?: string }> {
    try {
      logs.push(`🔑 Initiating login session for: ${email}`);

      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      // Store the session/tokens for later use
      // The verify-otp endpoint will use these to link the OTP verification
      logs.push(`✅ Login session initiated successfully`);
      return { success: true, session: data.accessToken };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login initiation failed';
      logs.push(`❌ Login initiation failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Auto-fetch OTP from email via backend
   */
  private async autoFetchOTP(
    email: string,
    logs: string[]
  ): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      logs.push(`📧 Fetching OTP from email: ${email}`);

      // Call backend endpoint to fetch OTP from email
      // This endpoint should:
      // 1. Connect to email service (IMAP/POP3)
      // 2. Search for OTP email
      // 3. Extract OTP code
      // 4. Return it to frontend
      const response = await fetch(`${this.apiUrl}/auth/fetch-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch OTP');
      }

      if (!data.otp) {
        throw new Error('No OTP found in email');
      }

      logs.push(`✅ OTP fetched successfully: ${data.otp.substring(0, 3)}***`);
      return { success: true, otp: data.otp };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OTP fetch failed';
      logs.push(`❌ OTP fetch failed: ${errorMessage}`);
      
      // Retry with longer timeout
      logs.push(`⏳ Retrying OTP fetch with longer timeout...`);
      return await this.retryFetchOTP(email, logs);
    }
  }

  /**
   * Retry OTP fetch with exponential backoff
   */
  private async retryFetchOTP(
    email: string,
    logs: string[],
    attempt: number = 1
  ): Promise<{ success: boolean; otp?: string; error?: string }> {
    if (attempt > 3) {
      const error = 'Failed to fetch OTP after 3 attempts';
      logs.push(`❌ ${error}`);
      return { success: false, error };
    }

    // Wait before retrying (exponential backoff)
    const delay = Math.pow(2, attempt) * 1000;
    logs.push(`⏳ Waiting ${delay}ms before retry attempt ${attempt}...`);
    await this.sleep(delay);

    try {
      const response = await fetch(`${this.apiUrl}/auth/fetch-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch OTP');
      }

      if (!data.otp) {
        throw new Error('No OTP found in email');
      }

      logs.push(`✅ OTP fetched on attempt ${attempt}: ${data.otp.substring(0, 3)}***`);
      return { success: true, otp: data.otp };

    } catch (error) {
      logs.push(`⚠️ Attempt ${attempt} failed, retrying...`);
      return this.retryFetchOTP(email, logs, attempt + 1);
    }
  }

  /**
   * Auto-verify OTP
   */
  private async autoVerifyOTP(
    email: string,
    otp: string,
    password: string,
    logs: string[],
    session?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logs.push(`🔐 Verifying OTP for: ${email}`);

      const response = await fetch(`${this.apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          otp,
          password,
          session // Pass session if available (from login)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'OTP verification failed');
      }

      logs.push(`✅ OTP verified successfully`);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OTP verification failed';
      logs.push(`❌ OTP verification failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Auto-login user
   */
  private async autoLogin(
    email: string,
    logs: string[]
  ): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    try {
      logs.push(`🔑 Auto-logging in user: ${email}`);

      // Use a special auto-login endpoint that doesn't require password
      // This endpoint should verify that OTP was already verified
      const response = await fetch(`${this.apiUrl}/auth/auto-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Auto-login failed');
      }

      // Store tokens
      authService.storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
      
      // Store user info
      const userInfo = {
        email: data.user.email,
        name: data.user.name,
        sub: data.user.userId
      };
      localStorage.setItem('user', JSON.stringify(userInfo));

      logs.push(`✅ User logged in successfully`);
      return {
        success: true,
        token: data.accessToken,
        user: userInfo
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Auto-login failed';
      logs.push(`❌ Auto-login failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Helper: Generate temporary password
   */
  private generateTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*';

    // Ensure at least one of each required type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest with random characters
    const allChars = uppercase + lowercase + digits + special;
    for (let i = password.length; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Helper: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Report progress
   */
  private reportProgress(
    callback: AutoAuthProgressCallback | undefined,
    step: AutoAuthProgress['step'],
    message: string,
    progress: number
  ): void {
    if (callback) {
      callback({ step, message, progress });
    }
  }
}

export const autoAuthService = new AutoAuthService();

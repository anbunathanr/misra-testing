/**
 * Authentication State Manager
 * Central coordinator for authentication state and component orchestration
 */

import { frontendAuthMonitoringService } from './auth-monitoring-service';
import { AuthEventType } from './auth-monitoring-service';
import apiConfig from '../config/api-config';
import { mockBackend } from './mock-backend';

export enum AuthenticationState {
  INITIAL = 'initial',
  REGISTERING = 'registering',
  EMAIL_VERIFICATION_REQUIRED = 'email_verification_required',
  EMAIL_VERIFYING = 'email_verifying',
  OTP_SETUP_REQUIRED = 'otp_setup_required',
  OTP_VERIFYING = 'otp_verifying',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error'
}

export interface UserInfo {
  email: string;
  name?: string;
  isRegistered: boolean;
  isEmailVerified: boolean;
  isOTPEnabled: boolean;
  userId?: string;
  organizationId?: string;
  role?: string;
}

export interface OTPSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  issuer: string;
  accountName: string;
}

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  suggestion: string;
  correlationId: string;
  timestamp: Date;
  step: AuthenticationState;
}

export interface AuthenticationContext {
  state: AuthenticationState;
  userInfo: Partial<UserInfo>;
  progress: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
  };
  error: AuthError | null;
  retryCount: number;
  lastAction: Date;
}

export type AuthStateChangeListener = (context: AuthenticationContext) => void;
export type ModalVisibilityListener = (modalType: 'email_verification' | 'otp_setup', visible: boolean, data?: any) => void;

/**
 * Session lock for handling concurrent authentication attempts
 */
interface SessionLock {
  lockId: string;
  timestamp: number;
  operation: string;
}

/**
 * Persisted session state structure
 */
interface PersistedSessionState {
  state: AuthenticationState;
  userInfo: Partial<UserInfo>;
  progress: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
  };
  retryCount: number;
  lastAction: string;
  otpSetupData: OTPSetupData | null;
  version: number; // Schema version for future migrations
  sessionId: string; // Unique session identifier
}

export class AuthStateManager {
  private context: AuthenticationContext;
  private stateChangeListeners: AuthStateChangeListener[] = [];
  private modalVisibilityListeners: ModalVisibilityListener[] = [];
  private otpSetupData: OTPSetupData | null = null;
  private sessionId: string;
  private readonly STORAGE_VERSION = 1;
  private readonly SESSION_TIMEOUT_HOURS = 1;
  private readonly LOCK_TIMEOUT_MS = 5000; // 5 seconds
  private readonly STORAGE_KEY = 'authState';
  private readonly LOCK_KEY = 'authStateLock';

  constructor() {
    this.sessionId = this.generateSessionId();
    
    this.context = {
      state: AuthenticationState.INITIAL,
      userInfo: {},
      progress: {
        currentStep: 0,
        totalSteps: 4,
        stepName: 'Ready'
      },
      error: null,
      retryCount: 0,
      lastAction: new Date()
    };

    // Restore state from localStorage if available
    this.restoreStateFromStorage();
  }

  /**
   * Generate unique session identifier
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // State management
  get currentState(): AuthenticationState {
    return this.context.state;
  }

  get userInfo(): UserInfo | null {
    if (!this.context.userInfo.email) return null;
    return this.context.userInfo as UserInfo;
  }

  get authenticationContext(): AuthenticationContext {
    return { ...this.context };
  }

  // State transitions with concurrent protection
  async initiateRegistration(email: string, name?: string): Promise<void> {
    const startTime = Date.now();
    
    return this.withLock('registration', async () => {
      try {
        this.updateState(AuthenticationState.REGISTERING, {
          userInfo: { email, name, isRegistered: false, isEmailVerified: false, isOTPEnabled: false },
          progress: { currentStep: 1, totalSteps: 4, stepName: 'Registration' }
        });

        // Monitor registration start
        frontendAuthMonitoringService.logAuthEvent(
          AuthEventType.AUTH_FLOW_INITIATED,
          email,
          'registration',
          true
        );

        // Check if mock backend should be used
        const apiUrl = apiConfig.getBaseUrl();
        let data;

        if (mockBackend.shouldUseMock(apiUrl)) {
          console.log('🎭 Using mock backend for registration');
          const mockResult = await mockBackend.mockQuickRegister(email, name);
          data = {
            state: 'authenticated',
            requiresEmailVerification: false,
            requiresOTPSetup: false,
            message: 'Mock registration successful',
            accessToken: mockResult.accessToken,
            refreshToken: mockResult.refreshToken,
            user: mockResult.user,
            expiresIn: mockResult.expiresIn
          };
        } else {
          const response = await fetch(`${apiUrl}/auth/initiate-flow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
          });

          const durationMs = Date.now() - startTime;
          frontendAuthMonitoringService.logAPICall(`${apiUrl}/auth/initiate-flow`, response.ok, durationMs, email);

          // Check if response has content before parsing JSON
          const responseText = await response.text();
          console.log('Raw response:', responseText);
          
          if (!responseText) {
            throw new Error('Empty response from server');
          }

          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Response text:', responseText);
            throw new Error('Invalid JSON response from server');
          }

          if (!response.ok) {
            frontendAuthMonitoringService.logError(email, data.error?.message || 'Registration failed', 'registration');
            throw new Error(data.error?.message || 'Registration failed');
          }
        }

        // Handle different registration outcomes
        if (data.requiresEmailVerification) {
          this.updateState(AuthenticationState.EMAIL_VERIFICATION_REQUIRED, {
            userInfo: { ...this.context.userInfo, isRegistered: true },
            progress: { currentStep: 2, totalSteps: 4, stepName: 'Email Verification' }
          });
          this.showEmailVerificationModal();
        } else if (data.requiresOTPSetup) {
          this.updateState(AuthenticationState.OTP_SETUP_REQUIRED, {
            userInfo: { ...this.context.userInfo, isRegistered: true, isEmailVerified: true },
            progress: { currentStep: 3, totalSteps: 4, stepName: 'OTP Setup' }
          });
        } else {
          // User is fully authenticated
          this.updateState(AuthenticationState.AUTHENTICATED, {
            userInfo: { ...this.context.userInfo, isRegistered: true, isEmailVerified: true, isOTPEnabled: true },
            progress: { currentStep: 4, totalSteps: 4, stepName: 'Complete' }
          });
        }
      } catch (error: any) {
        this.handleAuthError(this.createAuthError(error, AuthenticationState.REGISTERING));
        throw error;
      }
    });
  }

  async handleEmailVerification(code: string): Promise<OTPSetupData> {
    const startTime = Date.now();
    
    return this.withLock('email-verification', async () => {
      try {
        this.updateState(AuthenticationState.EMAIL_VERIFYING, {
          progress: { currentStep: 2, totalSteps: 4, stepName: 'Verifying Email' }
        });

        // Monitor email verification start
        frontendAuthMonitoringService.logAuthEvent(
          AuthEventType.EMAIL_VERIFICATION_STARTED,
          this.context.userInfo.email,
          'email_verification',
          true
        );

        const response = await fetch(`${apiConfig.getBaseUrl()}/auth/verify-email-with-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.context.userInfo.email,
            confirmationCode: code
          })
        });

        const durationMs = Date.now() - startTime;
        frontendAuthMonitoringService.logAPICall(`${apiConfig.getBaseUrl()}/auth/verify-email-with-otp`, response.ok, durationMs, this.context.userInfo.email);

        // Check if response has content before parsing JSON
        const responseText = await response.text();
        console.log('Email verification raw response:', responseText);
        
        if (!responseText) {
          throw new Error('Empty response from server');
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response text:', responseText);
          throw new Error('Invalid JSON response from server');
        }

        if (!response.ok) {
          frontendAuthMonitoringService.logError(this.context.userInfo.email, data.error?.message || 'Email verification failed', 'email_verification');
          throw new Error(data.error?.message || 'Email verification failed');
        }

        // Monitor email verification completion
        frontendAuthMonitoringService.logAuthEvent(
          AuthEventType.EMAIL_VERIFICATION_COMPLETED,
          this.context.userInfo.email,
          'email_verification',
          true,
          durationMs
        );

        // Store OTP setup data
        this.otpSetupData = data.otpSetup;

        // Store temporary tokens if provided (for file upload access during OTP setup)
        if (data.temporaryTokens) {
          localStorage.setItem('tempAccessToken', data.temporaryTokens.accessToken);
          localStorage.setItem('tempRefreshToken', data.temporaryTokens.refreshToken);
          localStorage.setItem('tempTokenScope', data.temporaryTokens.scope);
          localStorage.setItem('tempTokenExpiry', (Date.now() + (data.temporaryTokens.expiresIn * 1000)).toString());
          console.log('Temporary authentication tokens stored for file operations');
        }

        // Update state and show OTP setup modal
        this.updateState(AuthenticationState.OTP_SETUP_REQUIRED, {
          userInfo: { ...this.context.userInfo, isEmailVerified: true },
          progress: { currentStep: 3, totalSteps: 4, stepName: 'OTP Setup' }
        });

        this.hideModals();
        this.showOTPSetupModal(data.otpSetup);

        return data.otpSetup;
      } catch (error: any) {
        this.handleAuthError(this.createAuthError(error, AuthenticationState.EMAIL_VERIFYING));
        throw error;
      }
    });
  }

  async completeOTPSetup(otpCode: string): Promise<void> {
    const startTime = Date.now();
    
    return this.withLock('otp-setup', async () => {
      try {
        this.updateState(AuthenticationState.OTP_VERIFYING, {
          progress: { currentStep: 3, totalSteps: 4, stepName: 'Verifying OTP' }
        });

        // Monitor OTP setup start
        frontendAuthMonitoringService.logAuthEvent(
          AuthEventType.OTP_SETUP_STARTED,
          this.context.userInfo.email,
          'otp_setup',
          true
        );

        const response = await fetch(`${apiConfig.getBaseUrl()}/auth/complete-otp-setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.context.userInfo.email,
            otpCode
          })
        });

        const durationMs = Date.now() - startTime;
        frontendAuthMonitoringService.logAPICall(`${apiConfig.getBaseUrl()}/auth/complete-otp-setup`, response.ok, durationMs, this.context.userInfo.email);

        // Check if response has content before parsing JSON
        const responseText = await response.text();
        console.log('OTP setup raw response:', responseText);
        
        if (!responseText) {
          throw new Error('Empty response from server');
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response text:', responseText);
          throw new Error('Invalid JSON response from server');
        }

        if (!response.ok) {
          frontendAuthMonitoringService.logError(this.context.userInfo.email, data.error?.message || 'OTP verification failed', 'otp_verification');
          throw new Error(data.error?.message || 'OTP verification failed');
        }

        // Monitor OTP setup completion
        frontendAuthMonitoringService.logAuthEvent(
          AuthEventType.OTP_SETUP_COMPLETED,
          this.context.userInfo.email,
          'otp_setup',
          true,
          durationMs
        );

        // Monitor session creation
        frontendAuthMonitoringService.logSessionCreated(
          this.context.userInfo.email,
          data.userSession?.userId,
          durationMs
        );

        // Update user info with session data
        this.updateState(AuthenticationState.AUTHENTICATED, {
          userInfo: {
            ...this.context.userInfo,
            isOTPEnabled: true,
            userId: data.userSession?.userId,
            organizationId: data.userSession?.organizationId,
            role: data.userSession?.role
          },
          progress: { currentStep: 4, totalSteps: 4, stepName: 'Complete' }
        });

        // Store tokens if provided
        if (data.tokens) {
          localStorage.setItem('accessToken', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
          
          // Clear temporary tokens since we now have full authentication
          localStorage.removeItem('tempAccessToken');
          localStorage.removeItem('tempRefreshToken');
          localStorage.removeItem('tempTokenScope');
          localStorage.removeItem('tempTokenExpiry');
          console.log('Full authentication tokens stored, temporary tokens cleared');
        }

        this.hideModals();
        this.clearError();
      } catch (error: any) {
        this.handleAuthError(this.createAuthError(error, AuthenticationState.OTP_VERIFYING));
        throw error;
      }
    });
  }

  // Error handling
  handleAuthError(error: AuthError): void {
    this.updateState(AuthenticationState.ERROR, { error });
    this.context.retryCount++;
    this.persistStateToStorage();
  }

  async retryCurrentStep(): Promise<void> {
    const currentError = this.context.error;
    if (!currentError || !currentError.retryable) {
      throw new Error('Current operation is not retryable');
    }

    this.clearError();

    // Retry based on the step where error occurred
    switch (currentError.step) {
      case AuthenticationState.REGISTERING:
        if (this.context.userInfo.email) {
          await this.initiateRegistration(this.context.userInfo.email, this.context.userInfo.name);
        }
        break;
      case AuthenticationState.EMAIL_VERIFYING:
        // User needs to re-enter verification code
        this.updateState(AuthenticationState.EMAIL_VERIFICATION_REQUIRED);
        this.showEmailVerificationModal();
        break;
      case AuthenticationState.OTP_VERIFYING:
        // User needs to re-enter OTP code
        this.updateState(AuthenticationState.OTP_SETUP_REQUIRED);
        if (this.otpSetupData) {
          this.showOTPSetupModal(this.otpSetupData);
        }
        break;
    }
  }

  // Modal management
  showEmailVerificationModal(): void {
    this.notifyModalVisibility('email_verification', true, {
      email: this.context.userInfo.email
    });
  }

  showOTPSetupModal(otpData: OTPSetupData): void {
    this.otpSetupData = otpData;
    this.notifyModalVisibility('otp_setup', true, {
      email: this.context.userInfo.email,
      otpSetup: otpData
    });
  }

  hideModals(): void {
    this.notifyModalVisibility('email_verification', false);
    this.notifyModalVisibility('otp_setup', false);
  }

  // Event listeners
  addStateChangeListener(listener: AuthStateChangeListener): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index > -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }

  addModalVisibilityListener(listener: ModalVisibilityListener): () => void {
    this.modalVisibilityListeners.push(listener);
    return () => {
      const index = this.modalVisibilityListeners.indexOf(listener);
      if (index > -1) {
        this.modalVisibilityListeners.splice(index, 1);
      }
    };
  }

  // State persistence with enhanced validation and recovery
  
  /**
   * Persist authentication state to localStorage with validation
   * Note: This method should only be called from within locked operations
   */
  private persistStateToStorage(): void {
    try {
      const stateToStore: PersistedSessionState = {
        state: this.context.state,
        userInfo: this.context.userInfo,
        progress: this.context.progress,
        retryCount: this.context.retryCount,
        lastAction: this.context.lastAction.toISOString(),
        otpSetupData: this.otpSetupData,
        version: this.STORAGE_VERSION,
        sessionId: this.sessionId
      };
      
      // Validate state before persisting
      if (this.validateStateForPersistence(stateToStore)) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToStore));
        console.log('Auth state persisted successfully', { 
          state: stateToStore.state, 
          sessionId: this.sessionId 
        });
      } else {
        console.warn('State validation failed, skipping persistence');
      }
    } catch (error) {
      console.error('Failed to persist auth state:', error);
    }
  }

  /**
   * Restore authentication state from localStorage with validation and recovery
   */
  private restoreStateFromStorage(): void {
    try {
      const storedState = localStorage.getItem(this.STORAGE_KEY);
      if (!storedState) {
        console.log('No stored auth state found');
        return;
      }

      const parsed: PersistedSessionState = JSON.parse(storedState);
      
      // Validate schema version
      if (parsed.version !== this.STORAGE_VERSION) {
        console.warn('Auth state schema version mismatch, clearing state');
        this.clearStoredState();
        return;
      }

      // Validate state freshness
      const lastAction = new Date(parsed.lastAction);
      const now = new Date();
      const hoursSinceLastAction = (now.getTime() - lastAction.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastAction >= this.SESSION_TIMEOUT_HOURS) {
        console.log('Stored auth state expired, clearing state');
        this.clearStoredState();
        return;
      }

      // Validate state consistency
      if (!this.validateRestoredState(parsed)) {
        console.warn('Restored state validation failed, clearing state');
        this.clearStoredState();
        return;
      }

      // Restore state
      this.context = {
        ...this.context,
        state: parsed.state,
        userInfo: parsed.userInfo || {},
        progress: parsed.progress || this.context.progress,
        retryCount: parsed.retryCount || 0,
        lastAction: lastAction
      };
      this.otpSetupData = parsed.otpSetupData || null;
      this.sessionId = parsed.sessionId || this.generateSessionId();
      
      console.log('Auth state restored successfully', { 
        state: this.context.state, 
        sessionId: this.sessionId 
      });

      // Perform state-specific recovery
      this.performStateRecovery(parsed.state);
      
    } catch (error) {
      console.error('Failed to restore auth state:', error);
      this.clearStoredState();
    }
  }

  /**
   * Validate state before persisting to storage
   */
  private validateStateForPersistence(state: PersistedSessionState): boolean {
    // Must have a valid state
    if (!state.state || !Object.values(AuthenticationState).includes(state.state)) {
      console.warn('Invalid authentication state');
      return false;
    }

    // If not initial state, must have user email
    if (state.state !== AuthenticationState.INITIAL && !state.userInfo.email) {
      console.warn('Missing user email for non-initial state');
      return false;
    }

    // If OTP setup required, must have OTP data
    if (state.state === AuthenticationState.OTP_SETUP_REQUIRED && !state.otpSetupData) {
      console.warn('Missing OTP setup data for OTP_SETUP_REQUIRED state');
      return false;
    }

    // Progress must be valid
    if (state.progress.currentStep < 0 || state.progress.currentStep > state.progress.totalSteps) {
      console.warn('Invalid progress step');
      return false;
    }

    return true;
  }

  /**
   * Validate restored state for consistency
   */
  private validateRestoredState(state: PersistedSessionState): boolean {
    // Basic validation
    if (!this.validateStateForPersistence(state)) {
      return false;
    }

    // Validate state transitions are logical
    const validStates = [
      AuthenticationState.INITIAL,
      AuthenticationState.EMAIL_VERIFICATION_REQUIRED,
      AuthenticationState.OTP_SETUP_REQUIRED,
      AuthenticationState.AUTHENTICATED
    ];

    if (!validStates.includes(state.state)) {
      console.warn('Cannot restore transient state:', state.state);
      return false;
    }

    return true;
  }

  /**
   * Perform state-specific recovery after restoration
   */
  private async performStateRecovery(state: AuthenticationState): Promise<void> {
    try {
      switch (state) {
        case AuthenticationState.AUTHENTICATED:
          // Validate and refresh token if needed
          await this.validateSessionOnRestore();
          break;

        case AuthenticationState.EMAIL_VERIFICATION_REQUIRED:
          // User was in email verification flow, show modal
          console.log('Recovering email verification state');
          this.showEmailVerificationModal();
          break;

        case AuthenticationState.OTP_SETUP_REQUIRED:
          // User was in OTP setup flow, show modal if we have data
          if (this.otpSetupData) {
            console.log('Recovering OTP setup state');
            this.showOTPSetupModal(this.otpSetupData);
          } else {
            console.warn('OTP setup state without data, resetting');
            this.reset();
          }
          break;

        case AuthenticationState.INITIAL:
          // Nothing to recover
          break;

        default:
          console.warn('Unexpected state during recovery:', state);
          this.reset();
      }
    } catch (error) {
      console.error('Error during state recovery:', error);
      this.reset();
    }
  }

  /**
   * Validate session on page load and refresh token if needed
   */
  private async validateSessionOnRestore(): Promise<void> {
    try {
      // Import authService dynamically to avoid circular dependencies
      const { authService } = await import('./auth-service');
      
      const session = await authService.restoreSession();
      
      if (!session) {
        console.log('Session validation failed, resetting auth state');
        this.reset();
      } else {
        console.log('Session validated and restored successfully');
        // Update token in context if it was refreshed
        if (session.token) {
          localStorage.setItem('token', session.token);
        }
      }
    } catch (error) {
      console.error('Error validating session on restore:', error);
      this.reset();
    }
  }

  // Concurrent authentication handling with locking
  
  /**
   * Acquire lock for authentication operation
   */
  private async acquireLock(operation: string): Promise<boolean> {
    try {
      const existingLock = this.getExistingLock();
      
      // Check if there's an active lock
      if (existingLock) {
        const lockAge = Date.now() - existingLock.timestamp;
        
        // If lock is expired, clear it
        if (lockAge > this.LOCK_TIMEOUT_MS) {
          console.warn('Clearing expired lock', { 
            operation: existingLock.operation, 
            age: lockAge 
          });
          this.releaseLock();
        } else {
          // Lock is active, cannot acquire
          console.warn('Cannot acquire lock, operation in progress', { 
            operation: existingLock.operation,
            lockId: existingLock.lockId 
          });
          return false;
        }
      }

      // Acquire new lock
      const lock: SessionLock = {
        lockId: this.generateSessionId(),
        timestamp: Date.now(),
        operation
      };
      
      localStorage.setItem(this.LOCK_KEY, JSON.stringify(lock));
      console.log('Lock acquired', { operation, lockId: lock.lockId });
      return true;
    } catch (error) {
      console.error('Error acquiring lock:', error);
      return false;
    }
  }

  /**
   * Release authentication operation lock
   */
  private releaseLock(): void {
    try {
      localStorage.removeItem(this.LOCK_KEY);
      console.log('Lock released');
    } catch (error) {
      console.error('Error releasing lock:', error);
    }
  }

  /**
   * Get existing lock if present
   */
  private getExistingLock(): SessionLock | null {
    try {
      const lockStr = localStorage.getItem(this.LOCK_KEY);
      if (!lockStr) return null;
      
      return JSON.parse(lockStr) as SessionLock;
    } catch (error) {
      console.error('Error reading lock:', error);
      return null;
    }
  }

  /**
   * Execute operation with lock protection
   */
  private async withLock<T>(operation: string, fn: () => Promise<T> | T): Promise<T | null> {
    const acquired = await this.acquireLock(operation);
    
    if (!acquired) {
      console.warn('Operation blocked by concurrent lock', { operation });
      throw new Error(`Another authentication operation is in progress. Please wait.`);
    }

    try {
      const result = await fn();
      return result;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Check if another authentication operation is in progress
   */
  isOperationInProgress(): boolean {
    const lock = this.getExistingLock();
    if (!lock) return false;
    
    const lockAge = Date.now() - lock.timestamp;
    return lockAge <= this.LOCK_TIMEOUT_MS;
  }

  /**
   * Get current operation if any
   */
  getCurrentOperation(): string | null {
    const lock = this.getExistingLock();
    if (!lock) return null;
    
    const lockAge = Date.now() - lock.timestamp;
    if (lockAge > this.LOCK_TIMEOUT_MS) return null;
    
    return lock.operation;
  }

  clearStoredState(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.LOCK_KEY);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('tokenData');
    localStorage.removeItem('tempAccessToken');
    localStorage.removeItem('tempRefreshToken');
    localStorage.removeItem('tempTokenScope');
    localStorage.removeItem('tempTokenExpiry');
    console.log('Stored state cleared');
  }

  // Utility methods
  private updateState(newState: AuthenticationState, updates: Partial<AuthenticationContext> = {}): void {
    this.context = {
      ...this.context,
      ...updates,
      state: newState,
      lastAction: new Date()
    };

    this.persistStateToStorage();
    this.notifyStateChange();
  }

  private clearError(): void {
    this.context.error = null;
    this.persistStateToStorage();
    this.notifyStateChange();
  }

  private createAuthError(error: any, step: AuthenticationState): AuthError {
    const correlationId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine if error is retryable
    const retryable = !error.message.includes('INVALID_') && 
                     !error.message.includes('USER_NOT_CONFIRMED') &&
                     !error.message.includes('CONFIG_ERROR');

    return {
      code: error.code || 'AUTH_ERROR',
      message: error.message,
      userMessage: this.getUserFriendlyMessage(error.message),
      retryable,
      suggestion: this.getErrorSuggestion(error.message, retryable),
      correlationId,
      timestamp: new Date(),
      step
    };
  }

  private getUserFriendlyMessage(errorMessage: string): string {
    if (errorMessage.includes('EMAIL_VERIFICATION_REQUIRED')) {
      return 'Please check your email and enter the verification code to continue.';
    }
    if (errorMessage.includes('INVALID_VERIFICATION_CODE')) {
      return 'The verification code you entered is incorrect. Please try again.';
    }
    if (errorMessage.includes('CODE_EXPIRED')) {
      return 'The verification code has expired. Please request a new one.';
    }
    if (errorMessage.includes('INVALID_OTP')) {
      return 'The OTP code you entered is incorrect. Please check your authenticator app and try again.';
    }
    if (errorMessage.includes('USER_NOT_CONFIRMED')) {
      return 'Your email address needs to be verified before you can continue.';
    }
    if (errorMessage.includes('NETWORK_ERROR')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    return 'An unexpected error occurred during authentication. Please try again.';
  }

  private getErrorSuggestion(errorMessage: string, retryable: boolean): string {
    if (errorMessage.includes('EMAIL_VERIFICATION_REQUIRED')) {
      return 'Check your email inbox and spam folder for the verification code.';
    }
    if (errorMessage.includes('CODE_EXPIRED')) {
      return 'Click "Resend Code" to get a new verification code.';
    }
    if (errorMessage.includes('INVALID_OTP')) {
      return 'Make sure your device time is correct and try entering the code again.';
    }
    if (errorMessage.includes('NETWORK_ERROR')) {
      return 'Check your internet connection and try again in a moment.';
    }
    if (retryable) {
      return 'This is a temporary issue. Please try again.';
    }
    
    return 'Please contact support if this issue persists.';
  }

  private notifyStateChange(): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(this.authenticationContext);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  private notifyModalVisibility(modalType: 'email_verification' | 'otp_setup', visible: boolean, data?: any): void {
    this.modalVisibilityListeners.forEach(listener => {
      try {
        listener(modalType, visible, data);
      } catch (error) {
        console.error('Error in modal visibility listener:', error);
      }
    });
  }

  // Public utility methods
  reset(): void {
    this.context = {
      state: AuthenticationState.INITIAL,
      userInfo: {},
      progress: {
        currentStep: 0,
        totalSteps: 4,
        stepName: 'Ready'
      },
      error: null,
      retryCount: 0,
      lastAction: new Date()
    };
    this.otpSetupData = null;
    this.clearStoredState();
    this.notifyStateChange();
  }

  isAuthenticated(): boolean {
    return this.context.state === AuthenticationState.AUTHENTICATED;
  }

  requiresEmailVerification(): boolean {
    return this.context.state === AuthenticationState.EMAIL_VERIFICATION_REQUIRED;
  }

  requiresOTPSetup(): boolean {
    return this.context.state === AuthenticationState.OTP_SETUP_REQUIRED;
  }
}
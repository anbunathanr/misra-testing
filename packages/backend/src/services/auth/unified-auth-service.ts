import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand, 
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  InitiateAuthCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { JWTService, TemporaryTokenPair } from './jwt-service';
import { UserService } from '../user/user-service';
import { EmailVerificationService } from './email-verification-service';
import { AuthMonitoringService, authMonitoringService } from './auth-monitoring-service';
import { v4 as uuidv4 } from 'uuid';
import { AuthErrorHandler } from '../../utils/auth-error-handler';
import { createLogger } from '../../utils/logger';

export interface AuthFlowResult {
  state: AuthenticationState;
  requiresEmailVerification: boolean;
  requiresOTPSetup: boolean;
  message: string;
}

export interface OTPSetupResult {
  otpSetup: {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
    issuer: string;
    accountName: string;
  };
  temporaryTokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: 'temp_authenticated';
  };
  nextStep: AuthenticationState;
  message: string;
}

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

export interface AuthRequest {
  email: string;
  password?: string; // Optional for quick registration
  name?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    name: string;
    organizationId: string;
    role: string;
  };
  expiresIn: number;
  isNewUser: boolean;
  message: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
}

export class UnifiedAuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private jwtService: JWTService;
  private userService: UserService;
  private emailVerificationService: EmailVerificationService;
  private monitoringService: AuthMonitoringService;
  private errorHandler: AuthErrorHandler;
  private logger: ReturnType<typeof createLogger>;
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 5000   // 5 seconds
  };

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    this.jwtService = new JWTService();
    this.userService = new UserService();
    this.emailVerificationService = new EmailVerificationService();
    this.monitoringService = authMonitoringService;
    this.errorHandler = new AuthErrorHandler('UnifiedAuthService');
    this.logger = createLogger('UnifiedAuthService');
  }

  /**
   * Unified authentication method that handles both quick registration and existing user login
   */
  async authenticate(request: AuthRequest, retryConfig?: Partial<RetryConfig>): Promise<AuthResult> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    
    return this.executeWithRetry(
      () => this.performAuthentication(request),
      config,
      'authentication'
    );
  }

  /**
   * Quick registration flow - creates user if doesn't exist, logs in if exists
   */
  async quickRegister(email: string, name?: string, retryConfig?: Partial<RetryConfig>): Promise<AuthResult> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    
    return this.executeWithRetry(
      () => this.performQuickRegistration(email, name),
      config,
      'quick registration'
    );
  }

  /**
   * Standard login flow - requires password
   */
  async login(email: string, password: string, retryConfig?: Partial<RetryConfig>): Promise<AuthResult> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    
    return this.executeWithRetry(
      () => this.performLogin(email, password),
      config,
      'login'
    );
  }

  /**
   * Enhanced authentication flow initiation
   */
  async initiateAuthenticationFlow(email: string, name?: string): Promise<AuthFlowResult> {
    const correlationId = uuidv4();
    
    this.logger.info('Initiating authentication flow', {
      correlationId,
      email,
      hasName: !!name
    });

    // Monitor flow initiation
    this.monitoringService.onAuthFlowInitiated(correlationId, email);

    if (!this.isValidEmail(email)) {
      const error = new Error('INVALID_EMAIL: Valid email address is required');
      this.errorHandler.handleError(error, {
        operation: 'initiateAuthenticationFlow',
        email,
        step: 'validation'
      });
      throw error;
    }

    try {
      // Check if user exists and their verification status
      const userExists = await this.checkUserExists(email);
      
      if (!userExists) {
        // Create new user - this will require email verification
        await this.createCognitoUser(email, name || email.split('@')[0]);
        
        this.errorHandler.logAuthEvent('user_created', {
          operation: 'initiateAuthenticationFlow',
          email,
          step: 'registration'
        }, true, { correlationId });
        
        return {
          state: AuthenticationState.EMAIL_VERIFICATION_REQUIRED,
          requiresEmailVerification: true,
          requiresOTPSetup: false,
          message: 'Account created successfully. Please check your email for the verification code.'
        };
      }

      // User exists, check their status
      const isEmailVerified = await this.emailVerificationService.isEmailVerified(email);
      const isOTPEnabled = await this.emailVerificationService.isOTPEnabled(email);

      this.logger.info('User authentication state checked', {
        correlationId,
        email,
        isEmailVerified,
        isOTPEnabled
      });

      if (!isEmailVerified) {
        return {
          state: AuthenticationState.EMAIL_VERIFICATION_REQUIRED,
          requiresEmailVerification: true,
          requiresOTPSetup: false,
          message: 'Please verify your email address to continue.'
        };
      }

      if (!isOTPEnabled) {
        return {
          state: AuthenticationState.OTP_SETUP_REQUIRED,
          requiresEmailVerification: false,
          requiresOTPSetup: true,
          message: 'Please complete OTP setup for enhanced security.'
        };
      }

      // User is fully set up
      return {
        state: AuthenticationState.AUTHENTICATED,
        requiresEmailVerification: false,
        requiresOTPSetup: false,
        message: 'User is ready for authentication.'
      };
    } catch (error: any) {
      this.monitoringService.onError(correlationId, email, error.message, 'flow_initiation');
      this.errorHandler.handleError(error, {
        operation: 'initiateAuthenticationFlow',
        email,
        step: 'flow_initiation'
      });
      throw new Error(`AUTH_FLOW_ERROR: ${error.message}`);
    }
  }

  /**
   * Handle email verification completion with automatic OTP setup
   */
  async handleEmailVerificationComplete(email: string, verificationCode: string): Promise<OTPSetupResult> {
    const correlationId = uuidv4();
    
    this.logger.info('Handling email verification completion', {
      correlationId,
      email
    });

    // Monitor email verification start
    this.monitoringService.onEmailVerificationStarted(correlationId, email);
    const startTime = Date.now();

    try {
      // Verify email using EmailVerificationService
      const verificationResult = await this.emailVerificationService.verifyEmail(email, verificationCode);

      if (!verificationResult.success) {
        const error = new Error(`EMAIL_VERIFICATION_FAILED: ${verificationResult.message}`);
        const durationMs = Date.now() - startTime;
        this.monitoringService.onEmailVerificationFailed(correlationId, email, verificationResult.message, durationMs);
        this.errorHandler.handleError(error, {
          operation: 'handleEmailVerificationComplete',
          email,
          step: 'email_verification'
        });
        throw error;
      }

      this.errorHandler.logAuthEvent('email_verified', {
        operation: 'handleEmailVerificationComplete',
        email,
        step: 'email_verification'
      }, true, { correlationId });

      // Monitor email verification completion
      const durationMs = Date.now() - startTime;
      this.monitoringService.onEmailVerificationCompleted(correlationId, email, durationMs);

      // Email verification automatically sets up OTP, so return the setup data
      if (verificationResult.otpSecret && verificationResult.backupCodes) {
        this.logger.info('OTP setup data generated', {
          correlationId,
          email,
          hasSecret: !!verificationResult.otpSecret,
          backupCodesCount: verificationResult.backupCodes.length
        });

        // Generate temporary tokens to allow file operations before OTP setup completion
        let temporaryTokens: TemporaryTokenPair | undefined;
        
        try {
          // Get user information to create token payload
          const userInfo = await this.userService.getUserByEmail(email);
          
          if (userInfo) {
            temporaryTokens = await this.jwtService.generateTemporaryTokenPair({
              userId: userInfo.userId,
              email: userInfo.email,
              organizationId: userInfo.organizationId,
              role: userInfo.role || 'developer' // Default role if not specified
            });

            this.logger.info('Temporary tokens generated for email verified user', {
              correlationId,
              email,
              userId: userInfo.userId,
              scope: temporaryTokens.scope,
              expiresIn: temporaryTokens.expiresIn
            });
          }
        } catch (tokenError: any) {
          // Log the error but don't fail the entire flow
          this.logger.warn('Failed to generate temporary tokens, continuing without them', {
            correlationId,
            email,
            error: tokenError.message
          });
        }

        return {
          otpSetup: {
            secret: verificationResult.otpSecret,
            qrCodeUrl: this.generateQRCodeUrl(email, verificationResult.otpSecret),
            backupCodes: verificationResult.backupCodes,
            issuer: 'MISRA Platform',
            accountName: email
          },
          temporaryTokens,
          nextStep: AuthenticationState.OTP_SETUP_REQUIRED,
          message: 'Email verified successfully. Please complete OTP setup.'
        };
      }

      const error = new Error('OTP_SETUP_FAILED: Failed to generate OTP setup data');
      this.errorHandler.handleError(error, {
        operation: 'handleEmailVerificationComplete',
        email,
        step: 'otp_generation'
      });
      throw error;
    } catch (error: any) {
      this.monitoringService.onError(correlationId, email, error.message, 'email_verification_complete');
      this.errorHandler.handleError(error, {
        operation: 'handleEmailVerificationComplete',
        email,
        step: 'email_verification_complete'
      });
      throw new Error(`EMAIL_VERIFICATION_ERROR: ${error.message}`);
    }
  }

  /**
   * Complete OTP setup and establish user session
   */
  async completeOTPSetup(email: string, otpCode: string): Promise<AuthResult> {
    const correlationId = uuidv4();
    
    this.logger.info('Completing OTP setup', {
      correlationId,
      email
    });

    // Monitor OTP setup start
    this.monitoringService.onOTPSetupStarted(correlationId, email);
    const startTime = Date.now();

    try {
      // Verify OTP code
      const otpResult = await this.emailVerificationService.verifyOTP(email, otpCode);

      if (!otpResult.success) {
        const error = new Error(`OTP_VERIFICATION_FAILED: ${otpResult.message}`);
        const durationMs = Date.now() - startTime;
        this.monitoringService.onOTPSetupFailed(correlationId, email, otpResult.message, durationMs);
        this.errorHandler.handleError(error, {
          operation: 'completeOTPSetup',
          email,
          step: 'otp_verification'
        });
        throw error;
      }

      this.errorHandler.logAuthEvent('otp_verified', {
        operation: 'completeOTPSetup',
        email,
        step: 'otp_verification'
      }, true, { correlationId });

      // Monitor OTP setup completion
      const durationMs = Date.now() - startTime;
      this.monitoringService.onOTPSetupCompleted(correlationId, email, durationMs);

      // Get user information
      const cognitoUser = await this.cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: email
      }));

      const subAttribute = cognitoUser.UserAttributes?.find(attr => attr.Name === 'sub');
      const cognitoSub = subAttribute?.Value || uuidv4();

      // Get or create user in our system
      const user = await this.getOrCreateUser(email, cognitoSub);

      this.logger.info('User retrieved for session creation', {
        correlationId,
        userId: user.userId,
        email: user.email
      });

      // Generate JWT tokens
      const tokenPair = await this.jwtService.generateTokenPair({
        userId: user.userId,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role
      });

      // Monitor session creation
      this.monitoringService.onSessionCreated(correlationId, email, user.userId, durationMs);

      this.errorHandler.logAuthEvent('session_created', {
        operation: 'completeOTPSetup',
        email,
        userId: user.userId,
        step: 'session_creation'
      }, true, { correlationId });

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.email.split('@')[0],
          organizationId: user.organizationId,
          role: user.role
        },
        expiresIn: tokenPair.expiresIn,
        isNewUser: false,
        message: 'OTP setup completed successfully. You are now logged in.'
      };
    } catch (error: any) {
      this.monitoringService.onError(correlationId, email, error.message, 'otp_setup_complete');
      this.errorHandler.handleError(error, {
        operation: 'completeOTPSetup',
        email,
        step: 'otp_setup_complete'
      });
      throw new Error(`OTP_SETUP_ERROR: ${error.message}`);
    }
  }

  /**
   * Get authentication state for a user
   */
  async getAuthenticationState(email: string): Promise<AuthenticationState> {
    const correlationId = uuidv4();
    
    this.logger.info('Getting authentication state', {
      correlationId,
      email
    });

    try {
      const userExists = await this.checkUserExists(email);
      
      if (!userExists) {
        return AuthenticationState.INITIAL;
      }

      const isEmailVerified = await this.emailVerificationService.isEmailVerified(email);
      const isOTPEnabled = await this.emailVerificationService.isOTPEnabled(email);

      if (!isEmailVerified) {
        return AuthenticationState.EMAIL_VERIFICATION_REQUIRED;
      }

      if (!isOTPEnabled) {
        return AuthenticationState.OTP_SETUP_REQUIRED;
      }

      return AuthenticationState.AUTHENTICATED;
    } catch (error) {
      this.monitoringService.onError(correlationId, email, error.message, 'state_check');
      return AuthenticationState.ERROR;
    }
  }

  /**
   * Validate authentication step
   */
  async validateAuthenticationStep(email: string, step: AuthenticationState): Promise<boolean> {
    const correlationId = uuidv4();
    
    this.logger.info('Validating authentication step', {
      correlationId,
      email,
      step
    });

    try {
      const currentState = await this.getAuthenticationState(email);
      
      // Define valid state transitions
      const validTransitions: Record<AuthenticationState, AuthenticationState[]> = {
        [AuthenticationState.INITIAL]: [AuthenticationState.REGISTERING],
        [AuthenticationState.REGISTERING]: [AuthenticationState.EMAIL_VERIFICATION_REQUIRED],
        [AuthenticationState.EMAIL_VERIFICATION_REQUIRED]: [AuthenticationState.EMAIL_VERIFYING],
        [AuthenticationState.EMAIL_VERIFYING]: [AuthenticationState.OTP_SETUP_REQUIRED],
        [AuthenticationState.OTP_SETUP_REQUIRED]: [AuthenticationState.OTP_VERIFYING],
        [AuthenticationState.OTP_VERIFYING]: [AuthenticationState.AUTHENTICATED],
        [AuthenticationState.AUTHENTICATED]: [],
        [AuthenticationState.ERROR]: [AuthenticationState.INITIAL, AuthenticationState.EMAIL_VERIFICATION_REQUIRED, AuthenticationState.OTP_SETUP_REQUIRED]
      };

      return validTransitions[currentState]?.includes(step) || currentState === step;
    } catch (error) {
      this.monitoringService.onError(correlationId, email, error.message, 'step_validation');
      return false;
    }
  }

  private async performAuthentication(request: AuthRequest): Promise<AuthResult> {
    if (!this.isValidEmail(request.email)) {
      throw new Error('INVALID_EMAIL: Valid email address is required');
    }

    // If password is provided, use standard login flow
    if (request.password) {
      return this.performLogin(request.email, request.password);
    }

    // Otherwise, use quick registration flow
    return this.performQuickRegistration(request.email, request.name);
  }

  private async performQuickRegistration(email: string, name?: string): Promise<AuthResult> {
    const userName = name || email.split('@')[0];
    let cognitoSub: string;
    let isNewUser = false;

    // Check if user already exists in Cognito
    try {
      const existingUser = await this.cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: email
      }));

      // Check if user is confirmed (email verified)
      if (existingUser.UserStatus !== 'CONFIRMED') {
        throw new Error('USER_NOT_CONFIRMED: Please verify your email address before logging in. Check your email for the verification code.');
      }

      cognitoSub = existingUser.Username!;
      isNewUser = false;
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        // Create new user - this will require email verification
        isNewUser = true;
        cognitoSub = await this.createCognitoUser(email, userName);
        
        // Throw error to indicate verification is required
        throw new Error('EMAIL_VERIFICATION_REQUIRED: Account created successfully. Please check your email for the verification code to complete registration.');
      } else if (error.message.includes('USER_NOT_CONFIRMED')) {
        // Re-throw confirmation error
        throw error;
      } else {
        throw new Error(`COGNITO_ERROR: ${error.message}`);
      }
    }

    // Get or create user in our DynamoDB
    const user = await this.getOrCreateUser(email, cognitoSub);

    // Generate JWT tokens with 1-hour expiration
    const tokenPair = await this.jwtService.generateTokenPair({
      userId: user.userId,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        userId: user.userId,
        email: user.email,
        name: userName,
        organizationId: user.organizationId,
        role: user.role
      },
      expiresIn: tokenPair.expiresIn,
      isNewUser,
      message: isNewUser 
        ? 'Account created successfully. Session valid for 1 hour.'
        : 'Welcome back! Session valid for 1 hour.'
    };
  }

  private async performLogin(email: string, password: string): Promise<AuthResult> {
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      throw new Error('CONFIG_ERROR: Cognito client not configured');
    }

    // Authenticate against Cognito
    let cognitoSub: string;
    try {
      const authResult = await this.cognitoClient.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }));

      if (!authResult.AuthenticationResult?.IdToken) {
        throw new Error('INVALID_CREDENTIALS: Invalid email or password');
      }

      // Decode Cognito ID token to get sub
      const parts = authResult.AuthenticationResult.IdToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      cognitoSub = payload.sub;
    } catch (cognitoError: any) {
      if (
        cognitoError.name === 'NotAuthorizedException' ||
        cognitoError.name === 'UserNotFoundException'
      ) {
        throw new Error('INVALID_CREDENTIALS: Invalid email or password');
      }
      if (cognitoError.name === 'UserNotConfirmedException') {
        throw new Error('USER_NOT_CONFIRMED: User is not confirmed. Please verify your email.');
      }
      throw new Error(`AUTH_ERROR: ${cognitoError.message}`);
    }

    // Get or create user in our DynamoDB
    const user = await this.getOrCreateUser(email, cognitoSub);

    // Generate JWT tokens with 1-hour expiration
    const tokenPair = await this.jwtService.generateTokenPair({
      userId: user.userId,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role
    });

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.email.split('@')[0], // Default name from email
        organizationId: user.organizationId,
        role: user.role
      },
      expiresIn: tokenPair.expiresIn,
      isNewUser: false,
      message: 'Login successful. Session valid for 1 hour.'
    };
  }

  private async createCognitoUser(email: string, userName: string): Promise<string> {
    const tempPassword = this.generateTempPassword();
    const permanentPassword = this.generateSecurePassword();

    try {
      // Create user in Cognito
      await this.cognitoClient.send(new AdminCreateUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: email,
        TemporaryPassword: tempPassword,
        MessageAction: 'SUPPRESS', // Don't send welcome email
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: userName }
        ]
      }));

      // Set permanent password for seamless experience
      await this.cognitoClient.send(new AdminSetUserPasswordCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: email,
        Password: permanentPassword,
        Permanent: true
      }));

      // Get the Cognito sub from the created user
      const newUser = await this.cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: email
      }));
      
      const subAttribute = newUser.UserAttributes?.find(attr => attr.Name === 'sub');
      return subAttribute?.Value || uuidv4();

    } catch (createError: any) {
      throw new Error(`USER_CREATION_FAILED: ${createError.message}`);
    }
  }

  private async getOrCreateUser(email: string, cognitoSub: string): Promise<any> {
    // Check if user exists in our DynamoDB
    let user = await this.userService.getUserByEmail(email);

    if (!user) {
      // Create user in our system
      try {
        user = await this.userService.createUser({
          email,
          organizationId: cognitoSub, // Use Cognito sub as organization ID
          role: 'developer',
          preferences: {
            theme: 'light',
            notifications: {
              email: true,
              webhook: false
            },
            defaultMisraRuleSet: 'MISRA_C_2012'
          }
        });
      } catch (userError: any) {
        throw new Error(`USER_CREATION_FAILED: ${userError.message}`);
      }
    } else {
      // Update last login for existing user
      await this.userService.updateLastLogin(user.userId);
    }

    return user;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    operationType: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt === config.maxRetries) {
          throw new Error(`${operationType.toUpperCase()}_RETRY_EXHAUSTED: Failed after ${config.maxRetries + 1} attempts. Last error: ${error.message}`);
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );
        
        console.warn(`${operationType} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  private isNonRetryableError(error: Error): boolean {
    const message = error.message;
    
    // Don't retry validation errors
    if (message.includes('INVALID_EMAIL') || 
        message.includes('INVALID_CREDENTIALS') ||
        message.includes('USER_NOT_CONFIRMED') ||
        message.includes('CONFIG_ERROR')) {
      return true;
    }
    
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).slice(-12) + 'A1!';
  }

  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + 'A1!'; // Ensure it meets Cognito requirements
  }

  /**
   * Check if user exists in Cognito
   */
  private async checkUserExists(email: string): Promise<boolean> {
    const correlationId = uuidv4();
    
    this.logger.info('Checking if user exists', {
      correlationId,
      email
    });

    try {
      await this.cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: email
      }));
      return true;
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        return false;
      }
      this.monitoringService.onError(correlationId, email, error.message, 'user_check');
      throw error;
    }
  }

  /**
   * Generate QR code URL for OTP setup
   */
  private generateQRCodeUrl(email: string, secret: string): string {
    const correlationId = uuidv4();
    
    this.logger.info('Generating QR code URL', {
      correlationId,
      email
    });

    const issuer = 'MISRA Platform';
    const label = `${issuer}:${email}`;
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    
    // Return Google Charts QR code URL
    return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`;
  }
}
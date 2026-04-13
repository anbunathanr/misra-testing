import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand, 
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  InitiateAuthCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { JWTService } from './jwt-service';
import { UserService } from '../user/user-service';
import { v4 as uuidv4 } from 'uuid';

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
      
      // User exists, get their Cognito sub
      const subAttribute = existingUser.UserAttributes?.find(attr => attr.Name === 'sub');
      cognitoSub = subAttribute?.Value || uuidv4();
      
    } catch (cognitoError: any) {
      if (cognitoError.name === 'UserNotFoundException') {
        // User doesn't exist, create new user
        isNewUser = true;
        cognitoSub = await this.createCognitoUser(email, userName);
      } else {
        throw new Error(`COGNITO_ERROR: ${cognitoError.message}`);
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
}
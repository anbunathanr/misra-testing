import * as jwt from 'jsonwebtoken';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export interface JWTPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: 'admin' | 'developer' | 'viewer';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Module-level cache for JWT secret to prevent multiple calls to Secrets Manager
let cachedJwtSecret: string | null = null;
let secretFetchInProgress: Promise<string> | null = null;

export class JWTService {
  private secretsClient: SecretsManagerClient;
  private readonly ACCESS_TOKEN_EXPIRES_IN = '1h'; // Updated to 1 hour for production SaaS
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  constructor() {
    this.secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  private async getJWTSecret(): Promise<string> {
    // Check module-level cache first
    if (cachedJwtSecret) {
      return cachedJwtSecret;
    }
    
    // Check if a fetch is already in progress
    if (secretFetchInProgress) {
      // Wait for the in-progress fetch to complete
      return secretFetchInProgress;
    }
    
    // Check environment variable fallback first
    const envSecret = process.env.JWT_SECRET;
    if (envSecret) {
      cachedJwtSecret = envSecret;
      console.warn('Using JWT secret from environment variable fallback');
      return cachedJwtSecret;
    }
    
    // If we get here, we need to fetch from Secrets Manager
    secretFetchInProgress = (async () => {
      try {
        const secretName = process.env.JWT_SECRET_NAME || 'misra-platform-jwt-secret';
        const command = new GetSecretValueCommand({
          SecretId: secretName,
        });
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Secrets Manager timeout after 3 seconds')), 3000);
        });
        
        const fetchPromise = this.secretsClient.send(command);
        
        // Race between the fetch and timeout
        const response = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]);
        
        if (response.SecretString) {
          const secretData = JSON.parse(response.SecretString);
          cachedJwtSecret = secretData.secret || secretData;
          return cachedJwtSecret as string;
        } else {
          throw new Error('No secret value found in response');
        }
      } catch (error) {
        console.error('Failed to retrieve JWT secret from Secrets Manager:', error);
        
        // Check for specific AWS errors
        const err = error as any;
        if (err.name === 'AccessDeniedException') {
          throw new Error('Access denied to Secrets Manager. Check IAM permissions.');
        } else if (err.name === 'ResourceNotFoundException') {
          throw new Error(`Secret not found: ${process.env.JWT_SECRET_NAME || 'misra-platform-jwt-secret'}`);
        } else if (err.message && err.message.includes('timeout')) {
          throw new Error('Secrets Manager call timed out. Check network connectivity and IAM permissions.');
        } else {
          throw new Error(`Unable to retrieve JWT secret: ${err.message}`);
        }
      } finally {
        secretFetchInProgress = null;
      }
    })();
    
    return secretFetchInProgress;
  }

  async generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    const secret = await this.getJWTSecret();
    
    const accessToken = jwt.sign(payload, secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: 'misra-platform',
      audience: 'misra-platform-users',
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, type: 'refresh' },
      secret,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'misra-platform',
        audience: 'misra-platform-users',
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 60 * 60, // 1 hour in seconds
    };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const secret = await this.getJWTSecret();
    
    try {
      const decoded = jwt.verify(token, secret, {
        issuer: 'misra-platform',
        audience: 'misra-platform-users',
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string }> {
    const secret = await this.getJWTSecret();
    
    try {
      const decoded = jwt.verify(token, secret, {
        issuer: 'misra-platform',
        audience: 'misra-platform-users',
      }) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }
      
      return { userId: decoded.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof Error && error.message === 'Invalid refresh token') {
        // Re-throw our custom error for non-refresh tokens
        throw error;
      } else {
        // All other errors (including JsonWebTokenError) should throw "Invalid refresh token"
        throw new Error('Invalid refresh token');
      }
    }
  }

  async refreshAccessToken(refreshToken: string, userPayload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<{ accessToken: string; expiresIn: number }> {
    // Verify the refresh token first
    await this.verifyRefreshToken(refreshToken);
    
    const secret = await this.getJWTSecret();
    
    const accessToken = jwt.sign(userPayload, secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: 'misra-platform',
      audience: 'misra-platform-users',
    });

    return {
      accessToken,
      expiresIn: 60 * 60, // 1 hour in seconds
    };
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
}
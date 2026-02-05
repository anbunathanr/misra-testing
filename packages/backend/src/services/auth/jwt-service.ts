import jwt from 'jsonwebtoken';
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

export class JWTService {
  private secretsClient: SecretsManagerClient;
  private jwtSecret: string | null = null;
  private readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  constructor() {
    this.secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  private async getJWTSecret(): Promise<string> {
    if (this.jwtSecret) {
      return this.jwtSecret;
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: process.env.JWT_SECRET_NAME || 'misra-platform-jwt-secret',
      });
      
      const response = await this.secretsClient.send(command);
      const secretData = JSON.parse(response.SecretString || '{}');
      this.jwtSecret = secretData.secret;
      
      if (!this.jwtSecret) {
        throw new Error('JWT secret not found in Secrets Manager');
      }
      
      return this.jwtSecret;
    } catch (error) {
      console.error('Failed to retrieve JWT secret:', error);
      throw new Error('Unable to retrieve JWT secret');
    }
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
      expiresIn: 15 * 60, // 15 minutes in seconds
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
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      } else {
        throw new Error('Refresh token verification failed');
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
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
}
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export interface JwtPayload {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
  type?: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly secretsManager: SecretsManagerClient;

  constructor() {
    this.secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '1h';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  private async getSecret(secretName: string): Promise<string> {
    try {
      const response = await this.secretsManager.send(
        new GetSecretValueCommand({ SecretId: secretName })
      );
      if (response.SecretString) {
        return response.SecretString;
      }
      throw new Error('Secret value not found');
    } catch (error) {
      console.warn(`Failed to get secret ${secretName}, using fallback:`, error);
      return this.generateSecret();
    }
  }

  private generateSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Get access token secret (from Secrets Manager or fallback)
   */
  public async getAccessTokenSecret(): Promise<string> {
    const secretName = process.env.JWT_ACCESS_SECRET_NAME || 'misra-platform/jwt/access-secret';
    return await this.getSecret(secretName);
  }

  /**
   * Get refresh token secret (from Secrets Manager or fallback)
   */
  public async getRefreshTokenSecret(): Promise<string> {
    const secretName = process.env.JWT_REFRESH_SECRET_NAME || 'misra-platform/jwt/refresh-secret';
    return await this.getSecret(secretName);
  }

  /**
   * Generate access and refresh tokens
   */
  public async generateTokens(payload: JwtPayload): Promise<TokenPair> {
    const accessTokenSecret = await this.getAccessTokenSecret();
    const refreshTokenSecret = await this.getRefreshTokenSecret();

    const accessToken = jwt.sign(
      { ...payload, type: 'access' },
      accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }


  /**
   * Verify access token
   */
  public async verifyAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const secret = await this.getAccessTokenSecret();
      const decoded = jwt.verify(token, secret) as JwtPayload;
      if (decoded.type !== 'access') {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  public async verifyRefreshToken(token: string): Promise<JwtPayload | null> {
    try {
      const secret = await this.getRefreshTokenSecret();
      const decoded = jwt.verify(token, secret) as JwtPayload;
      if (decoded.type !== 'refresh') {
        return null;
      }
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh tokens using refresh token
   */
  public async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    return await this.generateTokens(payload);
  }
}

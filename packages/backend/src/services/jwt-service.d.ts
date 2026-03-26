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
export declare class JWTService {
    private readonly accessTokenSecret;
    private readonly refreshTokenSecret;
    private readonly accessTokenExpiry;
    private readonly refreshTokenExpiry;
    private readonly secretsManager;
    constructor();
    private getSecret;
    private generateSecret;
    /**
     * Get access token secret (from Secrets Manager or fallback)
     */
    getAccessTokenSecret(): Promise<string>;
    /**
     * Get refresh token secret (from Secrets Manager or fallback)
     */
    getRefreshTokenSecret(): Promise<string>;
    /**
     * Generate access and refresh tokens
     */
    generateTokens(payload: JwtPayload): Promise<TokenPair>;
    /**
     * Verify access token
     */
    verifyAccessToken(token: string): Promise<JwtPayload | null>;
    /**
     * Verify refresh token
     */
    verifyRefreshToken(token: string): Promise<JwtPayload | null>;
    /**
     * Refresh tokens using refresh token
     */
    refreshTokens(refreshToken: string): Promise<TokenPair | null>;
}

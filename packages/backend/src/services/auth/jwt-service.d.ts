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
export declare class JWTService {
    private secretsClient;
    private jwtSecret;
    private readonly ACCESS_TOKEN_EXPIRES_IN;
    private readonly REFRESH_TOKEN_EXPIRES_IN;
    constructor();
    private getJWTSecret;
    generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<TokenPair>;
    verifyAccessToken(token: string): Promise<JWTPayload>;
    verifyRefreshToken(token: string): Promise<{
        userId: string;
    }>;
    refreshAccessToken(refreshToken: string, userPayload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    extractTokenFromHeader(authHeader: string | undefined): string | null;
}

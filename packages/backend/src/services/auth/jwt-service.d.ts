export interface JWTPayload {
    userId: string;
    email: string;
    organizationId: string;
    role: 'admin' | 'developer' | 'viewer';
    iat?: number;
    exp?: number;
}
export interface TemporaryJWTPayload {
    userId: string;
    email: string;
    organizationId: string;
    role: 'admin' | 'developer' | 'viewer';
    scope: 'temp_authenticated';
    authState: 'otp_setup_required';
    iat?: number;
    exp?: number;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface TemporaryTokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: 'temp_authenticated';
}
export declare class JWTService {
    private secretsClient;
    private readonly ACCESS_TOKEN_EXPIRES_IN;
    private readonly REFRESH_TOKEN_EXPIRES_IN;
    private readonly TEMPORARY_TOKEN_EXPIRES_IN;
    constructor();
    private getJWTSecret;
    generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<TokenPair>;
    generateTemporaryTokenPair(payload: Omit<TemporaryJWTPayload, 'iat' | 'exp' | 'scope' | 'authState'>): Promise<TemporaryTokenPair>;
    verifyAccessToken(token: string): Promise<JWTPayload>;
    verifyTemporaryToken(token: string): Promise<TemporaryJWTPayload>;
    verifyAnyToken(token: string): Promise<JWTPayload | TemporaryJWTPayload>;
    verifyRefreshToken(token: string): Promise<{
        userId: string;
    }>;
    refreshAccessToken(refreshToken: string, userPayload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    extractTokenFromHeader(authHeader: string | undefined): string | null;
}

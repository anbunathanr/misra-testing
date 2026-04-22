export interface TOTPSetupResult {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
    session?: string;
}
export interface AuthenticationResult {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface MFAChallengeResult {
    session: string;
    challengeName: string;
    challengeParameters: Record<string, string>;
}
export declare class CognitoTOTPService {
    private cognitoClient;
    private userPoolId;
    private clientId;
    constructor();
    /**
     * Create a new user with MFA enabled for autonomous workflow
     */
    createUserWithMFA(email: string, name?: string): Promise<{
        tempPassword: string;
    }>;
    /**
     * Initiate authentication and handle MFA setup automatically
     */
    authenticateWithAutoMFA(email: string, password: string): Promise<AuthenticationResult | MFAChallengeResult>;
    /**
     * Set up TOTP automatically for autonomous workflow
     */
    private setupTOTPAutomatically;
    /**
     * Generate backup codes for TOTP
     */
    private generateBackupCodes;
    /**
     * Handle SOFTWARE_TOKEN_MFA challenge for existing TOTP users
     */
    private handleSoftwareTokenMFA;
    /**
     * Generate TOTP code for a user (placeholder implementation)
     */
    private generateTOTPForUser;
    /**
     * Update user's MFA setup status
     */
    private updateMFASetupStatus;
    /**
     * Generate a secure password for user creation
     */
    private generateSecurePassword;
    /**
     * Check if user exists in Cognito
     */
    userExists(email: string): Promise<boolean>;
}

export interface TOTPSecretData {
    secret: string;
    backupCodes: string[];
    createdAt: string;
    lastUsed?: string;
    usageCount: number;
}
export interface OTPConfiguration {
    issuer: string;
    algorithm: 'SHA1' | 'SHA256' | 'SHA512';
    digits: number;
    period: number;
    window: number;
}
export declare class OTPSecretsService {
    private secretsClient;
    private otpSecretName;
    private masterKey;
    private otpConfig;
    constructor();
    /**
     * Initialize the service by loading configuration from Secrets Manager
     */
    initialize(): Promise<void>;
    /**
     * Generate a new TOTP secret for a user
     */
    generateTOTPSecret(userId: string): Promise<TOTPSecretData>;
    /**
     * Retrieve TOTP secret for a user
     */
    getUserTOTPSecret(userId: string): Promise<TOTPSecretData | null>;
    /**
     * Generate TOTP code for a user
     */
    generateTOTPCode(userId: string): Promise<string>;
    /**
     * Verify TOTP code for a user
     */
    verifyTOTPCode(userId: string, code: string): Promise<boolean>;
    /**
     * Delete TOTP secret for a user
     */
    deleteTOTPSecret(userId: string): Promise<void>;
    /**
     * Store encrypted TOTP secret for a user (public method for external use)
     */
    storeUserTOTPSecret(userId: string, secretData: TOTPSecretData, correlationId: string): Promise<void>;
    /**
     * Store encrypted TOTP secret for a user (private implementation)
     */
    private _storeUserTOTPSecret;
    /**
     * Update secret usage statistics
     */
    private updateSecretUsage;
    /**
     * Generate backup codes
     */
    private generateBackupCodes;
    /**
     * Encrypt secret data using master key
     */
    private encryptSecretData;
    /**
     * Decrypt secret data using master key
     */
    private decryptSecretData;
    /**
     * Ensure service is initialized
     */
    private ensureInitialized;
}

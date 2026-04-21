"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPSecretsService = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const speakeasy = __importStar(require("speakeasy"));
const crypto = __importStar(require("crypto"));
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('OTPSecretsService');
class OTPSecretsService {
    secretsClient;
    otpSecretName;
    masterKey = null;
    otpConfig = null;
    constructor() {
        this.secretsClient = new client_secrets_manager_1.SecretsManagerClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.otpSecretName = process.env.OTP_SECRET_NAME || 'misra-platform/otp-secrets-dev';
        if (!this.otpSecretName) {
            throw new Error('OTP_SECRET_NAME environment variable is required');
        }
    }
    /**
     * Initialize the service by loading configuration from Secrets Manager
     */
    async initialize() {
        const correlationId = Math.random().toString(36).substring(7);
        logger.info('Initializing OTP Secrets Service', {
            correlationId,
            secretName: this.otpSecretName
        });
        try {
            const command = new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: this.otpSecretName
            });
            const response = await this.secretsClient.send(command);
            if (!response.SecretString) {
                throw new Error('OTP secret configuration not found');
            }
            const secretData = JSON.parse(response.SecretString);
            // Extract master key for encryption
            this.masterKey = secretData.masterKey;
            // Extract TOTP configuration
            this.otpConfig = JSON.parse(secretData.totpConfig);
            logger.info('OTP Secrets Service initialized successfully', {
                correlationId,
                hasConfig: !!this.otpConfig,
                hasMasterKey: !!this.masterKey
            });
        }
        catch (error) {
            logger.error('Failed to initialize OTP Secrets Service', {
                correlationId,
                error: error.message
            });
            throw new Error(`OTP_SERVICE_INIT_FAILED: ${error.message}`);
        }
    }
    /**
     * Generate a new TOTP secret for a user
     */
    async generateTOTPSecret(userId) {
        const correlationId = Math.random().toString(36).substring(7);
        logger.info('Generating TOTP secret for user', {
            correlationId,
            userId
        });
        await this.ensureInitialized();
        try {
            // Generate TOTP secret
            const secret = speakeasy.generateSecret({
                name: `MISRA Platform (${userId})`,
                issuer: this.otpConfig.issuer,
                length: 32
            });
            // Generate backup codes
            const backupCodes = this.generateBackupCodes();
            const secretData = {
                secret: secret.base32,
                backupCodes,
                createdAt: new Date().toISOString(),
                usageCount: 0
            };
            // Store encrypted secret for the user
            await this._storeUserTOTPSecret(userId, secretData, correlationId);
            logger.info('TOTP secret generated successfully', {
                correlationId,
                userId,
                backupCodesCount: backupCodes.length
            });
            return secretData;
        }
        catch (error) {
            logger.error('Failed to generate TOTP secret', {
                correlationId,
                userId,
                error: error.message
            });
            throw new Error(`TOTP_GENERATION_FAILED: ${error.message}`);
        }
    }
    /**
     * Retrieve TOTP secret for a user
     */
    async getUserTOTPSecret(userId) {
        const correlationId = Math.random().toString(36).substring(7);
        logger.info('Retrieving TOTP secret for user', {
            correlationId,
            userId
        });
        await this.ensureInitialized();
        try {
            const userSecretName = `${this.otpSecretName}/users/${userId}`;
            const command = new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: userSecretName
            });
            const response = await this.secretsClient.send(command);
            if (!response.SecretString) {
                logger.info('No TOTP secret found for user', {
                    correlationId,
                    userId
                });
                return null;
            }
            // Decrypt and parse secret data
            const encryptedData = JSON.parse(response.SecretString);
            const secretData = this.decryptSecretData(encryptedData);
            logger.info('TOTP secret retrieved successfully', {
                correlationId,
                userId,
                createdAt: secretData.createdAt,
                usageCount: secretData.usageCount
            });
            return secretData;
        }
        catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                logger.info('TOTP secret not found for user', {
                    correlationId,
                    userId
                });
                return null;
            }
            logger.error('Failed to retrieve TOTP secret', {
                correlationId,
                userId,
                error: error.message
            });
            throw new Error(`TOTP_RETRIEVAL_FAILED: ${error.message}`);
        }
    }
    /**
     * Generate TOTP code for a user
     */
    async generateTOTPCode(userId) {
        const correlationId = Math.random().toString(36).substring(7);
        logger.info('Generating TOTP code for user', {
            correlationId,
            userId
        });
        const secretData = await this.getUserTOTPSecret(userId);
        if (!secretData) {
            throw new Error('TOTP secret not found for user');
        }
        try {
            const totpCode = speakeasy.totp({
                secret: secretData.secret,
                encoding: 'base32',
                algorithm: this.otpConfig.algorithm.toLowerCase(),
                digits: this.otpConfig.digits,
                step: this.otpConfig.period,
                window: this.otpConfig.window
            });
            // Update usage statistics
            await this.updateSecretUsage(userId, correlationId);
            logger.info('TOTP code generated successfully', {
                correlationId,
                userId,
                codeLength: totpCode.length
            });
            return totpCode;
        }
        catch (error) {
            logger.error('Failed to generate TOTP code', {
                correlationId,
                userId,
                error: error.message
            });
            throw new Error(`TOTP_CODE_GENERATION_FAILED: ${error.message}`);
        }
    }
    /**
     * Verify TOTP code for a user
     */
    async verifyTOTPCode(userId, code) {
        const correlationId = Math.random().toString(36).substring(7);
        logger.info('Verifying TOTP code for user', {
            correlationId,
            userId,
            codeLength: code.length
        });
        const secretData = await this.getUserTOTPSecret(userId);
        if (!secretData) {
            throw new Error('TOTP secret not found for user');
        }
        try {
            const isValid = speakeasy.totp.verify({
                secret: secretData.secret,
                encoding: 'base32',
                token: code,
                algorithm: this.otpConfig.algorithm.toLowerCase(),
                digits: this.otpConfig.digits,
                step: this.otpConfig.period,
                window: this.otpConfig.window
            });
            if (isValid) {
                // Update usage statistics
                await this.updateSecretUsage(userId, correlationId);
            }
            logger.info('TOTP code verification completed', {
                correlationId,
                userId,
                isValid
            });
            return isValid;
        }
        catch (error) {
            logger.error('Failed to verify TOTP code', {
                correlationId,
                userId,
                error: error.message
            });
            throw new Error(`TOTP_VERIFICATION_FAILED: ${error.message}`);
        }
    }
    /**
     * Delete TOTP secret for a user
     */
    async deleteTOTPSecret(userId) {
        const correlationId = Math.random().toString(36).substring(7);
        logger.info('Deleting TOTP secret for user', {
            correlationId,
            userId
        });
        try {
            const userSecretName = `${this.otpSecretName}/users/${userId}`;
            // Note: AWS Secrets Manager doesn't have a direct delete command
            // We'll mark it as deleted by updating with empty data
            const command = new client_secrets_manager_1.PutSecretValueCommand({
                SecretId: userSecretName,
                SecretString: JSON.stringify({
                    deleted: true,
                    deletedAt: new Date().toISOString()
                })
            });
            await this.secretsClient.send(command);
            logger.info('TOTP secret deleted successfully', {
                correlationId,
                userId
            });
        }
        catch (error) {
            logger.error('Failed to delete TOTP secret', {
                correlationId,
                userId,
                error: error.message
            });
            throw new Error(`TOTP_DELETION_FAILED: ${error.message}`);
        }
    }
    /**
     * Store encrypted TOTP secret for a user (public method for external use)
     */
    async storeUserTOTPSecret(userId, secretData, correlationId) {
        await this.ensureInitialized();
        return this._storeUserTOTPSecret(userId, secretData, correlationId);
    }
    /**
     * Store encrypted TOTP secret for a user (private implementation)
     */
    async _storeUserTOTPSecret(userId, secretData, correlationId) {
        const userSecretName = `${this.otpSecretName}/users/${userId}`;
        // Encrypt secret data
        const encryptedData = this.encryptSecretData(secretData);
        try {
            // Try to update existing secret first
            const updateCommand = new client_secrets_manager_1.PutSecretValueCommand({
                SecretId: userSecretName,
                SecretString: JSON.stringify(encryptedData)
            });
            await this.secretsClient.send(updateCommand);
        }
        catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                // Create new secret if it doesn't exist
                const createCommand = new client_secrets_manager_1.CreateSecretCommand({
                    Name: userSecretName,
                    Description: `TOTP secret for user ${userId}`,
                    SecretString: JSON.stringify(encryptedData)
                });
                await this.secretsClient.send(createCommand);
            }
            else {
                throw error;
            }
        }
        logger.info('User TOTP secret stored successfully', {
            correlationId,
            userId,
            secretName: userSecretName
        });
    }
    /**
     * Update secret usage statistics
     */
    async updateSecretUsage(userId, correlationId) {
        try {
            const secretData = await this.getUserTOTPSecret(userId);
            if (secretData) {
                secretData.lastUsed = new Date().toISOString();
                secretData.usageCount += 1;
                await this._storeUserTOTPSecret(userId, secretData, correlationId);
            }
        }
        catch (error) {
            // Log but don't fail the main operation
            logger.warn('Failed to update secret usage statistics', {
                correlationId,
                userId,
                error: error.message
            });
        }
    }
    /**
     * Generate backup codes
     */
    generateBackupCodes() {
        const codes = [];
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < 10; i++) {
            let code = '';
            for (let j = 0; j < 8; j++) {
                code += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            codes.push(code);
        }
        return codes;
    }
    /**
     * Encrypt secret data using master key
     */
    encryptSecretData(data) {
        if (!this.masterKey) {
            throw new Error('Master key not available for encryption');
        }
        const cipher = crypto.createCipher('aes-256-cbc', this.masterKey);
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
            encrypted,
            algorithm: 'aes-256-cbc',
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Decrypt secret data using master key
     */
    decryptSecretData(encryptedData) {
        if (!this.masterKey) {
            throw new Error('Master key not available for decryption');
        }
        const decipher = crypto.createDecipher('aes-256-cbc', this.masterKey);
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    }
    /**
     * Ensure service is initialized
     */
    async ensureInitialized() {
        if (!this.masterKey || !this.otpConfig) {
            await this.initialize();
        }
    }
}
exports.OTPSecretsService = OTPSecretsService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3RwLXNlY3JldHMtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm90cC1zZWNyZXRzLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEVBT3lDO0FBQ3pDLHFEQUF1QztBQUN2QywrQ0FBaUM7QUFDakMsK0NBQWtEO0FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBa0JqRCxNQUFhLGlCQUFpQjtJQUNwQixhQUFhLENBQXVCO0lBQ3BDLGFBQWEsQ0FBUztJQUN0QixTQUFTLEdBQWtCLElBQUksQ0FBQztJQUNoQyxTQUFTLEdBQTRCLElBQUksQ0FBQztJQUVsRDtRQUNFLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQztZQUM1QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxJQUFJLGdDQUFnQyxDQUFDO1FBRXJGLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsVUFBVTtRQUNkLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlELE1BQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEVBQUU7WUFDOUMsYUFBYTtZQUNiLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYTtTQUMvQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUM7WUFDSCxNQUFN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Y0FBYyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEUsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4RSxTQUFTLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVwQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLGlCQUFpQjtRQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN2QyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMxQixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBemNELDhDQXljQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcbiAgU2VjcmV0c01hbmFnZXJDbGllbnQsXHJcbiAgR2V0U2VjcmV0VmFsdWVDb21tYW5kLFxyXG4gIFB1dFNlY3JldFZhbHVlQ29tbWFuZCxcclxuICBDcmVhdGVTZWNyZXRDb21tYW5kLFxyXG4gIFVwZGF0ZVNlY3JldENvbW1hbmQsXHJcbiAgUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvblxyXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyBzcGVha2Vhc3kgZnJvbSAnc3BlYWtlYXN5JztcclxuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ09UUFNlY3JldHNTZXJ2aWNlJyk7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRPVFBTZWNyZXREYXRhIHtcclxuICBzZWNyZXQ6IHN0cmluZztcclxuICBiYWNrdXBDb2Rlczogc3RyaW5nW107XHJcbiAgY3JlYXRlZEF0OiBzdHJpbmc7XHJcbiAgbGFzdFVzZWQ/OiBzdHJpbmc7XHJcbiAgdXNhZ2VDb3VudDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9UUENvbmZpZ3VyYXRpb24ge1xyXG4gIGlzc3Vlcjogc3RyaW5nO1xyXG4gIGFsZ29yaXRobTogJ1NIQTEnIHwgJ1NIQTI1NicgfCAnU0hBNTEyJztcclxuICBkaWdpdHM6IG51bWJlcjtcclxuICBwZXJpb2Q6IG51bWJlcjtcclxuICB3aW5kb3c6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE9UUFNlY3JldHNTZXJ2aWNlIHtcclxuICBwcml2YXRlIHNlY3JldHNDbGllbnQ6IFNlY3JldHNNYW5hZ2VyQ2xpZW50O1xyXG4gIHByaXZhdGUgb3RwU2VjcmV0TmFtZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgbWFzdGVyS2V5OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuICBwcml2YXRlIG90cENvbmZpZzogT1RQQ29uZmlndXJhdGlvbiB8IG51bGwgPSBudWxsO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuc2VjcmV0c0NsaWVudCA9IG5ldyBTZWNyZXRzTWFuYWdlckNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJ1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIHRoaXMub3RwU2VjcmV0TmFtZSA9IHByb2Nlc3MuZW52Lk9UUF9TRUNSRVRfTkFNRSB8fCAnbWlzcmEtcGxhdGZvcm0vb3RwLXNlY3JldHMtZGV2JztcclxuICAgIFxyXG4gICAgaWYgKCF0aGlzLm90cFNlY3JldE5hbWUpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPVFBfU0VDUkVUX05BTUUgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemUgdGhlIHNlcnZpY2UgYnkgbG9hZGluZyBjb25maWd1cmF0aW9uIGZyb20gU2VjcmV0cyBNYW5hZ2VyXHJcbiAgICovXHJcbiAgYXN5bmMgaW5pdGlhbGl6ZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdJbml0aWFsaXppbmcgT1RQIFNlY3JldHMgU2VydmljZScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgc2VjcmV0TmFtZTogdGhpcy5vdHBTZWNyZXROYW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldFNlY3JldFZhbHVlQ29tbWFuZCh7XHJcbiAgICAgICAgU2VjcmV0SWQ6IHRoaXMub3RwU2VjcmV0TmFtZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zZWNyZXRzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3BvbnNlLlNlY3JldFN0cmluZykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignT1RQIHNlY3JldCBjb25maWd1cmF0aW9uIG5vdCBmb3VuZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBzZWNyZXREYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS5TZWNyZXRTdHJpbmcpO1xyXG4gICAgICBcclxuICAgICAgLy8gRXh0cmFjdCBtYXN0ZXIga2V5IGZvciBlbmNyeXB0aW9uXHJcbiAgICAgIHRoaXMubWFzdGVyS2V5ID0gc2VjcmV0RGF0YS5tYXN0ZXJLZXk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBFeHRyYWN0IFRPVFAgY29uZmlndXJhdGlvblxyXG4gICAgICB0aGlzLm90cENvbmZpZyA9IEpTT04ucGFyc2Uoc2VjcmV0RGF0YS50b3RwQ29uZmlnKTtcclxuICAgICAgXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdPVFAgU2VjcmV0cyBTZXJ2aWNlIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGhhc0NvbmZpZzogISF0aGlzLm90cENvbmZpZyxcclxuICAgICAgICBoYXNNYXN0ZXJLZXk6ICEhdGhpcy5tYXN0ZXJLZXlcclxuICAgICAgfSk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIE9UUCBTZWNyZXRzIFNlcnZpY2UnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPVFBfU0VSVklDRV9JTklUX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYSBuZXcgVE9UUCBzZWNyZXQgZm9yIGEgdXNlclxyXG4gICAqL1xyXG4gIGFzeW5jIGdlbmVyYXRlVE9UUFNlY3JldCh1c2VySWQ6IHN0cmluZyk6IFByb21pc2U8VE9UUFNlY3JldERhdGE+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdHZW5lcmF0aW5nIFRPVFAgc2VjcmV0IGZvciB1c2VyJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IHRoaXMuZW5zdXJlSW5pdGlhbGl6ZWQoKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBHZW5lcmF0ZSBUT1RQIHNlY3JldFxyXG4gICAgICBjb25zdCBzZWNyZXQgPSBzcGVha2Vhc3kuZ2VuZXJhdGVTZWNyZXQoe1xyXG4gICAgICAgIG5hbWU6IGBNSVNSQSBQbGF0Zm9ybSAoJHt1c2VySWR9KWAsXHJcbiAgICAgICAgaXNzdWVyOiB0aGlzLm90cENvbmZpZyEuaXNzdWVyLFxyXG4gICAgICAgIGxlbmd0aDogMzJcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBiYWNrdXAgY29kZXNcclxuICAgICAgY29uc3QgYmFja3VwQ29kZXMgPSB0aGlzLmdlbmVyYXRlQmFja3VwQ29kZXMoKTtcclxuXHJcbiAgICAgIGNvbnN0IHNlY3JldERhdGE6IFRPVFBTZWNyZXREYXRhID0ge1xyXG4gICAgICAgIHNlY3JldDogc2VjcmV0LmJhc2UzMiEsXHJcbiAgICAgICAgYmFja3VwQ29kZXMsXHJcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgdXNhZ2VDb3VudDogMFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gU3RvcmUgZW5jcnlwdGVkIHNlY3JldCBmb3IgdGhlIHVzZXJcclxuICAgICAgYXdhaXQgdGhpcy5fc3RvcmVVc2VyVE9UUFNlY3JldCh1c2VySWQsIHNlY3JldERhdGEsIGNvcnJlbGF0aW9uSWQpO1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1RPVFAgc2VjcmV0IGdlbmVyYXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgYmFja3VwQ29kZXNDb3VudDogYmFja3VwQ29kZXMubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHNlY3JldERhdGE7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBUT1RQIHNlY3JldCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT1RQX0dFTkVSQVRJT05fRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXRyaWV2ZSBUT1RQIHNlY3JldCBmb3IgYSB1c2VyXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0VXNlclRPVFBTZWNyZXQodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPFRPVFBTZWNyZXREYXRhIHwgbnVsbD4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ1JldHJpZXZpbmcgVE9UUCBzZWNyZXQgZm9yIHVzZXInLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgdGhpcy5lbnN1cmVJbml0aWFsaXplZCgpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJTZWNyZXROYW1lID0gYCR7dGhpcy5vdHBTZWNyZXROYW1lfS91c2Vycy8ke3VzZXJJZH1gO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQoe1xyXG4gICAgICAgIFNlY3JldElkOiB1c2VyU2VjcmV0TmFtZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zZWNyZXRzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3BvbnNlLlNlY3JldFN0cmluZykge1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdObyBUT1RQIHNlY3JldCBmb3VuZCBmb3IgdXNlcicsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICB1c2VySWRcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRGVjcnlwdCBhbmQgcGFyc2Ugc2VjcmV0IGRhdGFcclxuICAgICAgY29uc3QgZW5jcnlwdGVkRGF0YSA9IEpTT04ucGFyc2UocmVzcG9uc2UuU2VjcmV0U3RyaW5nKTtcclxuICAgICAgY29uc3Qgc2VjcmV0RGF0YSA9IHRoaXMuZGVjcnlwdFNlY3JldERhdGEoZW5jcnlwdGVkRGF0YSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBzZWNyZXQgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBjcmVhdGVkQXQ6IHNlY3JldERhdGEuY3JlYXRlZEF0LFxyXG4gICAgICAgIHVzYWdlQ291bnQ6IHNlY3JldERhdGEudXNhZ2VDb3VudFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiBzZWNyZXREYXRhO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdSZXNvdXJjZU5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIHNlY3JldCBub3QgZm91bmQgZm9yIHVzZXInLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgdXNlcklkXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHJldHJpZXZlIFRPVFAgc2VjcmV0Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPVFBfUkVUUklFVkFMX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgVE9UUCBjb2RlIGZvciBhIHVzZXJcclxuICAgKi9cclxuICBhc3luYyBnZW5lcmF0ZVRPVFBDb2RlKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdHZW5lcmF0aW5nIFRPVFAgY29kZSBmb3IgdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBzZWNyZXREYXRhID0gYXdhaXQgdGhpcy5nZXRVc2VyVE9UUFNlY3JldCh1c2VySWQpO1xyXG4gICAgXHJcbiAgICBpZiAoIXNlY3JldERhdGEpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUT1RQIHNlY3JldCBub3QgZm91bmQgZm9yIHVzZXInKTtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB0b3RwQ29kZSA9IHNwZWFrZWFzeS50b3RwKHtcclxuICAgICAgICBzZWNyZXQ6IHNlY3JldERhdGEuc2VjcmV0LFxyXG4gICAgICAgIGVuY29kaW5nOiAnYmFzZTMyJyxcclxuICAgICAgICBhbGdvcml0aG06IHRoaXMub3RwQ29uZmlnIS5hbGdvcml0aG0udG9Mb3dlckNhc2UoKSBhcyBhbnksXHJcbiAgICAgICAgZGlnaXRzOiB0aGlzLm90cENvbmZpZyEuZGlnaXRzLFxyXG4gICAgICAgIHN0ZXA6IHRoaXMub3RwQ29uZmlnIS5wZXJpb2QsXHJcbiAgICAgICAgd2luZG93OiB0aGlzLm90cENvbmZpZyEud2luZG93XHJcbiAgICAgIH0gYXMgYW55KTtcclxuXHJcbiAgICAgIC8vIFVwZGF0ZSB1c2FnZSBzdGF0aXN0aWNzXHJcbiAgICAgIGF3YWl0IHRoaXMudXBkYXRlU2VjcmV0VXNhZ2UodXNlcklkLCBjb3JyZWxhdGlvbklkKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIGNvZGUgZ2VuZXJhdGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBjb2RlTGVuZ3RoOiB0b3RwQ29kZS5sZW5ndGhcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gdG90cENvZGU7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBUT1RQIGNvZGUnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVE9UUF9DT0RFX0dFTkVSQVRJT05fRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgVE9UUCBjb2RlIGZvciBhIHVzZXJcclxuICAgKi9cclxuICBhc3luYyB2ZXJpZnlUT1RQQ29kZSh1c2VySWQ6IHN0cmluZywgY29kZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gICAgXHJcbiAgICBsb2dnZXIuaW5mbygnVmVyaWZ5aW5nIFRPVFAgY29kZSBmb3IgdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBjb2RlTGVuZ3RoOiBjb2RlLmxlbmd0aFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgc2VjcmV0RGF0YSA9IGF3YWl0IHRoaXMuZ2V0VXNlclRPVFBTZWNyZXQodXNlcklkKTtcclxuICAgIFxyXG4gICAgaWYgKCFzZWNyZXREYXRhKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignVE9UUCBzZWNyZXQgbm90IGZvdW5kIGZvciB1c2VyJyk7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgaXNWYWxpZCA9IHNwZWFrZWFzeS50b3RwLnZlcmlmeSh7XHJcbiAgICAgICAgc2VjcmV0OiBzZWNyZXREYXRhLnNlY3JldCxcclxuICAgICAgICBlbmNvZGluZzogJ2Jhc2UzMicsXHJcbiAgICAgICAgdG9rZW46IGNvZGUsXHJcbiAgICAgICAgYWxnb3JpdGhtOiB0aGlzLm90cENvbmZpZyEuYWxnb3JpdGhtLnRvTG93ZXJDYXNlKCkgYXMgYW55LFxyXG4gICAgICAgIGRpZ2l0czogdGhpcy5vdHBDb25maWchLmRpZ2l0cyxcclxuICAgICAgICBzdGVwOiB0aGlzLm90cENvbmZpZyEucGVyaW9kLFxyXG4gICAgICAgIHdpbmRvdzogdGhpcy5vdHBDb25maWchLndpbmRvd1xyXG4gICAgICB9IGFzIGFueSk7XHJcblxyXG4gICAgICBpZiAoaXNWYWxpZCkge1xyXG4gICAgICAgIC8vIFVwZGF0ZSB1c2FnZSBzdGF0aXN0aWNzXHJcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVTZWNyZXRVc2FnZSh1c2VySWQsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBjb2RlIHZlcmlmaWNhdGlvbiBjb21wbGV0ZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgaXNWYWxpZFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiBpc1ZhbGlkO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmVyaWZ5IFRPVFAgY29kZScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT1RQX1ZFUklGSUNBVElPTl9GQUlMRUQ6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlbGV0ZSBUT1RQIHNlY3JldCBmb3IgYSB1c2VyXHJcbiAgICovXHJcbiAgYXN5bmMgZGVsZXRlVE9UUFNlY3JldCh1c2VySWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0RlbGV0aW5nIFRPVFAgc2VjcmV0IGZvciB1c2VyJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJTZWNyZXROYW1lID0gYCR7dGhpcy5vdHBTZWNyZXROYW1lfS91c2Vycy8ke3VzZXJJZH1gO1xyXG4gICAgICBcclxuICAgICAgLy8gTm90ZTogQVdTIFNlY3JldHMgTWFuYWdlciBkb2Vzbid0IGhhdmUgYSBkaXJlY3QgZGVsZXRlIGNvbW1hbmRcclxuICAgICAgLy8gV2UnbGwgbWFyayBpdCBhcyBkZWxldGVkIGJ5IHVwZGF0aW5nIHdpdGggZW1wdHkgZGF0YVxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dFNlY3JldFZhbHVlQ29tbWFuZCh7XHJcbiAgICAgICAgU2VjcmV0SWQ6IHVzZXJTZWNyZXROYW1lLFxyXG4gICAgICAgIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZGVsZXRlZDogdHJ1ZSxcclxuICAgICAgICAgIGRlbGV0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfSlcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLnNlY3JldHNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIHNlY3JldCBkZWxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZFxyXG4gICAgICB9KTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGRlbGV0ZSBUT1RQIHNlY3JldCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT1RQX0RFTEVUSU9OX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3RvcmUgZW5jcnlwdGVkIFRPVFAgc2VjcmV0IGZvciBhIHVzZXIgKHB1YmxpYyBtZXRob2QgZm9yIGV4dGVybmFsIHVzZSlcclxuICAgKi9cclxuICBhc3luYyBzdG9yZVVzZXJUT1RQU2VjcmV0KFxyXG4gICAgdXNlcklkOiBzdHJpbmcsIFxyXG4gICAgc2VjcmV0RGF0YTogVE9UUFNlY3JldERhdGEsIFxyXG4gICAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmVuc3VyZUluaXRpYWxpemVkKCk7XHJcbiAgICByZXR1cm4gdGhpcy5fc3RvcmVVc2VyVE9UUFNlY3JldCh1c2VySWQsIHNlY3JldERhdGEsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3RvcmUgZW5jcnlwdGVkIFRPVFAgc2VjcmV0IGZvciBhIHVzZXIgKHByaXZhdGUgaW1wbGVtZW50YXRpb24pXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBfc3RvcmVVc2VyVE9UUFNlY3JldChcclxuICAgIHVzZXJJZDogc3RyaW5nLCBcclxuICAgIHNlY3JldERhdGE6IFRPVFBTZWNyZXREYXRhLCBcclxuICAgIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgdXNlclNlY3JldE5hbWUgPSBgJHt0aGlzLm90cFNlY3JldE5hbWV9L3VzZXJzLyR7dXNlcklkfWA7XHJcbiAgICBcclxuICAgIC8vIEVuY3J5cHQgc2VjcmV0IGRhdGFcclxuICAgIGNvbnN0IGVuY3J5cHRlZERhdGEgPSB0aGlzLmVuY3J5cHRTZWNyZXREYXRhKHNlY3JldERhdGEpO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBUcnkgdG8gdXBkYXRlIGV4aXN0aW5nIHNlY3JldCBmaXJzdFxyXG4gICAgICBjb25zdCB1cGRhdGVDb21tYW5kID0gbmV3IFB1dFNlY3JldFZhbHVlQ29tbWFuZCh7XHJcbiAgICAgICAgU2VjcmV0SWQ6IHVzZXJTZWNyZXROYW1lLFxyXG4gICAgICAgIFNlY3JldFN0cmluZzogSlNPTi5zdHJpbmdpZnkoZW5jcnlwdGVkRGF0YSlcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLnNlY3JldHNDbGllbnQuc2VuZCh1cGRhdGVDb21tYW5kKTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICAvLyBDcmVhdGUgbmV3IHNlY3JldCBpZiBpdCBkb2Vzbid0IGV4aXN0XHJcbiAgICAgICAgY29uc3QgY3JlYXRlQ29tbWFuZCA9IG5ldyBDcmVhdGVTZWNyZXRDb21tYW5kKHtcclxuICAgICAgICAgIE5hbWU6IHVzZXJTZWNyZXROYW1lLFxyXG4gICAgICAgICAgRGVzY3JpcHRpb246IGBUT1RQIHNlY3JldCBmb3IgdXNlciAke3VzZXJJZH1gLFxyXG4gICAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeShlbmNyeXB0ZWREYXRhKVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBhd2FpdCB0aGlzLnNlY3JldHNDbGllbnQuc2VuZChjcmVhdGVDb21tYW5kKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdVc2VyIFRPVFAgc2VjcmV0IHN0b3JlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgc2VjcmV0TmFtZTogdXNlclNlY3JldE5hbWVcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIHNlY3JldCB1c2FnZSBzdGF0aXN0aWNzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyB1cGRhdGVTZWNyZXRVc2FnZSh1c2VySWQ6IHN0cmluZywgY29ycmVsYXRpb25JZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzZWNyZXREYXRhID0gYXdhaXQgdGhpcy5nZXRVc2VyVE9UUFNlY3JldCh1c2VySWQpO1xyXG4gICAgICBcclxuICAgICAgaWYgKHNlY3JldERhdGEpIHtcclxuICAgICAgICBzZWNyZXREYXRhLmxhc3RVc2VkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgIHNlY3JldERhdGEudXNhZ2VDb3VudCArPSAxO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGF3YWl0IHRoaXMuX3N0b3JlVXNlclRPVFBTZWNyZXQodXNlcklkLCBzZWNyZXREYXRhLCBjb3JyZWxhdGlvbklkKTtcclxuICAgICAgfVxyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgLy8gTG9nIGJ1dCBkb24ndCBmYWlsIHRoZSBtYWluIG9wZXJhdGlvblxyXG4gICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHVwZGF0ZSBzZWNyZXQgdXNhZ2Ugc3RhdGlzdGljcycsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGJhY2t1cCBjb2Rlc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVCYWNrdXBDb2RlcygpOiBzdHJpbmdbXSB7XHJcbiAgICBjb25zdCBjb2Rlczogc3RyaW5nW10gPSBbXTtcclxuICAgIGNvbnN0IGNoYXJzZXQgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5JztcclxuICAgIFxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XHJcbiAgICAgIGxldCBjb2RlID0gJyc7XHJcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgODsgaisrKSB7XHJcbiAgICAgICAgY29kZSArPSBjaGFyc2V0LmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFyc2V0Lmxlbmd0aCkpO1xyXG4gICAgICB9XHJcbiAgICAgIGNvZGVzLnB1c2goY29kZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBjb2RlcztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEVuY3J5cHQgc2VjcmV0IGRhdGEgdXNpbmcgbWFzdGVyIGtleVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZW5jcnlwdFNlY3JldERhdGEoZGF0YTogVE9UUFNlY3JldERhdGEpOiBhbnkge1xyXG4gICAgaWYgKCF0aGlzLm1hc3RlcktleSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01hc3RlciBrZXkgbm90IGF2YWlsYWJsZSBmb3IgZW5jcnlwdGlvbicpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNpcGhlciA9IGNyeXB0by5jcmVhdGVDaXBoZXIoJ2Flcy0yNTYtY2JjJywgdGhpcy5tYXN0ZXJLZXkpO1xyXG4gICAgbGV0IGVuY3J5cHRlZCA9IGNpcGhlci51cGRhdGUoSlNPTi5zdHJpbmdpZnkoZGF0YSksICd1dGY4JywgJ2hleCcpO1xyXG4gICAgZW5jcnlwdGVkICs9IGNpcGhlci5maW5hbCgnaGV4Jyk7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGVuY3J5cHRlZCxcclxuICAgICAgYWxnb3JpdGhtOiAnYWVzLTI1Ni1jYmMnLFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlY3J5cHQgc2VjcmV0IGRhdGEgdXNpbmcgbWFzdGVyIGtleVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZGVjcnlwdFNlY3JldERhdGEoZW5jcnlwdGVkRGF0YTogYW55KTogVE9UUFNlY3JldERhdGEge1xyXG4gICAgaWYgKCF0aGlzLm1hc3RlcktleSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01hc3RlciBrZXkgbm90IGF2YWlsYWJsZSBmb3IgZGVjcnlwdGlvbicpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRlY2lwaGVyID0gY3J5cHRvLmNyZWF0ZURlY2lwaGVyKCdhZXMtMjU2LWNiYycsIHRoaXMubWFzdGVyS2V5KTtcclxuICAgIGxldCBkZWNyeXB0ZWQgPSBkZWNpcGhlci51cGRhdGUoZW5jcnlwdGVkRGF0YS5lbmNyeXB0ZWQsICdoZXgnLCAndXRmOCcpO1xyXG4gICAgZGVjcnlwdGVkICs9IGRlY2lwaGVyLmZpbmFsKCd1dGY4Jyk7XHJcbiAgICBcclxuICAgIHJldHVybiBKU09OLnBhcnNlKGRlY3J5cHRlZCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFbnN1cmUgc2VydmljZSBpcyBpbml0aWFsaXplZFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZW5zdXJlSW5pdGlhbGl6ZWQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAoIXRoaXMubWFzdGVyS2V5IHx8ICF0aGlzLm90cENvbmZpZykge1xyXG4gICAgICBhd2FpdCB0aGlzLmluaXRpYWxpemUoKTtcclxuICAgIH1cclxuICB9XHJcbn0iXX0=
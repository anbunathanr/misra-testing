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
            logger.error('Failed to initialize OTP Secrets Service', error, {
                correlationId,
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
            logger.error('Failed to generate TOTP secret', error, {
                correlationId,
                userId,
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
            logger.error('Failed to retrieve TOTP secret', error, {
                correlationId,
                userId
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
            logger.error('Failed to generate TOTP code', error, {
                correlationId,
                userId
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
            logger.error('Failed to verify TOTP code', error, {
                correlationId,
                userId
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
            logger.error('Failed to delete TOTP secret', error, {
                correlationId,
                userId
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3RwLXNlY3JldHMtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm90cC1zZWNyZXRzLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNEVBT3lDO0FBQ3pDLHFEQUF1QztBQUN2QywrQ0FBaUM7QUFDakMsK0NBQWtEO0FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBa0JqRCxNQUFhLGlCQUFpQjtJQUNwQixhQUFhLENBQXVCO0lBQ3BDLGFBQWEsQ0FBUztJQUN0QixTQUFTLEdBQWtCLElBQUksQ0FBQztJQUNoQyxTQUFTLEdBQTRCLElBQUksQ0FBQztJQUVsRDtRQUNFLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQztZQUM1QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxJQUFJLGdDQUFnQyxDQUFDO1FBRXJGLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsVUFBVTtRQUNkLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlELE1BQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEVBQUU7WUFDOUMsYUFBYTtZQUNiLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYTtTQUMvQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUM7WUFDSCxNQUFN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QUN4RSxTQUFTLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVwQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLGlCQUFpQjtRQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN2QyxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMxQixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBbmNELDhDQW1jQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcbiAgU2VjcmV0c01hbmFnZXJDbGllbnQsXHJcbiAgR2V0U2VjcmV0VmFsdWVDb21tYW5kLFxyXG4gIFB1dFNlY3JldFZhbHVlQ29tbWFuZCxcclxuICBDcmVhdGVTZWNyZXRDb21tYW5kLFxyXG4gIFVwZGF0ZVNlY3JldENvbW1hbmQsXHJcbiAgUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvblxyXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZWNyZXRzLW1hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyBzcGVha2Vhc3kgZnJvbSAnc3BlYWtlYXN5JztcclxuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ09UUFNlY3JldHNTZXJ2aWNlJyk7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRPVFBTZWNyZXREYXRhIHtcclxuICBzZWNyZXQ6IHN0cmluZztcclxuICBiYWNrdXBDb2Rlczogc3RyaW5nW107XHJcbiAgY3JlYXRlZEF0OiBzdHJpbmc7XHJcbiAgbGFzdFVzZWQ/OiBzdHJpbmc7XHJcbiAgdXNhZ2VDb3VudDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE9UUENvbmZpZ3VyYXRpb24ge1xyXG4gIGlzc3Vlcjogc3RyaW5nO1xyXG4gIGFsZ29yaXRobTogJ1NIQTEnIHwgJ1NIQTI1NicgfCAnU0hBNTEyJztcclxuICBkaWdpdHM6IG51bWJlcjtcclxuICBwZXJpb2Q6IG51bWJlcjtcclxuICB3aW5kb3c6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE9UUFNlY3JldHNTZXJ2aWNlIHtcclxuICBwcml2YXRlIHNlY3JldHNDbGllbnQ6IFNlY3JldHNNYW5hZ2VyQ2xpZW50O1xyXG4gIHByaXZhdGUgb3RwU2VjcmV0TmFtZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgbWFzdGVyS2V5OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuICBwcml2YXRlIG90cENvbmZpZzogT1RQQ29uZmlndXJhdGlvbiB8IG51bGwgPSBudWxsO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuc2VjcmV0c0NsaWVudCA9IG5ldyBTZWNyZXRzTWFuYWdlckNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJ1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIHRoaXMub3RwU2VjcmV0TmFtZSA9IHByb2Nlc3MuZW52Lk9UUF9TRUNSRVRfTkFNRSB8fCAnbWlzcmEtcGxhdGZvcm0vb3RwLXNlY3JldHMtZGV2JztcclxuICAgIFxyXG4gICAgaWYgKCF0aGlzLm90cFNlY3JldE5hbWUpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdPVFBfU0VDUkVUX05BTUUgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemUgdGhlIHNlcnZpY2UgYnkgbG9hZGluZyBjb25maWd1cmF0aW9uIGZyb20gU2VjcmV0cyBNYW5hZ2VyXHJcbiAgICovXHJcbiAgYXN5bmMgaW5pdGlhbGl6ZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdJbml0aWFsaXppbmcgT1RQIFNlY3JldHMgU2VydmljZScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgc2VjcmV0TmFtZTogdGhpcy5vdHBTZWNyZXROYW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldFNlY3JldFZhbHVlQ29tbWFuZCh7XHJcbiAgICAgICAgU2VjcmV0SWQ6IHRoaXMub3RwU2VjcmV0TmFtZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zZWNyZXRzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3BvbnNlLlNlY3JldFN0cmluZykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignT1RQIHNlY3JldCBjb25maWd1cmF0aW9uIG5vdCBmb3VuZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBzZWNyZXREYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS5TZWNyZXRTdHJpbmcpO1xyXG4gICAgICBcclxuICAgICAgLy8gRXh0cmFjdCBtYXN0ZXIga2V5IGZvciBlbmNyeXB0aW9uXHJcbiAgICAgIHRoaXMubWFzdGVyS2V5ID0gc2VjcmV0RGF0YS5tYXN0ZXJLZXk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBFeHRyYWN0IFRPVFAgY29uZmlndXJhdGlvblxyXG4gICAgICB0aGlzLm90cENvbmZpZyA9IEpTT04ucGFyc2Uoc2VjcmV0RGF0YS50b3RwQ29uZmlnKTtcclxuICAgICAgXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdPVFAgU2VjcmV0cyBTZXJ2aWNlIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGhhc0NvbmZpZzogISF0aGlzLm90cENvbmZpZyxcclxuICAgICAgICBoYXNNYXN0ZXJLZXk6ICEhdGhpcy5tYXN0ZXJLZXlcclxuICAgICAgfSk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIE9UUCBTZWNyZXRzIFNlcnZpY2UnLCBlcnJvciwge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9UUF9TRVJWSUNFX0lOSVRfRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBhIG5ldyBUT1RQIHNlY3JldCBmb3IgYSB1c2VyXHJcbiAgICovXHJcbiAgYXN5bmMgZ2VuZXJhdGVUT1RQU2VjcmV0KHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxUT1RQU2VjcmV0RGF0YT4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0dlbmVyYXRpbmcgVE9UUCBzZWNyZXQgZm9yIHVzZXInLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgdGhpcy5lbnN1cmVJbml0aWFsaXplZCgpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdlbmVyYXRlIFRPVFAgc2VjcmV0XHJcbiAgICAgIGNvbnN0IHNlY3JldCA9IHNwZWFrZWFzeS5nZW5lcmF0ZVNlY3JldCh7XHJcbiAgICAgICAgbmFtZTogYE1JU1JBIFBsYXRmb3JtICgke3VzZXJJZH0pYCxcclxuICAgICAgICBpc3N1ZXI6IHRoaXMub3RwQ29uZmlnIS5pc3N1ZXIsXHJcbiAgICAgICAgbGVuZ3RoOiAzMlxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEdlbmVyYXRlIGJhY2t1cCBjb2Rlc1xyXG4gICAgICBjb25zdCBiYWNrdXBDb2RlcyA9IHRoaXMuZ2VuZXJhdGVCYWNrdXBDb2RlcygpO1xyXG5cclxuICAgICAgY29uc3Qgc2VjcmV0RGF0YTogVE9UUFNlY3JldERhdGEgPSB7XHJcbiAgICAgICAgc2VjcmV0OiBzZWNyZXQuYmFzZTMyISxcclxuICAgICAgICBiYWNrdXBDb2RlcyxcclxuICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB1c2FnZUNvdW50OiAwXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBTdG9yZSBlbmNyeXB0ZWQgc2VjcmV0IGZvciB0aGUgdXNlclxyXG4gICAgICBhd2FpdCB0aGlzLl9zdG9yZVVzZXJUT1RQU2VjcmV0KHVzZXJJZCwgc2VjcmV0RGF0YSwgY29ycmVsYXRpb25JZCk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBzZWNyZXQgZ2VuZXJhdGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBiYWNrdXBDb2Rlc0NvdW50OiBiYWNrdXBDb2Rlcy5sZW5ndGhcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gc2VjcmV0RGF0YTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIFRPVFAgc2VjcmV0JywgZXJyb3IsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVE9UUF9HRU5FUkFUSU9OX0ZBSUxFRDogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmV0cmlldmUgVE9UUCBzZWNyZXQgZm9yIGEgdXNlclxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFVzZXJUT1RQU2VjcmV0KHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxUT1RQU2VjcmV0RGF0YSB8IG51bGw+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdSZXRyaWV2aW5nIFRPVFAgc2VjcmV0IGZvciB1c2VyJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IHRoaXMuZW5zdXJlSW5pdGlhbGl6ZWQoKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1c2VyU2VjcmV0TmFtZSA9IGAke3RoaXMub3RwU2VjcmV0TmFtZX0vdXNlcnMvJHt1c2VySWR9YDtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0U2VjcmV0VmFsdWVDb21tYW5kKHtcclxuICAgICAgICBTZWNyZXRJZDogdXNlclNlY3JldE5hbWVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuc2VjcmV0c0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCFyZXNwb25zZS5TZWNyZXRTdHJpbmcpIHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnTm8gVE9UUCBzZWNyZXQgZm91bmQgZm9yIHVzZXInLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgdXNlcklkXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIERlY3J5cHQgYW5kIHBhcnNlIHNlY3JldCBkYXRhXHJcbiAgICAgIGNvbnN0IGVuY3J5cHRlZERhdGEgPSBKU09OLnBhcnNlKHJlc3BvbnNlLlNlY3JldFN0cmluZyk7XHJcbiAgICAgIGNvbnN0IHNlY3JldERhdGEgPSB0aGlzLmRlY3J5cHRTZWNyZXREYXRhKGVuY3J5cHRlZERhdGEpO1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1RPVFAgc2VjcmV0IHJldHJpZXZlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgY3JlYXRlZEF0OiBzZWNyZXREYXRhLmNyZWF0ZWRBdCxcclxuICAgICAgICB1c2FnZUNvdW50OiBzZWNyZXREYXRhLnVzYWdlQ291bnRcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gc2VjcmV0RGF0YTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnVE9UUCBzZWNyZXQgbm90IGZvdW5kIGZvciB1c2VyJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIHVzZXJJZFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byByZXRyaWV2ZSBUT1RQIHNlY3JldCcsIGVycm9yLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB1c2VySWRcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVE9UUF9SRVRSSUVWQUxfRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBUT1RQIGNvZGUgZm9yIGEgdXNlclxyXG4gICAqL1xyXG4gIGFzeW5jIGdlbmVyYXRlVE9UUENvZGUodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0dlbmVyYXRpbmcgVE9UUCBjb2RlIGZvciB1c2VyJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHNlY3JldERhdGEgPSBhd2FpdCB0aGlzLmdldFVzZXJUT1RQU2VjcmV0KHVzZXJJZCk7XHJcbiAgICBcclxuICAgIGlmICghc2VjcmV0RGF0YSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RPVFAgc2VjcmV0IG5vdCBmb3VuZCBmb3IgdXNlcicpO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHRvdHBDb2RlID0gc3BlYWtlYXN5LnRvdHAoe1xyXG4gICAgICAgIHNlY3JldDogc2VjcmV0RGF0YS5zZWNyZXQsXHJcbiAgICAgICAgZW5jb2Rpbmc6ICdiYXNlMzInLFxyXG4gICAgICAgIGFsZ29yaXRobTogdGhpcy5vdHBDb25maWchLmFsZ29yaXRobS50b0xvd2VyQ2FzZSgpIGFzIGFueSxcclxuICAgICAgICBkaWdpdHM6IHRoaXMub3RwQ29uZmlnIS5kaWdpdHMsXHJcbiAgICAgICAgc3RlcDogdGhpcy5vdHBDb25maWchLnBlcmlvZCxcclxuICAgICAgICB3aW5kb3c6IHRoaXMub3RwQ29uZmlnIS53aW5kb3dcclxuICAgICAgfSBhcyBhbnkpO1xyXG5cclxuICAgICAgLy8gVXBkYXRlIHVzYWdlIHN0YXRpc3RpY3NcclxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVTZWNyZXRVc2FnZSh1c2VySWQsIGNvcnJlbGF0aW9uSWQpO1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1RPVFAgY29kZSBnZW5lcmF0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGNvZGVMZW5ndGg6IHRvdHBDb2RlLmxlbmd0aFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiB0b3RwQ29kZTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIFRPVFAgY29kZScsIGVycm9yLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB1c2VySWRcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVE9UUF9DT0RFX0dFTkVSQVRJT05fRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgVE9UUCBjb2RlIGZvciBhIHVzZXJcclxuICAgKi9cclxuICBhc3luYyB2ZXJpZnlUT1RQQ29kZSh1c2VySWQ6IHN0cmluZywgY29kZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gICAgXHJcbiAgICBsb2dnZXIuaW5mbygnVmVyaWZ5aW5nIFRPVFAgY29kZSBmb3IgdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBjb2RlTGVuZ3RoOiBjb2RlLmxlbmd0aFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgc2VjcmV0RGF0YSA9IGF3YWl0IHRoaXMuZ2V0VXNlclRPVFBTZWNyZXQodXNlcklkKTtcclxuICAgIFxyXG4gICAgaWYgKCFzZWNyZXREYXRhKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignVE9UUCBzZWNyZXQgbm90IGZvdW5kIGZvciB1c2VyJyk7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgaXNWYWxpZCA9IHNwZWFrZWFzeS50b3RwLnZlcmlmeSh7XHJcbiAgICAgICAgc2VjcmV0OiBzZWNyZXREYXRhLnNlY3JldCxcclxuICAgICAgICBlbmNvZGluZzogJ2Jhc2UzMicsXHJcbiAgICAgICAgdG9rZW46IGNvZGUsXHJcbiAgICAgICAgYWxnb3JpdGhtOiB0aGlzLm90cENvbmZpZyEuYWxnb3JpdGhtLnRvTG93ZXJDYXNlKCkgYXMgYW55LFxyXG4gICAgICAgIGRpZ2l0czogdGhpcy5vdHBDb25maWchLmRpZ2l0cyxcclxuICAgICAgICBzdGVwOiB0aGlzLm90cENvbmZpZyEucGVyaW9kLFxyXG4gICAgICAgIHdpbmRvdzogdGhpcy5vdHBDb25maWchLndpbmRvd1xyXG4gICAgICB9IGFzIGFueSk7XHJcblxyXG4gICAgICBpZiAoaXNWYWxpZCkge1xyXG4gICAgICAgIC8vIFVwZGF0ZSB1c2FnZSBzdGF0aXN0aWNzXHJcbiAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVTZWNyZXRVc2FnZSh1c2VySWQsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBjb2RlIHZlcmlmaWNhdGlvbiBjb21wbGV0ZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgaXNWYWxpZFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiBpc1ZhbGlkO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gdmVyaWZ5IFRPVFAgY29kZScsIGVycm9yLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB1c2VySWRcclxuICAgICAgfSk7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVE9UUF9WRVJJRklDQVRJT05fRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZWxldGUgVE9UUCBzZWNyZXQgZm9yIGEgdXNlclxyXG4gICAqL1xyXG4gIGFzeW5jIGRlbGV0ZVRPVFBTZWNyZXQodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdEZWxldGluZyBUT1RQIHNlY3JldCBmb3IgdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkXHJcbiAgICB9KTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1c2VyU2VjcmV0TmFtZSA9IGAke3RoaXMub3RwU2VjcmV0TmFtZX0vdXNlcnMvJHt1c2VySWR9YDtcclxuICAgICAgXHJcbiAgICAgIC8vIE5vdGU6IEFXUyBTZWNyZXRzIE1hbmFnZXIgZG9lc24ndCBoYXZlIGEgZGlyZWN0IGRlbGV0ZSBjb21tYW5kXHJcbiAgICAgIC8vIFdlJ2xsIG1hcmsgaXQgYXMgZGVsZXRlZCBieSB1cGRhdGluZyB3aXRoIGVtcHR5IGRhdGFcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRTZWNyZXRWYWx1ZUNvbW1hbmQoe1xyXG4gICAgICAgIFNlY3JldElkOiB1c2VyU2VjcmV0TmFtZSxcclxuICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGRlbGV0ZWQ6IHRydWUsXHJcbiAgICAgICAgICBkZWxldGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5zZWNyZXRzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBzZWNyZXQgZGVsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB1c2VySWRcclxuICAgICAgfSk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBkZWxldGUgVE9UUCBzZWNyZXQnLCBlcnJvciwge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgdXNlcklkXHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPVFBfREVMRVRJT05fRkFJTEVEOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdG9yZSBlbmNyeXB0ZWQgVE9UUCBzZWNyZXQgZm9yIGEgdXNlciAocHVibGljIG1ldGhvZCBmb3IgZXh0ZXJuYWwgdXNlKVxyXG4gICAqL1xyXG4gIGFzeW5jIHN0b3JlVXNlclRPVFBTZWNyZXQoXHJcbiAgICB1c2VySWQ6IHN0cmluZywgXHJcbiAgICBzZWNyZXREYXRhOiBUT1RQU2VjcmV0RGF0YSwgXHJcbiAgICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuZW5zdXJlSW5pdGlhbGl6ZWQoKTtcclxuICAgIHJldHVybiB0aGlzLl9zdG9yZVVzZXJUT1RQU2VjcmV0KHVzZXJJZCwgc2VjcmV0RGF0YSwgY29ycmVsYXRpb25JZCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdG9yZSBlbmNyeXB0ZWQgVE9UUCBzZWNyZXQgZm9yIGEgdXNlciAocHJpdmF0ZSBpbXBsZW1lbnRhdGlvbilcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIF9zdG9yZVVzZXJUT1RQU2VjcmV0KFxyXG4gICAgdXNlcklkOiBzdHJpbmcsIFxyXG4gICAgc2VjcmV0RGF0YTogVE9UUFNlY3JldERhdGEsIFxyXG4gICAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCB1c2VyU2VjcmV0TmFtZSA9IGAke3RoaXMub3RwU2VjcmV0TmFtZX0vdXNlcnMvJHt1c2VySWR9YDtcclxuICAgIFxyXG4gICAgLy8gRW5jcnlwdCBzZWNyZXQgZGF0YVxyXG4gICAgY29uc3QgZW5jcnlwdGVkRGF0YSA9IHRoaXMuZW5jcnlwdFNlY3JldERhdGEoc2VjcmV0RGF0YSk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFRyeSB0byB1cGRhdGUgZXhpc3Rpbmcgc2VjcmV0IGZpcnN0XHJcbiAgICAgIGNvbnN0IHVwZGF0ZUNvbW1hbmQgPSBuZXcgUHV0U2VjcmV0VmFsdWVDb21tYW5kKHtcclxuICAgICAgICBTZWNyZXRJZDogdXNlclNlY3JldE5hbWUsXHJcbiAgICAgICAgU2VjcmV0U3RyaW5nOiBKU09OLnN0cmluZ2lmeShlbmNyeXB0ZWREYXRhKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuc2VjcmV0c0NsaWVudC5zZW5kKHVwZGF0ZUNvbW1hbmQpO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdSZXNvdXJjZU5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgc2VjcmV0IGlmIGl0IGRvZXNuJ3QgZXhpc3RcclxuICAgICAgICBjb25zdCBjcmVhdGVDb21tYW5kID0gbmV3IENyZWF0ZVNlY3JldENvbW1hbmQoe1xyXG4gICAgICAgICAgTmFtZTogdXNlclNlY3JldE5hbWUsXHJcbiAgICAgICAgICBEZXNjcmlwdGlvbjogYFRPVFAgc2VjcmV0IGZvciB1c2VyICR7dXNlcklkfWAsXHJcbiAgICAgICAgICBTZWNyZXRTdHJpbmc6IEpTT04uc3RyaW5naWZ5KGVuY3J5cHRlZERhdGEpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGF3YWl0IHRoaXMuc2VjcmV0c0NsaWVudC5zZW5kKGNyZWF0ZUNvbW1hbmQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1VzZXIgVE9UUCBzZWNyZXQgc3RvcmVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBzZWNyZXROYW1lOiB1c2VyU2VjcmV0TmFtZVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgc2VjcmV0IHVzYWdlIHN0YXRpc3RpY3NcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHVwZGF0ZVNlY3JldFVzYWdlKHVzZXJJZDogc3RyaW5nLCBjb3JyZWxhdGlvbklkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHNlY3JldERhdGEgPSBhd2FpdCB0aGlzLmdldFVzZXJUT1RQU2VjcmV0KHVzZXJJZCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoc2VjcmV0RGF0YSkge1xyXG4gICAgICAgIHNlY3JldERhdGEubGFzdFVzZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgc2VjcmV0RGF0YS51c2FnZUNvdW50ICs9IDE7XHJcbiAgICAgICAgXHJcbiAgICAgICAgYXdhaXQgdGhpcy5fc3RvcmVVc2VyVE9UUFNlY3JldCh1c2VySWQsIHNlY3JldERhdGEsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAvLyBMb2cgYnV0IGRvbid0IGZhaWwgdGhlIG1haW4gb3BlcmF0aW9uXHJcbiAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gdXBkYXRlIHNlY3JldCB1c2FnZSBzdGF0aXN0aWNzJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYmFja3VwIGNvZGVzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZUJhY2t1cENvZGVzKCk6IHN0cmluZ1tdIHtcclxuICAgIGNvbnN0IGNvZGVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgY29uc3QgY2hhcnNldCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWjAxMjM0NTY3ODknO1xyXG4gICAgXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IDEwOyBpKyspIHtcclxuICAgICAgbGV0IGNvZGUgPSAnJztcclxuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCA4OyBqKyspIHtcclxuICAgICAgICBjb2RlICs9IGNoYXJzZXQuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGNoYXJzZXQubGVuZ3RoKSk7XHJcbiAgICAgIH1cclxuICAgICAgY29kZXMucHVzaChjb2RlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGNvZGVzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRW5jcnlwdCBzZWNyZXQgZGF0YSB1c2luZyBtYXN0ZXIga2V5XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBlbmNyeXB0U2VjcmV0RGF0YShkYXRhOiBUT1RQU2VjcmV0RGF0YSk6IGFueSB7XHJcbiAgICBpZiAoIXRoaXMubWFzdGVyS2V5KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWFzdGVyIGtleSBub3QgYXZhaWxhYmxlIGZvciBlbmNyeXB0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY2lwaGVyID0gY3J5cHRvLmNyZWF0ZUNpcGhlcignYWVzLTI1Ni1jYmMnLCB0aGlzLm1hc3RlcktleSk7XHJcbiAgICBsZXQgZW5jcnlwdGVkID0gY2lwaGVyLnVwZGF0ZShKU09OLnN0cmluZ2lmeShkYXRhKSwgJ3V0ZjgnLCAnaGV4Jyk7XHJcbiAgICBlbmNyeXB0ZWQgKz0gY2lwaGVyLmZpbmFsKCdoZXgnKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZW5jcnlwdGVkLFxyXG4gICAgICBhbGdvcml0aG06ICdhZXMtMjU2LWNiYycsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGVjcnlwdCBzZWNyZXQgZGF0YSB1c2luZyBtYXN0ZXIga2V5XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBkZWNyeXB0U2VjcmV0RGF0YShlbmNyeXB0ZWREYXRhOiBhbnkpOiBUT1RQU2VjcmV0RGF0YSB7XHJcbiAgICBpZiAoIXRoaXMubWFzdGVyS2V5KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWFzdGVyIGtleSBub3QgYXZhaWxhYmxlIGZvciBkZWNyeXB0aW9uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGVjaXBoZXIgPSBjcnlwdG8uY3JlYXRlRGVjaXBoZXIoJ2Flcy0yNTYtY2JjJywgdGhpcy5tYXN0ZXJLZXkpO1xyXG4gICAgbGV0IGRlY3J5cHRlZCA9IGRlY2lwaGVyLnVwZGF0ZShlbmNyeXB0ZWREYXRhLmVuY3J5cHRlZCwgJ2hleCcsICd1dGY4Jyk7XHJcbiAgICBkZWNyeXB0ZWQgKz0gZGVjaXBoZXIuZmluYWwoJ3V0ZjgnKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIEpTT04ucGFyc2UoZGVjcnlwdGVkKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEVuc3VyZSBzZXJ2aWNlIGlzIGluaXRpYWxpemVkXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBlbnN1cmVJbml0aWFsaXplZCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmICghdGhpcy5tYXN0ZXJLZXkgfHwgIXRoaXMub3RwQ29uZmlnKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG4gICAgfVxyXG4gIH1cclxufSJdfQ==
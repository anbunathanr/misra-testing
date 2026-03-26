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
exports.JWTService = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const crypto = __importStar(require("crypto"));
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
class JWTService {
    accessTokenSecret;
    refreshTokenSecret;
    accessTokenExpiry;
    refreshTokenExpiry;
    secretsManager;
    constructor() {
        this.secretsManager = new client_secrets_manager_1.SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '1h';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    }
    async getSecret(secretName) {
        try {
            const response = await this.secretsManager.send(new client_secrets_manager_1.GetSecretValueCommand({ SecretId: secretName }));
            if (response.SecretString) {
                return response.SecretString;
            }
            throw new Error('Secret value not found');
        }
        catch (error) {
            console.warn(`Failed to get secret ${secretName}, using fallback:`, error);
            return this.generateSecret();
        }
    }
    generateSecret() {
        return crypto.randomBytes(64).toString('hex');
    }
    /**
     * Get access token secret (from Secrets Manager or fallback)
     */
    async getAccessTokenSecret() {
        const secretName = process.env.JWT_ACCESS_SECRET_NAME || 'misra-platform/jwt/access-secret';
        return await this.getSecret(secretName);
    }
    /**
     * Get refresh token secret (from Secrets Manager or fallback)
     */
    async getRefreshTokenSecret() {
        const secretName = process.env.JWT_REFRESH_SECRET_NAME || 'misra-platform/jwt/refresh-secret';
        return await this.getSecret(secretName);
    }
    /**
     * Generate access and refresh tokens
     */
    async generateTokens(payload) {
        const accessTokenSecret = await this.getAccessTokenSecret();
        const refreshTokenSecret = await this.getRefreshTokenSecret();
        const accessToken = jwt.sign({ ...payload, type: 'access' }, accessTokenSecret, { expiresIn: this.accessTokenExpiry });
        const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, refreshTokenSecret, { expiresIn: this.refreshTokenExpiry });
        return { accessToken, refreshToken };
    }
    /**
     * Verify access token
     */
    async verifyAccessToken(token) {
        try {
            const secret = await this.getAccessTokenSecret();
            const decoded = jwt.verify(token, secret);
            if (decoded.type !== 'access') {
                return null;
            }
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Verify refresh token
     */
    async verifyRefreshToken(token) {
        try {
            const secret = await this.getRefreshTokenSecret();
            const decoded = jwt.verify(token, secret);
            if (decoded.type !== 'refresh') {
                return null;
            }
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Refresh tokens using refresh token
     */
    async refreshTokens(refreshToken) {
        const payload = await this.verifyRefreshToken(refreshToken);
        if (!payload) {
            return null;
        }
        return await this.generateTokens(payload);
    }
}
exports.JWTService = JWTService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiand0LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqd3Qtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBb0M7QUFDcEMsK0NBQWlDO0FBQ2pDLDRFQUE4RjtBQWU5RixNQUFhLFVBQVU7SUFDSixpQkFBaUIsQ0FBUztJQUMxQixrQkFBa0IsQ0FBUztJQUMzQixpQkFBaUIsQ0FBUztJQUMxQixrQkFBa0IsQ0FBUztJQUMzQixjQUFjLENBQXVCO0lBRXREO1FBQ0UsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDbEcsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDO1FBQy9ELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLElBQUksQ0FBQztJQUNuRSxDQUFDO0lBRU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFrQjtRQUN4QyxJQUFJLENBQUM7WUFDSCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUM3QyxJQUFJLDhDQUFxQixDQUFDLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQ3BELENBQUM7WUFDRixJQUFJLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxRQUFRLENBQUMsWUFBWSxDQUFDO1lBQy9CLENBQUM7WUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsSUFBSSxDQUFDLHdCQUF3QixVQUFV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QUFDO1FBQzVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRjtBQWxIRCxnQ0FrSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBqd3QgZnJvbSAnanNvbndlYnRva2VuJztcclxuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XHJcbmltcG9ydCB7IFNlY3JldHNNYW5hZ2VyQ2xpZW50LCBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSnd0UGF5bG9hZCB7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZD86IHN0cmluZztcclxuICByb2xlPzogc3RyaW5nO1xyXG4gIHR5cGU/OiAnYWNjZXNzJyB8ICdyZWZyZXNoJztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUb2tlblBhaXIge1xyXG4gIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBKV1RTZXJ2aWNlIHtcclxuICBwcml2YXRlIHJlYWRvbmx5IGFjY2Vzc1Rva2VuU2VjcmV0OiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSByZWFkb25seSByZWZyZXNoVG9rZW5TZWNyZXQ6IHN0cmluZztcclxuICBwcml2YXRlIHJlYWRvbmx5IGFjY2Vzc1Rva2VuRXhwaXJ5OiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSByZWFkb25seSByZWZyZXNoVG9rZW5FeHBpcnk6IHN0cmluZztcclxuICBwcml2YXRlIHJlYWRvbmx5IHNlY3JldHNNYW5hZ2VyOiBTZWNyZXRzTWFuYWdlckNsaWVudDtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnNlY3JldHNNYW5hZ2VyID0gbmV3IFNlY3JldHNNYW5hZ2VyQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xyXG4gICAgdGhpcy5hY2Nlc3NUb2tlbkV4cGlyeSA9IHByb2Nlc3MuZW52LkpXVF9BQ0NFU1NfRVhQSVJZIHx8ICcxaCc7XHJcbiAgICB0aGlzLnJlZnJlc2hUb2tlbkV4cGlyeSA9IHByb2Nlc3MuZW52LkpXVF9SRUZSRVNIX0VYUElSWSB8fCAnN2QnO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRTZWNyZXQoc2VjcmV0TmFtZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zZWNyZXRzTWFuYWdlci5zZW5kKFxyXG4gICAgICAgIG5ldyBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQoeyBTZWNyZXRJZDogc2VjcmV0TmFtZSB9KVxyXG4gICAgICApO1xyXG4gICAgICBpZiAocmVzcG9uc2UuU2VjcmV0U3RyaW5nKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLlNlY3JldFN0cmluZztcclxuICAgICAgfVxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY3JldCB2YWx1ZSBub3QgZm91bmQnKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgRmFpbGVkIHRvIGdldCBzZWNyZXQgJHtzZWNyZXROYW1lfSwgdXNpbmcgZmFsbGJhY2s6YCwgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZVNlY3JldCgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVNlY3JldCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGNyeXB0by5yYW5kb21CeXRlcyg2NCkudG9TdHJpbmcoJ2hleCcpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFjY2VzcyB0b2tlbiBzZWNyZXQgKGZyb20gU2VjcmV0cyBNYW5hZ2VyIG9yIGZhbGxiYWNrKVxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBnZXRBY2Nlc3NUb2tlblNlY3JldCgpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgY29uc3Qgc2VjcmV0TmFtZSA9IHByb2Nlc3MuZW52LkpXVF9BQ0NFU1NfU0VDUkVUX05BTUUgfHwgJ21pc3JhLXBsYXRmb3JtL2p3dC9hY2Nlc3Mtc2VjcmV0JztcclxuICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFNlY3JldChzZWNyZXROYW1lKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCByZWZyZXNoIHRva2VuIHNlY3JldCAoZnJvbSBTZWNyZXRzIE1hbmFnZXIgb3IgZmFsbGJhY2spXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIGdldFJlZnJlc2hUb2tlblNlY3JldCgpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgY29uc3Qgc2VjcmV0TmFtZSA9IHByb2Nlc3MuZW52LkpXVF9SRUZSRVNIX1NFQ1JFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS9qd3QvcmVmcmVzaC1zZWNyZXQnO1xyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U2VjcmV0KHNlY3JldE5hbWUpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYWNjZXNzIGFuZCByZWZyZXNoIHRva2Vuc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBnZW5lcmF0ZVRva2VucyhwYXlsb2FkOiBKd3RQYXlsb2FkKTogUHJvbWlzZTxUb2tlblBhaXI+IHtcclxuICAgIGNvbnN0IGFjY2Vzc1Rva2VuU2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRBY2Nlc3NUb2tlblNlY3JldCgpO1xyXG4gICAgY29uc3QgcmVmcmVzaFRva2VuU2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRSZWZyZXNoVG9rZW5TZWNyZXQoKTtcclxuXHJcbiAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IGp3dC5zaWduKFxyXG4gICAgICB7IC4uLnBheWxvYWQsIHR5cGU6ICdhY2Nlc3MnIH0sXHJcbiAgICAgIGFjY2Vzc1Rva2VuU2VjcmV0LFxyXG4gICAgICB7IGV4cGlyZXNJbjogdGhpcy5hY2Nlc3NUb2tlbkV4cGlyeSB9XHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHJlZnJlc2hUb2tlbiA9IGp3dC5zaWduKFxyXG4gICAgICB7IC4uLnBheWxvYWQsIHR5cGU6ICdyZWZyZXNoJyB9LFxyXG4gICAgICByZWZyZXNoVG9rZW5TZWNyZXQsXHJcbiAgICAgIHsgZXhwaXJlc0luOiB0aGlzLnJlZnJlc2hUb2tlbkV4cGlyeSB9XHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiB7IGFjY2Vzc1Rva2VuLCByZWZyZXNoVG9rZW4gfTtcclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgYWNjZXNzIHRva2VuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIHZlcmlmeUFjY2Vzc1Rva2VuKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPEp3dFBheWxvYWQgfCBudWxsPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzZWNyZXQgPSBhd2FpdCB0aGlzLmdldEFjY2Vzc1Rva2VuU2VjcmV0KCk7XHJcbiAgICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBzZWNyZXQpIGFzIEp3dFBheWxvYWQ7XHJcbiAgICAgIGlmIChkZWNvZGVkLnR5cGUgIT09ICdhY2Nlc3MnKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGRlY29kZWQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZlcmlmeSByZWZyZXNoIHRva2VuXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIHZlcmlmeVJlZnJlc2hUb2tlbih0b2tlbjogc3RyaW5nKTogUHJvbWlzZTxKd3RQYXlsb2FkIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRSZWZyZXNoVG9rZW5TZWNyZXQoKTtcclxuICAgICAgY29uc3QgZGVjb2RlZCA9IGp3dC52ZXJpZnkodG9rZW4sIHNlY3JldCkgYXMgSnd0UGF5bG9hZDtcclxuICAgICAgaWYgKGRlY29kZWQudHlwZSAhPT0gJ3JlZnJlc2gnKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGRlY29kZWQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlZnJlc2ggdG9rZW5zIHVzaW5nIHJlZnJlc2ggdG9rZW5cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgcmVmcmVzaFRva2VucyhyZWZyZXNoVG9rZW46IHN0cmluZyk6IFByb21pc2U8VG9rZW5QYWlyIHwgbnVsbD4ge1xyXG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHRoaXMudmVyaWZ5UmVmcmVzaFRva2VuKHJlZnJlc2hUb2tlbik7XHJcbiAgICBpZiAoIXBheWxvYWQpIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2VuZXJhdGVUb2tlbnMocGF5bG9hZCk7XHJcbiAgfVxyXG59XHJcbiJdfQ==
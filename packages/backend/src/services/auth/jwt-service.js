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
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
// Module-level cache for JWT secret to prevent multiple calls to Secrets Manager
let cachedJwtSecret = null;
let secretFetchInProgress = null;
class JWTService {
    secretsClient;
    ACCESS_TOKEN_EXPIRES_IN = '1h'; // Updated to 1 hour for production SaaS
    REFRESH_TOKEN_EXPIRES_IN = '7d';
    constructor() {
        this.secretsClient = new client_secrets_manager_1.SecretsManagerClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }
    async getJWTSecret() {
        // Check module-level cache first
        if (cachedJwtSecret) {
            return cachedJwtSecret;
        }
        // Check if a fetch is already in progress
        if (secretFetchInProgress) {
            // Wait for the in-progress fetch to complete
            return secretFetchInProgress;
        }
        // Check environment variable fallback first
        const envSecret = process.env.JWT_SECRET;
        if (envSecret) {
            cachedJwtSecret = envSecret;
            console.warn('Using JWT secret from environment variable fallback');
            return cachedJwtSecret;
        }
        // If we get here, we need to fetch from Secrets Manager
        secretFetchInProgress = (async () => {
            try {
                const secretName = process.env.JWT_SECRET_NAME || 'misra-platform-jwt-secret';
                const command = new client_secrets_manager_1.GetSecretValueCommand({
                    SecretId: secretName,
                });
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Secrets Manager timeout after 3 seconds')), 3000);
                });
                const fetchPromise = this.secretsClient.send(command);
                // Race between the fetch and timeout
                const response = await Promise.race([
                    fetchPromise,
                    timeoutPromise
                ]);
                if (response.SecretString) {
                    const secretData = JSON.parse(response.SecretString);
                    cachedJwtSecret = secretData.secret || secretData;
                    return cachedJwtSecret;
                }
                else {
                    throw new Error('No secret value found in response');
                }
            }
            catch (error) {
                console.error('Failed to retrieve JWT secret from Secrets Manager:', error);
                // Check for specific AWS errors
                const err = error;
                if (err.name === 'AccessDeniedException') {
                    throw new Error('Access denied to Secrets Manager. Check IAM permissions.');
                }
                else if (err.name === 'ResourceNotFoundException') {
                    throw new Error(`Secret not found: ${process.env.JWT_SECRET_NAME || 'misra-platform-jwt-secret'}`);
                }
                else if (err.message && err.message.includes('timeout')) {
                    throw new Error('Secrets Manager call timed out. Check network connectivity and IAM permissions.');
                }
                else {
                    throw new Error(`Unable to retrieve JWT secret: ${err.message}`);
                }
            }
            finally {
                secretFetchInProgress = null;
            }
        })();
        return secretFetchInProgress;
    }
    async generateTokenPair(payload) {
        const secret = await this.getJWTSecret();
        const accessToken = jwt.sign(payload, secret, {
            expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
            issuer: 'misra-platform',
            audience: 'misra-platform-users',
        });
        const refreshToken = jwt.sign({ userId: payload.userId, type: 'refresh' }, secret, {
            expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
            issuer: 'misra-platform',
            audience: 'misra-platform-users',
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: 60 * 60, // 1 hour in seconds
        };
    }
    async verifyAccessToken(token) {
        const secret = await this.getJWTSecret();
        try {
            const decoded = jwt.verify(token, secret, {
                issuer: 'misra-platform',
                audience: 'misra-platform-users',
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Token expired');
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid token');
            }
            else {
                throw new Error('Token verification failed');
            }
        }
    }
    async verifyRefreshToken(token) {
        const secret = await this.getJWTSecret();
        try {
            const decoded = jwt.verify(token, secret, {
                issuer: 'misra-platform',
                audience: 'misra-platform-users',
            });
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }
            return { userId: decoded.userId };
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Refresh token expired');
            }
            else if (error instanceof Error && error.message === 'Invalid refresh token') {
                // Re-throw our custom error for non-refresh tokens
                throw error;
            }
            else {
                // All other errors (including JsonWebTokenError) should throw "Invalid refresh token"
                throw new Error('Invalid refresh token');
            }
        }
    }
    async refreshAccessToken(refreshToken, userPayload) {
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
            expiresIn: 60 * 60, // 1 hour in seconds
        };
    }
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7); // Remove 'Bearer ' prefix
    }
}
exports.JWTService = JWTService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiand0LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqd3Qtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBb0M7QUFDcEMsNEVBQThGO0FBaUI5RixpRkFBaUY7QUFDakYsSUFBSSxlQUFlLEdBQWtCLElBQUksQ0FBQztBQUMxQyxJQUFJLHFCQUFxQixHQUEyQixJQUFJLENBQUM7QUFFekQsTUFBYSxVQUFVO0lBQ2IsYUFBYSxDQUF1QjtJQUMzQix1QkFBdUIsR0FBRyxJQUFJLENBQUMsQ0FBQyx3Q0FBd0M7SUFDeEUsd0JBQXdCLEdBQUcsSUFBSSxDQUFDO0lBRWpEO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLDZDQUFvQixDQUFDO1lBQzVDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWTtRQUN4QixpQ0FBaUM7UUFDakMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNwQixPQUFPLGVBQWUsQ0FBQztRQUN6QixDQUFDO1FBRUQsMENBQTBDO1FBQzFDLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMxQiw2Q0FBNkM7WUFDN0MsT0FBTyxxQkFBcUIsQ0FBQztRQUMvQixDQUFDO1FBRUQsNENBQTRDO1FBQzVDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ3pDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxlQUFlLEdBQUcsU0FBUyxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztZQUNwRSxPQUFPLGVBQWUsQ0FBQztRQUN6QixDQUFDO1FBRUQsd0RBQXdEO1FBQ3hELHFCQUFxQixHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDbEMsSUFBSSxD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RSxzQkFBc0I7U0FDakMsQ0FBQyxDQUFDO1FBRUgsT0FBTztZQUNMLFdBQVc7WUFDWCxTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxvQkFBb0I7U0FDekMsQ0FBQztJQUNKLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxVQUE4QjtRQUNuRCxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3JELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtJQUM1RCxDQUFDO0NBQ0Y7QUFwTEQsZ0NBb0xDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgand0IGZyb20gJ2pzb253ZWJ0b2tlbic7XHJcbmltcG9ydCB7IFNlY3JldHNNYW5hZ2VyQ2xpZW50LCBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSldUUGF5bG9hZCB7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIHJvbGU6ICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInO1xyXG4gIGlhdD86IG51bWJlcjtcclxuICBleHA/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW5QYWlyIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG4vLyBNb2R1bGUtbGV2ZWwgY2FjaGUgZm9yIEpXVCBzZWNyZXQgdG8gcHJldmVudCBtdWx0aXBsZSBjYWxscyB0byBTZWNyZXRzIE1hbmFnZXJcclxubGV0IGNhY2hlZEp3dFNlY3JldDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcbmxldCBzZWNyZXRGZXRjaEluUHJvZ3Jlc3M6IFByb21pc2U8c3RyaW5nPiB8IG51bGwgPSBudWxsO1xyXG5cclxuZXhwb3J0IGNsYXNzIEpXVFNlcnZpY2Uge1xyXG4gIHByaXZhdGUgc2VjcmV0c0NsaWVudDogU2VjcmV0c01hbmFnZXJDbGllbnQ7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBBQ0NFU1NfVE9LRU5fRVhQSVJFU19JTiA9ICcxaCc7IC8vIFVwZGF0ZWQgdG8gMSBob3VyIGZvciBwcm9kdWN0aW9uIFNhYVNcclxuICBwcml2YXRlIHJlYWRvbmx5IFJFRlJFU0hfVE9LRU5fRVhQSVJFU19JTiA9ICc3ZCc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5zZWNyZXRzQ2xpZW50ID0gbmV3IFNlY3JldHNNYW5hZ2VyQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGdldEpXVFNlY3JldCgpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgLy8gQ2hlY2sgbW9kdWxlLWxldmVsIGNhY2hlIGZpcnN0XHJcbiAgICBpZiAoY2FjaGVkSnd0U2VjcmV0KSB7XHJcbiAgICAgIHJldHVybiBjYWNoZWRKd3RTZWNyZXQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIENoZWNrIGlmIGEgZmV0Y2ggaXMgYWxyZWFkeSBpbiBwcm9ncmVzc1xyXG4gICAgaWYgKHNlY3JldEZldGNoSW5Qcm9ncmVzcykge1xyXG4gICAgICAvLyBXYWl0IGZvciB0aGUgaW4tcHJvZ3Jlc3MgZmV0Y2ggdG8gY29tcGxldGVcclxuICAgICAgcmV0dXJuIHNlY3JldEZldGNoSW5Qcm9ncmVzcztcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgZW52aXJvbm1lbnQgdmFyaWFibGUgZmFsbGJhY2sgZmlyc3RcclxuICAgIGNvbnN0IGVudlNlY3JldCA9IHByb2Nlc3MuZW52LkpXVF9TRUNSRVQ7XHJcbiAgICBpZiAoZW52U2VjcmV0KSB7XHJcbiAgICAgIGNhY2hlZEp3dFNlY3JldCA9IGVudlNlY3JldDtcclxuICAgICAgY29uc29sZS53YXJuKCdVc2luZyBKV1Qgc2VjcmV0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGUgZmFsbGJhY2snKTtcclxuICAgICAgcmV0dXJuIGNhY2hlZEp3dFNlY3JldDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gSWYgd2UgZ2V0IGhlcmUsIHdlIG5lZWQgdG8gZmV0Y2ggZnJvbSBTZWNyZXRzIE1hbmFnZXJcclxuICAgIHNlY3JldEZldGNoSW5Qcm9ncmVzcyA9IChhc3luYyAoKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3Qgc2VjcmV0TmFtZSA9IHByb2Nlc3MuZW52LkpXVF9TRUNSRVRfTkFNRSB8fCAnbWlzcmEtcGxhdGZvcm0tand0LXNlY3JldCc7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQoe1xyXG4gICAgICAgICAgU2VjcmV0SWQ6IHNlY3JldE5hbWUsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQWRkIHRpbWVvdXQgdG8gcHJldmVudCBoYW5naW5nXHJcbiAgICAgICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZTxuZXZlcj4oKF8sIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKCdTZWNyZXRzIE1hbmFnZXIgdGltZW91dCBhZnRlciAzIHNlY29uZHMnKSksIDMwMDApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGZldGNoUHJvbWlzZSA9IHRoaXMuc2VjcmV0c0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFJhY2UgYmV0d2VlbiB0aGUgZmV0Y2ggYW5kIHRpbWVvdXRcclxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IFByb21pc2UucmFjZShbXHJcbiAgICAgICAgICBmZXRjaFByb21pc2UsXHJcbiAgICAgICAgICB0aW1lb3V0UHJvbWlzZVxyXG4gICAgICAgIF0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChyZXNwb25zZS5TZWNyZXRTdHJpbmcpIHtcclxuICAgICAgICAgIGNvbnN0IHNlY3JldERhdGEgPSBKU09OLnBhcnNlKHJlc3BvbnNlLlNlY3JldFN0cmluZyk7XHJcbiAgICAgICAgICBjYWNoZWRKd3RTZWNyZXQgPSBzZWNyZXREYXRhLnNlY3JldCB8fCBzZWNyZXREYXRhO1xyXG4gICAgICAgICAgcmV0dXJuIGNhY2hlZEp3dFNlY3JldCBhcyBzdHJpbmc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gc2VjcmV0IHZhbHVlIGZvdW5kIGluIHJlc3BvbnNlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZXRyaWV2ZSBKV1Qgc2VjcmV0IGZyb20gU2VjcmV0cyBNYW5hZ2VyOicsIGVycm9yKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3Igc3BlY2lmaWMgQVdTIGVycm9yc1xyXG4gICAgICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIGFueTtcclxuICAgICAgICBpZiAoZXJyLm5hbWUgPT09ICdBY2Nlc3NEZW5pZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FjY2VzcyBkZW5pZWQgdG8gU2VjcmV0cyBNYW5hZ2VyLiBDaGVjayBJQU0gcGVybWlzc2lvbnMuJyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChlcnIubmFtZSA9PT0gJ1Jlc291cmNlTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFNlY3JldCBub3QgZm91bmQ6ICR7cHJvY2Vzcy5lbnYuSldUX1NFQ1JFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1qd3Qtc2VjcmV0J31gKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVyci5tZXNzYWdlICYmIGVyci5tZXNzYWdlLmluY2x1ZGVzKCd0aW1lb3V0JykpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2VjcmV0cyBNYW5hZ2VyIGNhbGwgdGltZWQgb3V0LiBDaGVjayBuZXR3b3JrIGNvbm5lY3Rpdml0eSBhbmQgSUFNIHBlcm1pc3Npb25zLicpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byByZXRyaWV2ZSBKV1Qgc2VjcmV0OiAke2Vyci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBzZWNyZXRGZXRjaEluUHJvZ3Jlc3MgPSBudWxsO1xyXG4gICAgICB9XHJcbiAgICB9KSgpO1xyXG4gICAgXHJcbiAgICByZXR1cm4gc2VjcmV0RmV0Y2hJblByb2dyZXNzO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2VuZXJhdGVUb2tlblBhaXIocGF5bG9hZDogT21pdDxKV1RQYXlsb2FkLCAnaWF0JyB8ICdleHAnPik6IFByb21pc2U8VG9rZW5QYWlyPiB7XHJcbiAgICBjb25zdCBzZWNyZXQgPSBhd2FpdCB0aGlzLmdldEpXVFNlY3JldCgpO1xyXG4gICAgXHJcbiAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IGp3dC5zaWduKHBheWxvYWQsIHNlY3JldCwge1xyXG4gICAgICBleHBpcmVzSW46IHRoaXMuQUNDRVNTX1RPS0VOX0VYUElSRVNfSU4sXHJcbiAgICAgIGlzc3VlcjogJ21pc3JhLXBsYXRmb3JtJyxcclxuICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZWZyZXNoVG9rZW4gPSBqd3Quc2lnbihcclxuICAgICAgeyB1c2VySWQ6IHBheWxvYWQudXNlcklkLCB0eXBlOiAncmVmcmVzaCcgfSxcclxuICAgICAgc2VjcmV0LFxyXG4gICAgICB7XHJcbiAgICAgICAgZXhwaXJlc0luOiB0aGlzLlJFRlJFU0hfVE9LRU5fRVhQSVJFU19JTixcclxuICAgICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWNjZXNzVG9rZW4sXHJcbiAgICAgIHJlZnJlc2hUb2tlbixcclxuICAgICAgZXhwaXJlc0luOiA2MCAqIDYwLCAvLyAxIGhvdXIgaW4gc2Vjb25kc1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHZlcmlmeUFjY2Vzc1Rva2VuKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPEpXVFBheWxvYWQ+IHtcclxuICAgIGNvbnN0IHNlY3JldCA9IGF3YWl0IHRoaXMuZ2V0SldUU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBzZWNyZXQsIHtcclxuICAgICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIH0pIGFzIEpXVFBheWxvYWQ7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gZGVjb2RlZDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIGp3dC5Ub2tlbkV4cGlyZWRFcnJvcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVG9rZW4gZXhwaXJlZCcpO1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0Lkpzb25XZWJUb2tlbkVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHRva2VuJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb2tlbiB2ZXJpZmljYXRpb24gZmFpbGVkJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHZlcmlmeVJlZnJlc2hUb2tlbih0b2tlbjogc3RyaW5nKTogUHJvbWlzZTx7IHVzZXJJZDogc3RyaW5nIH0+IHtcclxuICAgIGNvbnN0IHNlY3JldCA9IGF3YWl0IHRoaXMuZ2V0SldUU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBzZWNyZXQsIHtcclxuICAgICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIH0pIGFzIGFueTtcclxuICAgICAgXHJcbiAgICAgIGlmIChkZWNvZGVkLnR5cGUgIT09ICdyZWZyZXNoJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByZWZyZXNoIHRva2VuJyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7IHVzZXJJZDogZGVjb2RlZC51c2VySWQgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIGp3dC5Ub2tlbkV4cGlyZWRFcnJvcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVmcmVzaCB0b2tlbiBleHBpcmVkJyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiBlcnJvci5tZXNzYWdlID09PSAnSW52YWxpZCByZWZyZXNoIHRva2VuJykge1xyXG4gICAgICAgIC8vIFJlLXRocm93IG91ciBjdXN0b20gZXJyb3IgZm9yIG5vbi1yZWZyZXNoIHRva2Vuc1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEFsbCBvdGhlciBlcnJvcnMgKGluY2x1ZGluZyBKc29uV2ViVG9rZW5FcnJvcikgc2hvdWxkIHRocm93IFwiSW52YWxpZCByZWZyZXNoIHRva2VuXCJcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcmVmcmVzaCB0b2tlbicpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyByZWZyZXNoQWNjZXNzVG9rZW4ocmVmcmVzaFRva2VuOiBzdHJpbmcsIHVzZXJQYXlsb2FkOiBPbWl0PEpXVFBheWxvYWQsICdpYXQnIHwgJ2V4cCc+KTogUHJvbWlzZTx7IGFjY2Vzc1Rva2VuOiBzdHJpbmc7IGV4cGlyZXNJbjogbnVtYmVyIH0+IHtcclxuICAgIC8vIFZlcmlmeSB0aGUgcmVmcmVzaCB0b2tlbiBmaXJzdFxyXG4gICAgYXdhaXQgdGhpcy52ZXJpZnlSZWZyZXNoVG9rZW4ocmVmcmVzaFRva2VuKTtcclxuICAgIFxyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgY29uc3QgYWNjZXNzVG9rZW4gPSBqd3Quc2lnbih1c2VyUGF5bG9hZCwgc2VjcmV0LCB7XHJcbiAgICAgIGV4cGlyZXNJbjogdGhpcy5BQ0NFU1NfVE9LRU5fRVhQSVJFU19JTixcclxuICAgICAgaXNzdWVyOiAnbWlzcmEtcGxhdGZvcm0nLFxyXG4gICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuLFxyXG4gICAgICBleHBpcmVzSW46IDYwICogNjAsIC8vIDEgaG91ciBpbiBzZWNvbmRzXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgZXh0cmFjdFRva2VuRnJvbUhlYWRlcihhdXRoSGVhZGVyOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCBudWxsIHtcclxuICAgIGlmICghYXV0aEhlYWRlciB8fCAhYXV0aEhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBhdXRoSGVhZGVyLnN1YnN0cmluZyg3KTsgLy8gUmVtb3ZlICdCZWFyZXIgJyBwcmVmaXhcclxuICB9XHJcbn0iXX0=
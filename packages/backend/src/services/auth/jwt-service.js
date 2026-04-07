"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
// Module-level cache for JWT secret to prevent multiple calls to Secrets Manager
let cachedJwtSecret = null;
let secretFetchInProgress = null;
class JWTService {
    secretsClient;
    ACCESS_TOKEN_EXPIRES_IN = '15m';
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
        const accessToken = jsonwebtoken_1.default.sign(payload, secret, {
            expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
            issuer: 'misra-platform',
            audience: 'misra-platform-users',
        });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: payload.userId, type: 'refresh' }, secret, {
            expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
            issuer: 'misra-platform',
            audience: 'misra-platform-users',
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
        };
    }
    async verifyAccessToken(token) {
        const secret = await this.getJWTSecret();
        try {
            const decoded = jsonwebtoken_1.default.verify(token, secret, {
                issuer: 'misra-platform',
                audience: 'misra-platform-users',
            });
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('Token expired');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
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
            const decoded = jsonwebtoken_1.default.verify(token, secret, {
                issuer: 'misra-platform',
                audience: 'misra-platform-users',
            });
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token');
            }
            return { userId: decoded.userId };
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
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
        const accessToken = jsonwebtoken_1.default.sign(userPayload, secret, {
            expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
            issuer: 'misra-platform',
            audience: 'misra-platform-users',
        });
        return {
            accessToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiand0LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqd3Qtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnRUFBK0I7QUFDL0IsNEVBQThGO0FBaUI5RixpRkFBaUY7QUFDakYsSUFBSSxlQUFlLEdBQWtCLElBQUksQ0FBQztBQUMxQyxJQUFJLHFCQUFxQixHQUEyQixJQUFJLENBQUM7QUFFekQsTUFBYSxVQUFVO0lBQ2IsYUFBYSxDQUF1QjtJQUMzQix1QkFBdUIsR0FBRyxLQUFLLENBQUM7SUFDaEMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDO0lBRWpEO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLDZDQUFvQixDQUFDO1lBQzVDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWTtRQUN4QixpQ0FBaUM7UUFDakMsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNwQixPQUFPLGVBQWUsQ0FBQztRQUN6QixDQUFDO1FBRUQsMENBQTBDO1FBQzFDLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMxQiw2Q0FBNkM7WUFDN0MsT0FBTyxxQkFBcUIsQ0FBQztRQUMvQixDQUFDO1FBRUQsNENBQTRDO1FBQzVDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ3pDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxlQUFlLEdBQUcsU0FBUyxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztZQUNwRSxPQUFPLGVBQWUsQ0FBQztRQUN6QixDQUFDO1FBRUQsd0RBQXdEO1FBQ3hELHFCQUFxQixHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDbEMsSUFBSSxDQUFDO2dCQUNILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENB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O1lBQ0wsV0FBVztZQUNYLFNBQVMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLHdCQUF3QjtTQUM3QyxDQUFDO0lBQ0osQ0FBQztJQUVELHNCQUFzQixDQUFDLFVBQThCO1FBQ25ELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDckQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCO0lBQzVELENBQUM7Q0FDRjtBQXBMRCxnQ0FvTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgand0IGZyb20gJ2pzb253ZWJ0b2tlbic7XHJcbmltcG9ydCB7IFNlY3JldHNNYW5hZ2VyQ2xpZW50LCBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSldUUGF5bG9hZCB7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIHJvbGU6ICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInO1xyXG4gIGlhdD86IG51bWJlcjtcclxuICBleHA/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW5QYWlyIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG4vLyBNb2R1bGUtbGV2ZWwgY2FjaGUgZm9yIEpXVCBzZWNyZXQgdG8gcHJldmVudCBtdWx0aXBsZSBjYWxscyB0byBTZWNyZXRzIE1hbmFnZXJcclxubGV0IGNhY2hlZEp3dFNlY3JldDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcbmxldCBzZWNyZXRGZXRjaEluUHJvZ3Jlc3M6IFByb21pc2U8c3RyaW5nPiB8IG51bGwgPSBudWxsO1xyXG5cclxuZXhwb3J0IGNsYXNzIEpXVFNlcnZpY2Uge1xyXG4gIHByaXZhdGUgc2VjcmV0c0NsaWVudDogU2VjcmV0c01hbmFnZXJDbGllbnQ7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBBQ0NFU1NfVE9LRU5fRVhQSVJFU19JTiA9ICcxNW0nO1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgUkVGUkVTSF9UT0tFTl9FWFBJUkVTX0lOID0gJzdkJztcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnNlY3JldHNDbGllbnQgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgZ2V0SldUU2VjcmV0KCk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICAvLyBDaGVjayBtb2R1bGUtbGV2ZWwgY2FjaGUgZmlyc3RcclxuICAgIGlmIChjYWNoZWRKd3RTZWNyZXQpIHtcclxuICAgICAgcmV0dXJuIGNhY2hlZEp3dFNlY3JldDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgaWYgYSBmZXRjaCBpcyBhbHJlYWR5IGluIHByb2dyZXNzXHJcbiAgICBpZiAoc2VjcmV0RmV0Y2hJblByb2dyZXNzKSB7XHJcbiAgICAgIC8vIFdhaXQgZm9yIHRoZSBpbi1wcm9ncmVzcyBmZXRjaCB0byBjb21wbGV0ZVxyXG4gICAgICByZXR1cm4gc2VjcmV0RmV0Y2hJblByb2dyZXNzO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBDaGVjayBlbnZpcm9ubWVudCB2YXJpYWJsZSBmYWxsYmFjayBmaXJzdFxyXG4gICAgY29uc3QgZW52U2VjcmV0ID0gcHJvY2Vzcy5lbnYuSldUX1NFQ1JFVDtcclxuICAgIGlmIChlbnZTZWNyZXQpIHtcclxuICAgICAgY2FjaGVkSnd0U2VjcmV0ID0gZW52U2VjcmV0O1xyXG4gICAgICBjb25zb2xlLndhcm4oJ1VzaW5nIEpXVCBzZWNyZXQgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZSBmYWxsYmFjaycpO1xyXG4gICAgICByZXR1cm4gY2FjaGVkSnd0U2VjcmV0O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBJZiB3ZSBnZXQgaGVyZSwgd2UgbmVlZCB0byBmZXRjaCBmcm9tIFNlY3JldHMgTWFuYWdlclxyXG4gICAgc2VjcmV0RmV0Y2hJblByb2dyZXNzID0gKGFzeW5jICgpID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBzZWNyZXROYW1lID0gcHJvY2Vzcy5lbnYuSldUX1NFQ1JFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1qd3Qtc2VjcmV0JztcclxuICAgICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldFNlY3JldFZhbHVlQ29tbWFuZCh7XHJcbiAgICAgICAgICBTZWNyZXRJZDogc2VjcmV0TmFtZSxcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBBZGQgdGltZW91dCB0byBwcmV2ZW50IGhhbmdpbmdcclxuICAgICAgICBjb25zdCB0aW1lb3V0UHJvbWlzZSA9IG5ldyBQcm9taXNlPG5ldmVyPigoXywgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoJ1NlY3JldHMgTWFuYWdlciB0aW1lb3V0IGFmdGVyIDMgc2Vjb25kcycpKSwgMzAwMCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZmV0Y2hQcm9taXNlID0gdGhpcy5zZWNyZXRzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUmFjZSBiZXR3ZWVuIHRoZSBmZXRjaCBhbmQgdGltZW91dFxyXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcclxuICAgICAgICAgIGZldGNoUHJvbWlzZSxcclxuICAgICAgICAgIHRpbWVvdXRQcm9taXNlXHJcbiAgICAgICAgXSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLlNlY3JldFN0cmluZykge1xyXG4gICAgICAgICAgY29uc3Qgc2VjcmV0RGF0YSA9IEpTT04ucGFyc2UocmVzcG9uc2UuU2VjcmV0U3RyaW5nKTtcclxuICAgICAgICAgIGNhY2hlZEp3dFNlY3JldCA9IHNlY3JldERhdGEuc2VjcmV0IHx8IHNlY3JldERhdGE7XHJcbiAgICAgICAgICByZXR1cm4gY2FjaGVkSnd0U2VjcmV0IGFzIHN0cmluZztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBzZWNyZXQgdmFsdWUgZm91bmQgaW4gcmVzcG9uc2UnKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJldHJpZXZlIEpXVCBzZWNyZXQgZnJvbSBTZWNyZXRzIE1hbmFnZXI6JywgZXJyb3IpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGZvciBzcGVjaWZpYyBBV1MgZXJyb3JzXHJcbiAgICAgICAgY29uc3QgZXJyID0gZXJyb3IgYXMgYW55O1xyXG4gICAgICAgIGlmIChlcnIubmFtZSA9PT0gJ0FjY2Vzc0RlbmllZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQWNjZXNzIGRlbmllZCB0byBTZWNyZXRzIE1hbmFnZXIuIENoZWNrIElBTSBwZXJtaXNzaW9ucy4nKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVyci5uYW1lID09PSAnUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgU2VjcmV0IG5vdCBmb3VuZDogJHtwcm9jZXNzLmVudi5KV1RfU0VDUkVUX05BTUUgfHwgJ21pc3JhLXBsYXRmb3JtLWp3dC1zZWNyZXQnfWApO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZXJyLm1lc3NhZ2UgJiYgZXJyLm1lc3NhZ2UuaW5jbHVkZXMoJ3RpbWVvdXQnKSkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWNyZXRzIE1hbmFnZXIgY2FsbCB0aW1lZCBvdXQuIENoZWNrIG5ldHdvcmsgY29ubmVjdGl2aXR5IGFuZCBJQU0gcGVybWlzc2lvbnMuJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIHJldHJpZXZlIEpXVCBzZWNyZXQ6ICR7ZXJyLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIHNlY3JldEZldGNoSW5Qcm9ncmVzcyA9IG51bGw7XHJcbiAgICAgIH1cclxuICAgIH0pKCk7XHJcbiAgICBcclxuICAgIHJldHVybiBzZWNyZXRGZXRjaEluUHJvZ3Jlc3M7XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZW5lcmF0ZVRva2VuUGFpcihwYXlsb2FkOiBPbWl0PEpXVFBheWxvYWQsICdpYXQnIHwgJ2V4cCc+KTogUHJvbWlzZTxUb2tlblBhaXI+IHtcclxuICAgIGNvbnN0IHNlY3JldCA9IGF3YWl0IHRoaXMuZ2V0SldUU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIGNvbnN0IGFjY2Vzc1Rva2VuID0gand0LnNpZ24ocGF5bG9hZCwgc2VjcmV0LCB7XHJcbiAgICAgIGV4cGlyZXNJbjogdGhpcy5BQ0NFU1NfVE9LRU5fRVhQSVJFU19JTixcclxuICAgICAgaXNzdWVyOiAnbWlzcmEtcGxhdGZvcm0nLFxyXG4gICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlZnJlc2hUb2tlbiA9IGp3dC5zaWduKFxyXG4gICAgICB7IHVzZXJJZDogcGF5bG9hZC51c2VySWQsIHR5cGU6ICdyZWZyZXNoJyB9LFxyXG4gICAgICBzZWNyZXQsXHJcbiAgICAgIHtcclxuICAgICAgICBleHBpcmVzSW46IHRoaXMuUkVGUkVTSF9UT0tFTl9FWFBJUkVTX0lOLFxyXG4gICAgICAgIGlzc3VlcjogJ21pc3JhLXBsYXRmb3JtJyxcclxuICAgICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhY2Nlc3NUb2tlbixcclxuICAgICAgcmVmcmVzaFRva2VuLFxyXG4gICAgICBleHBpcmVzSW46IDE1ICogNjAsIC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHZlcmlmeUFjY2Vzc1Rva2VuKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPEpXVFBheWxvYWQ+IHtcclxuICAgIGNvbnN0IHNlY3JldCA9IGF3YWl0IHRoaXMuZ2V0SldUU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBzZWNyZXQsIHtcclxuICAgICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIH0pIGFzIEpXVFBheWxvYWQ7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gZGVjb2RlZDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIGp3dC5Ub2tlbkV4cGlyZWRFcnJvcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVG9rZW4gZXhwaXJlZCcpO1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0Lkpzb25XZWJUb2tlbkVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHRva2VuJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb2tlbiB2ZXJpZmljYXRpb24gZmFpbGVkJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHZlcmlmeVJlZnJlc2hUb2tlbih0b2tlbjogc3RyaW5nKTogUHJvbWlzZTx7IHVzZXJJZDogc3RyaW5nIH0+IHtcclxuICAgIGNvbnN0IHNlY3JldCA9IGF3YWl0IHRoaXMuZ2V0SldUU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBzZWNyZXQsIHtcclxuICAgICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIH0pIGFzIGFueTtcclxuICAgICAgXHJcbiAgICAgIGlmIChkZWNvZGVkLnR5cGUgIT09ICdyZWZyZXNoJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByZWZyZXNoIHRva2VuJyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7IHVzZXJJZDogZGVjb2RlZC51c2VySWQgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIGp3dC5Ub2tlbkV4cGlyZWRFcnJvcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVmcmVzaCB0b2tlbiBleHBpcmVkJyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiBlcnJvci5tZXNzYWdlID09PSAnSW52YWxpZCByZWZyZXNoIHRva2VuJykge1xyXG4gICAgICAgIC8vIFJlLXRocm93IG91ciBjdXN0b20gZXJyb3IgZm9yIG5vbi1yZWZyZXNoIHRva2Vuc1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEFsbCBvdGhlciBlcnJvcnMgKGluY2x1ZGluZyBKc29uV2ViVG9rZW5FcnJvcikgc2hvdWxkIHRocm93IFwiSW52YWxpZCByZWZyZXNoIHRva2VuXCJcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcmVmcmVzaCB0b2tlbicpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyByZWZyZXNoQWNjZXNzVG9rZW4ocmVmcmVzaFRva2VuOiBzdHJpbmcsIHVzZXJQYXlsb2FkOiBPbWl0PEpXVFBheWxvYWQsICdpYXQnIHwgJ2V4cCc+KTogUHJvbWlzZTx7IGFjY2Vzc1Rva2VuOiBzdHJpbmc7IGV4cGlyZXNJbjogbnVtYmVyIH0+IHtcclxuICAgIC8vIFZlcmlmeSB0aGUgcmVmcmVzaCB0b2tlbiBmaXJzdFxyXG4gICAgYXdhaXQgdGhpcy52ZXJpZnlSZWZyZXNoVG9rZW4ocmVmcmVzaFRva2VuKTtcclxuICAgIFxyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgY29uc3QgYWNjZXNzVG9rZW4gPSBqd3Quc2lnbih1c2VyUGF5bG9hZCwgc2VjcmV0LCB7XHJcbiAgICAgIGV4cGlyZXNJbjogdGhpcy5BQ0NFU1NfVE9LRU5fRVhQSVJFU19JTixcclxuICAgICAgaXNzdWVyOiAnbWlzcmEtcGxhdGZvcm0nLFxyXG4gICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuLFxyXG4gICAgICBleHBpcmVzSW46IDE1ICogNjAsIC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGV4dHJhY3RUb2tlbkZyb21IZWFkZXIoYXV0aEhlYWRlcjogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgbnVsbCB7XHJcbiAgICBpZiAoIWF1dGhIZWFkZXIgfHwgIWF1dGhIZWFkZXIuc3RhcnRzV2l0aCgnQmVhcmVyICcpKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gYXV0aEhlYWRlci5zdWJzdHJpbmcoNyk7IC8vIFJlbW92ZSAnQmVhcmVyICcgcHJlZml4XHJcbiAgfVxyXG59Il19
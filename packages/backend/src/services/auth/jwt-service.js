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
            requestTimeout: 3000, // 3 second timeout for Secrets Manager calls
            connectionTimeout: 3000, // 3 second connection timeout
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
                if (error.name === 'AccessDeniedException') {
                    throw new Error('Access denied to Secrets Manager. Check IAM permissions.');
                }
                else if (error.name === 'ResourceNotFoundException') {
                    throw new Error(`Secret not found: ${process.env.JWT_SECRET_NAME || 'misra-platform-jwt-secret'}`);
                }
                else if (error.message.includes('timeout')) {
                    throw new Error('Secrets Manager call timed out. Check network connectivity and IAM permissions.');
                }
                else {
                    throw new Error(`Unable to retrieve JWT secret: ${error.message}`);
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
            else if (error.message === 'Invalid refresh token') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiand0LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqd3Qtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnRUFBK0I7QUFDL0IsNEVBQThGO0FBaUI5RixpRkFBaUY7QUFDakYsSUFBSSxlQUFlLEdBQWtCLElBQUksQ0FBQztBQUMxQyxJQUFJLHFCQUFxQixHQUEyQixJQUFJLENBQUM7QUFFekQsTUFBYSxVQUFVO0lBQ2IsYUFBYSxDQUF1QjtJQUMzQix1QkFBdUIsR0FBRyxLQUFLLENBQUM7SUFDaEMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDO0lBRWpEO1FBQ0UsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLDZDQUFvQixDQUFDO1lBQzVDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1lBQzdDLGNBQWMsRUFBRSxJQUFJLEVBQUUsNkNBQTZDO1lBQ25FLGlCQUFpQixFQUFFLElBQUksRUFBRSw4QkFBOEI7U0FDeEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZO1FBQ3hCLGlDQUFpQztRQUNqQyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sZUFBZSxDQUFDO1FBQ3pCLENBQUM7UUFFRCwwQ0FBMEM7UUFDMUMsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzFCLDZDQUE2QztZQUM3QyxPQUFPLHFCQUFxQixDQUFDO1FBQy9CLENBQUM7UUFFRCw0Q0FBNEM7UUFDNUMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7UUFDekMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLGVBQWUsR0FBRyxTQUFTLENBQUM7WUFDNUIsT0FBTyxDQUFDLElBQUksQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO1lBQ3BFLE9BQU8sZUFBZSxDQUFDO1FBQ3pCLENBQUM7UUFFRCx3REFBd0Q7UUFDeEQscUJBQXFCLEdBQUcsQ0FBQyxL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LFdBQVc7WUFDWCxTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSx3QkFBd0I7U0FDN0MsQ0FBQztJQUNKLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxVQUE4QjtRQUNuRCxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3JELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtJQUM1RCxDQUFDO0NBQ0Y7QUFyTEQsZ0NBcUxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGp3dCBmcm9tICdqc29ud2VidG9rZW4nO1xyXG5pbXBvcnQgeyBTZWNyZXRzTWFuYWdlckNsaWVudCwgR2V0U2VjcmV0VmFsdWVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNlY3JldHMtbWFuYWdlcic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEpXVFBheWxvYWQge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICByb2xlOiAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJztcclxuICBpYXQ/OiBudW1iZXI7XHJcbiAgZXhwPzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRva2VuUGFpciB7XHJcbiAgYWNjZXNzVG9rZW46IHN0cmluZztcclxuICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxufVxyXG5cclxuLy8gTW9kdWxlLWxldmVsIGNhY2hlIGZvciBKV1Qgc2VjcmV0IHRvIHByZXZlbnQgbXVsdGlwbGUgY2FsbHMgdG8gU2VjcmV0cyBNYW5hZ2VyXHJcbmxldCBjYWNoZWRKd3RTZWNyZXQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5sZXQgc2VjcmV0RmV0Y2hJblByb2dyZXNzOiBQcm9taXNlPHN0cmluZz4gfCBudWxsID0gbnVsbDtcclxuXHJcbmV4cG9ydCBjbGFzcyBKV1RTZXJ2aWNlIHtcclxuICBwcml2YXRlIHNlY3JldHNDbGllbnQ6IFNlY3JldHNNYW5hZ2VyQ2xpZW50O1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgQUNDRVNTX1RPS0VOX0VYUElSRVNfSU4gPSAnMTVtJztcclxuICBwcml2YXRlIHJlYWRvbmx5IFJFRlJFU0hfVE9LRU5fRVhQSVJFU19JTiA9ICc3ZCc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5zZWNyZXRzQ2xpZW50ID0gbmV3IFNlY3JldHNNYW5hZ2VyQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgICByZXF1ZXN0VGltZW91dDogMzAwMCwgLy8gMyBzZWNvbmQgdGltZW91dCBmb3IgU2VjcmV0cyBNYW5hZ2VyIGNhbGxzXHJcbiAgICAgIGNvbm5lY3Rpb25UaW1lb3V0OiAzMDAwLCAvLyAzIHNlY29uZCBjb25uZWN0aW9uIHRpbWVvdXRcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRKV1RTZWNyZXQoKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIC8vIENoZWNrIG1vZHVsZS1sZXZlbCBjYWNoZSBmaXJzdFxyXG4gICAgaWYgKGNhY2hlZEp3dFNlY3JldCkge1xyXG4gICAgICByZXR1cm4gY2FjaGVkSnd0U2VjcmV0O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBDaGVjayBpZiBhIGZldGNoIGlzIGFscmVhZHkgaW4gcHJvZ3Jlc3NcclxuICAgIGlmIChzZWNyZXRGZXRjaEluUHJvZ3Jlc3MpIHtcclxuICAgICAgLy8gV2FpdCBmb3IgdGhlIGluLXByb2dyZXNzIGZldGNoIHRvIGNvbXBsZXRlXHJcbiAgICAgIHJldHVybiBzZWNyZXRGZXRjaEluUHJvZ3Jlc3M7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIENoZWNrIGVudmlyb25tZW50IHZhcmlhYmxlIGZhbGxiYWNrIGZpcnN0XHJcbiAgICBjb25zdCBlbnZTZWNyZXQgPSBwcm9jZXNzLmVudi5KV1RfU0VDUkVUO1xyXG4gICAgaWYgKGVudlNlY3JldCkge1xyXG4gICAgICBjYWNoZWRKd3RTZWNyZXQgPSBlbnZTZWNyZXQ7XHJcbiAgICAgIGNvbnNvbGUud2FybignVXNpbmcgSldUIHNlY3JldCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlIGZhbGxiYWNrJyk7XHJcbiAgICAgIHJldHVybiBjYWNoZWRKd3RTZWNyZXQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIElmIHdlIGdldCBoZXJlLCB3ZSBuZWVkIHRvIGZldGNoIGZyb20gU2VjcmV0cyBNYW5hZ2VyXHJcbiAgICBzZWNyZXRGZXRjaEluUHJvZ3Jlc3MgPSAoYXN5bmMgKCkgPT4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHNlY3JldE5hbWUgPSBwcm9jZXNzLmVudi5KV1RfU0VDUkVUX05BTUUgfHwgJ21pc3JhLXBsYXRmb3JtLWp3dC1zZWNyZXQnO1xyXG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0U2VjcmV0VmFsdWVDb21tYW5kKHtcclxuICAgICAgICAgIFNlY3JldElkOiBzZWNyZXROYW1lLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFkZCB0aW1lb3V0IHRvIHByZXZlbnQgaGFuZ2luZ1xyXG4gICAgICAgIGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2U8bmV2ZXI+KChfLCByZWplY3QpID0+IHtcclxuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignU2VjcmV0cyBNYW5hZ2VyIHRpbWVvdXQgYWZ0ZXIgMyBzZWNvbmRzJykpLCAzMDAwKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBmZXRjaFByb21pc2UgPSB0aGlzLnNlY3JldHNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBSYWNlIGJldHdlZW4gdGhlIGZldGNoIGFuZCB0aW1lb3V0XHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xyXG4gICAgICAgICAgZmV0Y2hQcm9taXNlLFxyXG4gICAgICAgICAgdGltZW91dFByb21pc2VcclxuICAgICAgICBdKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAocmVzcG9uc2UuU2VjcmV0U3RyaW5nKSB7XHJcbiAgICAgICAgICBjb25zdCBzZWNyZXREYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS5TZWNyZXRTdHJpbmcpO1xyXG4gICAgICAgICAgY2FjaGVkSnd0U2VjcmV0ID0gc2VjcmV0RGF0YS5zZWNyZXQgfHwgc2VjcmV0RGF0YTtcclxuICAgICAgICAgIHJldHVybiBjYWNoZWRKd3RTZWNyZXQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gc2VjcmV0IHZhbHVlIGZvdW5kIGluIHJlc3BvbnNlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZXRyaWV2ZSBKV1Qgc2VjcmV0IGZyb20gU2VjcmV0cyBNYW5hZ2VyOicsIGVycm9yKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3Igc3BlY2lmaWMgQVdTIGVycm9yc1xyXG4gICAgICAgIGlmIChlcnJvci5uYW1lID09PSAnQWNjZXNzRGVuaWVkRXhjZXB0aW9uJykge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBY2Nlc3MgZGVuaWVkIHRvIFNlY3JldHMgTWFuYWdlci4gQ2hlY2sgSUFNIHBlcm1pc3Npb25zLicpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoZXJyb3IubmFtZSA9PT0gJ1Jlc291cmNlTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFNlY3JldCBub3QgZm91bmQ6ICR7cHJvY2Vzcy5lbnYuSldUX1NFQ1JFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1qd3Qtc2VjcmV0J31gKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ3RpbWVvdXQnKSkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWNyZXRzIE1hbmFnZXIgY2FsbCB0aW1lZCBvdXQuIENoZWNrIG5ldHdvcmsgY29ubmVjdGl2aXR5IGFuZCBJQU0gcGVybWlzc2lvbnMuJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIHJldHJpZXZlIEpXVCBzZWNyZXQ6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgc2VjcmV0RmV0Y2hJblByb2dyZXNzID0gbnVsbDtcclxuICAgICAgfVxyXG4gICAgfSkoKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHNlY3JldEZldGNoSW5Qcm9ncmVzcztcclxuICB9XHJcblxyXG4gIGFzeW5jIGdlbmVyYXRlVG9rZW5QYWlyKHBheWxvYWQ6IE9taXQ8SldUUGF5bG9hZCwgJ2lhdCcgfCAnZXhwJz4pOiBQcm9taXNlPFRva2VuUGFpcj4ge1xyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgY29uc3QgYWNjZXNzVG9rZW4gPSBqd3Quc2lnbihwYXlsb2FkLCBzZWNyZXQsIHtcclxuICAgICAgZXhwaXJlc0luOiB0aGlzLkFDQ0VTU19UT0tFTl9FWFBJUkVTX0lOLFxyXG4gICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgIGF1ZGllbmNlOiAnbWlzcmEtcGxhdGZvcm0tdXNlcnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVmcmVzaFRva2VuID0gand0LnNpZ24oXHJcbiAgICAgIHsgdXNlcklkOiBwYXlsb2FkLnVzZXJJZCwgdHlwZTogJ3JlZnJlc2gnIH0sXHJcbiAgICAgIHNlY3JldCxcclxuICAgICAge1xyXG4gICAgICAgIGV4cGlyZXNJbjogdGhpcy5SRUZSRVNIX1RPS0VOX0VYUElSRVNfSU4sXHJcbiAgICAgICAgaXNzdWVyOiAnbWlzcmEtcGxhdGZvcm0nLFxyXG4gICAgICAgIGF1ZGllbmNlOiAnbWlzcmEtcGxhdGZvcm0tdXNlcnMnLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuLFxyXG4gICAgICByZWZyZXNoVG9rZW4sXHJcbiAgICAgIGV4cGlyZXNJbjogMTUgKiA2MCwgLy8gMTUgbWludXRlcyBpbiBzZWNvbmRzXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgdmVyaWZ5QWNjZXNzVG9rZW4odG9rZW46IHN0cmluZyk6IFByb21pc2U8SldUUGF5bG9hZD4ge1xyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZGVjb2RlZCA9IGp3dC52ZXJpZnkodG9rZW4sIHNlY3JldCwge1xyXG4gICAgICAgIGlzc3VlcjogJ21pc3JhLXBsYXRmb3JtJyxcclxuICAgICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgICAgfSkgYXMgSldUUGF5bG9hZDtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiBkZWNvZGVkO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0LlRva2VuRXhwaXJlZEVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb2tlbiBleHBpcmVkJyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IgaW5zdGFuY2VvZiBqd3QuSnNvbldlYlRva2VuRXJyb3IpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdG9rZW4nKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rva2VuIHZlcmlmaWNhdGlvbiBmYWlsZWQnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgdmVyaWZ5UmVmcmVzaFRva2VuKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPHsgdXNlcklkOiBzdHJpbmcgfT4ge1xyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZGVjb2RlZCA9IGp3dC52ZXJpZnkodG9rZW4sIHNlY3JldCwge1xyXG4gICAgICAgIGlzc3VlcjogJ21pc3JhLXBsYXRmb3JtJyxcclxuICAgICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgICAgfSkgYXMgYW55O1xyXG4gICAgICBcclxuICAgICAgaWYgKGRlY29kZWQudHlwZSAhPT0gJ3JlZnJlc2gnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlZnJlc2ggdG9rZW4nKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHsgdXNlcklkOiBkZWNvZGVkLnVzZXJJZCB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0LlRva2VuRXhwaXJlZEVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWZyZXNoIHRva2VuIGV4cGlyZWQnKTtcclxuICAgICAgfSBlbHNlIGlmIChlcnJvci5tZXNzYWdlID09PSAnSW52YWxpZCByZWZyZXNoIHRva2VuJykge1xyXG4gICAgICAgIC8vIFJlLXRocm93IG91ciBjdXN0b20gZXJyb3IgZm9yIG5vbi1yZWZyZXNoIHRva2Vuc1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEFsbCBvdGhlciBlcnJvcnMgKGluY2x1ZGluZyBKc29uV2ViVG9rZW5FcnJvcikgc2hvdWxkIHRocm93IFwiSW52YWxpZCByZWZyZXNoIHRva2VuXCJcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcmVmcmVzaCB0b2tlbicpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyByZWZyZXNoQWNjZXNzVG9rZW4ocmVmcmVzaFRva2VuOiBzdHJpbmcsIHVzZXJQYXlsb2FkOiBPbWl0PEpXVFBheWxvYWQsICdpYXQnIHwgJ2V4cCc+KTogUHJvbWlzZTx7IGFjY2Vzc1Rva2VuOiBzdHJpbmc7IGV4cGlyZXNJbjogbnVtYmVyIH0+IHtcclxuICAgIC8vIFZlcmlmeSB0aGUgcmVmcmVzaCB0b2tlbiBmaXJzdFxyXG4gICAgYXdhaXQgdGhpcy52ZXJpZnlSZWZyZXNoVG9rZW4ocmVmcmVzaFRva2VuKTtcclxuICAgIFxyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgY29uc3QgYWNjZXNzVG9rZW4gPSBqd3Quc2lnbih1c2VyUGF5bG9hZCwgc2VjcmV0LCB7XHJcbiAgICAgIGV4cGlyZXNJbjogdGhpcy5BQ0NFU1NfVE9LRU5fRVhQSVJFU19JTixcclxuICAgICAgaXNzdWVyOiAnbWlzcmEtcGxhdGZvcm0nLFxyXG4gICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuLFxyXG4gICAgICBleHBpcmVzSW46IDE1ICogNjAsIC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGV4dHJhY3RUb2tlbkZyb21IZWFkZXIoYXV0aEhlYWRlcjogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgbnVsbCB7XHJcbiAgICBpZiAoIWF1dGhIZWFkZXIgfHwgIWF1dGhIZWFkZXIuc3RhcnRzV2l0aCgnQmVhcmVyICcpKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gYXV0aEhlYWRlci5zdWJzdHJpbmcoNyk7IC8vIFJlbW92ZSAnQmVhcmVyICcgcHJlZml4XHJcbiAgfVxyXG59Il19
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
    TEMPORARY_TOKEN_EXPIRES_IN = '1h'; // Temporary tokens expire in 1 hour
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
    async generateTemporaryTokenPair(payload) {
        const secret = await this.getJWTSecret();
        // Create temporary token payload with limited scope
        const tempPayload = {
            ...payload,
            scope: 'temp_authenticated',
            authState: 'otp_setup_required'
        };
        const accessToken = jwt.sign(tempPayload, secret, {
            expiresIn: this.TEMPORARY_TOKEN_EXPIRES_IN,
            issuer: 'misra-platform',
            audience: 'misra-platform-users',
        });
        const refreshToken = jwt.sign({
            userId: payload.userId,
            type: 'temp_refresh',
            scope: 'temp_authenticated'
        }, secret, {
            expiresIn: this.TEMPORARY_TOKEN_EXPIRES_IN,
            issuer: 'misra-platform',
            audience: 'misra-platform-users',
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: 60 * 60, // 1 hour in seconds
            scope: 'temp_authenticated'
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
    async verifyTemporaryToken(token) {
        const secret = await this.getJWTSecret();
        try {
            const decoded = jwt.verify(token, secret, {
                issuer: 'misra-platform',
                audience: 'misra-platform-users',
            });
            // Verify this is actually a temporary token
            if (decoded.scope !== 'temp_authenticated') {
                throw new Error('Invalid temporary token scope');
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Temporary token expired');
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid temporary token');
            }
            else {
                throw new Error('Temporary token verification failed');
            }
        }
    }
    async verifyAnyToken(token) {
        const secret = await this.getJWTSecret();
        try {
            const decoded = jwt.verify(token, secret, {
                issuer: 'misra-platform',
                audience: 'misra-platform-users',
            });
            // Check if this is a temporary token
            if (decoded.scope === 'temp_authenticated') {
                return decoded;
            }
            else {
                return decoded;
            }
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
            if (decoded.type !== 'refresh' && decoded.type !== 'temp_refresh') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiand0LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqd3Qtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBb0M7QUFDcEMsNEVBQThGO0FBbUM5RixpRkFBaUY7QUFDakYsSUFBSSxlQUFlLEdBQWtCLElBQUksQ0FBQztBQUMxQyxJQUFJLHFCQUFxQixHQUEyQixJQUFJLENBQUM7QUFFekQsTUFBYSxVQUFVO0lBQ2IsYUFBYSxDQUF1QjtJQUMzQix1QkFBdUIsR0FBRyxJQUFJLENBQUMsQ0FBQyx3Q0FBd0M7SUFDeEUsd0JBQXdCLEdBQUcsSUFBSSxDQUFDO0lBQ2hDLDBCQUEwQixHQUFHLElBQUksQ0FBQyxDQUFDLG9DQUFvQztJQUV4RjtRQUNFLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQztZQUM1QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLFlBQVk7UUFDeEIsaUNBQWlDO1FBQ2pDLElBQUksZUFBZSxFQUFFLENBQUM7WUFDcEIsT0FBTyxlQUFlLENBQUM7UUFDekIsQ0FBQztRQUVELDBDQUEwQztRQUMxQyxJQUFJLHFCQUFxQixFQUFFLENBQUM7WUFDMUIsNkNBQTZDO1lBQzdDLE9BQU8scUJBQXFCLENBQUM7UUFDL0IsQ0FBQztRQUVELDRDQUE0QztRQUM1QyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztRQUN6QyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2QsZUFBZSxHQUFHLFNBQVMsQ0FBQztZQUM1QixPQUFPLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxDQUFDLENBQUM7WUFDcEUsT0FBTyxlQUFlLENBQUM7UUFDekIsQ0FBQztRQUVELHdEQUF3RDtRQUN4RCxxQkFB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Q0FBQyxDQUFDO1lBQzNDLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxZQUFvQixFQUFFLFdBQTRDO1FBQ3pGLGlDQUFpQztRQUNqQyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV6QyxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUU7WUFDaEQsU0FBUyxFQUFFLElBQUksQ0FBQyx1QkFBdUI7WUFDdkMsTUFBTSxFQUFFLGdCQUFnQjtZQUN4QixRQUFRLEVBQUUsc0JBQXNCO1NBQ2pDLENBQUMsQ0FBQztRQUVILE9BQU87WUFDTCxXQUFXO1lBQ1gsU0FBUyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsb0JBQW9CO1NBQ3pDLENBQUM7SUFDSixDQUFDO0lBRUQsc0JBQXNCLENBQUMsVUFBOEI7UUFDbkQsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7SUFDNUQsQ0FBQztDQUNGO0FBL1FELGdDQStRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGp3dCBmcm9tICdqc29ud2VidG9rZW4nO1xyXG5pbXBvcnQgeyBTZWNyZXRzTWFuYWdlckNsaWVudCwgR2V0U2VjcmV0VmFsdWVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNlY3JldHMtbWFuYWdlcic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEpXVFBheWxvYWQge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICByb2xlOiAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJztcclxuICBpYXQ/OiBudW1iZXI7XHJcbiAgZXhwPzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBvcmFyeUpXVFBheWxvYWQge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICByb2xlOiAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJztcclxuICBzY29wZTogJ3RlbXBfYXV0aGVudGljYXRlZCc7IC8vIEluZGljYXRlcyB0ZW1wb3JhcnkgYXV0aGVudGljYXRpb25cclxuICBhdXRoU3RhdGU6ICdvdHBfc2V0dXBfcmVxdWlyZWQnO1xyXG4gIGlhdD86IG51bWJlcjtcclxuICBleHA/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW5QYWlyIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBvcmFyeVRva2VuUGFpciB7XHJcbiAgYWNjZXNzVG9rZW46IHN0cmluZztcclxuICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxuICBzY29wZTogJ3RlbXBfYXV0aGVudGljYXRlZCc7XHJcbn1cclxuXHJcbi8vIE1vZHVsZS1sZXZlbCBjYWNoZSBmb3IgSldUIHNlY3JldCB0byBwcmV2ZW50IG11bHRpcGxlIGNhbGxzIHRvIFNlY3JldHMgTWFuYWdlclxyXG5sZXQgY2FjaGVkSnd0U2VjcmV0OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxubGV0IHNlY3JldEZldGNoSW5Qcm9ncmVzczogUHJvbWlzZTxzdHJpbmc+IHwgbnVsbCA9IG51bGw7XHJcblxyXG5leHBvcnQgY2xhc3MgSldUU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBzZWNyZXRzQ2xpZW50OiBTZWNyZXRzTWFuYWdlckNsaWVudDtcclxuICBwcml2YXRlIHJlYWRvbmx5IEFDQ0VTU19UT0tFTl9FWFBJUkVTX0lOID0gJzFoJzsgLy8gVXBkYXRlZCB0byAxIGhvdXIgZm9yIHByb2R1Y3Rpb24gU2FhU1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgUkVGUkVTSF9UT0tFTl9FWFBJUkVTX0lOID0gJzdkJztcclxuICBwcml2YXRlIHJlYWRvbmx5IFRFTVBPUkFSWV9UT0tFTl9FWFBJUkVTX0lOID0gJzFoJzsgLy8gVGVtcG9yYXJ5IHRva2VucyBleHBpcmUgaW4gMSBob3VyXHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5zZWNyZXRzQ2xpZW50ID0gbmV3IFNlY3JldHNNYW5hZ2VyQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGdldEpXVFNlY3JldCgpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgLy8gQ2hlY2sgbW9kdWxlLWxldmVsIGNhY2hlIGZpcnN0XHJcbiAgICBpZiAoY2FjaGVkSnd0U2VjcmV0KSB7XHJcbiAgICAgIHJldHVybiBjYWNoZWRKd3RTZWNyZXQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIENoZWNrIGlmIGEgZmV0Y2ggaXMgYWxyZWFkeSBpbiBwcm9ncmVzc1xyXG4gICAgaWYgKHNlY3JldEZldGNoSW5Qcm9ncmVzcykge1xyXG4gICAgICAvLyBXYWl0IGZvciB0aGUgaW4tcHJvZ3Jlc3MgZmV0Y2ggdG8gY29tcGxldGVcclxuICAgICAgcmV0dXJuIHNlY3JldEZldGNoSW5Qcm9ncmVzcztcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgZW52aXJvbm1lbnQgdmFyaWFibGUgZmFsbGJhY2sgZmlyc3RcclxuICAgIGNvbnN0IGVudlNlY3JldCA9IHByb2Nlc3MuZW52LkpXVF9TRUNSRVQ7XHJcbiAgICBpZiAoZW52U2VjcmV0KSB7XHJcbiAgICAgIGNhY2hlZEp3dFNlY3JldCA9IGVudlNlY3JldDtcclxuICAgICAgY29uc29sZS53YXJuKCdVc2luZyBKV1Qgc2VjcmV0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGUgZmFsbGJhY2snKTtcclxuICAgICAgcmV0dXJuIGNhY2hlZEp3dFNlY3JldDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gSWYgd2UgZ2V0IGhlcmUsIHdlIG5lZWQgdG8gZmV0Y2ggZnJvbSBTZWNyZXRzIE1hbmFnZXJcclxuICAgIHNlY3JldEZldGNoSW5Qcm9ncmVzcyA9IChhc3luYyAoKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3Qgc2VjcmV0TmFtZSA9IHByb2Nlc3MuZW52LkpXVF9TRUNSRVRfTkFNRSB8fCAnbWlzcmEtcGxhdGZvcm0tand0LXNlY3JldCc7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQoe1xyXG4gICAgICAgICAgU2VjcmV0SWQ6IHNlY3JldE5hbWUsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQWRkIHRpbWVvdXQgdG8gcHJldmVudCBoYW5naW5nXHJcbiAgICAgICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZTxuZXZlcj4oKF8sIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKCdTZWNyZXRzIE1hbmFnZXIgdGltZW91dCBhZnRlciAzIHNlY29uZHMnKSksIDMwMDApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGZldGNoUHJvbWlzZSA9IHRoaXMuc2VjcmV0c0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFJhY2UgYmV0d2VlbiB0aGUgZmV0Y2ggYW5kIHRpbWVvdXRcclxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IFByb21pc2UucmFjZShbXHJcbiAgICAgICAgICBmZXRjaFByb21pc2UsXHJcbiAgICAgICAgICB0aW1lb3V0UHJvbWlzZVxyXG4gICAgICAgIF0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChyZXNwb25zZS5TZWNyZXRTdHJpbmcpIHtcclxuICAgICAgICAgIGNvbnN0IHNlY3JldERhdGEgPSBKU09OLnBhcnNlKHJlc3BvbnNlLlNlY3JldFN0cmluZyk7XHJcbiAgICAgICAgICBjYWNoZWRKd3RTZWNyZXQgPSBzZWNyZXREYXRhLnNlY3JldCB8fCBzZWNyZXREYXRhO1xyXG4gICAgICAgICAgcmV0dXJuIGNhY2hlZEp3dFNlY3JldCBhcyBzdHJpbmc7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gc2VjcmV0IHZhbHVlIGZvdW5kIGluIHJlc3BvbnNlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZXRyaWV2ZSBKV1Qgc2VjcmV0IGZyb20gU2VjcmV0cyBNYW5hZ2VyOicsIGVycm9yKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3Igc3BlY2lmaWMgQVdTIGVycm9yc1xyXG4gICAgICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIGFueTtcclxuICAgICAgICBpZiAoZXJyLm5hbWUgPT09ICdBY2Nlc3NEZW5pZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FjY2VzcyBkZW5pZWQgdG8gU2VjcmV0cyBNYW5hZ2VyLiBDaGVjayBJQU0gcGVybWlzc2lvbnMuJyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChlcnIubmFtZSA9PT0gJ1Jlc291cmNlTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFNlY3JldCBub3QgZm91bmQ6ICR7cHJvY2Vzcy5lbnYuSldUX1NFQ1JFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1qd3Qtc2VjcmV0J31gKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGVyci5tZXNzYWdlICYmIGVyci5tZXNzYWdlLmluY2x1ZGVzKCd0aW1lb3V0JykpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2VjcmV0cyBNYW5hZ2VyIGNhbGwgdGltZWQgb3V0LiBDaGVjayBuZXR3b3JrIGNvbm5lY3Rpdml0eSBhbmQgSUFNIHBlcm1pc3Npb25zLicpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byByZXRyaWV2ZSBKV1Qgc2VjcmV0OiAke2Vyci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICBzZWNyZXRGZXRjaEluUHJvZ3Jlc3MgPSBudWxsO1xyXG4gICAgICB9XHJcbiAgICB9KSgpO1xyXG4gICAgXHJcbiAgICByZXR1cm4gc2VjcmV0RmV0Y2hJblByb2dyZXNzO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2VuZXJhdGVUb2tlblBhaXIocGF5bG9hZDogT21pdDxKV1RQYXlsb2FkLCAnaWF0JyB8ICdleHAnPik6IFByb21pc2U8VG9rZW5QYWlyPiB7XHJcbiAgICBjb25zdCBzZWNyZXQgPSBhd2FpdCB0aGlzLmdldEpXVFNlY3JldCgpO1xyXG4gICAgXHJcbiAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IGp3dC5zaWduKHBheWxvYWQsIHNlY3JldCwge1xyXG4gICAgICBleHBpcmVzSW46IHRoaXMuQUNDRVNTX1RPS0VOX0VYUElSRVNfSU4sXHJcbiAgICAgIGlzc3VlcjogJ21pc3JhLXBsYXRmb3JtJyxcclxuICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZWZyZXNoVG9rZW4gPSBqd3Quc2lnbihcclxuICAgICAgeyB1c2VySWQ6IHBheWxvYWQudXNlcklkLCB0eXBlOiAncmVmcmVzaCcgfSxcclxuICAgICAgc2VjcmV0LFxyXG4gICAgICB7XHJcbiAgICAgICAgZXhwaXJlc0luOiB0aGlzLlJFRlJFU0hfVE9LRU5fRVhQSVJFU19JTixcclxuICAgICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWNjZXNzVG9rZW4sXHJcbiAgICAgIHJlZnJlc2hUb2tlbixcclxuICAgICAgZXhwaXJlc0luOiA2MCAqIDYwLCAvLyAxIGhvdXIgaW4gc2Vjb25kc1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdlbmVyYXRlVGVtcG9yYXJ5VG9rZW5QYWlyKHBheWxvYWQ6IE9taXQ8VGVtcG9yYXJ5SldUUGF5bG9hZCwgJ2lhdCcgfCAnZXhwJyB8ICdzY29wZScgfCAnYXV0aFN0YXRlJz4pOiBQcm9taXNlPFRlbXBvcmFyeVRva2VuUGFpcj4ge1xyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHRlbXBvcmFyeSB0b2tlbiBwYXlsb2FkIHdpdGggbGltaXRlZCBzY29wZVxyXG4gICAgY29uc3QgdGVtcFBheWxvYWQ6IE9taXQ8VGVtcG9yYXJ5SldUUGF5bG9hZCwgJ2lhdCcgfCAnZXhwJz4gPSB7XHJcbiAgICAgIC4uLnBheWxvYWQsXHJcbiAgICAgIHNjb3BlOiAndGVtcF9hdXRoZW50aWNhdGVkJyxcclxuICAgICAgYXV0aFN0YXRlOiAnb3RwX3NldHVwX3JlcXVpcmVkJ1xyXG4gICAgfTtcclxuICAgIFxyXG4gICAgY29uc3QgYWNjZXNzVG9rZW4gPSBqd3Quc2lnbih0ZW1wUGF5bG9hZCwgc2VjcmV0LCB7XHJcbiAgICAgIGV4cGlyZXNJbjogdGhpcy5URU1QT1JBUllfVE9LRU5fRVhQSVJFU19JTixcclxuICAgICAgaXNzdWVyOiAnbWlzcmEtcGxhdGZvcm0nLFxyXG4gICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlZnJlc2hUb2tlbiA9IGp3dC5zaWduKFxyXG4gICAgICB7IFxyXG4gICAgICAgIHVzZXJJZDogcGF5bG9hZC51c2VySWQsIFxyXG4gICAgICAgIHR5cGU6ICd0ZW1wX3JlZnJlc2gnLFxyXG4gICAgICAgIHNjb3BlOiAndGVtcF9hdXRoZW50aWNhdGVkJ1xyXG4gICAgICB9LFxyXG4gICAgICBzZWNyZXQsXHJcbiAgICAgIHtcclxuICAgICAgICBleHBpcmVzSW46IHRoaXMuVEVNUE9SQVJZX1RPS0VOX0VYUElSRVNfSU4sXHJcbiAgICAgICAgaXNzdWVyOiAnbWlzcmEtcGxhdGZvcm0nLFxyXG4gICAgICAgIGF1ZGllbmNlOiAnbWlzcmEtcGxhdGZvcm0tdXNlcnMnLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuLFxyXG4gICAgICByZWZyZXNoVG9rZW4sXHJcbiAgICAgIGV4cGlyZXNJbjogNjAgKiA2MCwgLy8gMSBob3VyIGluIHNlY29uZHNcclxuICAgICAgc2NvcGU6ICd0ZW1wX2F1dGhlbnRpY2F0ZWQnXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgdmVyaWZ5QWNjZXNzVG9rZW4odG9rZW46IHN0cmluZyk6IFByb21pc2U8SldUUGF5bG9hZD4ge1xyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZGVjb2RlZCA9IGp3dC52ZXJpZnkodG9rZW4sIHNlY3JldCwge1xyXG4gICAgICAgIGlzc3VlcjogJ21pc3JhLXBsYXRmb3JtJyxcclxuICAgICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgICAgfSkgYXMgSldUUGF5bG9hZDtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiBkZWNvZGVkO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0LlRva2VuRXhwaXJlZEVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb2tlbiBleHBpcmVkJyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IgaW5zdGFuY2VvZiBqd3QuSnNvbldlYlRva2VuRXJyb3IpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdG9rZW4nKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rva2VuIHZlcmlmaWNhdGlvbiBmYWlsZWQnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgdmVyaWZ5VGVtcG9yYXJ5VG9rZW4odG9rZW46IHN0cmluZyk6IFByb21pc2U8VGVtcG9yYXJ5SldUUGF5bG9hZD4ge1xyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZGVjb2RlZCA9IGp3dC52ZXJpZnkodG9rZW4sIHNlY3JldCwge1xyXG4gICAgICAgIGlzc3VlcjogJ21pc3JhLXBsYXRmb3JtJyxcclxuICAgICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgICAgfSkgYXMgVGVtcG9yYXJ5SldUUGF5bG9hZDtcclxuICAgICAgXHJcbiAgICAgIC8vIFZlcmlmeSB0aGlzIGlzIGFjdHVhbGx5IGEgdGVtcG9yYXJ5IHRva2VuXHJcbiAgICAgIGlmIChkZWNvZGVkLnNjb3BlICE9PSAndGVtcF9hdXRoZW50aWNhdGVkJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0ZW1wb3JhcnkgdG9rZW4gc2NvcGUnKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgcmV0dXJuIGRlY29kZWQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBqd3QuVG9rZW5FeHBpcmVkRXJyb3IpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RlbXBvcmFyeSB0b2tlbiBleHBpcmVkJyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IgaW5zdGFuY2VvZiBqd3QuSnNvbldlYlRva2VuRXJyb3IpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdGVtcG9yYXJ5IHRva2VuJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUZW1wb3JhcnkgdG9rZW4gdmVyaWZpY2F0aW9uIGZhaWxlZCcpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyB2ZXJpZnlBbnlUb2tlbih0b2tlbjogc3RyaW5nKTogUHJvbWlzZTxKV1RQYXlsb2FkIHwgVGVtcG9yYXJ5SldUUGF5bG9hZD4ge1xyXG4gICAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgdGhpcy5nZXRKV1RTZWNyZXQoKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZGVjb2RlZCA9IGp3dC52ZXJpZnkodG9rZW4sIHNlY3JldCwge1xyXG4gICAgICAgIGlzc3VlcjogJ21pc3JhLXBsYXRmb3JtJyxcclxuICAgICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgICAgfSkgYXMgYW55O1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIHRlbXBvcmFyeSB0b2tlblxyXG4gICAgICBpZiAoZGVjb2RlZC5zY29wZSA9PT0gJ3RlbXBfYXV0aGVudGljYXRlZCcpIHtcclxuICAgICAgICByZXR1cm4gZGVjb2RlZCBhcyBUZW1wb3JhcnlKV1RQYXlsb2FkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBkZWNvZGVkIGFzIEpXVFBheWxvYWQ7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIGp3dC5Ub2tlbkV4cGlyZWRFcnJvcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVG9rZW4gZXhwaXJlZCcpO1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0Lkpzb25XZWJUb2tlbkVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHRva2VuJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb2tlbiB2ZXJpZmljYXRpb24gZmFpbGVkJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHZlcmlmeVJlZnJlc2hUb2tlbih0b2tlbjogc3RyaW5nKTogUHJvbWlzZTx7IHVzZXJJZDogc3RyaW5nIH0+IHtcclxuICAgIGNvbnN0IHNlY3JldCA9IGF3YWl0IHRoaXMuZ2V0SldUU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBzZWNyZXQsIHtcclxuICAgICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIH0pIGFzIGFueTtcclxuICAgICAgXHJcbiAgICAgIGlmIChkZWNvZGVkLnR5cGUgIT09ICdyZWZyZXNoJyAmJiBkZWNvZGVkLnR5cGUgIT09ICd0ZW1wX3JlZnJlc2gnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlZnJlc2ggdG9rZW4nKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHsgdXNlcklkOiBkZWNvZGVkLnVzZXJJZCB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0LlRva2VuRXhwaXJlZEVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWZyZXNoIHRva2VuIGV4cGlyZWQnKTtcclxuICAgICAgfSBlbHNlIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yICYmIGVycm9yLm1lc3NhZ2UgPT09ICdJbnZhbGlkIHJlZnJlc2ggdG9rZW4nKSB7XHJcbiAgICAgICAgLy8gUmUtdGhyb3cgb3VyIGN1c3RvbSBlcnJvciBmb3Igbm9uLXJlZnJlc2ggdG9rZW5zXHJcbiAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gQWxsIG90aGVyIGVycm9ycyAoaW5jbHVkaW5nIEpzb25XZWJUb2tlbkVycm9yKSBzaG91bGQgdGhyb3cgXCJJbnZhbGlkIHJlZnJlc2ggdG9rZW5cIlxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByZWZyZXNoIHRva2VuJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHJlZnJlc2hBY2Nlc3NUb2tlbihyZWZyZXNoVG9rZW46IHN0cmluZywgdXNlclBheWxvYWQ6IE9taXQ8SldUUGF5bG9hZCwgJ2lhdCcgfCAnZXhwJz4pOiBQcm9taXNlPHsgYWNjZXNzVG9rZW46IHN0cmluZzsgZXhwaXJlc0luOiBudW1iZXIgfT4ge1xyXG4gICAgLy8gVmVyaWZ5IHRoZSByZWZyZXNoIHRva2VuIGZpcnN0XHJcbiAgICBhd2FpdCB0aGlzLnZlcmlmeVJlZnJlc2hUb2tlbihyZWZyZXNoVG9rZW4pO1xyXG4gICAgXHJcbiAgICBjb25zdCBzZWNyZXQgPSBhd2FpdCB0aGlzLmdldEpXVFNlY3JldCgpO1xyXG4gICAgXHJcbiAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IGp3dC5zaWduKHVzZXJQYXlsb2FkLCBzZWNyZXQsIHtcclxuICAgICAgZXhwaXJlc0luOiB0aGlzLkFDQ0VTU19UT0tFTl9FWFBJUkVTX0lOLFxyXG4gICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgIGF1ZGllbmNlOiAnbWlzcmEtcGxhdGZvcm0tdXNlcnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWNjZXNzVG9rZW4sXHJcbiAgICAgIGV4cGlyZXNJbjogNjAgKiA2MCwgLy8gMSBob3VyIGluIHNlY29uZHNcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBleHRyYWN0VG9rZW5Gcm9tSGVhZGVyKGF1dGhIZWFkZXI6IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB8IG51bGwge1xyXG4gICAgaWYgKCFhdXRoSGVhZGVyIHx8ICFhdXRoSGVhZGVyLnN0YXJ0c1dpdGgoJ0JlYXJlciAnKSkge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGF1dGhIZWFkZXIuc3Vic3RyaW5nKDcpOyAvLyBSZW1vdmUgJ0JlYXJlciAnIHByZWZpeFxyXG4gIH1cclxufSJdfQ==
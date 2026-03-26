"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
class JWTService {
    secretsClient;
    jwtSecret = null;
    ACCESS_TOKEN_EXPIRES_IN = '15m';
    REFRESH_TOKEN_EXPIRES_IN = '7d';
    constructor() {
        this.secretsClient = new client_secrets_manager_1.SecretsManagerClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }
    async getJWTSecret() {
        if (this.jwtSecret) {
            return this.jwtSecret;
        }
        try {
            const command = new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: process.env.JWT_SECRET_NAME || 'misra-platform-jwt-secret',
            });
            const response = await this.secretsClient.send(command);
            const secretData = JSON.parse(response.SecretString || '{}');
            this.jwtSecret = secretData.secret;
            if (!this.jwtSecret) {
                throw new Error('JWT secret not found in Secrets Manager');
            }
            return this.jwtSecret;
        }
        catch (error) {
            console.error('Failed to retrieve JWT secret:', error);
            throw new Error('Unable to retrieve JWT secret');
        }
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
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid refresh token');
            }
            else {
                throw new Error('Refresh token verification failed');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiand0LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqd3Qtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxnRUFBK0I7QUFDL0IsNEVBQThGO0FBaUI5RixNQUFhLFVBQVU7SUFDYixhQUFhLENBQXVCO0lBQ3BDLFNBQVMsR0FBa0IsSUFBSSxDQUFDO0lBQ3ZCLHVCQUF1QixHQUFHLEtBQUssQ0FBQztJQUNoQyx3QkFBd0IsR0FBRyxJQUFJLENBQUM7SUFFakQ7UUFDRSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksNkNBQW9CLENBQUM7WUFDNUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7U0FDOUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZO1FBQ3hCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ25CLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN4QixDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSw4Q0FBcUIsQ0FBQztnQkFDeEMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxJQUFJLDJCQUEyQjthQUNyRSxDQUFDLENBQUM7WUFFSCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3hELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsQ0FBQztZQUM3RCxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFFbkMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1lBQzdELENBQUM7WUFFRCxPQUFPLElBQUks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LEtBQUssWUFBWSxzQkFBRyxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ2xELE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUMzQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1lBQ3ZELENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxZQUFvQixFQUFFLFdBQTRDO1FBQ3pGLGlDQUFpQztRQUNqQyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV6QyxNQUFNLFdBQVcsR0FBRyxzQkFBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFO1lBQ2hELFNBQVMsRUFBRSxJQUFJLENBQUMsdUJBQXVCO1lBQ3ZDLE1BQU0sRUFBRSxnQkFBZ0I7WUFDeEIsUUFBUSxFQUFFLHNCQUFzQjtTQUNqQyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsV0FBVztZQUNYLFNBQVMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLHdCQUF3QjtTQUM3QyxDQUFDO0lBQ0osQ0FBQztJQUVELHNCQUFzQixDQUFDLFVBQThCO1FBQ25ELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDckQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMEJBQTBCO0lBQzVELENBQUM7Q0FDRjtBQXRJRCxnQ0FzSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgand0IGZyb20gJ2pzb253ZWJ0b2tlbic7XHJcbmltcG9ydCB7IFNlY3JldHNNYW5hZ2VyQ2xpZW50LCBHZXRTZWNyZXRWYWx1ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VjcmV0cy1tYW5hZ2VyJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSldUUGF5bG9hZCB7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIHJvbGU6ICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInO1xyXG4gIGlhdD86IG51bWJlcjtcclxuICBleHA/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW5QYWlyIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgSldUU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBzZWNyZXRzQ2xpZW50OiBTZWNyZXRzTWFuYWdlckNsaWVudDtcclxuICBwcml2YXRlIGp3dFNlY3JldDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBBQ0NFU1NfVE9LRU5fRVhQSVJFU19JTiA9ICcxNW0nO1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgUkVGUkVTSF9UT0tFTl9FWFBJUkVTX0lOID0gJzdkJztcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnNlY3JldHNDbGllbnQgPSBuZXcgU2VjcmV0c01hbmFnZXJDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgZ2V0SldUU2VjcmV0KCk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBpZiAodGhpcy5qd3RTZWNyZXQpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuand0U2VjcmV0O1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0U2VjcmV0VmFsdWVDb21tYW5kKHtcclxuICAgICAgICBTZWNyZXRJZDogcHJvY2Vzcy5lbnYuSldUX1NFQ1JFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1qd3Qtc2VjcmV0JyxcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuc2VjcmV0c0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zdCBzZWNyZXREYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS5TZWNyZXRTdHJpbmcgfHwgJ3t9Jyk7XHJcbiAgICAgIHRoaXMuand0U2VjcmV0ID0gc2VjcmV0RGF0YS5zZWNyZXQ7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXRoaXMuand0U2VjcmV0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdKV1Qgc2VjcmV0IG5vdCBmb3VuZCBpbiBTZWNyZXRzIE1hbmFnZXInKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHRoaXMuand0U2VjcmV0O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJldHJpZXZlIEpXVCBzZWNyZXQ6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byByZXRyaWV2ZSBKV1Qgc2VjcmV0Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZW5lcmF0ZVRva2VuUGFpcihwYXlsb2FkOiBPbWl0PEpXVFBheWxvYWQsICdpYXQnIHwgJ2V4cCc+KTogUHJvbWlzZTxUb2tlblBhaXI+IHtcclxuICAgIGNvbnN0IHNlY3JldCA9IGF3YWl0IHRoaXMuZ2V0SldUU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIGNvbnN0IGFjY2Vzc1Rva2VuID0gand0LnNpZ24ocGF5bG9hZCwgc2VjcmV0LCB7XHJcbiAgICAgIGV4cGlyZXNJbjogdGhpcy5BQ0NFU1NfVE9LRU5fRVhQSVJFU19JTixcclxuICAgICAgaXNzdWVyOiAnbWlzcmEtcGxhdGZvcm0nLFxyXG4gICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlZnJlc2hUb2tlbiA9IGp3dC5zaWduKFxyXG4gICAgICB7IHVzZXJJZDogcGF5bG9hZC51c2VySWQsIHR5cGU6ICdyZWZyZXNoJyB9LFxyXG4gICAgICBzZWNyZXQsXHJcbiAgICAgIHtcclxuICAgICAgICBleHBpcmVzSW46IHRoaXMuUkVGUkVTSF9UT0tFTl9FWFBJUkVTX0lOLFxyXG4gICAgICAgIGlzc3VlcjogJ21pc3JhLXBsYXRmb3JtJyxcclxuICAgICAgICBhdWRpZW5jZTogJ21pc3JhLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhY2Nlc3NUb2tlbixcclxuICAgICAgcmVmcmVzaFRva2VuLFxyXG4gICAgICBleHBpcmVzSW46IDE1ICogNjAsIC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHZlcmlmeUFjY2Vzc1Rva2VuKHRva2VuOiBzdHJpbmcpOiBQcm9taXNlPEpXVFBheWxvYWQ+IHtcclxuICAgIGNvbnN0IHNlY3JldCA9IGF3YWl0IHRoaXMuZ2V0SldUU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBzZWNyZXQsIHtcclxuICAgICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIH0pIGFzIEpXVFBheWxvYWQ7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gZGVjb2RlZDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIGp3dC5Ub2tlbkV4cGlyZWRFcnJvcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVG9rZW4gZXhwaXJlZCcpO1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0Lkpzb25XZWJUb2tlbkVycm9yKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHRva2VuJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb2tlbiB2ZXJpZmljYXRpb24gZmFpbGVkJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHZlcmlmeVJlZnJlc2hUb2tlbih0b2tlbjogc3RyaW5nKTogUHJvbWlzZTx7IHVzZXJJZDogc3RyaW5nIH0+IHtcclxuICAgIGNvbnN0IHNlY3JldCA9IGF3YWl0IHRoaXMuZ2V0SldUU2VjcmV0KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBzZWNyZXQsIHtcclxuICAgICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgICAgYXVkaWVuY2U6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIH0pIGFzIGFueTtcclxuICAgICAgXHJcbiAgICAgIGlmIChkZWNvZGVkLnR5cGUgIT09ICdyZWZyZXNoJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByZWZyZXNoIHRva2VuJyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7IHVzZXJJZDogZGVjb2RlZC51c2VySWQgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIGp3dC5Ub2tlbkV4cGlyZWRFcnJvcikge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVmcmVzaCB0b2tlbiBleHBpcmVkJyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IgaW5zdGFuY2VvZiBqd3QuSnNvbldlYlRva2VuRXJyb3IpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcmVmcmVzaCB0b2tlbicpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVmcmVzaCB0b2tlbiB2ZXJpZmljYXRpb24gZmFpbGVkJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHJlZnJlc2hBY2Nlc3NUb2tlbihyZWZyZXNoVG9rZW46IHN0cmluZywgdXNlclBheWxvYWQ6IE9taXQ8SldUUGF5bG9hZCwgJ2lhdCcgfCAnZXhwJz4pOiBQcm9taXNlPHsgYWNjZXNzVG9rZW46IHN0cmluZzsgZXhwaXJlc0luOiBudW1iZXIgfT4ge1xyXG4gICAgLy8gVmVyaWZ5IHRoZSByZWZyZXNoIHRva2VuIGZpcnN0XHJcbiAgICBhd2FpdCB0aGlzLnZlcmlmeVJlZnJlc2hUb2tlbihyZWZyZXNoVG9rZW4pO1xyXG4gICAgXHJcbiAgICBjb25zdCBzZWNyZXQgPSBhd2FpdCB0aGlzLmdldEpXVFNlY3JldCgpO1xyXG4gICAgXHJcbiAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IGp3dC5zaWduKHVzZXJQYXlsb2FkLCBzZWNyZXQsIHtcclxuICAgICAgZXhwaXJlc0luOiB0aGlzLkFDQ0VTU19UT0tFTl9FWFBJUkVTX0lOLFxyXG4gICAgICBpc3N1ZXI6ICdtaXNyYS1wbGF0Zm9ybScsXHJcbiAgICAgIGF1ZGllbmNlOiAnbWlzcmEtcGxhdGZvcm0tdXNlcnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYWNjZXNzVG9rZW4sXHJcbiAgICAgIGV4cGlyZXNJbjogMTUgKiA2MCwgLy8gMTUgbWludXRlcyBpbiBzZWNvbmRzXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgZXh0cmFjdFRva2VuRnJvbUhlYWRlcihhdXRoSGVhZGVyOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBzdHJpbmcgfCBudWxsIHtcclxuICAgIGlmICghYXV0aEhlYWRlciB8fCAhYXV0aEhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBhdXRoSGVhZGVyLnN1YnN0cmluZyg3KTsgLy8gUmVtb3ZlICdCZWFyZXIgJyBwcmVmaXhcclxuICB9XHJcbn0iXX0=
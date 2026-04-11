"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const jwt_service_1 = require("../../services/auth/jwt-service");
const user_service_1 = require("../../services/user/user-service");
const jwtService = new jwt_service_1.JWTService();
const userService = new user_service_1.UserService();
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const handler = async (event) => {
    try {
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const loginRequest = JSON.parse(event.body);
        if (!loginRequest.email || !loginRequest.password) {
            return errorResponse(400, 'INVALID_INPUT', 'Email and password are required');
        }
        const clientId = process.env.COGNITO_CLIENT_ID;
        if (!clientId) {
            return errorResponse(500, 'CONFIG_ERROR', 'Cognito client not configured');
        }
        // Authenticate against Cognito
        let cognitoSub;
        try {
            const authResult = await cognitoClient.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
                AuthFlow: 'USER_PASSWORD_AUTH',
                ClientId: clientId,
                AuthParameters: {
                    USERNAME: loginRequest.email,
                    PASSWORD: loginRequest.password,
                },
            }));
            if (!authResult.AuthenticationResult?.IdToken) {
                return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
            }
            // Decode Cognito ID token to get sub
            const parts = authResult.AuthenticationResult.IdToken.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            cognitoSub = payload.sub;
        }
        catch (cognitoError) {
            console.error('Cognito auth error:', cognitoError.name, cognitoError.message);
            if (cognitoError.name === 'NotAuthorizedException' ||
                cognitoError.name === 'UserNotFoundException') {
                return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
            }
            if (cognitoError.name === 'UserNotConfirmedException') {
                return errorResponse(401, 'USER_NOT_CONFIRMED', 'User is not confirmed. Please verify your email.');
            }
            return errorResponse(500, 'AUTH_ERROR', 'Authentication service error');
        }
        // Get or create user in DynamoDB
        let user = await userService.getUserByEmail(loginRequest.email);
        if (!user) {
            user = await userService.createUser({
                email: loginRequest.email,
                organizationId: cognitoSub, // use Cognito sub as org ID for new users
                role: 'developer',
                preferences: {
                    theme: 'light',
                    notifications: { email: true, webhook: false },
                    defaultMisraRuleSet: 'MISRA_C_2012',
                },
            });
        }
        else {
            await userService.updateLastLogin(user.userId);
        }
        // Generate platform JWT tokens
        const tokenPair = await jwtService.generateTokenPair({
            userId: user.userId,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
        });
        const response = {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            user,
            expiresIn: tokenPair.expiresIn,
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('Login error:', error);
        return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
    }
};
exports.handler = handler;
// ✅ Standard error response
function errorResponse(statusCode, code, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: Math.random().toString(36).substring(7),
            },
        }),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxnR0FHbUQ7QUFDbkQsaUVBQTZEO0FBQzdELG1FQUErRDtBQWUvRCxNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztBQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLEVBQUUsQ0FBQztBQUN0QyxNQUFNLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFFcEcsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsRCxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUM7UUFDL0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO1FBQzdFLENBQUM7UUFFRCwrQkFBK0I7UUFDL0IsSUFBSSxVQUFrQixDQUFDO1FBQ3ZCLElBQUksQ0FBQztZQUNI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QVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7XHJcbiAgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsXHJcbiAgSW5pdGlhdGVBdXRoQ29tbWFuZCxcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCB7IEpXVFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdXRoL2p3dC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVXNlclNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy91c2VyL3VzZXItc2VydmljZSc7XHJcblxyXG4vLyBMb2NhbCB0eXBlIGRlZmluaXRpb25zXHJcbmludGVyZmFjZSBMb2dpblJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIExvZ2luUmVzcG9uc2Uge1xyXG4gIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuOiBzdHJpbmc7XHJcbiAgdXNlcjogYW55O1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG5jb25zdCBqd3RTZXJ2aWNlID0gbmV3IEpXVFNlcnZpY2UoKTtcclxuY29uc3QgdXNlclNlcnZpY2UgPSBuZXcgVXNlclNlcnZpY2UoKTtcclxuY29uc3QgY29nbml0b0NsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGxvZ2luUmVxdWVzdDogTG9naW5SZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICBpZiAoIWxvZ2luUmVxdWVzdC5lbWFpbCB8fCAhbG9naW5SZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfSU5QVVQnLCAnRW1haWwgYW5kIHBhc3N3b3JkIGFyZSByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNsaWVudElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQ7XHJcbiAgICBpZiAoIWNsaWVudElkKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0NPTkZJR19FUlJPUicsICdDb2duaXRvIGNsaWVudCBub3QgY29uZmlndXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0ZSBhZ2FpbnN0IENvZ25pdG9cclxuICAgIGxldCBjb2duaXRvU3ViOiBzdHJpbmc7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBhdXRoUmVzdWx0ID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBJbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgICBBdXRoRmxvdzogJ1VTRVJfUEFTU1dPUkRfQVVUSCcsXHJcbiAgICAgICAgQ2xpZW50SWQ6IGNsaWVudElkLFxyXG4gICAgICAgIEF1dGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICBVU0VSTkFNRTogbG9naW5SZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgICAgUEFTU1dPUkQ6IGxvZ2luUmVxdWVzdC5wYXNzd29yZCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LklkVG9rZW4pIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdJTlZBTElEX0NSRURFTlRJQUxTJywgJ0ludmFsaWQgZW1haWwgb3IgcGFzc3dvcmQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRGVjb2RlIENvZ25pdG8gSUQgdG9rZW4gdG8gZ2V0IHN1YlxyXG4gICAgICBjb25zdCBwYXJ0cyA9IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbi5zcGxpdCgnLicpO1xyXG4gICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShwYXJ0c1sxXSwgJ2Jhc2U2NHVybCcpLnRvU3RyaW5nKCd1dGY4JykpO1xyXG4gICAgICBjb2duaXRvU3ViID0gcGF5bG9hZC5zdWI7XHJcbiAgICB9IGNhdGNoIChjb2duaXRvRXJyb3I6IGFueSkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdDb2duaXRvIGF1dGggZXJyb3I6JywgY29nbml0b0Vycm9yLm5hbWUsIGNvZ25pdG9FcnJvci5tZXNzYWdlKTtcclxuICAgICAgaWYgKFxyXG4gICAgICAgIGNvZ25pdG9FcnJvci5uYW1lID09PSAnTm90QXV0aG9yaXplZEV4Y2VwdGlvbicgfHxcclxuICAgICAgICBjb2duaXRvRXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbidcclxuICAgICAgKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnSU5WQUxJRF9DUkVERU5USUFMUycsICdJbnZhbGlkIGVtYWlsIG9yIHBhc3N3b3JkJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGNvZ25pdG9FcnJvci5uYW1lID09PSAnVXNlck5vdENvbmZpcm1lZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdVU0VSX05PVF9DT05GSVJNRUQnLCAnVXNlciBpcyBub3QgY29uZmlybWVkLiBQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwuJyk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQVVUSF9FUlJPUicsICdBdXRoZW50aWNhdGlvbiBzZXJ2aWNlIGVycm9yJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IG9yIGNyZWF0ZSB1c2VyIGluIER5bmFtb0RCXHJcbiAgICBsZXQgdXNlciA9IGF3YWl0IHVzZXJTZXJ2aWNlLmdldFVzZXJCeUVtYWlsKGxvZ2luUmVxdWVzdC5lbWFpbCk7XHJcblxyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIHVzZXIgPSBhd2FpdCB1c2VyU2VydmljZS5jcmVhdGVVc2VyKHtcclxuICAgICAgICBlbWFpbDogbG9naW5SZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiBjb2duaXRvU3ViLCAvLyB1c2UgQ29nbml0byBzdWIgYXMgb3JnIElEIGZvciBuZXcgdXNlcnNcclxuICAgICAgICByb2xlOiAnZGV2ZWxvcGVyJyxcclxuICAgICAgICBwcmVmZXJlbmNlczoge1xyXG4gICAgICAgICAgdGhlbWU6ICdsaWdodCcsXHJcbiAgICAgICAgICBub3RpZmljYXRpb25zOiB7IGVtYWlsOiB0cnVlLCB3ZWJob29rOiBmYWxzZSB9LFxyXG4gICAgICAgICAgZGVmYXVsdE1pc3JhUnVsZVNldDogJ01JU1JBX0NfMjAxMicsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhd2FpdCB1c2VyU2VydmljZS51cGRhdGVMYXN0TG9naW4odXNlci51c2VySWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyYXRlIHBsYXRmb3JtIEpXVCB0b2tlbnNcclxuICAgIGNvbnN0IHRva2VuUGFpciA9IGF3YWl0IGp3dFNlcnZpY2UuZ2VuZXJhdGVUb2tlblBhaXIoe1xyXG4gICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIHJvbGU6IHVzZXIucm9sZSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBMb2dpblJlc3BvbnNlID0ge1xyXG4gICAgICBhY2Nlc3NUb2tlbjogdG9rZW5QYWlyLmFjY2Vzc1Rva2VuLFxyXG4gICAgICByZWZyZXNoVG9rZW46IHRva2VuUGFpci5yZWZyZXNoVG9rZW4sXHJcbiAgICAgIHVzZXIsXHJcbiAgICAgIGV4cGlyZXNJbjogdG9rZW5QYWlyLmV4cGlyZXNJbixcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0xvZ2luIGVycm9yOicsIGVycm9yKTtcclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0lOVEVSTkFMX0VSUk9SJywgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xyXG4gIH1cclxufTtcclxuXHJcbi8vIOKchSBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgfTtcclxufSJdfQ==
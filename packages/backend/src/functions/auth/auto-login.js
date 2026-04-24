"use strict";
/**
 * Auto-Login Lambda Function
 *
 * Logs in user after OTP verification without requiring password
 * This is used in the automated authentication flow
 *
 * For existing users: Uses the temporary password set during registration
 * For new users: Uses the temporary password generated during registration
 *
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "accessToken": "...",
 *   "refreshToken": "...",
 *   "expiresIn": 3600,
 *   "user": {
 *     "userId": "...",
 *     "email": "user@example.com",
 *     "name": "User"
 *   }
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('AutoLogin');
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
const dynamoClient = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
// Standard demo password for all test accounts
const DEMO_PASSWORD = 'DemoPass123!@#';
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    logger.info('Auto-login request received', {
        correlationId,
        path: event.path,
        method: event.httpMethod
    });
    try {
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.email) {
            return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
        }
        logger.info('Auto-logging in user', {
            correlationId,
            email: request.email
        });
        // Try to get the temporary password from DynamoDB (stored during registration)
        let tempPassword = DEMO_PASSWORD; // Use demo password as fallback for existing users
        try {
            const usersTableName = process.env.USERS_TABLE_NAME || 'misra-users';
            const userRecord = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
                TableName: usersTableName,
                Key: {
                    email: request.email
                }
            }));
            if (userRecord.Item?.tempPassword) {
                tempPassword = userRecord.Item.tempPassword;
                logger.info('Retrieved temporary password from DynamoDB', { correlationId });
            }
        }
        catch (dbError) {
            logger.warn('Could not retrieve temp password from DynamoDB, using demo password fallback', {
                correlationId,
                error: dbError.message
            });
            // Continue with demo password fallback
        }
        // Authenticate with Cognito using the temporary password
        const authResult = await cognitoClient.send(new client_cognito_identity_provider_1.AdminInitiateAuthCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            ClientId: process.env.COGNITO_CLIENT_ID,
            AuthFlow: client_cognito_identity_provider_1.AuthFlowType.ADMIN_NO_SRP_AUTH,
            AuthParameters: {
                USERNAME: request.email,
                PASSWORD: tempPassword,
            },
        }));
        // Check if authentication was successful
        if (!authResult.AuthenticationResult) {
            throw new Error('Authentication failed - no tokens returned from Cognito');
        }
        logger.info('Auto-login successful', {
            correlationId,
            email: request.email
        });
        // Extract user ID from the access token (sub claim)
        const accessTokenParts = authResult.AuthenticationResult.AccessToken.split('.');
        let userId = request.email.split('@')[0];
        let userName = 'User';
        try {
            const payload = JSON.parse(Buffer.from(accessTokenParts[1], 'base64').toString());
            userId = payload.sub || userId;
        }
        catch (e) {
            logger.warn('Could not extract userId from token', { correlationId });
        }
        // Try to get user name from Cognito
        try {
            const userInfo = await cognitoClient.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: request.email
            }));
            const nameAttr = userInfo.UserAttributes?.find(attr => attr.Name === 'name');
            if (nameAttr?.Value) {
                userName = nameAttr.Value;
            }
        }
        catch (e) {
            logger.warn('Could not retrieve user name from Cognito', { correlationId });
        }
        const response = {
            accessToken: authResult.AuthenticationResult.AccessToken,
            refreshToken: authResult.AuthenticationResult.RefreshToken,
            expiresIn: authResult.AuthenticationResult.ExpiresIn || 3600,
            user: {
                userId,
                email: request.email,
                name: userName
            }
        };
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        logger.error('Auto-login failed', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
        // Check if it's an authentication error
        if (error.message?.includes('Incorrect username or password') ||
            error.name === 'NotAuthorizedException') {
            return errorResponse(401, 'INVALID_CREDENTIALS', 'Incorrect username or password', correlationId);
        }
        return errorResponse(500, 'AUTO_LOGIN_FAILED', error.message || 'Failed to auto-login', correlationId);
    }
};
exports.handler = handler;
/**
 * Standard error response
 */
function errorResponse(statusCode, code, message, correlationId) {
    return {
        statusCode,
        headers: cors_1.corsHeaders,
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: correlationId
            }
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sb2dpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dG8tbG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUJHOzs7QUFHSCxnR0FLbUQ7QUFDbkQsOERBQTBEO0FBQzFELHdEQUFtRDtBQUNuRCwyQ0FBK0M7QUFDL0MsK0NBQWtEO0FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxXQUFXLENBQUMsQ0FBQztBQUN6QyxNQUFNLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO0lBQ3RELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQUNILE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQztJQUN0QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztDQUM5QyxDQUFDLENBQUM7QUFFSCwrQ0FBK0M7QUFDL0MsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUM7QUFpQmhDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVuRyxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1FBQ3pDLGFBQWE7UUFDYixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7UUFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxVQUFVO0tBQ3pCLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sYUFB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ZW50IjpbIi8qKlxyXG4gKiBBdXRvLUxvZ2luIExhbWJkYSBGdW5jdGlvblxyXG4gKiBcclxuICogTG9ncyBpbiB1c2VyIGFmdGVyIE9UUCB2ZXJpZmljYXRpb24gd2l0aG91dCByZXF1aXJpbmcgcGFzc3dvcmRcclxuICogVGhpcyBpcyB1c2VkIGluIHRoZSBhdXRvbWF0ZWQgYXV0aGVudGljYXRpb24gZmxvd1xyXG4gKiBcclxuICogRm9yIGV4aXN0aW5nIHVzZXJzOiBVc2VzIHRoZSB0ZW1wb3JhcnkgcGFzc3dvcmQgc2V0IGR1cmluZyByZWdpc3RyYXRpb25cclxuICogRm9yIG5ldyB1c2VyczogVXNlcyB0aGUgdGVtcG9yYXJ5IHBhc3N3b3JkIGdlbmVyYXRlZCBkdXJpbmcgcmVnaXN0cmF0aW9uXHJcbiAqIFxyXG4gKiBSZXF1ZXN0OlxyXG4gKiB7XHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIlxyXG4gKiB9XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIFwiYWNjZXNzVG9rZW5cIjogXCIuLi5cIixcclxuICogICBcInJlZnJlc2hUb2tlblwiOiBcIi4uLlwiLFxyXG4gKiAgIFwiZXhwaXJlc0luXCI6IDM2MDAsXHJcbiAqICAgXCJ1c2VyXCI6IHtcclxuICogICAgIFwidXNlcklkXCI6IFwiLi4uXCIsXHJcbiAqICAgICBcImVtYWlsXCI6IFwidXNlckBleGFtcGxlLmNvbVwiLFxyXG4gKiAgICAgXCJuYW1lXCI6IFwiVXNlclwiXHJcbiAqICAgfVxyXG4gKiB9XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBcclxuICBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCxcclxuICBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQsXHJcbiAgQXV0aEZsb3dUeXBlLFxyXG4gIEFkbWluR2V0VXNlckNvbW1hbmRcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgR2V0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IGNvcnNIZWFkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29ycyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ0F1dG9Mb2dpbicpO1xyXG5jb25zdCBjb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHsgXHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIFxyXG59KTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgXHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIFxyXG59KTtcclxuXHJcbi8vIFN0YW5kYXJkIGRlbW8gcGFzc3dvcmQgZm9yIGFsbCB0ZXN0IGFjY291bnRzXHJcbmNvbnN0IERFTU9fUEFTU1dPUkQgPSAnRGVtb1Bhc3MxMjMhQCMnO1xyXG5cclxuaW50ZXJmYWNlIEF1dG9Mb2dpblJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBBdXRvTG9naW5SZXNwb25zZSB7XHJcbiAgYWNjZXNzVG9rZW46IHN0cmluZztcclxuICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxuICB1c2VyOiB7XHJcbiAgICB1c2VySWQ6IHN0cmluZztcclxuICAgIGVtYWlsOiBzdHJpbmc7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBjb3JyZWxhdGlvbklkID0gZXZlbnQuaGVhZGVyc1snWC1Db3JyZWxhdGlvbi1JRCddIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICBcclxuICBsb2dnZXIuaW5mbygnQXV0by1sb2dpbiByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICBtZXRob2Q6IGV2ZW50Lmh0dHBNZXRob2RcclxuICB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBBdXRvTG9naW5SZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0VNQUlMJywgJ0VtYWlsIGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0F1dG8tbG9nZ2luZyBpbiB1c2VyJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVHJ5IHRvIGdldCB0aGUgdGVtcG9yYXJ5IHBhc3N3b3JkIGZyb20gRHluYW1vREIgKHN0b3JlZCBkdXJpbmcgcmVnaXN0cmF0aW9uKVxyXG4gICAgbGV0IHRlbXBQYXNzd29yZCA9IERFTU9fUEFTU1dPUkQ7IC8vIFVzZSBkZW1vIHBhc3N3b3JkIGFzIGZhbGxiYWNrIGZvciBleGlzdGluZyB1c2Vyc1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1c2Vyc1RhYmxlTmFtZSA9IHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFX05BTUUgfHwgJ21pc3JhLXVzZXJzJztcclxuICAgICAgY29uc3QgdXNlclJlY29yZCA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHVzZXJzVGFibGVOYW1lLFxyXG4gICAgICAgIEtleToge1xyXG4gICAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICh1c2VyUmVjb3JkLkl0ZW0/LnRlbXBQYXNzd29yZCkge1xyXG4gICAgICAgIHRlbXBQYXNzd29yZCA9IHVzZXJSZWNvcmQuSXRlbS50ZW1wUGFzc3dvcmQ7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1JldHJpZXZlZCB0ZW1wb3JhcnkgcGFzc3dvcmQgZnJvbSBEeW5hbW9EQicsIHsgY29ycmVsYXRpb25JZCB9KTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZGJFcnJvcikge1xyXG4gICAgICBsb2dnZXIud2FybignQ291bGQgbm90IHJldHJpZXZlIHRlbXAgcGFzc3dvcmQgZnJvbSBEeW5hbW9EQiwgdXNpbmcgZGVtbyBwYXNzd29yZCBmYWxsYmFjaycsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVycm9yOiAoZGJFcnJvciBhcyBhbnkpLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIENvbnRpbnVlIHdpdGggZGVtbyBwYXNzd29yZCBmYWxsYmFja1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0ZSB3aXRoIENvZ25pdG8gdXNpbmcgdGhlIHRlbXBvcmFyeSBwYXNzd29yZFxyXG4gICAgY29uc3QgYXV0aFJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICBBdXRoRmxvdzogQXV0aEZsb3dUeXBlLkFETUlOX05PX1NSUF9BVVRILFxyXG4gICAgICBBdXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIFBBU1NXT1JEOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgIH0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgYXV0aGVudGljYXRpb24gd2FzIHN1Y2Nlc3NmdWxcclxuICAgIGlmICghYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZCAtIG5vIHRva2VucyByZXR1cm5lZCBmcm9tIENvZ25pdG8nKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnQXV0by1sb2dpbiBzdWNjZXNzZnVsJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXh0cmFjdCB1c2VyIElEIGZyb20gdGhlIGFjY2VzcyB0b2tlbiAoc3ViIGNsYWltKVxyXG4gICAgY29uc3QgYWNjZXNzVG9rZW5QYXJ0cyA9IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW4hLnNwbGl0KCcuJyk7XHJcbiAgICBsZXQgdXNlcklkID0gcmVxdWVzdC5lbWFpbC5zcGxpdCgnQCcpWzBdO1xyXG4gICAgbGV0IHVzZXJOYW1lID0gJ1VzZXInO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShhY2Nlc3NUb2tlblBhcnRzWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKSk7XHJcbiAgICAgIHVzZXJJZCA9IHBheWxvYWQuc3ViIHx8IHVzZXJJZDtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0NvdWxkIG5vdCBleHRyYWN0IHVzZXJJZCBmcm9tIHRva2VuJywgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRyeSB0byBnZXQgdXNlciBuYW1lIGZyb20gQ29nbml0b1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlckluZm8gPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBuYW1lQXR0ciA9IHVzZXJJbmZvLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnbmFtZScpO1xyXG4gICAgICBpZiAobmFtZUF0dHI/LlZhbHVlKSB7XHJcbiAgICAgICAgdXNlck5hbWUgPSBuYW1lQXR0ci5WYWx1ZTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBsb2dnZXIud2FybignQ291bGQgbm90IHJldHJpZXZlIHVzZXIgbmFtZSBmcm9tIENvZ25pdG8nLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IEF1dG9Mb2dpblJlc3BvbnNlID0ge1xyXG4gICAgICBhY2Nlc3NUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5BY2Nlc3NUb2tlbiEsXHJcbiAgICAgIHJlZnJlc2hUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5SZWZyZXNoVG9rZW4hLFxyXG4gICAgICBleHBpcmVzSW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuRXhwaXJlc0luIHx8IDM2MDAsXHJcbiAgICAgIHVzZXI6IHtcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgbmFtZTogdXNlck5hbWVcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignQXV0by1sb2dpbiBmYWlsZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBzdGFjazogZXJyb3Iuc3RhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENoZWNrIGlmIGl0J3MgYW4gYXV0aGVudGljYXRpb24gZXJyb3JcclxuICAgIGlmIChlcnJvci5tZXNzYWdlPy5pbmNsdWRlcygnSW5jb3JyZWN0IHVzZXJuYW1lIG9yIHBhc3N3b3JkJykgfHwgXHJcbiAgICAgICAgZXJyb3IubmFtZSA9PT0gJ05vdEF1dGhvcml6ZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ0lOVkFMSURfQ1JFREVOVElBTFMnLCAnSW5jb3JyZWN0IHVzZXJuYW1lIG9yIHBhc3N3b3JkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQVVUT19MT0dJTl9GQUlMRUQnLCBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gYXV0by1sb2dpbicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZyxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59XHJcbiJdfQ==
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
        let tempPassword = 'TestPass123!@#'; // Fallback for existing users
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
            logger.warn('Could not retrieve temp password from DynamoDB, using fallback', {
                correlationId,
                error: dbError.message
            });
            // Continue with fallback password
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sb2dpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dG8tbG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUJHOzs7QUFHSCxnR0FLbUQ7QUFDbkQsOERBQTBEO0FBQzFELHdEQUFtRDtBQUNuRCwyQ0FBK0M7QUFDL0MsK0NBQWtEO0FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxXQUFXLENBQUMsQ0FBQztBQUN6QyxNQUFNLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO0lBQ3RELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQUNILE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQztJQUN0QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztDQUM5QyxDQUFDLENBQUM7QUFpQkksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5HLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUU7UUFDekMsYUFBYTtRQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtRQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7S0FDekIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLENB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clxuICogXHJcbiAqIExvZ3MgaW4gdXNlciBhZnRlciBPVFAgdmVyaWZpY2F0aW9uIHdpdGhvdXQgcmVxdWlyaW5nIHBhc3N3b3JkXHJcbiAqIFRoaXMgaXMgdXNlZCBpbiB0aGUgYXV0b21hdGVkIGF1dGhlbnRpY2F0aW9uIGZsb3dcclxuICogXHJcbiAqIEZvciBleGlzdGluZyB1c2VyczogVXNlcyB0aGUgdGVtcG9yYXJ5IHBhc3N3b3JkIHNldCBkdXJpbmcgcmVnaXN0cmF0aW9uXHJcbiAqIEZvciBuZXcgdXNlcnM6IFVzZXMgdGhlIHRlbXBvcmFyeSBwYXNzd29yZCBnZW5lcmF0ZWQgZHVyaW5nIHJlZ2lzdHJhdGlvblxyXG4gKiBcclxuICogUmVxdWVzdDpcclxuICoge1xyXG4gKiAgIFwiZW1haWxcIjogXCJ1c2VyQGV4YW1wbGUuY29tXCJcclxuICogfVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBcImFjY2Vzc1Rva2VuXCI6IFwiLi4uXCIsXHJcbiAqICAgXCJyZWZyZXNoVG9rZW5cIjogXCIuLi5cIixcclxuICogICBcImV4cGlyZXNJblwiOiAzNjAwLFxyXG4gKiAgIFwidXNlclwiOiB7XHJcbiAqICAgICBcInVzZXJJZFwiOiBcIi4uLlwiLFxyXG4gKiAgICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIixcclxuICogICAgIFwibmFtZVwiOiBcIlVzZXJcIlxyXG4gKiAgIH1cclxuICogfVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgXHJcbiAgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsXHJcbiAgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kLFxyXG4gIEF1dGhGbG93VHlwZSxcclxuICBBZG1pbkdldFVzZXJDb21tYW5kXHJcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IEdldENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdBdXRvTG9naW4nKTtcclxuY29uc3QgY29nbml0b0NsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7IFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxufSk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxufSk7XHJcblxyXG5pbnRlcmZhY2UgQXV0b0xvZ2luUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIEF1dG9Mb2dpblJlc3BvbnNlIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG4gIHVzZXI6IHtcclxuICAgIHVzZXJJZDogc3RyaW5nO1xyXG4gICAgZW1haWw6IHN0cmluZztcclxuICAgIG5hbWU6IHN0cmluZztcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdBdXRvLWxvZ2luIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlcXVlc3Q6IEF1dG9Mb2dpblJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xyXG4gICAgaWYgKCFyZXF1ZXN0LmVtYWlsKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRU1BSUwnLCAnRW1haWwgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnQXV0by1sb2dnaW5nIGluIHVzZXInLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUcnkgdG8gZ2V0IHRoZSB0ZW1wb3JhcnkgcGFzc3dvcmQgZnJvbSBEeW5hbW9EQiAoc3RvcmVkIGR1cmluZyByZWdpc3RyYXRpb24pXHJcbiAgICBsZXQgdGVtcFBhc3N3b3JkID0gJ1Rlc3RQYXNzMTIzIUAjJzsgLy8gRmFsbGJhY2sgZm9yIGV4aXN0aW5nIHVzZXJzXHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJzVGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEVfTkFNRSB8fCAnbWlzcmEtdXNlcnMnO1xyXG4gICAgICBjb25zdCB1c2VyUmVjb3JkID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdXNlcnNUYWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7XHJcbiAgICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgIH1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKHVzZXJSZWNvcmQuSXRlbT8udGVtcFBhc3N3b3JkKSB7XHJcbiAgICAgICAgdGVtcFBhc3N3b3JkID0gdXNlclJlY29yZC5JdGVtLnRlbXBQYXNzd29yZDtcclxuICAgICAgICBsb2dnZXIuaW5mbygnUmV0cmlldmVkIHRlbXBvcmFyeSBwYXNzd29yZCBmcm9tIER5bmFtb0RCJywgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChkYkVycm9yKSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKCdDb3VsZCBub3QgcmV0cmlldmUgdGVtcCBwYXNzd29yZCBmcm9tIER5bmFtb0RCLCB1c2luZyBmYWxsYmFjaycsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVycm9yOiAoZGJFcnJvciBhcyBhbnkpLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIENvbnRpbnVlIHdpdGggZmFsbGJhY2sgcGFzc3dvcmRcclxuICAgIH1cclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGUgd2l0aCBDb2duaXRvIHVzaW5nIHRoZSB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCh7XHJcbiAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgQ2xpZW50SWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEISxcclxuICAgICAgQXV0aEZsb3c6IEF1dGhGbG93VHlwZS5BRE1JTl9OT19TUlBfQVVUSCxcclxuICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBQQVNTV09SRDogdGVtcFBhc3N3b3JkLFxyXG4gICAgICB9LFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIENoZWNrIGlmIGF1dGhlbnRpY2F0aW9uIHdhcyBzdWNjZXNzZnVsXHJcbiAgICBpZiAoIWF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdXRoZW50aWNhdGlvbiBmYWlsZWQgLSBubyB0b2tlbnMgcmV0dXJuZWQgZnJvbSBDb2duaXRvJyk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0F1dG8tbG9naW4gc3VjY2Vzc2Z1bCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEV4dHJhY3QgdXNlciBJRCBmcm9tIHRoZSBhY2Nlc3MgdG9rZW4gKHN1YiBjbGFpbSlcclxuICAgIGNvbnN0IGFjY2Vzc1Rva2VuUGFydHMgPSBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuIS5zcGxpdCgnLicpO1xyXG4gICAgbGV0IHVzZXJJZCA9IHJlcXVlc3QuZW1haWwuc3BsaXQoJ0AnKVswXTtcclxuICAgIGxldCB1c2VyTmFtZSA9ICdVc2VyJztcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcGF5bG9hZCA9IEpTT04ucGFyc2UoQnVmZmVyLmZyb20oYWNjZXNzVG9rZW5QYXJ0c1sxXSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCkpO1xyXG4gICAgICB1c2VySWQgPSBwYXlsb2FkLnN1YiB8fCB1c2VySWQ7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKCdDb3VsZCBub3QgZXh0cmFjdCB1c2VySWQgZnJvbSB0b2tlbicsIHsgY29ycmVsYXRpb25JZCB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBUcnkgdG8gZ2V0IHVzZXIgbmFtZSBmcm9tIENvZ25pdG9cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJJbmZvID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3QgbmFtZUF0dHIgPSB1c2VySW5mby5Vc2VyQXR0cmlidXRlcz8uZmluZChhdHRyID0+IGF0dHIuTmFtZSA9PT0gJ25hbWUnKTtcclxuICAgICAgaWYgKG5hbWVBdHRyPy5WYWx1ZSkge1xyXG4gICAgICAgIHVzZXJOYW1lID0gbmFtZUF0dHIuVmFsdWU7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0NvdWxkIG5vdCByZXRyaWV2ZSB1c2VyIG5hbWUgZnJvbSBDb2duaXRvJywgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBBdXRvTG9naW5SZXNwb25zZSA9IHtcclxuICAgICAgYWNjZXNzVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW4hLFxyXG4gICAgICByZWZyZXNoVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuISxcclxuICAgICAgZXhwaXJlc0luOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkV4cGlyZXNJbiB8fCAzNjAwLFxyXG4gICAgICB1c2VyOiB7XHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIG5hbWU6IHVzZXJOYW1lXHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0F1dG8tbG9naW4gZmFpbGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDaGVjayBpZiBpdCdzIGFuIGF1dGhlbnRpY2F0aW9uIGVycm9yXHJcbiAgICBpZiAoZXJyb3IubWVzc2FnZT8uaW5jbHVkZXMoJ0luY29ycmVjdCB1c2VybmFtZSBvciBwYXNzd29yZCcpIHx8IFxyXG4gICAgICAgIGVycm9yLm5hbWUgPT09ICdOb3RBdXRob3JpemVkRXhjZXB0aW9uJykge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdJTlZBTElEX0NSRURFTlRJQUxTJywgJ0luY29ycmVjdCB1c2VybmFtZSBvciBwYXNzd29yZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0FVVE9fTE9HSU5fRkFJTEVEJywgZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGF1dG8tbG9naW4nLCBjb3JyZWxhdGlvbklkKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogU3RhbmRhcmQgZXJyb3IgcmVzcG9uc2VcclxuICovXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBjb3JyZWxhdGlvbklkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufVxyXG4iXX0=
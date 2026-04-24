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
            const userRecord = await dynamoClient.send(new client_dynamodb_1.GetCommand({
                TableName: usersTableName,
                Key: {
                    email: { S: request.email }
                }
            }));
            if (userRecord.Item?.tempPassword?.S) {
                tempPassword = userRecord.Item.tempPassword.S;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sb2dpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dG8tbG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUJHOzs7QUFHSCxnR0FLbUQ7QUFDbkQsOERBQXNFO0FBQ3RFLDJDQUErQztBQUMvQywrQ0FBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pDLE1BQU0sYUFBYSxHQUFHLElBQUksZ0VBQTZCLENBQUM7SUFDdEQsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7Q0FDOUMsQ0FBQyxDQUFDO0FBQ0gsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO0lBQ3RDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQWlCSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkcsTUFBTSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtRQUN6QyxhQUFhO1FBQ2IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1FBQ2hCLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVTtLQUN6QixDQUFDLENBQUM7SUFFSCxJQUFJLENBQUM7UUFDSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZG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QXV0by1Mb2dpbiBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIExvZ3MgaW4gdXNlciBhZnRlciBPVFAgdmVyaWZpY2F0aW9uIHdpdGhvdXQgcmVxdWlyaW5nIHBhc3N3b3JkXHJcbiAqIFRoaXMgaXMgdXNlZCBpbiB0aGUgYXV0b21hdGVkIGF1dGhlbnRpY2F0aW9uIGZsb3dcclxuICogXHJcbiAqIEZvciBleGlzdGluZyB1c2VyczogVXNlcyB0aGUgdGVtcG9yYXJ5IHBhc3N3b3JkIHNldCBkdXJpbmcgcmVnaXN0cmF0aW9uXHJcbiAqIEZvciBuZXcgdXNlcnM6IFVzZXMgdGhlIHRlbXBvcmFyeSBwYXNzd29yZCBnZW5lcmF0ZWQgZHVyaW5nIHJlZ2lzdHJhdGlvblxyXG4gKiBcclxuICogUmVxdWVzdDpcclxuICoge1xyXG4gKiAgIFwiZW1haWxcIjogXCJ1c2VyQGV4YW1wbGUuY29tXCJcclxuICogfVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBcImFjY2Vzc1Rva2VuXCI6IFwiLi4uXCIsXHJcbiAqICAgXCJyZWZyZXNoVG9rZW5cIjogXCIuLi5cIixcclxuICogICBcImV4cGlyZXNJblwiOiAzNjAwLFxyXG4gKiAgIFwidXNlclwiOiB7XHJcbiAqICAgICBcInVzZXJJZFwiOiBcIi4uLlwiLFxyXG4gKiAgICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIixcclxuICogICAgIFwibmFtZVwiOiBcIlVzZXJcIlxyXG4gKiAgIH1cclxuICogfVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgXHJcbiAgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsXHJcbiAgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kLFxyXG4gIEF1dGhGbG93VHlwZSxcclxuICBBZG1pbkdldFVzZXJDb21tYW5kXHJcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgR2V0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IGNvcnNIZWFkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29ycyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ0F1dG9Mb2dpbicpO1xyXG5jb25zdCBjb2duaXRvQ2xpZW50ID0gbmV3IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50KHsgXHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIFxyXG59KTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgXHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIFxyXG59KTtcclxuXHJcbmludGVyZmFjZSBBdXRvTG9naW5SZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQXV0b0xvZ2luUmVzcG9uc2Uge1xyXG4gIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuOiBzdHJpbmc7XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbiAgdXNlcjoge1xyXG4gICAgdXNlcklkOiBzdHJpbmc7XHJcbiAgICBlbWFpbDogc3RyaW5nO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGV2ZW50LmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgXHJcbiAgbG9nZ2VyLmluZm8oJ0F1dG8tbG9naW4gcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgbWV0aG9kOiBldmVudC5odHRwTWV0aG9kXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogQXV0b0xvZ2luUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIXJlcXVlc3QuZW1haWwpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19FTUFJTCcsICdFbWFpbCBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdBdXRvLWxvZ2dpbmcgaW4gdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRyeSB0byBnZXQgdGhlIHRlbXBvcmFyeSBwYXNzd29yZCBmcm9tIER5bmFtb0RCIChzdG9yZWQgZHVyaW5nIHJlZ2lzdHJhdGlvbilcclxuICAgIGxldCB0ZW1wUGFzc3dvcmQgPSAnVGVzdFBhc3MxMjMhQCMnOyAvLyBGYWxsYmFjayBmb3IgZXhpc3RpbmcgdXNlcnNcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlcnNUYWJsZU5hbWUgPSBwcm9jZXNzLmVudi5VU0VSU19UQUJMRV9OQU1FIHx8ICdtaXNyYS11c2Vycyc7XHJcbiAgICAgIGNvbnN0IHVzZXJSZWNvcmQgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB1c2Vyc1RhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHtcclxuICAgICAgICAgIGVtYWlsOiB7IFM6IHJlcXVlc3QuZW1haWwgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKHVzZXJSZWNvcmQuSXRlbT8udGVtcFBhc3N3b3JkPy5TKSB7XHJcbiAgICAgICAgdGVtcFBhc3N3b3JkID0gdXNlclJlY29yZC5JdGVtLnRlbXBQYXNzd29yZC5TO1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdSZXRyaWV2ZWQgdGVtcG9yYXJ5IHBhc3N3b3JkIGZyb20gRHluYW1vREInLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGRiRXJyb3IpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0NvdWxkIG5vdCByZXRyaWV2ZSB0ZW1wIHBhc3N3b3JkIGZyb20gRHluYW1vREIsIHVzaW5nIGZhbGxiYWNrJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZXJyb3I6IChkYkVycm9yIGFzIGFueSkubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgLy8gQ29udGludWUgd2l0aCBmYWxsYmFjayBwYXNzd29yZFxyXG4gICAgfVxyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0ZSB3aXRoIENvZ25pdG8gdXNpbmcgdGhlIHRlbXBvcmFyeSBwYXNzd29yZFxyXG4gICAgY29uc3QgYXV0aFJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICBBdXRoRmxvdzogQXV0aEZsb3dUeXBlLkFETUlOX05PX1NSUF9BVVRILFxyXG4gICAgICBBdXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIFBBU1NXT1JEOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgIH0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgYXV0aGVudGljYXRpb24gd2FzIHN1Y2Nlc3NmdWxcclxuICAgIGlmICghYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZCAtIG5vIHRva2VucyByZXR1cm5lZCBmcm9tIENvZ25pdG8nKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnQXV0by1sb2dpbiBzdWNjZXNzZnVsJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXh0cmFjdCB1c2VyIElEIGZyb20gdGhlIGFjY2VzcyB0b2tlbiAoc3ViIGNsYWltKVxyXG4gICAgY29uc3QgYWNjZXNzVG9rZW5QYXJ0cyA9IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW4hLnNwbGl0KCcuJyk7XHJcbiAgICBsZXQgdXNlcklkID0gcmVxdWVzdC5lbWFpbC5zcGxpdCgnQCcpWzBdO1xyXG4gICAgbGV0IHVzZXJOYW1lID0gJ1VzZXInO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShhY2Nlc3NUb2tlblBhcnRzWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKSk7XHJcbiAgICAgIHVzZXJJZCA9IHBheWxvYWQuc3ViIHx8IHVzZXJJZDtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0NvdWxkIG5vdCBleHRyYWN0IHVzZXJJZCBmcm9tIHRva2VuJywgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRyeSB0byBnZXQgdXNlciBuYW1lIGZyb20gQ29nbml0b1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlckluZm8gPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBuYW1lQXR0ciA9IHVzZXJJbmZvLlVzZXJBdHRyaWJ1dGVzPy5maW5kKGF0dHIgPT4gYXR0ci5OYW1lID09PSAnbmFtZScpO1xyXG4gICAgICBpZiAobmFtZUF0dHI/LlZhbHVlKSB7XHJcbiAgICAgICAgdXNlck5hbWUgPSBuYW1lQXR0ci5WYWx1ZTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBsb2dnZXIud2FybignQ291bGQgbm90IHJldHJpZXZlIHVzZXIgbmFtZSBmcm9tIENvZ25pdG8nLCB7IGNvcnJlbGF0aW9uSWQgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IEF1dG9Mb2dpblJlc3BvbnNlID0ge1xyXG4gICAgICBhY2Nlc3NUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5BY2Nlc3NUb2tlbiEsXHJcbiAgICAgIHJlZnJlc2hUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5SZWZyZXNoVG9rZW4hLFxyXG4gICAgICBleHBpcmVzSW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuRXhwaXJlc0luIHx8IDM2MDAsXHJcbiAgICAgIHVzZXI6IHtcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgbmFtZTogdXNlck5hbWVcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignQXV0by1sb2dpbiBmYWlsZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBzdGFjazogZXJyb3Iuc3RhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENoZWNrIGlmIGl0J3MgYW4gYXV0aGVudGljYXRpb24gZXJyb3JcclxuICAgIGlmIChlcnJvci5tZXNzYWdlPy5pbmNsdWRlcygnSW5jb3JyZWN0IHVzZXJuYW1lIG9yIHBhc3N3b3JkJykgfHwgXHJcbiAgICAgICAgZXJyb3IubmFtZSA9PT0gJ05vdEF1dGhvcml6ZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ0lOVkFMSURfQ1JFREVOVElBTFMnLCAnSW5jb3JyZWN0IHVzZXJuYW1lIG9yIHBhc3N3b3JkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQVVUT19MT0dJTl9GQUlMRUQnLCBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gYXV0by1sb2dpbicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZyxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59XHJcbiJdfQ==
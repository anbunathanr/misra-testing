"use strict";
/**
 * Verify OTP Email Lambda Function
 *
 * Verifies the OTP provided by the user and authenticates them
 * Returns JWT tokens for authenticated session
 *
 * Request:
 * {
 *   "email": "user@example.com",
 *   "otp": "123456"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "accessToken": "jwt-token",
 *   "refreshToken": "refresh-token",
 *   "user": {
 *     "email": "user@example.com",
 *     "userId": "cognito-user-id"
 *   },
 *   "expiresIn": 3600
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const validation_1 = require("../../utils/validation");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('VerifyOTPEmail');
const cognito = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    try {
        logger.info('Verify OTP request received', {
            correlationId,
            path: event.path,
            method: event.httpMethod
        });
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
        }
        const request = JSON.parse(event.body);
        // Validate inputs
        if (!request.email) {
            return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
        }
        if (!(0, validation_1.validateEmail)(request.email)) {
            return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address', correlationId);
        }
        if (!request.otp) {
            return errorResponse(400, 'MISSING_OTP', 'OTP is required', correlationId);
        }
        if (!/^\d{6}$/.test(request.otp)) {
            return errorResponse(400, 'INVALID_OTP_FORMAT', 'OTP must be a 6-digit number', correlationId);
        }
        logger.info('Verifying OTP', {
            correlationId,
            email: request.email
        });
        const otpTableName = process.env.OTP_TABLE_NAME || 'OTP';
        // Query OTP from DynamoDB using EmailIndex GSI
        let otpRecord = null;
        try {
            const queryResponse = await dynamoClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: otpTableName,
                IndexName: 'EmailIndex',
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: {
                    ':email': request.email
                },
                ScanIndexForward: false, // Get most recent first
                Limit: 1
            }));
            if (queryResponse.Items && queryResponse.Items.length > 0) {
                otpRecord = queryResponse.Items[0];
            }
        }
        catch (dbError) {
            logger.error('Failed to query OTP from DynamoDB', {
                correlationId,
                email: request.email,
                error: dbError.message
            });
            return errorResponse(500, 'OTP_LOOKUP_FAILED', 'Failed to verify OTP', correlationId);
        }
        // Check if OTP exists
        if (!otpRecord) {
            logger.warn('OTP not found', {
                correlationId,
                email: request.email
            });
            return errorResponse(404, 'OTP_NOT_FOUND', 'OTP not found or has expired', correlationId);
        }
        // Check if OTP has expired
        const now = Math.floor(Date.now() / 1000);
        if (otpRecord.ttl && otpRecord.ttl < now) {
            logger.warn('OTP expired', {
                correlationId,
                email: request.email,
                ttl: otpRecord.ttl,
                now
            });
            // Delete expired OTP
            try {
                await dynamoClient.send(new lib_dynamodb_1.DeleteCommand({
                    TableName: otpTableName,
                    Key: {
                        otpId: otpRecord.otpId
                    }
                }));
            }
            catch (e) {
                logger.warn('Failed to delete expired OTP', { correlationId });
            }
            return errorResponse(401, 'OTP_EXPIRED', 'OTP has expired. Please request a new one.', correlationId);
        }
        // Verify OTP matches
        if (otpRecord.otp !== request.otp) {
            logger.warn('OTP mismatch', {
                correlationId,
                email: request.email
            });
            // Increment attempt counter
            const attempts = (otpRecord.attempts || 0) + 1;
            const maxAttempts = otpRecord.maxAttempts || 5;
            if (attempts >= maxAttempts) {
                logger.warn('Max OTP attempts exceeded', {
                    correlationId,
                    email: request.email,
                    attempts,
                    maxAttempts
                });
                // Delete OTP after max attempts
                try {
                    await dynamoClient.send(new lib_dynamodb_1.DeleteCommand({
                        TableName: otpTableName,
                        Key: {
                            otpId: otpRecord.otpId
                        }
                    }));
                }
                catch (e) {
                    logger.warn('Failed to delete OTP after max attempts', { correlationId });
                }
                return errorResponse(429, 'TOO_MANY_ATTEMPTS', 'Too many failed OTP attempts. Please request a new OTP.', correlationId);
            }
            return errorResponse(401, 'INVALID_OTP', `Invalid OTP. ${maxAttempts - attempts} attempts remaining.`, correlationId);
        }
        logger.info('OTP verified successfully', {
            correlationId,
            email: request.email
        });
        // Get user from Cognito
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        if (!userPoolId) {
            logger.error('COGNITO_USER_POOL_ID not configured', { correlationId });
            return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error', correlationId);
        }
        let userId;
        try {
            const userResponse = await cognito.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: userPoolId,
                Username: request.email
            }));
            userId = userResponse.Username || request.email;
        }
        catch (error) {
            if (error.name === 'UserNotFoundException') {
                logger.warn('User not found in Cognito', {
                    correlationId,
                    email: request.email
                });
                return errorResponse(404, 'USER_NOT_FOUND', 'User not found', correlationId);
            }
            throw error;
        }
        logger.info('User found in Cognito', {
            correlationId,
            email: request.email,
            userId
        });
        // Get temporary password from DynamoDB (stored during registration)
        const usersTableName = process.env.USERS_TABLE_NAME || 'misra-users';
        let tempPassword = null;
        try {
            const userQuery = await dynamoClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: usersTableName,
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: {
                    ':email': request.email
                },
                Limit: 1
            }));
            if (userQuery.Items && userQuery.Items.length > 0) {
                tempPassword = userQuery.Items[0].tempPassword;
            }
        }
        catch (e) {
            logger.warn('Failed to retrieve user credentials from DynamoDB', {
                correlationId,
                email: request.email
            });
        }
        // Authenticate user with Cognito
        let authTokens = null;
        if (tempPassword) {
            try {
                const authResponse = await cognito.send(new client_cognito_identity_provider_1.AdminInitiateAuthCommand({
                    UserPoolId: userPoolId,
                    ClientId: process.env.COGNITO_CLIENT_ID || '',
                    AuthFlow: 'ADMIN_NO_SRP_AUTH',
                    AuthParameters: {
                        USERNAME: request.email,
                        PASSWORD: tempPassword
                    }
                }));
                authTokens = authResponse.AuthenticationResult;
                logger.info('User authenticated successfully', {
                    correlationId,
                    email: request.email
                });
            }
            catch (authError) {
                logger.error('Failed to authenticate user', {
                    correlationId,
                    email: request.email,
                    error: authError.message
                });
                return errorResponse(401, 'AUTHENTICATION_FAILED', 'Failed to authenticate user', correlationId);
            }
        }
        else {
            logger.warn('No temporary password found, cannot authenticate', {
                correlationId,
                email: request.email
            });
            return errorResponse(500, 'AUTH_SETUP_INCOMPLETE', 'User authentication setup incomplete', correlationId);
        }
        // Delete OTP after successful verification
        try {
            await dynamoClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: otpTableName,
                Key: {
                    otpId: otpRecord.otpId
                }
            }));
            logger.info('OTP deleted after verification', {
                correlationId,
                email: request.email
            });
        }
        catch (e) {
            logger.warn('Failed to delete OTP after verification', {
                correlationId,
                email: request.email
            });
        }
        logger.info('OTP verification completed successfully', {
            correlationId,
            email: request.email,
            userId
        });
        const response = {
            success: true,
            accessToken: authTokens.AccessToken,
            refreshToken: authTokens.RefreshToken,
            user: {
                email: request.email,
                userId
            },
            expiresIn: authTokens.ExpiresIn || 3600
        };
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        logger.error('OTP verification failed', {
            correlationId,
            error: error.message,
            name: error.name,
            stack: error.stack
        });
        return errorResponse(500, 'VERIFICATION_FAILED', error.message || 'Failed to verify OTP', correlationId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LW90cC1lbWFpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZlcmlmeS1vdHAtZW1haWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXVCRzs7O0FBR0gsZ0dBQXlJO0FBQ3pJLDhEQUEwRDtBQUMxRCx3REFBb0U7QUFDcEUsdURBQXVEO0FBQ3ZELDJDQUErQztBQUMvQywrQ0FBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDOUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxnRUFBNkIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ3JHLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBa0JwRixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkcsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtZQUN6QyxhQUFhO1lBQ2IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVTtTQUN6QixDQUFDLENBQUM7UUFFSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxF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QUFFO2dCQUNuQyxTQUFTLEVBQUUsYUFBYTthQUN6QjtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBWZXJpZnkgT1RQIEVtYWlsIExhbWJkYSBGdW5jdGlvblxyXG4gKiBcclxuICogVmVyaWZpZXMgdGhlIE9UUCBwcm92aWRlZCBieSB0aGUgdXNlciBhbmQgYXV0aGVudGljYXRlcyB0aGVtXHJcbiAqIFJldHVybnMgSldUIHRva2VucyBmb3IgYXV0aGVudGljYXRlZCBzZXNzaW9uXHJcbiAqIFxyXG4gKiBSZXF1ZXN0OlxyXG4gKiB7XHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIixcclxuICogICBcIm90cFwiOiBcIjEyMzQ1NlwiXHJcbiAqIH1cclxuICogXHJcbiAqIFJlc3BvbnNlOlxyXG4gKiB7XHJcbiAqICAgXCJzdWNjZXNzXCI6IHRydWUsXHJcbiAqICAgXCJhY2Nlc3NUb2tlblwiOiBcImp3dC10b2tlblwiLFxyXG4gKiAgIFwicmVmcmVzaFRva2VuXCI6IFwicmVmcmVzaC10b2tlblwiLFxyXG4gKiAgIFwidXNlclwiOiB7XHJcbiAqICAgICBcImVtYWlsXCI6IFwidXNlckBleGFtcGxlLmNvbVwiLFxyXG4gKiAgICAgXCJ1c2VySWRcIjogXCJjb2duaXRvLXVzZXItaWRcIlxyXG4gKiAgIH0sXHJcbiAqICAgXCJleHBpcmVzSW5cIjogMzYwMFxyXG4gKiB9XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgQWRtaW5HZXRVc2VyQ29tbWFuZCwgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IFF1ZXJ5Q29tbWFuZCwgRGVsZXRlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IHZhbGlkYXRlRW1haWwgfSBmcm9tICcuLi8uLi91dGlscy92YWxpZGF0aW9uJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignVmVyaWZ5T1RQRW1haWwnKTtcclxuY29uc3QgY29nbml0byA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xyXG5cclxuaW50ZXJmYWNlIFZlcmlmeU9UUFJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgb3RwOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBWZXJpZnlPVFBSZXNwb25zZSB7XHJcbiAgc3VjY2VzczogYm9vbGVhbjtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIHVzZXI6IHtcclxuICAgIGVtYWlsOiBzdHJpbmc7XHJcbiAgICB1c2VySWQ6IHN0cmluZztcclxuICB9O1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBsb2dnZXIuaW5mbygnVmVyaWZ5IE9UUCByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgICBtZXRob2Q6IGV2ZW50Lmh0dHBNZXRob2RcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBWZXJpZnlPVFBSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBpbnB1dHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0VNQUlMJywgJ0VtYWlsIGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF2YWxpZGF0ZUVtYWlsKHJlcXVlc3QuZW1haWwpKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfRU1BSUwnLCAnUGxlYXNlIHByb3ZpZGUgYSB2YWxpZCBlbWFpbCBhZGRyZXNzJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFyZXF1ZXN0Lm90cCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX09UUCcsICdPVFAgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIS9eXFxkezZ9JC8udGVzdChyZXF1ZXN0Lm90cCkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9PVFBfRk9STUFUJywgJ09UUCBtdXN0IGJlIGEgNi1kaWdpdCBudW1iZXInLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnVmVyaWZ5aW5nIE9UUCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IG90cFRhYmxlTmFtZSA9IHByb2Nlc3MuZW52Lk9UUF9UQUJMRV9OQU1FIHx8ICdPVFAnO1xyXG5cclxuICAgIC8vIFF1ZXJ5IE9UUCBmcm9tIER5bmFtb0RCIHVzaW5nIEVtYWlsSW5kZXggR1NJXHJcbiAgICBsZXQgb3RwUmVjb3JkOiBhbnkgPSBudWxsO1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcXVlcnlSZXNwb25zZSA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogb3RwVGFibGVOYW1lLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ0VtYWlsSW5kZXgnLFxyXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdlbWFpbCA9IDplbWFpbCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzplbWFpbCc6IHJlcXVlc3QuZW1haWxcclxuICAgICAgICB9LFxyXG4gICAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLCAvLyBHZXQgbW9zdCByZWNlbnQgZmlyc3RcclxuICAgICAgICBMaW1pdDogMVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAocXVlcnlSZXNwb25zZS5JdGVtcyAmJiBxdWVyeVJlc3BvbnNlLkl0ZW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBvdHBSZWNvcmQgPSBxdWVyeVJlc3BvbnNlLkl0ZW1zWzBdO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChkYkVycm9yKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHF1ZXJ5IE9UUCBmcm9tIER5bmFtb0RCJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgZXJyb3I6IChkYkVycm9yIGFzIGFueSkubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnT1RQX0xPT0tVUF9GQUlMRUQnLCAnRmFpbGVkIHRvIHZlcmlmeSBPVFAnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiBPVFAgZXhpc3RzXHJcbiAgICBpZiAoIW90cFJlY29yZCkge1xyXG4gICAgICBsb2dnZXIud2FybignT1RQIG5vdCBmb3VuZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDQsICdPVFBfTk9UX0ZPVU5EJywgJ09UUCBub3QgZm91bmQgb3IgaGFzIGV4cGlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiBPVFAgaGFzIGV4cGlyZWRcclxuICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xyXG4gICAgaWYgKG90cFJlY29yZC50dGwgJiYgb3RwUmVjb3JkLnR0bCA8IG5vdykge1xyXG4gICAgICBsb2dnZXIud2FybignT1RQIGV4cGlyZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICB0dGw6IG90cFJlY29yZC50dGwsXHJcbiAgICAgICAgbm93XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgLy8gRGVsZXRlIGV4cGlyZWQgT1RQXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IERlbGV0ZUNvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiBvdHBUYWJsZU5hbWUsXHJcbiAgICAgICAgICBLZXk6IHtcclxuICAgICAgICAgICAgb3RwSWQ6IG90cFJlY29yZC5vdHBJZFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gZGVsZXRlIGV4cGlyZWQgT1RQJywgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdPVFBfRVhQSVJFRCcsICdPVFAgaGFzIGV4cGlyZWQuIFBsZWFzZSByZXF1ZXN0IGEgbmV3IG9uZS4nLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWZXJpZnkgT1RQIG1hdGNoZXNcclxuICAgIGlmIChvdHBSZWNvcmQub3RwICE9PSByZXF1ZXN0Lm90cCkge1xyXG4gICAgICBsb2dnZXIud2FybignT1RQIG1pc21hdGNoJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBJbmNyZW1lbnQgYXR0ZW1wdCBjb3VudGVyXHJcbiAgICAgIGNvbnN0IGF0dGVtcHRzID0gKG90cFJlY29yZC5hdHRlbXB0cyB8fCAwKSArIDE7XHJcbiAgICAgIGNvbnN0IG1heEF0dGVtcHRzID0gb3RwUmVjb3JkLm1heEF0dGVtcHRzIHx8IDU7XHJcblxyXG4gICAgICBpZiAoYXR0ZW1wdHMgPj0gbWF4QXR0ZW1wdHMpIHtcclxuICAgICAgICBsb2dnZXIud2FybignTWF4IE9UUCBhdHRlbXB0cyBleGNlZWRlZCcsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICAgIGF0dGVtcHRzLFxyXG4gICAgICAgICAgbWF4QXR0ZW1wdHNcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gRGVsZXRlIE9UUCBhZnRlciBtYXggYXR0ZW1wdHNcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IERlbGV0ZUNvbW1hbmQoe1xyXG4gICAgICAgICAgICBUYWJsZU5hbWU6IG90cFRhYmxlTmFtZSxcclxuICAgICAgICAgICAgS2V5OiB7XHJcbiAgICAgICAgICAgICAgb3RwSWQ6IG90cFJlY29yZC5vdHBJZFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byBkZWxldGUgT1RQIGFmdGVyIG1heCBhdHRlbXB0cycsIHsgY29ycmVsYXRpb25JZCB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQyOSwgJ1RPT19NQU5ZX0FUVEVNUFRTJywgJ1RvbyBtYW55IGZhaWxlZCBPVFAgYXR0ZW1wdHMuIFBsZWFzZSByZXF1ZXN0IGEgbmV3IE9UUC4nLCBjb3JyZWxhdGlvbklkKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnSU5WQUxJRF9PVFAnLCBgSW52YWxpZCBPVFAuICR7bWF4QXR0ZW1wdHMgLSBhdHRlbXB0c30gYXR0ZW1wdHMgcmVtYWluaW5nLmAsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdPVFAgdmVyaWZpZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IHVzZXIgZnJvbSBDb2duaXRvXHJcbiAgICBjb25zdCB1c2VyUG9vbElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQ7XHJcbiAgICBpZiAoIXVzZXJQb29sSWQpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdDT0dOSVRPX1VTRVJfUE9PTF9JRCBub3QgY29uZmlndXJlZCcsIHsgY29ycmVsYXRpb25JZCB9IGFzIGFueSk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0NPTkZJR19FUlJPUicsICdBdXRoZW50aWNhdGlvbiBzZXJ2aWNlIGNvbmZpZ3VyYXRpb24gZXJyb3InLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgdXNlcklkOiBzdHJpbmc7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1c2VyUmVzcG9uc2UgPSBhd2FpdCBjb2duaXRvLnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSkpO1xyXG4gICAgICB1c2VySWQgPSB1c2VyUmVzcG9uc2UuVXNlcm5hbWUgfHwgcmVxdWVzdC5lbWFpbDtcclxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgaWYgKGVycm9yLm5hbWUgPT09ICdVc2VyTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1VzZXIgbm90IGZvdW5kIGluIENvZ25pdG8nLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDQsICdVU0VSX05PVF9GT1VORCcsICdVc2VyIG5vdCBmb3VuZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdVc2VyIGZvdW5kIGluIENvZ25pdG8nLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCB0ZW1wb3JhcnkgcGFzc3dvcmQgZnJvbSBEeW5hbW9EQiAoc3RvcmVkIGR1cmluZyByZWdpc3RyYXRpb24pXHJcbiAgICBjb25zdCB1c2Vyc1RhYmxlTmFtZSA9IHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFX05BTUUgfHwgJ21pc3JhLXVzZXJzJztcclxuICAgIGxldCB0ZW1wUGFzc3dvcmQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJRdWVyeSA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdXNlcnNUYWJsZU5hbWUsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ2VtYWlsID0gOmVtYWlsJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmVtYWlsJzogcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgTGltaXQ6IDFcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKHVzZXJRdWVyeS5JdGVtcyAmJiB1c2VyUXVlcnkuSXRlbXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHRlbXBQYXNzd29yZCA9IHVzZXJRdWVyeS5JdGVtc1swXS50ZW1wUGFzc3dvcmQ7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byByZXRyaWV2ZSB1c2VyIGNyZWRlbnRpYWxzIGZyb20gRHluYW1vREInLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGUgdXNlciB3aXRoIENvZ25pdG9cclxuICAgIGxldCBhdXRoVG9rZW5zOiBhbnkgPSBudWxsO1xyXG4gICAgaWYgKHRlbXBQYXNzd29yZCkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGF1dGhSZXNwb25zZSA9IGF3YWl0IGNvZ25pdG8uc2VuZChuZXcgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgICAgIFVzZXJQb29sSWQ6IHVzZXJQb29sSWQsXHJcbiAgICAgICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQgfHwgJycsXHJcbiAgICAgICAgICBBdXRoRmxvdzogJ0FETUlOX05PX1NSUF9BVVRIJyxcclxuICAgICAgICAgIEF1dGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgICAgICBQQVNTV09SRDogdGVtcFBhc3N3b3JkXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBhdXRoVG9rZW5zID0gYXV0aFJlc3BvbnNlLkF1dGhlbnRpY2F0aW9uUmVzdWx0O1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdVc2VyIGF1dGhlbnRpY2F0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGF1dGhFcnJvcjogYW55KSB7XHJcbiAgICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gYXV0aGVudGljYXRlIHVzZXInLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgICBlcnJvcjogYXV0aEVycm9yLm1lc3NhZ2VcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdBVVRIRU5USUNBVElPTl9GQUlMRUQnLCAnRmFpbGVkIHRvIGF1dGhlbnRpY2F0ZSB1c2VyJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKCdObyB0ZW1wb3JhcnkgcGFzc3dvcmQgZm91bmQsIGNhbm5vdCBhdXRoZW50aWNhdGUnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQVVUSF9TRVRVUF9JTkNPTVBMRVRFJywgJ1VzZXIgYXV0aGVudGljYXRpb24gc2V0dXAgaW5jb21wbGV0ZScsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERlbGV0ZSBPVFAgYWZ0ZXIgc3VjY2Vzc2Z1bCB2ZXJpZmljYXRpb25cclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBEZWxldGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IG90cFRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHtcclxuICAgICAgICAgIG90cElkOiBvdHBSZWNvcmQub3RwSWRcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ09UUCBkZWxldGVkIGFmdGVyIHZlcmlmaWNhdGlvbicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIGRlbGV0ZSBPVFAgYWZ0ZXIgdmVyaWZpY2F0aW9uJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ09UUCB2ZXJpZmljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIHVzZXJJZFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IFZlcmlmeU9UUFJlc3BvbnNlID0ge1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICBhY2Nlc3NUb2tlbjogYXV0aFRva2Vucy5BY2Nlc3NUb2tlbixcclxuICAgICAgcmVmcmVzaFRva2VuOiBhdXRoVG9rZW5zLlJlZnJlc2hUb2tlbixcclxuICAgICAgdXNlcjoge1xyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIHVzZXJJZFxyXG4gICAgICB9LFxyXG4gICAgICBleHBpcmVzSW46IGF1dGhUb2tlbnMuRXhwaXJlc0luIHx8IDM2MDBcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ09UUCB2ZXJpZmljYXRpb24gZmFpbGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgbmFtZTogZXJyb3IubmFtZSxcclxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdWRVJJRklDQVRJT05fRkFJTEVEJywgZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIHZlcmlmeSBPVFAnLCBjb3JyZWxhdGlvbklkKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogU3RhbmRhcmQgZXJyb3IgcmVzcG9uc2VcclxuICovXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBjb3JyZWxhdGlvbklkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufVxyXG4iXX0=
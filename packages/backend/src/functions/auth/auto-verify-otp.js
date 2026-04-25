"use strict";
/**
 * Auto Verify OTP Lambda Function
 *
 * Automatically fetches OTP from email and verifies it without user intervention
 * This creates a seamless authentication experience
 *
 * Request:
 * {
 *   "email": "user@example.com"
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
const logger = (0, logger_1.createLogger)('AutoVerifyOTP');
const cognito = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    try {
        logger.info('Auto verify OTP request received', {
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
        logger.info('Starting automatic OTP verification', {
            correlationId,
            email: request.email
        });
        const otpTableName = process.env.OTP_TABLE_NAME || 'OTP';
        // Wait for OTP to be generated and stored (polling approach)
        let otpRecord = null;
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max wait
        while (!otpRecord && attempts < maxAttempts) {
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
                    break;
                }
            }
            catch (dbError) {
                logger.warn('Failed to query OTP from DynamoDB', {
                    correlationId,
                    email: request.email,
                    attempt: attempts + 1,
                    error: dbError.message
                });
            }
            // Wait 1 second before next attempt
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        // Check if OTP was found
        if (!otpRecord) {
            logger.warn('OTP not found after polling', {
                correlationId,
                email: request.email,
                attempts
            });
            return errorResponse(404, 'OTP_NOT_FOUND', 'OTP not found. Please ensure registration was completed.', correlationId);
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
            return errorResponse(401, 'OTP_EXPIRED', 'OTP has expired. Please register again.', correlationId);
        }
        logger.info('OTP found automatically', {
            correlationId,
            email: request.email,
            otpId: otpRecord.otpId
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
                logger.info('User authenticated automatically', {
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
            logger.info('OTP deleted after automatic verification', {
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
        logger.info('Automatic OTP verification completed successfully', {
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
        logger.error('Automatic OTP verification failed', {
            correlationId,
            error: error.message,
            name: error.name,
            stack: error.stack
        });
        return errorResponse(500, 'AUTO_VERIFICATION_FAILED', error.message || 'Failed to automatically verify OTP', correlationId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by12ZXJpZnktb3RwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0by12ZXJpZnktb3RwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXNCRzs7O0FBR0gsZ0dBQXlJO0FBQ3pJLDhEQUEwRDtBQUMxRCx3REFBb0U7QUFDcEUsdURBQXVEO0FBQ3ZELDJDQUErQztBQUMvQywrQ0FBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sT0FBTyxHQUFHLElBQUksZ0VBQTZCLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNyRyxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQWlCcEYsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5HLElBQUksQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEVBQUU7WUFDOUMsYUFBYTtZQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7U0FDekIsQ0FBQyxDQUFDO1FBRUgscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSww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QVMsRUFBRSxhQUFhO2FBQ3pCO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEF1dG8gVmVyaWZ5IE9UUCBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIEF1dG9tYXRpY2FsbHkgZmV0Y2hlcyBPVFAgZnJvbSBlbWFpbCBhbmQgdmVyaWZpZXMgaXQgd2l0aG91dCB1c2VyIGludGVydmVudGlvblxyXG4gKiBUaGlzIGNyZWF0ZXMgYSBzZWFtbGVzcyBhdXRoZW50aWNhdGlvbiBleHBlcmllbmNlXHJcbiAqIFxyXG4gKiBSZXF1ZXN0OlxyXG4gKiB7XHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIlxyXG4gKiB9XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIFwic3VjY2Vzc1wiOiB0cnVlLFxyXG4gKiAgIFwiYWNjZXNzVG9rZW5cIjogXCJqd3QtdG9rZW5cIixcclxuICogICBcInJlZnJlc2hUb2tlblwiOiBcInJlZnJlc2gtdG9rZW5cIixcclxuICogICBcInVzZXJcIjoge1xyXG4gKiAgICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIixcclxuICogICAgIFwidXNlcklkXCI6IFwiY29nbml0by11c2VyLWlkXCJcclxuICogICB9LFxyXG4gKiAgIFwiZXhwaXJlc0luXCI6IDM2MDBcclxuICogfVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIEFkbWluR2V0VXNlckNvbW1hbmQsIEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBRdWVyeUNvbW1hbmQsIERlbGV0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZUVtYWlsIH0gZnJvbSAnLi4vLi4vdXRpbHMvdmFsaWRhdGlvbic7XHJcbmltcG9ydCB7IGNvcnNIZWFkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29ycyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ0F1dG9WZXJpZnlPVFAnKTtcclxuY29uc3QgY29nbml0byA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xyXG5cclxuaW50ZXJmYWNlIEF1dG9WZXJpZnlPVFBSZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQXV0b1ZlcmlmeU9UUFJlc3BvbnNlIHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuOiBzdHJpbmc7XHJcbiAgdXNlcjoge1xyXG4gICAgZW1haWw6IHN0cmluZztcclxuICAgIHVzZXJJZDogc3RyaW5nO1xyXG4gIH07XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGV2ZW50LmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGxvZ2dlci5pbmZvKCdBdXRvIHZlcmlmeSBPVFAgcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgICAgbWV0aG9kOiBldmVudC5odHRwTWV0aG9kXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogQXV0b1ZlcmlmeU9UUFJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIGlucHV0c1xyXG4gICAgaWYgKCFyZXF1ZXN0LmVtYWlsKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRU1BSUwnLCAnRW1haWwgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXZhbGlkYXRlRW1haWwocmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9FTUFJTCcsICdQbGVhc2UgcHJvdmlkZSBhIHZhbGlkIGVtYWlsIGFkZHJlc3MnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgYXV0b21hdGljIE9UUCB2ZXJpZmljYXRpb24nLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBvdHBUYWJsZU5hbWUgPSBwcm9jZXNzLmVudi5PVFBfVEFCTEVfTkFNRSB8fCAnT1RQJztcclxuXHJcbiAgICAvLyBXYWl0IGZvciBPVFAgdG8gYmUgZ2VuZXJhdGVkIGFuZCBzdG9yZWQgKHBvbGxpbmcgYXBwcm9hY2gpXHJcbiAgICBsZXQgb3RwUmVjb3JkOiBhbnkgPSBudWxsO1xyXG4gICAgbGV0IGF0dGVtcHRzID0gMDtcclxuICAgIGNvbnN0IG1heEF0dGVtcHRzID0gMzA7IC8vIDMwIHNlY29uZHMgbWF4IHdhaXRcclxuICAgIFxyXG4gICAgd2hpbGUgKCFvdHBSZWNvcmQgJiYgYXR0ZW1wdHMgPCBtYXhBdHRlbXB0cykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHF1ZXJ5UmVzcG9uc2UgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogb3RwVGFibGVOYW1lLFxyXG4gICAgICAgICAgSW5kZXhOYW1lOiAnRW1haWxJbmRleCcsXHJcbiAgICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZW1haWwgPSA6ZW1haWwnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgICAnOmVtYWlsJzogcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLCAvLyBHZXQgbW9zdCByZWNlbnQgZmlyc3RcclxuICAgICAgICAgIExpbWl0OiAxXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBpZiAocXVlcnlSZXNwb25zZS5JdGVtcyAmJiBxdWVyeVJlc3BvbnNlLkl0ZW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIG90cFJlY29yZCA9IHF1ZXJ5UmVzcG9uc2UuSXRlbXNbMF07XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2ggKGRiRXJyb3IpIHtcclxuICAgICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHF1ZXJ5IE9UUCBmcm9tIER5bmFtb0RCJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgICAgYXR0ZW1wdDogYXR0ZW1wdHMgKyAxLFxyXG4gICAgICAgICAgZXJyb3I6IChkYkVycm9yIGFzIGFueSkubWVzc2FnZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBXYWl0IDEgc2Vjb25kIGJlZm9yZSBuZXh0IGF0dGVtcHRcclxuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcclxuICAgICAgYXR0ZW1wdHMrKztcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiBPVFAgd2FzIGZvdW5kXHJcbiAgICBpZiAoIW90cFJlY29yZCkge1xyXG4gICAgICBsb2dnZXIud2FybignT1RQIG5vdCBmb3VuZCBhZnRlciBwb2xsaW5nJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgYXR0ZW1wdHNcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwNCwgJ09UUF9OT1RfRk9VTkQnLCAnT1RQIG5vdCBmb3VuZC4gUGxlYXNlIGVuc3VyZSByZWdpc3RyYXRpb24gd2FzIGNvbXBsZXRlZC4nLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiBPVFAgaGFzIGV4cGlyZWRcclxuICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xyXG4gICAgaWYgKG90cFJlY29yZC50dGwgJiYgb3RwUmVjb3JkLnR0bCA8IG5vdykge1xyXG4gICAgICBsb2dnZXIud2FybignT1RQIGV4cGlyZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICB0dGw6IG90cFJlY29yZC50dGwsXHJcbiAgICAgICAgbm93XHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgLy8gRGVsZXRlIGV4cGlyZWQgT1RQXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IERlbGV0ZUNvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiBvdHBUYWJsZU5hbWUsXHJcbiAgICAgICAgICBLZXk6IHtcclxuICAgICAgICAgICAgb3RwSWQ6IG90cFJlY29yZC5vdHBJZFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gZGVsZXRlIGV4cGlyZWQgT1RQJywgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdPVFBfRVhQSVJFRCcsICdPVFAgaGFzIGV4cGlyZWQuIFBsZWFzZSByZWdpc3RlciBhZ2Fpbi4nLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnT1RQIGZvdW5kIGF1dG9tYXRpY2FsbHknLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICBvdHBJZDogb3RwUmVjb3JkLm90cElkXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZXQgdXNlciBmcm9tIENvZ25pdG9cclxuICAgIGNvbnN0IHVzZXJQb29sSWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRDtcclxuICAgIGlmICghdXNlclBvb2xJZCkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0NPR05JVE9fVVNFUl9QT09MX0lEIG5vdCBjb25maWd1cmVkJywgeyBjb3JyZWxhdGlvbklkIH0gYXMgYW55KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQ09ORklHX0VSUk9SJywgJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgY29uZmlndXJhdGlvbiBlcnJvcicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCB1c2VySWQ6IHN0cmluZztcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJSZXNwb25zZSA9IGF3YWl0IGNvZ25pdG8uc2VuZChuZXcgQWRtaW5HZXRVc2VyQ29tbWFuZCh7XHJcbiAgICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KSk7XHJcbiAgICAgIHVzZXJJZCA9IHVzZXJSZXNwb25zZS5Vc2VybmFtZSB8fCByZXF1ZXN0LmVtYWlsO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICBsb2dnZXIud2FybignVXNlciBub3QgZm91bmQgaW4gQ29nbml0bycsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwNCwgJ1VTRVJfTk9UX0ZPVU5EJywgJ1VzZXIgbm90IGZvdW5kJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICAgIH1cclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1VzZXIgZm91bmQgaW4gQ29nbml0bycsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIHVzZXJJZFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IHRlbXBvcmFyeSBwYXNzd29yZCBmcm9tIER5bmFtb0RCIChzdG9yZWQgZHVyaW5nIHJlZ2lzdHJhdGlvbilcclxuICAgIGNvbnN0IHVzZXJzVGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEVfTkFNRSB8fCAnbWlzcmEtdXNlcnMnO1xyXG4gICAgbGV0IHRlbXBQYXNzd29yZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlclF1ZXJ5ID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB1c2Vyc1RhYmxlTmFtZSxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZW1haWwgPSA6ZW1haWwnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6ZW1haWwnOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBMaW1pdDogMVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAodXNlclF1ZXJ5Lkl0ZW1zICYmIHVzZXJRdWVyeS5JdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgdGVtcFBhc3N3b3JkID0gdXNlclF1ZXJ5Lkl0ZW1zWzBdLnRlbXBQYXNzd29yZDtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHJldHJpZXZlIHVzZXIgY3JlZGVudGlhbHMgZnJvbSBEeW5hbW9EQicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0ZSB1c2VyIHdpdGggQ29nbml0b1xyXG4gICAgbGV0IGF1dGhUb2tlbnM6IGFueSA9IG51bGw7XHJcbiAgICBpZiAodGVtcFBhc3N3b3JkKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgYXV0aFJlc3BvbnNlID0gYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQoe1xyXG4gICAgICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgICAgIENsaWVudElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX0NMSUVOVF9JRCB8fCAnJyxcclxuICAgICAgICAgIEF1dGhGbG93OiAnQURNSU5fTk9fU1JQX0FVVEgnLFxyXG4gICAgICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgVVNFUk5BTUU6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgICAgIFBBU1NXT1JEOiB0ZW1wUGFzc3dvcmRcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIGF1dGhUb2tlbnMgPSBhdXRoUmVzcG9uc2UuQXV0aGVudGljYXRpb25SZXN1bHQ7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1VzZXIgYXV0aGVudGljYXRlZCBhdXRvbWF0aWNhbGx5Jywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGF1dGhFcnJvcjogYW55KSB7XHJcbiAgICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gYXV0aGVudGljYXRlIHVzZXInLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgICBlcnJvcjogYXV0aEVycm9yLm1lc3NhZ2VcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdBVVRIRU5USUNBVElPTl9GQUlMRUQnLCAnRmFpbGVkIHRvIGF1dGhlbnRpY2F0ZSB1c2VyJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKCdObyB0ZW1wb3JhcnkgcGFzc3dvcmQgZm91bmQsIGNhbm5vdCBhdXRoZW50aWNhdGUnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQVVUSF9TRVRVUF9JTkNPTVBMRVRFJywgJ1VzZXIgYXV0aGVudGljYXRpb24gc2V0dXAgaW5jb21wbGV0ZScsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERlbGV0ZSBPVFAgYWZ0ZXIgc3VjY2Vzc2Z1bCB2ZXJpZmljYXRpb25cclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBEZWxldGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IG90cFRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHtcclxuICAgICAgICAgIG90cElkOiBvdHBSZWNvcmQub3RwSWRcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ09UUCBkZWxldGVkIGFmdGVyIGF1dG9tYXRpYyB2ZXJpZmljYXRpb24nLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byBkZWxldGUgT1RQIGFmdGVyIHZlcmlmaWNhdGlvbicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdBdXRvbWF0aWMgT1RQIHZlcmlmaWNhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgdXNlcklkXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogQXV0b1ZlcmlmeU9UUFJlc3BvbnNlID0ge1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICBhY2Nlc3NUb2tlbjogYXV0aFRva2Vucy5BY2Nlc3NUb2tlbixcclxuICAgICAgcmVmcmVzaFRva2VuOiBhdXRoVG9rZW5zLlJlZnJlc2hUb2tlbixcclxuICAgICAgdXNlcjoge1xyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIHVzZXJJZFxyXG4gICAgICB9LFxyXG4gICAgICBleHBpcmVzSW46IGF1dGhUb2tlbnMuRXhwaXJlc0luIHx8IDM2MDBcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0F1dG9tYXRpYyBPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIG5hbWU6IGVycm9yLm5hbWUsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQVVUT19WRVJJRklDQVRJT05fRkFJTEVEJywgZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGF1dG9tYXRpY2FsbHkgdmVyaWZ5IE9UUCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZyxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59Il19
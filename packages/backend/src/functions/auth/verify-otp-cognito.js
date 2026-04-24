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
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const speakeasy = __importStar(require("speakeasy"));
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('VerifyOTPCognito');
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
const dynamoClient = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
// Standard demo password for all test accounts
const DEMO_PASSWORD = 'DemoPass123!@#';
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || 'unknown';
    logger.info('OTP verification request received', {
        correlationId,
        path: event.path,
        method: event.httpMethod
    });
    try {
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const request = JSON.parse(event.body);
        if (!request.email) {
            return errorResponse(400, 'MISSING_EMAIL', 'Email is required');
        }
        // If OTP code is provided, handle automatic verification with the OTP
        if (request.otp) {
            return await handleAutomaticTOTPVerificationWithOTP(request, correlationId);
        }
        // For autonomous workflow, handle automatic TOTP verification
        if (request.automaticVerification) {
            return await handleAutomaticTOTPVerification(request, correlationId);
        }
        // For manual workflow, handle standard MFA challenge
        return await handleManualTOTPVerification(request, correlationId);
    }
    catch (error) {
        logger.error('OTP verification failed', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
        return errorResponse(500, 'VERIFICATION_ERROR', 'OTP verification failed');
    }
};
exports.handler = handler;
/**
 * Handle automatic TOTP verification with provided OTP code
 * This is called when frontend provides an OTP code to verify
 * Works for both new users (MFA_SETUP) and existing users (SOFTWARE_TOKEN_MFA)
 */
async function handleAutomaticTOTPVerificationWithOTP(request, correlationId) {
    logger.info('Starting TOTP verification with provided OTP', {
        correlationId,
        email: request.email,
        hasSession: !!request.session
    });
    try {
        // Step 1: Initiate auth to get session
        // For existing users, we authenticate with email and password
        // For new users, we also authenticate with email and password
        const authResult = await cognitoClient.send(new client_cognito_identity_provider_1.AdminInitiateAuthCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            ClientId: process.env.COGNITO_CLIENT_ID,
            AuthFlow: client_cognito_identity_provider_1.AuthFlowType.ADMIN_NO_SRP_AUTH,
            AuthParameters: {
                USERNAME: request.email,
                PASSWORD: request.password || await generateTemporaryPassword(request.email),
            },
        }));
        logger.info('Auth initiated', {
            correlationId,
            email: request.email,
            challengeName: authResult.ChallengeName
        });
        // Step 2: Handle MFA_SETUP challenge if user needs TOTP setup
        if (authResult.ChallengeName === client_cognito_identity_provider_1.ChallengeNameType.MFA_SETUP) {
            logger.info('MFA setup required, associating software token', {
                correlationId,
                email: request.email
            });
            // Associate software token (get TOTP secret)
            const associateResult = await cognitoClient.send(new client_cognito_identity_provider_1.AssociateSoftwareTokenCommand({
                Session: authResult.Session,
            }));
            if (!associateResult.SecretCode) {
                throw new Error('Failed to get TOTP secret from Cognito');
            }
            logger.info('Software token associated', {
                correlationId,
                email: request.email
            });
            // Verify the software token with the provided OTP code
            const verifyResult = await cognitoClient.send(new client_cognito_identity_provider_1.VerifySoftwareTokenCommand({
                Session: authResult.Session,
                UserCode: request.otp,
            }));
            if (verifyResult.Status !== 'SUCCESS') {
                throw new Error(`TOTP verification failed: ${verifyResult.Status}`);
            }
            logger.info('TOTP code verified successfully', {
                correlationId,
                email: request.email
            });
            // Enable TOTP MFA for the user
            await cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserMFAPreferenceCommand({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: request.email,
                SoftwareTokenMfaSettings: {
                    Enabled: true,
                    PreferredMfa: true,
                },
            }));
            logger.info('TOTP MFA enabled successfully', {
                correlationId,
                email: request.email
            });
            // Continue with authentication using the new session
            const finalAuthResult = await cognitoClient.send(new client_cognito_identity_provider_1.RespondToAuthChallengeCommand({
                ClientId: process.env.COGNITO_CLIENT_ID,
                ChallengeName: client_cognito_identity_provider_1.ChallengeNameType.MFA_SETUP,
                Session: verifyResult.Session,
                ChallengeResponses: {
                    USERNAME: request.email,
                },
            }));
            return successResponse({
                success: true,
                accessToken: finalAuthResult.AuthenticationResult?.AccessToken,
                idToken: finalAuthResult.AuthenticationResult?.IdToken,
                refreshToken: finalAuthResult.AuthenticationResult?.RefreshToken,
                message: 'TOTP MFA setup completed successfully',
                nextStep: 'authenticated'
            });
        }
        // Step 3: Handle SOFTWARE_TOKEN_MFA challenge for existing TOTP users
        if (authResult.ChallengeName === client_cognito_identity_provider_1.ChallengeNameType.SOFTWARE_TOKEN_MFA) {
            logger.info('SOFTWARE_TOKEN_MFA challenge received', {
                correlationId,
                email: request.email
            });
            // Respond to the MFA challenge with the provided OTP code
            const challengeResult = await cognitoClient.send(new client_cognito_identity_provider_1.RespondToAuthChallengeCommand({
                ClientId: process.env.COGNITO_CLIENT_ID,
                ChallengeName: client_cognito_identity_provider_1.ChallengeNameType.SOFTWARE_TOKEN_MFA,
                Session: authResult.Session,
                ChallengeResponses: {
                    USERNAME: request.email,
                    SOFTWARE_TOKEN_MFA_CODE: request.otp,
                },
            }));
            return successResponse({
                success: true,
                accessToken: challengeResult.AuthenticationResult?.AccessToken,
                idToken: challengeResult.AuthenticationResult?.IdToken,
                refreshToken: challengeResult.AuthenticationResult?.RefreshToken,
                message: 'TOTP MFA verification completed successfully',
                nextStep: 'authenticated'
            });
        }
        // If no MFA challenge, user might already be authenticated
        if (authResult.AuthenticationResult) {
            return successResponse({
                success: true,
                accessToken: authResult.AuthenticationResult.AccessToken,
                idToken: authResult.AuthenticationResult.IdToken,
                refreshToken: authResult.AuthenticationResult.RefreshToken,
                message: 'Authentication completed (no MFA required)',
                nextStep: 'authenticated'
            });
        }
        throw new Error(`Unexpected auth state: ${authResult.ChallengeName || 'unknown'}`);
    }
    catch (error) {
        logger.error('TOTP verification with OTP failed', {
            correlationId,
            email: request.email,
            error: error.message
        });
        return errorResponse(400, 'OTP_VERIFICATION_FAILED', error.message);
    }
}
/**
 * Handle automatic TOTP verification for autonomous workflow
 * This sets up TOTP MFA and automatically generates/verifies codes
 */
async function handleAutomaticTOTPVerification(request, correlationId) {
    logger.info('Starting automatic TOTP verification', {
        correlationId,
        email: request.email
    });
    try {
        // Step 1: Initiate auth to get session
        const authResult = await cognitoClient.send(new client_cognito_identity_provider_1.AdminInitiateAuthCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            ClientId: process.env.COGNITO_CLIENT_ID,
            AuthFlow: client_cognito_identity_provider_1.AuthFlowType.ADMIN_NO_SRP_AUTH,
            AuthParameters: {
                USERNAME: request.email,
                PASSWORD: await generateTemporaryPassword(request.email), // Use stored temp password
            },
        }));
        // Step 2: Handle MFA_SETUP challenge if user needs TOTP setup
        if (authResult.ChallengeName === client_cognito_identity_provider_1.ChallengeNameType.MFA_SETUP) {
            logger.info('MFA setup required, associating software token', {
                correlationId,
                email: request.email
            });
            // Associate software token (get TOTP secret)
            const associateResult = await cognitoClient.send(new client_cognito_identity_provider_1.AssociateSoftwareTokenCommand({
                Session: authResult.Session,
            }));
            if (!associateResult.SecretCode) {
                throw new Error('Failed to get TOTP secret from Cognito');
            }
            // Generate TOTP code using the secret
            const totpCode = speakeasy.totp({
                secret: associateResult.SecretCode,
                encoding: 'base32',
                time: Math.floor(Date.now() / 1000)
            });
            logger.info('Generated TOTP code for verification', {
                correlationId,
                email: request.email,
                codeLength: totpCode.length
            });
            // Verify the software token
            const verifyResult = await cognitoClient.send(new client_cognito_identity_provider_1.VerifySoftwareTokenCommand({
                Session: authResult.Session,
                UserCode: totpCode,
            }));
            if (verifyResult.Status !== 'SUCCESS') {
                throw new Error(`TOTP verification failed: ${verifyResult.Status}`);
            }
            // Enable TOTP MFA for the user
            await cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserMFAPreferenceCommand({
                UserPoolId: process.env.COGNITO_USER_POOL_ID,
                Username: request.email,
                SoftwareTokenMfaSettings: {
                    Enabled: true,
                    PreferredMfa: true,
                },
            }));
            logger.info('TOTP MFA enabled successfully', {
                correlationId,
                email: request.email
            });
            // Continue with authentication using the new session
            const finalAuthResult = await cognitoClient.send(new client_cognito_identity_provider_1.RespondToAuthChallengeCommand({
                ClientId: process.env.COGNITO_CLIENT_ID,
                ChallengeName: client_cognito_identity_provider_1.ChallengeNameType.MFA_SETUP,
                Session: verifyResult.Session,
                ChallengeResponses: {
                    USERNAME: request.email,
                },
            }));
            return successResponse({
                success: true,
                accessToken: finalAuthResult.AuthenticationResult?.AccessToken,
                idToken: finalAuthResult.AuthenticationResult?.IdToken,
                refreshToken: finalAuthResult.AuthenticationResult?.RefreshToken,
                message: 'TOTP MFA setup completed successfully',
                nextStep: 'authenticated'
            });
        }
        // Step 3: Handle SOFTWARE_TOKEN_MFA challenge for existing TOTP users
        if (authResult.ChallengeName === client_cognito_identity_provider_1.ChallengeNameType.SOFTWARE_TOKEN_MFA) {
            logger.info('SOFTWARE_TOKEN_MFA challenge received', {
                correlationId,
                email: request.email
            });
            // Get user's TOTP secret (this would be stored securely in Cognito)
            // For autonomous workflow, we need to generate the TOTP code server-side
            const totpCode = await generateTOTPCodeForUser(request.email, correlationId);
            // Respond to the MFA challenge
            const challengeResult = await cognitoClient.send(new client_cognito_identity_provider_1.RespondToAuthChallengeCommand({
                ClientId: process.env.COGNITO_CLIENT_ID,
                ChallengeName: client_cognito_identity_provider_1.ChallengeNameType.SOFTWARE_TOKEN_MFA,
                Session: authResult.Session,
                ChallengeResponses: {
                    USERNAME: request.email,
                    SOFTWARE_TOKEN_MFA_CODE: totpCode,
                },
            }));
            return successResponse({
                success: true,
                accessToken: challengeResult.AuthenticationResult?.AccessToken,
                idToken: challengeResult.AuthenticationResult?.IdToken,
                refreshToken: challengeResult.AuthenticationResult?.RefreshToken,
                message: 'TOTP MFA verification completed successfully',
                nextStep: 'authenticated'
            });
        }
        // If no MFA challenge, user might already be authenticated
        if (authResult.AuthenticationResult) {
            return successResponse({
                success: true,
                accessToken: authResult.AuthenticationResult.AccessToken,
                idToken: authResult.AuthenticationResult.IdToken,
                refreshToken: authResult.AuthenticationResult.RefreshToken,
                message: 'Authentication completed (no MFA required)',
                nextStep: 'authenticated'
            });
        }
        throw new Error(`Unexpected auth state: ${authResult.ChallengeName || 'unknown'}`);
    }
    catch (error) {
        logger.error('Automatic TOTP verification failed', {
            correlationId,
            email: request.email,
            error: error.message
        });
        return errorResponse(400, 'AUTO_TOTP_FAILED', error.message);
    }
}
/**
 * Handle manual TOTP verification (for standard user workflow)
 */
async function handleManualTOTPVerification(request, correlationId) {
    // This would handle manual OTP entry by users
    // Implementation depends on the specific manual workflow requirements
    return errorResponse(501, 'NOT_IMPLEMENTED', 'Manual TOTP verification not yet implemented');
}
/**
 * Generate TOTP code for a user (server-side generation for autonomous workflow)
 * In production, this would retrieve the user's TOTP secret securely
 */
async function generateTOTPCodeForUser(email, correlationId) {
    // NOTE: This is a simplified implementation
    // In production, you would:
    // 1. Retrieve the user's TOTP secret from secure storage (Cognito stores this internally)
    // 2. Use the secret to generate the current TOTP code
    // 3. Handle time synchronization and window tolerance
    logger.info('Generating TOTP code for user', {
        correlationId,
        email
    });
    // For now, we'll use a placeholder implementation
    // The actual secret would be retrieved from Cognito's internal storage
    const secret = await getStoredTOTPSecret(email);
    const totpCode = speakeasy.totp({
        secret: secret,
        encoding: 'base32',
        time: Math.floor(Date.now() / 1000)
    });
    logger.info('TOTP code generated successfully', {
        correlationId,
        email,
        codeLength: totpCode.length
    });
    return totpCode;
}
/**
 * Retrieve stored TOTP secret for a user
 * This is a placeholder - in production, Cognito manages TOTP secrets internally
 */
async function getStoredTOTPSecret(email) {
    // In the actual implementation, this would:
    // 1. Query Cognito to get the user's MFA settings
    // 2. Extract the TOTP secret (if accessible)
    // 3. Return the secret for code generation
    // For now, return a placeholder secret
    // This needs to be replaced with actual Cognito integration
    return 'PLACEHOLDER_SECRET_FROM_COGNITO';
}
/**
 * Generate temporary password for user (used in autonomous workflow)
 */
async function generateTemporaryPassword(email) {
    // Retrieve the temporary password from DynamoDB that was stored during registration
    try {
        const usersTableName = process.env.USERS_TABLE_NAME || 'misra-users';
        const userRecord = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
            TableName: usersTableName,
            Key: {
                email: email
            }
        }));
        if (userRecord.Item?.tempPassword) {
            return userRecord.Item.tempPassword;
        }
    }
    catch (error) {
        logger.warn('Could not retrieve password from DynamoDB', {
            email,
            error: error.message
        });
    }
    // Fallback to demo password if retrieval fails
    return DEMO_PASSWORD;
}
function successResponse(data) {
    return {
        statusCode: 200,
        headers: cors_1.corsHeaders,
        body: JSON.stringify(data)
    };
}
function errorResponse(statusCode, code, message) {
    return {
        statusCode,
        headers: cors_1.corsHeaders,
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: Math.random().toString(36).substring(7)
            }
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LW90cC1jb2duaXRvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmVyaWZ5LW90cC1jb2duaXRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGdHQVVtRDtBQUNuRCw4REFBMEQ7QUFDMUQsd0RBQW1EO0FBQ25ELHFEQUF1QztBQUN2QywyQ0FBK0M7QUFDL0MsK0NBQWtEO0FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ2hELE1BQU0sYUFBYSxHQUFHLElBQUksZ0VBQTZCLENBQUM7SUFDdEQsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7Q0FDOUMsQ0FBQyxDQUFDO0FBQ0gsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO0lBQ3RDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQUVILCtDQUErQztBQUMvQyxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQztBQXNCaEMsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLFNBQVMsQ0FBQztJQUVyRSxNQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFO1FBQy9DLGFBQWE7UUFDYixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7UUFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxVQUFVO0tBQ3pCLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ3hF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LENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBcclxuICBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCxcclxuICBBc3NvY2lhdGVTb2Z0d2FyZVRva2VuQ29tbWFuZCxcclxuICBWZXJpZnlTb2Z0d2FyZVRva2VuQ29tbWFuZCxcclxuICBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCxcclxuICBJbml0aWF0ZUF1dGhDb21tYW5kLFxyXG4gIEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCxcclxuICBBZG1pblNldFVzZXJNRkFQcmVmZXJlbmNlQ29tbWFuZCxcclxuICBDaGFsbGVuZ2VOYW1lVHlwZSxcclxuICBBdXRoRmxvd1R5cGVcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgR2V0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIHNwZWFrZWFzeSBmcm9tICdzcGVha2Vhc3knO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdWZXJpZnlPVFBDb2duaXRvJyk7XHJcbmNvbnN0IGNvZ25pdG9DbGllbnQgPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoeyBcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgXHJcbn0pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyBcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgXHJcbn0pO1xyXG5cclxuLy8gU3RhbmRhcmQgZGVtbyBwYXNzd29yZCBmb3IgYWxsIHRlc3QgYWNjb3VudHNcclxuY29uc3QgREVNT19QQVNTV09SRCA9ICdEZW1vUGFzczEyMyFAIyc7XHJcblxyXG5pbnRlcmZhY2UgVmVyaWZ5T1RQUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvdHA/OiBzdHJpbmc7IC8vIE9UUCBjb2RlIGZyb20gZnJvbnRlbmRcclxuICBwYXNzd29yZD86IHN0cmluZzsgLy8gUGFzc3dvcmQgZm9yIGF1dGhlbnRpY2F0aW9uXHJcbiAgc2Vzc2lvbj86IHN0cmluZzsgLy8gQ29nbml0byBzZXNzaW9uIGZyb20gcHJldmlvdXMgYXV0aCBzdGVwXHJcbiAgY2hhbGxlbmdlTmFtZT86IHN0cmluZzsgLy8gVHlwZSBvZiBNRkEgY2hhbGxlbmdlXHJcbiAgYXV0b21hdGljVmVyaWZpY2F0aW9uPzogYm9vbGVhbjsgLy8gRmxhZyBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVmVyaWZ5T1RQUmVzcG9uc2Uge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgYWNjZXNzVG9rZW4/OiBzdHJpbmc7XHJcbiAgaWRUb2tlbj86IHN0cmluZztcclxuICByZWZyZXNoVG9rZW4/OiBzdHJpbmc7XHJcbiAgc2Vzc2lvbj86IHN0cmluZztcclxuICBjaGFsbGVuZ2VOYW1lPzogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBuZXh0U3RlcD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBjb3JyZWxhdGlvbklkID0gZXZlbnQuaGVhZGVyc1snWC1Db3JyZWxhdGlvbi1JRCddIHx8ICd1bmtub3duJztcclxuICBcclxuICBsb2dnZXIuaW5mbygnT1RQIHZlcmlmaWNhdGlvbiByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICBtZXRob2Q6IGV2ZW50Lmh0dHBNZXRob2RcclxuICB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogVmVyaWZ5T1RQUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgaWYgKCFyZXF1ZXN0LmVtYWlsKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRU1BSUwnLCAnRW1haWwgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBPVFAgY29kZSBpcyBwcm92aWRlZCwgaGFuZGxlIGF1dG9tYXRpYyB2ZXJpZmljYXRpb24gd2l0aCB0aGUgT1RQXHJcbiAgICBpZiAocmVxdWVzdC5vdHApIHtcclxuICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZUF1dG9tYXRpY1RPVFBWZXJpZmljYXRpb25XaXRoT1RQKHJlcXVlc3QsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvciBhdXRvbm9tb3VzIHdvcmtmbG93LCBoYW5kbGUgYXV0b21hdGljIFRPVFAgdmVyaWZpY2F0aW9uXHJcbiAgICBpZiAocmVxdWVzdC5hdXRvbWF0aWNWZXJpZmljYXRpb24pIHtcclxuICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZUF1dG9tYXRpY1RPVFBWZXJpZmljYXRpb24ocmVxdWVzdCwgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRm9yIG1hbnVhbCB3b3JrZmxvdywgaGFuZGxlIHN0YW5kYXJkIE1GQSBjaGFsbGVuZ2VcclxuICAgIHJldHVybiBhd2FpdCBoYW5kbGVNYW51YWxUT1RQVmVyaWZpY2F0aW9uKHJlcXVlc3QsIGNvcnJlbGF0aW9uSWQpO1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ09UUCB2ZXJpZmljYXRpb24gZmFpbGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdWRVJJRklDQVRJT05fRVJST1InLCAnT1RQIHZlcmlmaWNhdGlvbiBmYWlsZWQnKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogSGFuZGxlIGF1dG9tYXRpYyBUT1RQIHZlcmlmaWNhdGlvbiB3aXRoIHByb3ZpZGVkIE9UUCBjb2RlXHJcbiAqIFRoaXMgaXMgY2FsbGVkIHdoZW4gZnJvbnRlbmQgcHJvdmlkZXMgYW4gT1RQIGNvZGUgdG8gdmVyaWZ5XHJcbiAqIFdvcmtzIGZvciBib3RoIG5ldyB1c2VycyAoTUZBX1NFVFVQKSBhbmQgZXhpc3RpbmcgdXNlcnMgKFNPRlRXQVJFX1RPS0VOX01GQSlcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUF1dG9tYXRpY1RPVFBWZXJpZmljYXRpb25XaXRoT1RQKFxyXG4gIHJlcXVlc3Q6IFZlcmlmeU9UUFJlcXVlc3QsIFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdTdGFydGluZyBUT1RQIHZlcmlmaWNhdGlvbiB3aXRoIHByb3ZpZGVkIE9UUCcsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgIGhhc1Nlc3Npb246ICEhcmVxdWVzdC5zZXNzaW9uXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBTdGVwIDE6IEluaXRpYXRlIGF1dGggdG8gZ2V0IHNlc3Npb25cclxuICAgIC8vIEZvciBleGlzdGluZyB1c2Vycywgd2UgYXV0aGVudGljYXRlIHdpdGggZW1haWwgYW5kIHBhc3N3b3JkXHJcbiAgICAvLyBGb3IgbmV3IHVzZXJzLCB3ZSBhbHNvIGF1dGhlbnRpY2F0ZSB3aXRoIGVtYWlsIGFuZCBwYXNzd29yZFxyXG4gICAgY29uc3QgYXV0aFJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICBBdXRoRmxvdzogQXV0aEZsb3dUeXBlLkFETUlOX05PX1NSUF9BVVRILFxyXG4gICAgICBBdXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIFBBU1NXT1JEOiByZXF1ZXN0LnBhc3N3b3JkIHx8IGF3YWl0IGdlbmVyYXRlVGVtcG9yYXJ5UGFzc3dvcmQocmVxdWVzdC5lbWFpbCksXHJcbiAgICAgIH0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0F1dGggaW5pdGlhdGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgY2hhbGxlbmdlTmFtZTogYXV0aFJlc3VsdC5DaGFsbGVuZ2VOYW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdGVwIDI6IEhhbmRsZSBNRkFfU0VUVVAgY2hhbGxlbmdlIGlmIHVzZXIgbmVlZHMgVE9UUCBzZXR1cFxyXG4gICAgaWYgKGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gQ2hhbGxlbmdlTmFtZVR5cGUuTUZBX1NFVFVQKSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdNRkEgc2V0dXAgcmVxdWlyZWQsIGFzc29jaWF0aW5nIHNvZnR3YXJlIHRva2VuJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBc3NvY2lhdGUgc29mdHdhcmUgdG9rZW4gKGdldCBUT1RQIHNlY3JldClcclxuICAgICAgY29uc3QgYXNzb2NpYXRlUmVzdWx0ID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBBc3NvY2lhdGVTb2Z0d2FyZVRva2VuQ29tbWFuZCh7XHJcbiAgICAgICAgU2Vzc2lvbjogYXV0aFJlc3VsdC5TZXNzaW9uLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWFzc29jaWF0ZVJlc3VsdC5TZWNyZXRDb2RlKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2V0IFRPVFAgc2VjcmV0IGZyb20gQ29nbml0bycpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnU29mdHdhcmUgdG9rZW4gYXNzb2NpYXRlZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gVmVyaWZ5IHRoZSBzb2Z0d2FyZSB0b2tlbiB3aXRoIHRoZSBwcm92aWRlZCBPVFAgY29kZVxyXG4gICAgICBjb25zdCB2ZXJpZnlSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IFZlcmlmeVNvZnR3YXJlVG9rZW5Db21tYW5kKHtcclxuICAgICAgICBTZXNzaW9uOiBhdXRoUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgVXNlckNvZGU6IHJlcXVlc3Qub3RwISxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKHZlcmlmeVJlc3VsdC5TdGF0dXMgIT09ICdTVUNDRVNTJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVE9UUCB2ZXJpZmljYXRpb24gZmFpbGVkOiAke3ZlcmlmeVJlc3VsdC5TdGF0dXN9YCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIGNvZGUgdmVyaWZpZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBFbmFibGUgVE9UUCBNRkEgZm9yIHRoZSB1c2VyXHJcbiAgICAgIGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZUNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBTb2Z0d2FyZVRva2VuTWZhU2V0dGluZ3M6IHtcclxuICAgICAgICAgIEVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICBQcmVmZXJyZWRNZmE6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1RPVFAgTUZBIGVuYWJsZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBDb250aW51ZSB3aXRoIGF1dGhlbnRpY2F0aW9uIHVzaW5nIHRoZSBuZXcgc2Vzc2lvblxyXG4gICAgICBjb25zdCBmaW5hbEF1dGhSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IFJlc3BvbmRUb0F1dGhDaGFsbGVuZ2VDb21tYW5kKHtcclxuICAgICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICAgIENoYWxsZW5nZU5hbWU6IENoYWxsZW5nZU5hbWVUeXBlLk1GQV9TRVRVUCxcclxuICAgICAgICBTZXNzaW9uOiB2ZXJpZnlSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgICBDaGFsbGVuZ2VSZXNwb25zZXM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgYWNjZXNzVG9rZW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uQWNjZXNzVG9rZW4sXHJcbiAgICAgICAgaWRUb2tlbjogZmluYWxBdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5JZFRva2VuLFxyXG4gICAgICAgIHJlZnJlc2hUb2tlbjogZmluYWxBdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5SZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgbWVzc2FnZTogJ1RPVFAgTUZBIHNldHVwIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICAgIG5leHRTdGVwOiAnYXV0aGVudGljYXRlZCdcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RlcCAzOiBIYW5kbGUgU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSBmb3IgZXhpc3RpbmcgVE9UUCB1c2Vyc1xyXG4gICAgaWYgKGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gQ2hhbGxlbmdlTmFtZVR5cGUuU09GVFdBUkVfVE9LRU5fTUZBKSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdTT0ZUV0FSRV9UT0tFTl9NRkEgY2hhbGxlbmdlIHJlY2VpdmVkJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBSZXNwb25kIHRvIHRoZSBNRkEgY2hhbGxlbmdlIHdpdGggdGhlIHByb3ZpZGVkIE9UUCBjb2RlXHJcbiAgICAgIGNvbnN0IGNoYWxsZW5nZVJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgUmVzcG9uZFRvQXV0aENoYWxsZW5nZUNvbW1hbmQoe1xyXG4gICAgICAgIENsaWVudElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX0NMSUVOVF9JRCEsXHJcbiAgICAgICAgQ2hhbGxlbmdlTmFtZTogQ2hhbGxlbmdlTmFtZVR5cGUuU09GVFdBUkVfVE9LRU5fTUZBLFxyXG4gICAgICAgIFNlc3Npb246IGF1dGhSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgICBDaGFsbGVuZ2VSZXNwb25zZXM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgICAgU09GVFdBUkVfVE9LRU5fTUZBX0NPREU6IHJlcXVlc3Qub3RwISxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LkFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIGlkVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uSWRUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uUmVmcmVzaFRva2VuLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdUT1RQIE1GQSB2ZXJpZmljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgbmV4dFN0ZXA6ICdhdXRoZW50aWNhdGVkJ1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBubyBNRkEgY2hhbGxlbmdlLCB1c2VyIG1pZ2h0IGFscmVhZHkgYmUgYXV0aGVudGljYXRlZFxyXG4gICAgaWYgKGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQpIHtcclxuICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBhY2Nlc3NUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5BY2Nlc3NUb2tlbixcclxuICAgICAgICBpZFRva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LklkVG9rZW4sXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LlJlZnJlc2hUb2tlbixcclxuICAgICAgICBtZXNzYWdlOiAnQXV0aGVudGljYXRpb24gY29tcGxldGVkIChubyBNRkEgcmVxdWlyZWQpJyxcclxuICAgICAgICBuZXh0U3RlcDogJ2F1dGhlbnRpY2F0ZWQnXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBhdXRoIHN0YXRlOiAke2F1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSB8fCAndW5rbm93bid9YCk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignVE9UUCB2ZXJpZmljYXRpb24gd2l0aCBPVFAgZmFpbGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2VcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ09UUF9WRVJJRklDQVRJT05fRkFJTEVEJywgZXJyb3IubWVzc2FnZSk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIGF1dG9tYXRpYyBUT1RQIHZlcmlmaWNhdGlvbiBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG4gKiBUaGlzIHNldHMgdXAgVE9UUCBNRkEgYW5kIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVzL3ZlcmlmaWVzIGNvZGVzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVBdXRvbWF0aWNUT1RQVmVyaWZpY2F0aW9uKFxyXG4gIHJlcXVlc3Q6IFZlcmlmeU9UUFJlcXVlc3QsIFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdTdGFydGluZyBhdXRvbWF0aWMgVE9UUCB2ZXJpZmljYXRpb24nLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFN0ZXAgMTogSW5pdGlhdGUgYXV0aCB0byBnZXQgc2Vzc2lvblxyXG4gICAgY29uc3QgYXV0aFJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICBBdXRoRmxvdzogQXV0aEZsb3dUeXBlLkFETUlOX05PX1NSUF9BVVRILFxyXG4gICAgICBBdXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIFBBU1NXT1JEOiBhd2FpdCBnZW5lcmF0ZVRlbXBvcmFyeVBhc3N3b3JkKHJlcXVlc3QuZW1haWwpLCAvLyBVc2Ugc3RvcmVkIHRlbXAgcGFzc3dvcmRcclxuICAgICAgfSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBTdGVwIDI6IEhhbmRsZSBNRkFfU0VUVVAgY2hhbGxlbmdlIGlmIHVzZXIgbmVlZHMgVE9UUCBzZXR1cFxyXG4gICAgaWYgKGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gQ2hhbGxlbmdlTmFtZVR5cGUuTUZBX1NFVFVQKSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdNRkEgc2V0dXAgcmVxdWlyZWQsIGFzc29jaWF0aW5nIHNvZnR3YXJlIHRva2VuJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBBc3NvY2lhdGUgc29mdHdhcmUgdG9rZW4gKGdldCBUT1RQIHNlY3JldClcclxuICAgICAgY29uc3QgYXNzb2NpYXRlUmVzdWx0ID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBBc3NvY2lhdGVTb2Z0d2FyZVRva2VuQ29tbWFuZCh7XHJcbiAgICAgICAgU2Vzc2lvbjogYXV0aFJlc3VsdC5TZXNzaW9uLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIWFzc29jaWF0ZVJlc3VsdC5TZWNyZXRDb2RlKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2V0IFRPVFAgc2VjcmV0IGZyb20gQ29nbml0bycpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBUT1RQIGNvZGUgdXNpbmcgdGhlIHNlY3JldFxyXG4gICAgICBjb25zdCB0b3RwQ29kZSA9IHNwZWFrZWFzeS50b3RwKHtcclxuICAgICAgICBzZWNyZXQ6IGFzc29jaWF0ZVJlc3VsdC5TZWNyZXRDb2RlLFxyXG4gICAgICAgIGVuY29kaW5nOiAnYmFzZTMyJyxcclxuICAgICAgICB0aW1lOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdHZW5lcmF0ZWQgVE9UUCBjb2RlIGZvciB2ZXJpZmljYXRpb24nLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBjb2RlTGVuZ3RoOiB0b3RwQ29kZS5sZW5ndGhcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBWZXJpZnkgdGhlIHNvZnR3YXJlIHRva2VuXHJcbiAgICAgIGNvbnN0IHZlcmlmeVJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgVmVyaWZ5U29mdHdhcmVUb2tlbkNvbW1hbmQoe1xyXG4gICAgICAgIFNlc3Npb246IGF1dGhSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgICBVc2VyQ29kZTogdG90cENvZGUsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICh2ZXJpZnlSZXN1bHQuU3RhdHVzICE9PSAnU1VDQ0VTUycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZDogJHt2ZXJpZnlSZXN1bHQuU3RhdHVzfWApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBFbmFibGUgVE9UUCBNRkEgZm9yIHRoZSB1c2VyXHJcbiAgICAgIGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZUNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBTb2Z0d2FyZVRva2VuTWZhU2V0dGluZ3M6IHtcclxuICAgICAgICAgIEVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICBQcmVmZXJyZWRNZmE6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1RPVFAgTUZBIGVuYWJsZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBDb250aW51ZSB3aXRoIGF1dGhlbnRpY2F0aW9uIHVzaW5nIHRoZSBuZXcgc2Vzc2lvblxyXG4gICAgICBjb25zdCBmaW5hbEF1dGhSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IFJlc3BvbmRUb0F1dGhDaGFsbGVuZ2VDb21tYW5kKHtcclxuICAgICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICAgIENoYWxsZW5nZU5hbWU6IENoYWxsZW5nZU5hbWVUeXBlLk1GQV9TRVRVUCxcclxuICAgICAgICBTZXNzaW9uOiB2ZXJpZnlSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgICBDaGFsbGVuZ2VSZXNwb25zZXM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgYWNjZXNzVG9rZW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uQWNjZXNzVG9rZW4sXHJcbiAgICAgICAgaWRUb2tlbjogZmluYWxBdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5JZFRva2VuLFxyXG4gICAgICAgIHJlZnJlc2hUb2tlbjogZmluYWxBdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5SZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgbWVzc2FnZTogJ1RPVFAgTUZBIHNldHVwIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICAgIG5leHRTdGVwOiAnYXV0aGVudGljYXRlZCdcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RlcCAzOiBIYW5kbGUgU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSBmb3IgZXhpc3RpbmcgVE9UUCB1c2Vyc1xyXG4gICAgaWYgKGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gQ2hhbGxlbmdlTmFtZVR5cGUuU09GVFdBUkVfVE9LRU5fTUZBKSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdTT0ZUV0FSRV9UT0tFTl9NRkEgY2hhbGxlbmdlIHJlY2VpdmVkJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZXQgdXNlcidzIFRPVFAgc2VjcmV0ICh0aGlzIHdvdWxkIGJlIHN0b3JlZCBzZWN1cmVseSBpbiBDb2duaXRvKVxyXG4gICAgICAvLyBGb3IgYXV0b25vbW91cyB3b3JrZmxvdywgd2UgbmVlZCB0byBnZW5lcmF0ZSB0aGUgVE9UUCBjb2RlIHNlcnZlci1zaWRlXHJcbiAgICAgIGNvbnN0IHRvdHBDb2RlID0gYXdhaXQgZ2VuZXJhdGVUT1RQQ29kZUZvclVzZXIocmVxdWVzdC5lbWFpbCwgY29ycmVsYXRpb25JZCk7XHJcblxyXG4gICAgICAvLyBSZXNwb25kIHRvIHRoZSBNRkEgY2hhbGxlbmdlXHJcbiAgICAgIGNvbnN0IGNoYWxsZW5nZVJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgUmVzcG9uZFRvQXV0aENoYWxsZW5nZUNvbW1hbmQoe1xyXG4gICAgICAgIENsaWVudElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX0NMSUVOVF9JRCEsXHJcbiAgICAgICAgQ2hhbGxlbmdlTmFtZTogQ2hhbGxlbmdlTmFtZVR5cGUuU09GVFdBUkVfVE9LRU5fTUZBLFxyXG4gICAgICAgIFNlc3Npb246IGF1dGhSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgICBDaGFsbGVuZ2VSZXNwb25zZXM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgICAgU09GVFdBUkVfVE9LRU5fTUZBX0NPREU6IHRvdHBDb2RlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgYWNjZXNzVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uQWNjZXNzVG9rZW4sXHJcbiAgICAgICAgaWRUb2tlbjogY2hhbGxlbmdlUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5JZFRva2VuLFxyXG4gICAgICAgIHJlZnJlc2hUb2tlbjogY2hhbGxlbmdlUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5SZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgbWVzc2FnZTogJ1RPVFAgTUZBIHZlcmlmaWNhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgICBuZXh0U3RlcDogJ2F1dGhlbnRpY2F0ZWQnXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIG5vIE1GQSBjaGFsbGVuZ2UsIHVzZXIgbWlnaHQgYWxyZWFkeSBiZSBhdXRoZW50aWNhdGVkXHJcbiAgICBpZiAoYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIGlkVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdBdXRoZW50aWNhdGlvbiBjb21wbGV0ZWQgKG5vIE1GQSByZXF1aXJlZCknLFxyXG4gICAgICAgIG5leHRTdGVwOiAnYXV0aGVudGljYXRlZCdcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGF1dGggc3RhdGU6ICR7YXV0aFJlc3VsdC5DaGFsbGVuZ2VOYW1lIHx8ICd1bmtub3duJ31gKTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdBdXRvbWF0aWMgVE9UUCB2ZXJpZmljYXRpb24gZmFpbGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2VcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0FVVE9fVE9UUF9GQUlMRUQnLCBlcnJvci5tZXNzYWdlKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUgbWFudWFsIFRPVFAgdmVyaWZpY2F0aW9uIChmb3Igc3RhbmRhcmQgdXNlciB3b3JrZmxvdylcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZU1hbnVhbFRPVFBWZXJpZmljYXRpb24oXHJcbiAgcmVxdWVzdDogVmVyaWZ5T1RQUmVxdWVzdCwgXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XHJcbiAgXHJcbiAgLy8gVGhpcyB3b3VsZCBoYW5kbGUgbWFudWFsIE9UUCBlbnRyeSBieSB1c2Vyc1xyXG4gIC8vIEltcGxlbWVudGF0aW9uIGRlcGVuZHMgb24gdGhlIHNwZWNpZmljIG1hbnVhbCB3b3JrZmxvdyByZXF1aXJlbWVudHNcclxuICBcclxuICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDEsICdOT1RfSU1QTEVNRU5URUQnLCAnTWFudWFsIFRPVFAgdmVyaWZpY2F0aW9uIG5vdCB5ZXQgaW1wbGVtZW50ZWQnKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlIFRPVFAgY29kZSBmb3IgYSB1c2VyIChzZXJ2ZXItc2lkZSBnZW5lcmF0aW9uIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93KVxyXG4gKiBJbiBwcm9kdWN0aW9uLCB0aGlzIHdvdWxkIHJldHJpZXZlIHRoZSB1c2VyJ3MgVE9UUCBzZWNyZXQgc2VjdXJlbHlcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlVE9UUENvZGVGb3JVc2VyKGVtYWlsOiBzdHJpbmcsIGNvcnJlbGF0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgLy8gTk9URTogVGhpcyBpcyBhIHNpbXBsaWZpZWQgaW1wbGVtZW50YXRpb25cclxuICAvLyBJbiBwcm9kdWN0aW9uLCB5b3Ugd291bGQ6XHJcbiAgLy8gMS4gUmV0cmlldmUgdGhlIHVzZXIncyBUT1RQIHNlY3JldCBmcm9tIHNlY3VyZSBzdG9yYWdlIChDb2duaXRvIHN0b3JlcyB0aGlzIGludGVybmFsbHkpXHJcbiAgLy8gMi4gVXNlIHRoZSBzZWNyZXQgdG8gZ2VuZXJhdGUgdGhlIGN1cnJlbnQgVE9UUCBjb2RlXHJcbiAgLy8gMy4gSGFuZGxlIHRpbWUgc3luY2hyb25pemF0aW9uIGFuZCB3aW5kb3cgdG9sZXJhbmNlXHJcbiAgXHJcbiAgbG9nZ2VyLmluZm8oJ0dlbmVyYXRpbmcgVE9UUCBjb2RlIGZvciB1c2VyJywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIGVtYWlsXHJcbiAgfSk7XHJcblxyXG4gIC8vIEZvciBub3csIHdlJ2xsIHVzZSBhIHBsYWNlaG9sZGVyIGltcGxlbWVudGF0aW9uXHJcbiAgLy8gVGhlIGFjdHVhbCBzZWNyZXQgd291bGQgYmUgcmV0cmlldmVkIGZyb20gQ29nbml0bydzIGludGVybmFsIHN0b3JhZ2VcclxuICBjb25zdCBzZWNyZXQgPSBhd2FpdCBnZXRTdG9yZWRUT1RQU2VjcmV0KGVtYWlsKTtcclxuICBcclxuICBjb25zdCB0b3RwQ29kZSA9IHNwZWFrZWFzeS50b3RwKHtcclxuICAgIHNlY3JldDogc2VjcmV0LFxyXG4gICAgZW5jb2Rpbmc6ICdiYXNlMzInLFxyXG4gICAgdGltZTogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICB9KTtcclxuXHJcbiAgbG9nZ2VyLmluZm8oJ1RPVFAgY29kZSBnZW5lcmF0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIGVtYWlsLFxyXG4gICAgY29kZUxlbmd0aDogdG90cENvZGUubGVuZ3RoXHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB0b3RwQ29kZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHJpZXZlIHN0b3JlZCBUT1RQIHNlY3JldCBmb3IgYSB1c2VyXHJcbiAqIFRoaXMgaXMgYSBwbGFjZWhvbGRlciAtIGluIHByb2R1Y3Rpb24sIENvZ25pdG8gbWFuYWdlcyBUT1RQIHNlY3JldHMgaW50ZXJuYWxseVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZ2V0U3RvcmVkVE9UUFNlY3JldChlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAvLyBJbiB0aGUgYWN0dWFsIGltcGxlbWVudGF0aW9uLCB0aGlzIHdvdWxkOlxyXG4gIC8vIDEuIFF1ZXJ5IENvZ25pdG8gdG8gZ2V0IHRoZSB1c2VyJ3MgTUZBIHNldHRpbmdzXHJcbiAgLy8gMi4gRXh0cmFjdCB0aGUgVE9UUCBzZWNyZXQgKGlmIGFjY2Vzc2libGUpXHJcbiAgLy8gMy4gUmV0dXJuIHRoZSBzZWNyZXQgZm9yIGNvZGUgZ2VuZXJhdGlvblxyXG4gIFxyXG4gIC8vIEZvciBub3csIHJldHVybiBhIHBsYWNlaG9sZGVyIHNlY3JldFxyXG4gIC8vIFRoaXMgbmVlZHMgdG8gYmUgcmVwbGFjZWQgd2l0aCBhY3R1YWwgQ29nbml0byBpbnRlZ3JhdGlvblxyXG4gIHJldHVybiAnUExBQ0VIT0xERVJfU0VDUkVUX0ZST01fQ09HTklUTyc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSB0ZW1wb3JhcnkgcGFzc3dvcmQgZm9yIHVzZXIgKHVzZWQgaW4gYXV0b25vbW91cyB3b3JrZmxvdylcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlVGVtcG9yYXJ5UGFzc3dvcmQoZW1haWw6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgLy8gUmV0cmlldmUgdGhlIHRlbXBvcmFyeSBwYXNzd29yZCBmcm9tIER5bmFtb0RCIHRoYXQgd2FzIHN0b3JlZCBkdXJpbmcgcmVnaXN0cmF0aW9uXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHVzZXJzVGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEVfTkFNRSB8fCAnbWlzcmEtdXNlcnMnO1xyXG4gICAgY29uc3QgdXNlclJlY29yZCA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiB1c2Vyc1RhYmxlTmFtZSxcclxuICAgICAgS2V5OiB7XHJcbiAgICAgICAgZW1haWw6IGVtYWlsXHJcbiAgICAgIH1cclxuICAgIH0pKTtcclxuXHJcbiAgICBpZiAodXNlclJlY29yZC5JdGVtPy50ZW1wUGFzc3dvcmQpIHtcclxuICAgICAgcmV0dXJuIHVzZXJSZWNvcmQuSXRlbS50ZW1wUGFzc3dvcmQ7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxvZ2dlci53YXJuKCdDb3VsZCBub3QgcmV0cmlldmUgcGFzc3dvcmQgZnJvbSBEeW5hbW9EQicsIHtcclxuICAgICAgZW1haWwsXHJcbiAgICAgIGVycm9yOiAoZXJyb3IgYXMgYW55KS5tZXNzYWdlXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIEZhbGxiYWNrIHRvIGRlbW8gcGFzc3dvcmQgaWYgcmV0cmlldmFsIGZhaWxzXHJcbiAgcmV0dXJuIERFTU9fUEFTU1dPUkQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN1Y2Nlc3NSZXNwb25zZShkYXRhOiBWZXJpZnlPVFBSZXNwb25zZSk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSlcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKHN0YXR1c0NvZGU6IG51bWJlciwgY29kZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufSJdfQ==
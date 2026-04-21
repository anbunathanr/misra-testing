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
const speakeasy = __importStar(require("speakeasy"));
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('VerifyOTPCognito');
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
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
                time: Math.floor(Date.now() / 1000),
                window: 2, // Allow some time drift
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
        time: Math.floor(Date.now() / 1000),
        window: 2,
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
    // This would retrieve or generate a temporary password for the user
    // In the autonomous workflow, users are created with known temporary passwords
    return 'TempPass123!'; // Placeholder - should be retrieved from secure storage
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LW90cC1jb2duaXRvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmVyaWZ5LW90cC1jb2duaXRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGdHQVVtRDtBQUNuRCxxREFBdUM7QUFDdkMsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNoRCxNQUFNLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO0lBQ3RELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQW9CSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksU0FBUyxDQUFDO0lBRXJFLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUNBQW1DLEVBQUU7UUFDL0MsYUFBYTtRQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtRQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7S0FDekIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFxQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6RCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNs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QWEsQ0FBQyxVQUFrQixFQUFFLElBQVksRUFBRSxPQUFlO0lBQ3RFLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFLGtCQUFXO1FBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBcclxuICBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCxcclxuICBBc3NvY2lhdGVTb2Z0d2FyZVRva2VuQ29tbWFuZCxcclxuICBWZXJpZnlTb2Z0d2FyZVRva2VuQ29tbWFuZCxcclxuICBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCxcclxuICBJbml0aWF0ZUF1dGhDb21tYW5kLFxyXG4gIEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCxcclxuICBBZG1pblNldFVzZXJNRkFQcmVmZXJlbmNlQ29tbWFuZCxcclxuICBDaGFsbGVuZ2VOYW1lVHlwZSxcclxuICBBdXRoRmxvd1R5cGVcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCAqIGFzIHNwZWFrZWFzeSBmcm9tICdzcGVha2Vhc3knO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdWZXJpZnlPVFBDb2duaXRvJyk7XHJcbmNvbnN0IGNvZ25pdG9DbGllbnQgPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoeyBcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgXHJcbn0pO1xyXG5cclxuaW50ZXJmYWNlIFZlcmlmeU9UUFJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgc2Vzc2lvbj86IHN0cmluZzsgLy8gQ29nbml0byBzZXNzaW9uIGZyb20gcHJldmlvdXMgYXV0aCBzdGVwXHJcbiAgY2hhbGxlbmdlTmFtZT86IHN0cmluZzsgLy8gVHlwZSBvZiBNRkEgY2hhbGxlbmdlXHJcbiAgYXV0b21hdGljVmVyaWZpY2F0aW9uPzogYm9vbGVhbjsgLy8gRmxhZyBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVmVyaWZ5T1RQUmVzcG9uc2Uge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgYWNjZXNzVG9rZW4/OiBzdHJpbmc7XHJcbiAgaWRUb2tlbj86IHN0cmluZztcclxuICByZWZyZXNoVG9rZW4/OiBzdHJpbmc7XHJcbiAgc2Vzc2lvbj86IHN0cmluZztcclxuICBjaGFsbGVuZ2VOYW1lPzogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBuZXh0U3RlcD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBjb3JyZWxhdGlvbklkID0gZXZlbnQuaGVhZGVyc1snWC1Db3JyZWxhdGlvbi1JRCddIHx8ICd1bmtub3duJztcclxuICBcclxuICBsb2dnZXIuaW5mbygnT1RQIHZlcmlmaWNhdGlvbiByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICBtZXRob2Q6IGV2ZW50Lmh0dHBNZXRob2RcclxuICB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogVmVyaWZ5T1RQUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgaWYgKCFyZXF1ZXN0LmVtYWlsKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRU1BSUwnLCAnRW1haWwgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGb3IgYXV0b25vbW91cyB3b3JrZmxvdywgaGFuZGxlIGF1dG9tYXRpYyBUT1RQIHZlcmlmaWNhdGlvblxyXG4gICAgaWYgKHJlcXVlc3QuYXV0b21hdGljVmVyaWZpY2F0aW9uKSB7XHJcbiAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVBdXRvbWF0aWNUT1RQVmVyaWZpY2F0aW9uKHJlcXVlc3QsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvciBtYW51YWwgd29ya2Zsb3csIGhhbmRsZSBzdGFuZGFyZCBNRkEgY2hhbGxlbmdlXHJcbiAgICByZXR1cm4gYXdhaXQgaGFuZGxlTWFudWFsVE9UUFZlcmlmaWNhdGlvbihyZXF1ZXN0LCBjb3JyZWxhdGlvbklkKTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnVkVSSUZJQ0FUSU9OX0VSUk9SJywgJ09UUCB2ZXJpZmljYXRpb24gZmFpbGVkJyk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEhhbmRsZSBhdXRvbWF0aWMgVE9UUCB2ZXJpZmljYXRpb24gZm9yIGF1dG9ub21vdXMgd29ya2Zsb3dcclxuICogVGhpcyBzZXRzIHVwIFRPVFAgTUZBIGFuZCBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlcy92ZXJpZmllcyBjb2Rlc1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQXV0b21hdGljVE9UUFZlcmlmaWNhdGlvbihcclxuICByZXF1ZXN0OiBWZXJpZnlPVFBSZXF1ZXN0LCBcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBcclxuICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgYXV0b21hdGljIFRPVFAgdmVyaWZpY2F0aW9uJywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBTdGVwIDE6IEluaXRpYXRlIGF1dGggdG8gZ2V0IHNlc3Npb25cclxuICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCh7XHJcbiAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgQ2xpZW50SWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEISxcclxuICAgICAgQXV0aEZsb3c6IEF1dGhGbG93VHlwZS5BRE1JTl9OT19TUlBfQVVUSCxcclxuICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBQQVNTV09SRDogYXdhaXQgZ2VuZXJhdGVUZW1wb3JhcnlQYXNzd29yZChyZXF1ZXN0LmVtYWlsKSwgLy8gVXNlIHN0b3JlZCB0ZW1wIHBhc3N3b3JkXHJcbiAgICAgIH0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gU3RlcCAyOiBIYW5kbGUgTUZBX1NFVFVQIGNoYWxsZW5nZSBpZiB1c2VyIG5lZWRzIFRPVFAgc2V0dXBcclxuICAgIGlmIChhdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUgPT09IENoYWxsZW5nZU5hbWVUeXBlLk1GQV9TRVRVUCkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnTUZBIHNldHVwIHJlcXVpcmVkLCBhc3NvY2lhdGluZyBzb2Z0d2FyZSB0b2tlbicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQXNzb2NpYXRlIHNvZnR3YXJlIHRva2VuIChnZXQgVE9UUCBzZWNyZXQpXHJcbiAgICAgIGNvbnN0IGFzc29jaWF0ZVJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQXNzb2NpYXRlU29mdHdhcmVUb2tlbkNvbW1hbmQoe1xyXG4gICAgICAgIFNlc3Npb246IGF1dGhSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKCFhc3NvY2lhdGVSZXN1bHQuU2VjcmV0Q29kZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdldCBUT1RQIHNlY3JldCBmcm9tIENvZ25pdG8nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gR2VuZXJhdGUgVE9UUCBjb2RlIHVzaW5nIHRoZSBzZWNyZXRcclxuICAgICAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICAgICAgc2VjcmV0OiBhc3NvY2lhdGVSZXN1bHQuU2VjcmV0Q29kZSxcclxuICAgICAgICBlbmNvZGluZzogJ2Jhc2UzMicsXHJcbiAgICAgICAgdGltZTogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXHJcbiAgICAgICAgd2luZG93OiAyLCAvLyBBbGxvdyBzb21lIHRpbWUgZHJpZnRcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnR2VuZXJhdGVkIFRPVFAgY29kZSBmb3IgdmVyaWZpY2F0aW9uJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgY29kZUxlbmd0aDogdG90cENvZGUubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gVmVyaWZ5IHRoZSBzb2Z0d2FyZSB0b2tlblxyXG4gICAgICBjb25zdCB2ZXJpZnlSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IFZlcmlmeVNvZnR3YXJlVG9rZW5Db21tYW5kKHtcclxuICAgICAgICBTZXNzaW9uOiBhdXRoUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgVXNlckNvZGU6IHRvdHBDb2RlLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAodmVyaWZ5UmVzdWx0LlN0YXR1cyAhPT0gJ1NVQ0NFU1MnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT1RQIHZlcmlmaWNhdGlvbiBmYWlsZWQ6ICR7dmVyaWZ5UmVzdWx0LlN0YXR1c31gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRW5hYmxlIFRPVFAgTUZBIGZvciB0aGUgdXNlclxyXG4gICAgICBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluU2V0VXNlck1GQVByZWZlcmVuY2VDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgU29mdHdhcmVUb2tlbk1mYVNldHRpbmdzOiB7XHJcbiAgICAgICAgICBFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgUHJlZmVycmVkTWZhOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIE1GQSBlbmFibGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQ29udGludWUgd2l0aCBhdXRoZW50aWNhdGlvbiB1c2luZyB0aGUgbmV3IHNlc3Npb25cclxuICAgICAgY29uc3QgZmluYWxBdXRoUmVzdWx0ID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCh7XHJcbiAgICAgICAgQ2xpZW50SWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEISxcclxuICAgICAgICBDaGFsbGVuZ2VOYW1lOiBDaGFsbGVuZ2VOYW1lVHlwZS5NRkFfU0VUVVAsXHJcbiAgICAgICAgU2Vzc2lvbjogdmVyaWZ5UmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgQ2hhbGxlbmdlUmVzcG9uc2VzOiB7XHJcbiAgICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBmaW5hbEF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LkFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIGlkVG9rZW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uSWRUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uUmVmcmVzaFRva2VuLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdUT1RQIE1GQSBzZXR1cCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgICBuZXh0U3RlcDogJ2F1dGhlbnRpY2F0ZWQnXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0ZXAgMzogSGFuZGxlIFNPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UgZm9yIGV4aXN0aW5nIFRPVFAgdXNlcnNcclxuICAgIGlmIChhdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUgPT09IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSByZWNlaXZlZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gR2V0IHVzZXIncyBUT1RQIHNlY3JldCAodGhpcyB3b3VsZCBiZSBzdG9yZWQgc2VjdXJlbHkgaW4gQ29nbml0bylcclxuICAgICAgLy8gRm9yIGF1dG9ub21vdXMgd29ya2Zsb3csIHdlIG5lZWQgdG8gZ2VuZXJhdGUgdGhlIFRPVFAgY29kZSBzZXJ2ZXItc2lkZVxyXG4gICAgICBjb25zdCB0b3RwQ29kZSA9IGF3YWl0IGdlbmVyYXRlVE9UUENvZGVGb3JVc2VyKHJlcXVlc3QuZW1haWwsIGNvcnJlbGF0aW9uSWQpO1xyXG5cclxuICAgICAgLy8gUmVzcG9uZCB0byB0aGUgTUZBIGNoYWxsZW5nZVxyXG4gICAgICBjb25zdCBjaGFsbGVuZ2VSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IFJlc3BvbmRUb0F1dGhDaGFsbGVuZ2VDb21tYW5kKHtcclxuICAgICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICAgIENoYWxsZW5nZU5hbWU6IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSxcclxuICAgICAgICBTZXNzaW9uOiBhdXRoUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgQ2hhbGxlbmdlUmVzcG9uc2VzOiB7XHJcbiAgICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICAgIFNPRlRXQVJFX1RPS0VOX01GQV9DT0RFOiB0b3RwQ29kZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LkFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIGlkVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uSWRUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uUmVmcmVzaFRva2VuLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdUT1RQIE1GQSB2ZXJpZmljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgbmV4dFN0ZXA6ICdhdXRoZW50aWNhdGVkJ1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBubyBNRkEgY2hhbGxlbmdlLCB1c2VyIG1pZ2h0IGFscmVhZHkgYmUgYXV0aGVudGljYXRlZFxyXG4gICAgaWYgKGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQpIHtcclxuICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBhY2Nlc3NUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5BY2Nlc3NUb2tlbixcclxuICAgICAgICBpZFRva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LklkVG9rZW4sXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LlJlZnJlc2hUb2tlbixcclxuICAgICAgICBtZXNzYWdlOiAnQXV0aGVudGljYXRpb24gY29tcGxldGVkIChubyBNRkEgcmVxdWlyZWQpJyxcclxuICAgICAgICBuZXh0U3RlcDogJ2F1dGhlbnRpY2F0ZWQnXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBhdXRoIHN0YXRlOiAke2F1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSB8fCAndW5rbm93bid9YCk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignQXV0b21hdGljIFRPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdBVVRPX1RPVFBfRkFJTEVEJywgZXJyb3IubWVzc2FnZSk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIG1hbnVhbCBUT1RQIHZlcmlmaWNhdGlvbiAoZm9yIHN0YW5kYXJkIHVzZXIgd29ya2Zsb3cpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVNYW51YWxUT1RQVmVyaWZpY2F0aW9uKFxyXG4gIHJlcXVlc3Q6IFZlcmlmeU9UUFJlcXVlc3QsIFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIFxyXG4gIC8vIFRoaXMgd291bGQgaGFuZGxlIG1hbnVhbCBPVFAgZW50cnkgYnkgdXNlcnNcclxuICAvLyBJbXBsZW1lbnRhdGlvbiBkZXBlbmRzIG9uIHRoZSBzcGVjaWZpYyBtYW51YWwgd29ya2Zsb3cgcmVxdWlyZW1lbnRzXHJcbiAgXHJcbiAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAxLCAnTk9UX0lNUExFTUVOVEVEJywgJ01hbnVhbCBUT1RQIHZlcmlmaWNhdGlvbiBub3QgeWV0IGltcGxlbWVudGVkJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBUT1RQIGNvZGUgZm9yIGEgdXNlciAoc2VydmVyLXNpZGUgZ2VuZXJhdGlvbiBmb3IgYXV0b25vbW91cyB3b3JrZmxvdylcclxuICogSW4gcHJvZHVjdGlvbiwgdGhpcyB3b3VsZCByZXRyaWV2ZSB0aGUgdXNlcidzIFRPVFAgc2VjcmV0IHNlY3VyZWx5XHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVRPVFBDb2RlRm9yVXNlcihlbWFpbDogc3RyaW5nLCBjb3JyZWxhdGlvbklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIC8vIE5PVEU6IFRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uXHJcbiAgLy8gSW4gcHJvZHVjdGlvbiwgeW91IHdvdWxkOlxyXG4gIC8vIDEuIFJldHJpZXZlIHRoZSB1c2VyJ3MgVE9UUCBzZWNyZXQgZnJvbSBzZWN1cmUgc3RvcmFnZSAoQ29nbml0byBzdG9yZXMgdGhpcyBpbnRlcm5hbGx5KVxyXG4gIC8vIDIuIFVzZSB0aGUgc2VjcmV0IHRvIGdlbmVyYXRlIHRoZSBjdXJyZW50IFRPVFAgY29kZVxyXG4gIC8vIDMuIEhhbmRsZSB0aW1lIHN5bmNocm9uaXphdGlvbiBhbmQgd2luZG93IHRvbGVyYW5jZVxyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdHZW5lcmF0aW5nIFRPVFAgY29kZSBmb3IgdXNlcicsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBlbWFpbFxyXG4gIH0pO1xyXG5cclxuICAvLyBGb3Igbm93LCB3ZSdsbCB1c2UgYSBwbGFjZWhvbGRlciBpbXBsZW1lbnRhdGlvblxyXG4gIC8vIFRoZSBhY3R1YWwgc2VjcmV0IHdvdWxkIGJlIHJldHJpZXZlZCBmcm9tIENvZ25pdG8ncyBpbnRlcm5hbCBzdG9yYWdlXHJcbiAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgZ2V0U3RvcmVkVE9UUFNlY3JldChlbWFpbCk7XHJcbiAgXHJcbiAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICBzZWNyZXQ6IHNlY3JldCxcclxuICAgIGVuY29kaW5nOiAnYmFzZTMyJyxcclxuICAgIHRpbWU6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgd2luZG93OiAyLFxyXG4gIH0pO1xyXG5cclxuICBsb2dnZXIuaW5mbygnVE9UUCBjb2RlIGdlbmVyYXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgZW1haWwsXHJcbiAgICBjb2RlTGVuZ3RoOiB0b3RwQ29kZS5sZW5ndGhcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIHRvdHBDb2RlO1xyXG59XHJcblxyXG4vKipcclxuICogUmV0cmlldmUgc3RvcmVkIFRPVFAgc2VjcmV0IGZvciBhIHVzZXJcclxuICogVGhpcyBpcyBhIHBsYWNlaG9sZGVyIC0gaW4gcHJvZHVjdGlvbiwgQ29nbml0byBtYW5hZ2VzIFRPVFAgc2VjcmV0cyBpbnRlcm5hbGx5XHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZXRTdG9yZWRUT1RQU2VjcmV0KGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIC8vIEluIHRoZSBhY3R1YWwgaW1wbGVtZW50YXRpb24sIHRoaXMgd291bGQ6XHJcbiAgLy8gMS4gUXVlcnkgQ29nbml0byB0byBnZXQgdGhlIHVzZXIncyBNRkEgc2V0dGluZ3NcclxuICAvLyAyLiBFeHRyYWN0IHRoZSBUT1RQIHNlY3JldCAoaWYgYWNjZXNzaWJsZSlcclxuICAvLyAzLiBSZXR1cm4gdGhlIHNlY3JldCBmb3IgY29kZSBnZW5lcmF0aW9uXHJcbiAgXHJcbiAgLy8gRm9yIG5vdywgcmV0dXJuIGEgcGxhY2Vob2xkZXIgc2VjcmV0XHJcbiAgLy8gVGhpcyBuZWVkcyB0byBiZSByZXBsYWNlZCB3aXRoIGFjdHVhbCBDb2duaXRvIGludGVncmF0aW9uXHJcbiAgcmV0dXJuICdQTEFDRUhPTERFUl9TRUNSRVRfRlJPTV9DT0dOSVRPJztcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlIHRlbXBvcmFyeSBwYXNzd29yZCBmb3IgdXNlciAodXNlZCBpbiBhdXRvbm9tb3VzIHdvcmtmbG93KVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVUZW1wb3JhcnlQYXNzd29yZChlbWFpbDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAvLyBUaGlzIHdvdWxkIHJldHJpZXZlIG9yIGdlbmVyYXRlIGEgdGVtcG9yYXJ5IHBhc3N3b3JkIGZvciB0aGUgdXNlclxyXG4gIC8vIEluIHRoZSBhdXRvbm9tb3VzIHdvcmtmbG93LCB1c2VycyBhcmUgY3JlYXRlZCB3aXRoIGtub3duIHRlbXBvcmFyeSBwYXNzd29yZHNcclxuICByZXR1cm4gJ1RlbXBQYXNzMTIzISc7IC8vIFBsYWNlaG9sZGVyIC0gc2hvdWxkIGJlIHJldHJpZXZlZCBmcm9tIHNlY3VyZSBzdG9yYWdlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN1Y2Nlc3NSZXNwb25zZShkYXRhOiBWZXJpZnlPVFBSZXNwb25zZSk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZGF0YSlcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKHN0YXR1c0NvZGU6IG51bWJlciwgY29kZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufSJdfQ==
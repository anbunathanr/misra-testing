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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LW90cC1jb2duaXRvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmVyaWZ5LW90cC1jb2duaXRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGdHQVVtRDtBQUNuRCxxREFBdUM7QUFDdkMsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNoRCxNQUFNLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO0lBQ3RELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQXNCSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksU0FBUyxDQUFDO0lBRXJFLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUNBQW1DLEVBQUU7UUFDL0MsYUFBYTtRQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtRQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7S0FDekIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFxQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6RCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNs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QUMsQ0FBQyx3REFBd0Q7QUFDakYsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLElBQXVCO0lBQzlDLE9BQU87UUFDTCxVQUFVLEVBQUUsR0FBRztRQUNmLE9BQU8sRUFBRSxrQkFBVztRQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7S0FDM0IsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxVQUFrQixFQUFFLElBQVksRUFBRSxPQUFlO0lBQ3RFLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFLGtCQUFXO1FBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBcclxuICBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCxcclxuICBBc3NvY2lhdGVTb2Z0d2FyZVRva2VuQ29tbWFuZCxcclxuICBWZXJpZnlTb2Z0d2FyZVRva2VuQ29tbWFuZCxcclxuICBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCxcclxuICBJbml0aWF0ZUF1dGhDb21tYW5kLFxyXG4gIEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCxcclxuICBBZG1pblNldFVzZXJNRkFQcmVmZXJlbmNlQ29tbWFuZCxcclxuICBDaGFsbGVuZ2VOYW1lVHlwZSxcclxuICBBdXRoRmxvd1R5cGVcclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCAqIGFzIHNwZWFrZWFzeSBmcm9tICdzcGVha2Vhc3knO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdWZXJpZnlPVFBDb2duaXRvJyk7XHJcbmNvbnN0IGNvZ25pdG9DbGllbnQgPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoeyBcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgXHJcbn0pO1xyXG5cclxuaW50ZXJmYWNlIFZlcmlmeU9UUFJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgb3RwPzogc3RyaW5nOyAvLyBPVFAgY29kZSBmcm9tIGZyb250ZW5kXHJcbiAgcGFzc3dvcmQ/OiBzdHJpbmc7IC8vIFBhc3N3b3JkIGZvciBhdXRoZW50aWNhdGlvblxyXG4gIHNlc3Npb24/OiBzdHJpbmc7IC8vIENvZ25pdG8gc2Vzc2lvbiBmcm9tIHByZXZpb3VzIGF1dGggc3RlcFxyXG4gIGNoYWxsZW5nZU5hbWU/OiBzdHJpbmc7IC8vIFR5cGUgb2YgTUZBIGNoYWxsZW5nZVxyXG4gIGF1dG9tYXRpY1ZlcmlmaWNhdGlvbj86IGJvb2xlYW47IC8vIEZsYWcgZm9yIGF1dG9ub21vdXMgd29ya2Zsb3dcclxufVxyXG5cclxuaW50ZXJmYWNlIFZlcmlmeU9UUFJlc3BvbnNlIHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIGFjY2Vzc1Rva2VuPzogc3RyaW5nO1xyXG4gIGlkVG9rZW4/OiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuPzogc3RyaW5nO1xyXG4gIHNlc3Npb24/OiBzdHJpbmc7XHJcbiAgY2hhbGxlbmdlTmFtZT86IHN0cmluZztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgbmV4dFN0ZXA/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGV2ZW50LmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCAndW5rbm93bic7XHJcbiAgXHJcbiAgbG9nZ2VyLmluZm8oJ09UUCB2ZXJpZmljYXRpb24gcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgbWV0aG9kOiBldmVudC5odHRwTWV0aG9kXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlcXVlc3Q6IFZlcmlmeU9UUFJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0VNQUlMJywgJ0VtYWlsIGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgT1RQIGNvZGUgaXMgcHJvdmlkZWQsIGhhbmRsZSBhdXRvbWF0aWMgdmVyaWZpY2F0aW9uIHdpdGggdGhlIE9UUFxyXG4gICAgaWYgKHJlcXVlc3Qub3RwKSB7XHJcbiAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVBdXRvbWF0aWNUT1RQVmVyaWZpY2F0aW9uV2l0aE9UUChyZXF1ZXN0LCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGb3IgYXV0b25vbW91cyB3b3JrZmxvdywgaGFuZGxlIGF1dG9tYXRpYyBUT1RQIHZlcmlmaWNhdGlvblxyXG4gICAgaWYgKHJlcXVlc3QuYXV0b21hdGljVmVyaWZpY2F0aW9uKSB7XHJcbiAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVBdXRvbWF0aWNUT1RQVmVyaWZpY2F0aW9uKHJlcXVlc3QsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvciBtYW51YWwgd29ya2Zsb3csIGhhbmRsZSBzdGFuZGFyZCBNRkEgY2hhbGxlbmdlXHJcbiAgICByZXR1cm4gYXdhaXQgaGFuZGxlTWFudWFsVE9UUFZlcmlmaWNhdGlvbihyZXF1ZXN0LCBjb3JyZWxhdGlvbklkKTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnVkVSSUZJQ0FUSU9OX0VSUk9SJywgJ09UUCB2ZXJpZmljYXRpb24gZmFpbGVkJyk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEhhbmRsZSBhdXRvbWF0aWMgVE9UUCB2ZXJpZmljYXRpb24gd2l0aCBwcm92aWRlZCBPVFAgY29kZVxyXG4gKiBUaGlzIGlzIGNhbGxlZCB3aGVuIGZyb250ZW5kIHByb3ZpZGVzIGFuIE9UUCBjb2RlIHRvIHZlcmlmeVxyXG4gKiBXb3JrcyBmb3IgYm90aCBuZXcgdXNlcnMgKE1GQV9TRVRVUCkgYW5kIGV4aXN0aW5nIHVzZXJzIChTT0ZUV0FSRV9UT0tFTl9NRkEpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVBdXRvbWF0aWNUT1RQVmVyaWZpY2F0aW9uV2l0aE9UUChcclxuICByZXF1ZXN0OiBWZXJpZnlPVFBSZXF1ZXN0LCBcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBcclxuICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgVE9UUCB2ZXJpZmljYXRpb24gd2l0aCBwcm92aWRlZCBPVFAnLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICBoYXNTZXNzaW9uOiAhIXJlcXVlc3Quc2Vzc2lvblxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gU3RlcCAxOiBJbml0aWF0ZSBhdXRoIHRvIGdldCBzZXNzaW9uXHJcbiAgICAvLyBGb3IgZXhpc3RpbmcgdXNlcnMsIHdlIGF1dGhlbnRpY2F0ZSB3aXRoIGVtYWlsIGFuZCBwYXNzd29yZFxyXG4gICAgLy8gRm9yIG5ldyB1c2Vycywgd2UgYWxzbyBhdXRoZW50aWNhdGUgd2l0aCBlbWFpbCBhbmQgcGFzc3dvcmRcclxuICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCh7XHJcbiAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgQ2xpZW50SWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEISxcclxuICAgICAgQXV0aEZsb3c6IEF1dGhGbG93VHlwZS5BRE1JTl9OT19TUlBfQVVUSCxcclxuICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBQQVNTV09SRDogcmVxdWVzdC5wYXNzd29yZCB8fCBhd2FpdCBnZW5lcmF0ZVRlbXBvcmFyeVBhc3N3b3JkKHJlcXVlc3QuZW1haWwpLFxyXG4gICAgICB9LFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdBdXRoIGluaXRpYXRlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIGNoYWxsZW5nZU5hbWU6IGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RlcCAyOiBIYW5kbGUgTUZBX1NFVFVQIGNoYWxsZW5nZSBpZiB1c2VyIG5lZWRzIFRPVFAgc2V0dXBcclxuICAgIGlmIChhdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUgPT09IENoYWxsZW5nZU5hbWVUeXBlLk1GQV9TRVRVUCkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnTUZBIHNldHVwIHJlcXVpcmVkLCBhc3NvY2lhdGluZyBzb2Z0d2FyZSB0b2tlbicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQXNzb2NpYXRlIHNvZnR3YXJlIHRva2VuIChnZXQgVE9UUCBzZWNyZXQpXHJcbiAgICAgIGNvbnN0IGFzc29jaWF0ZVJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQXNzb2NpYXRlU29mdHdhcmVUb2tlbkNvbW1hbmQoe1xyXG4gICAgICAgIFNlc3Npb246IGF1dGhSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKCFhc3NvY2lhdGVSZXN1bHQuU2VjcmV0Q29kZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdldCBUT1RQIHNlY3JldCBmcm9tIENvZ25pdG8nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1NvZnR3YXJlIHRva2VuIGFzc29jaWF0ZWQnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSB0aGUgc29mdHdhcmUgdG9rZW4gd2l0aCB0aGUgcHJvdmlkZWQgT1RQIGNvZGVcclxuICAgICAgY29uc3QgdmVyaWZ5UmVzdWx0ID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBWZXJpZnlTb2Z0d2FyZVRva2VuQ29tbWFuZCh7XHJcbiAgICAgICAgU2Vzc2lvbjogYXV0aFJlc3VsdC5TZXNzaW9uLFxyXG4gICAgICAgIFVzZXJDb2RlOiByZXF1ZXN0Lm90cCEsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICh2ZXJpZnlSZXN1bHQuU3RhdHVzICE9PSAnU1VDQ0VTUycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZDogJHt2ZXJpZnlSZXN1bHQuU3RhdHVzfWApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVE9UUCBjb2RlIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gRW5hYmxlIFRPVFAgTUZBIGZvciB0aGUgdXNlclxyXG4gICAgICBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluU2V0VXNlck1GQVByZWZlcmVuY2VDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgU29mdHdhcmVUb2tlbk1mYVNldHRpbmdzOiB7XHJcbiAgICAgICAgICBFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgUHJlZmVycmVkTWZhOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIE1GQSBlbmFibGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQ29udGludWUgd2l0aCBhdXRoZW50aWNhdGlvbiB1c2luZyB0aGUgbmV3IHNlc3Npb25cclxuICAgICAgY29uc3QgZmluYWxBdXRoUmVzdWx0ID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCh7XHJcbiAgICAgICAgQ2xpZW50SWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEISxcclxuICAgICAgICBDaGFsbGVuZ2VOYW1lOiBDaGFsbGVuZ2VOYW1lVHlwZS5NRkFfU0VUVVAsXHJcbiAgICAgICAgU2Vzc2lvbjogdmVyaWZ5UmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgQ2hhbGxlbmdlUmVzcG9uc2VzOiB7XHJcbiAgICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBmaW5hbEF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LkFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIGlkVG9rZW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uSWRUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uUmVmcmVzaFRva2VuLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdUT1RQIE1GQSBzZXR1cCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgICBuZXh0U3RlcDogJ2F1dGhlbnRpY2F0ZWQnXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0ZXAgMzogSGFuZGxlIFNPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UgZm9yIGV4aXN0aW5nIFRPVFAgdXNlcnNcclxuICAgIGlmIChhdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUgPT09IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSByZWNlaXZlZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gUmVzcG9uZCB0byB0aGUgTUZBIGNoYWxsZW5nZSB3aXRoIHRoZSBwcm92aWRlZCBPVFAgY29kZVxyXG4gICAgICBjb25zdCBjaGFsbGVuZ2VSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IFJlc3BvbmRUb0F1dGhDaGFsbGVuZ2VDb21tYW5kKHtcclxuICAgICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICAgIENoYWxsZW5nZU5hbWU6IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSxcclxuICAgICAgICBTZXNzaW9uOiBhdXRoUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgQ2hhbGxlbmdlUmVzcG9uc2VzOiB7XHJcbiAgICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICAgIFNPRlRXQVJFX1RPS0VOX01GQV9DT0RFOiByZXF1ZXN0Lm90cCEsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBhY2Nlc3NUb2tlbjogY2hhbGxlbmdlUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5BY2Nlc3NUb2tlbixcclxuICAgICAgICBpZFRva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LklkVG9rZW4sXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LlJlZnJlc2hUb2tlbixcclxuICAgICAgICBtZXNzYWdlOiAnVE9UUCBNRkEgdmVyaWZpY2F0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICAgIG5leHRTdGVwOiAnYXV0aGVudGljYXRlZCdcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgbm8gTUZBIGNoYWxsZW5nZSwgdXNlciBtaWdodCBhbHJlYWR5IGJlIGF1dGhlbnRpY2F0ZWRcclxuICAgIGlmIChhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0KSB7XHJcbiAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgYWNjZXNzVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW4sXHJcbiAgICAgICAgaWRUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5JZFRva2VuLFxyXG4gICAgICAgIHJlZnJlc2hUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5SZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgbWVzc2FnZTogJ0F1dGhlbnRpY2F0aW9uIGNvbXBsZXRlZCAobm8gTUZBIHJlcXVpcmVkKScsXHJcbiAgICAgICAgbmV4dFN0ZXA6ICdhdXRoZW50aWNhdGVkJ1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgYXV0aCBzdGF0ZTogJHthdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUgfHwgJ3Vua25vd24nfWApO1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ1RPVFAgdmVyaWZpY2F0aW9uIHdpdGggT1RQIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdPVFBfVkVSSUZJQ0FUSU9OX0ZBSUxFRCcsIGVycm9yLm1lc3NhZ2UpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEhhbmRsZSBhdXRvbWF0aWMgVE9UUCB2ZXJpZmljYXRpb24gZm9yIGF1dG9ub21vdXMgd29ya2Zsb3dcclxuICogVGhpcyBzZXRzIHVwIFRPVFAgTUZBIGFuZCBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlcy92ZXJpZmllcyBjb2Rlc1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQXV0b21hdGljVE9UUFZlcmlmaWNhdGlvbihcclxuICByZXF1ZXN0OiBWZXJpZnlPVFBSZXF1ZXN0LCBcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICBcclxuICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgYXV0b21hdGljIFRPVFAgdmVyaWZpY2F0aW9uJywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBTdGVwIDE6IEluaXRpYXRlIGF1dGggdG8gZ2V0IHNlc3Npb25cclxuICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluSW5pdGlhdGVBdXRoQ29tbWFuZCh7XHJcbiAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgQ2xpZW50SWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEISxcclxuICAgICAgQXV0aEZsb3c6IEF1dGhGbG93VHlwZS5BRE1JTl9OT19TUlBfQVVUSCxcclxuICAgICAgQXV0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBQQVNTV09SRDogYXdhaXQgZ2VuZXJhdGVUZW1wb3JhcnlQYXNzd29yZChyZXF1ZXN0LmVtYWlsKSwgLy8gVXNlIHN0b3JlZCB0ZW1wIHBhc3N3b3JkXHJcbiAgICAgIH0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gU3RlcCAyOiBIYW5kbGUgTUZBX1NFVFVQIGNoYWxsZW5nZSBpZiB1c2VyIG5lZWRzIFRPVFAgc2V0dXBcclxuICAgIGlmIChhdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUgPT09IENoYWxsZW5nZU5hbWVUeXBlLk1GQV9TRVRVUCkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnTUZBIHNldHVwIHJlcXVpcmVkLCBhc3NvY2lhdGluZyBzb2Z0d2FyZSB0b2tlbicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQXNzb2NpYXRlIHNvZnR3YXJlIHRva2VuIChnZXQgVE9UUCBzZWNyZXQpXHJcbiAgICAgIGNvbnN0IGFzc29jaWF0ZVJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQXNzb2NpYXRlU29mdHdhcmVUb2tlbkNvbW1hbmQoe1xyXG4gICAgICAgIFNlc3Npb246IGF1dGhSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKCFhc3NvY2lhdGVSZXN1bHQuU2VjcmV0Q29kZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdldCBUT1RQIHNlY3JldCBmcm9tIENvZ25pdG8nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gR2VuZXJhdGUgVE9UUCBjb2RlIHVzaW5nIHRoZSBzZWNyZXRcclxuICAgICAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICAgICAgc2VjcmV0OiBhc3NvY2lhdGVSZXN1bHQuU2VjcmV0Q29kZSxcclxuICAgICAgICBlbmNvZGluZzogJ2Jhc2UzMicsXHJcbiAgICAgICAgdGltZTogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnR2VuZXJhdGVkIFRPVFAgY29kZSBmb3IgdmVyaWZpY2F0aW9uJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgY29kZUxlbmd0aDogdG90cENvZGUubGVuZ3RoXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gVmVyaWZ5IHRoZSBzb2Z0d2FyZSB0b2tlblxyXG4gICAgICBjb25zdCB2ZXJpZnlSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IFZlcmlmeVNvZnR3YXJlVG9rZW5Db21tYW5kKHtcclxuICAgICAgICBTZXNzaW9uOiBhdXRoUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgVXNlckNvZGU6IHRvdHBDb2RlLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAodmVyaWZ5UmVzdWx0LlN0YXR1cyAhPT0gJ1NVQ0NFU1MnKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUT1RQIHZlcmlmaWNhdGlvbiBmYWlsZWQ6ICR7dmVyaWZ5UmVzdWx0LlN0YXR1c31gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRW5hYmxlIFRPVFAgTUZBIGZvciB0aGUgdXNlclxyXG4gICAgICBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFkbWluU2V0VXNlck1GQVByZWZlcmVuY2VDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgU29mdHdhcmVUb2tlbk1mYVNldHRpbmdzOiB7XHJcbiAgICAgICAgICBFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgUHJlZmVycmVkTWZhOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdUT1RQIE1GQSBlbmFibGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQ29udGludWUgd2l0aCBhdXRoZW50aWNhdGlvbiB1c2luZyB0aGUgbmV3IHNlc3Npb25cclxuICAgICAgY29uc3QgZmluYWxBdXRoUmVzdWx0ID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBSZXNwb25kVG9BdXRoQ2hhbGxlbmdlQ29tbWFuZCh7XHJcbiAgICAgICAgQ2xpZW50SWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEISxcclxuICAgICAgICBDaGFsbGVuZ2VOYW1lOiBDaGFsbGVuZ2VOYW1lVHlwZS5NRkFfU0VUVVAsXHJcbiAgICAgICAgU2Vzc2lvbjogdmVyaWZ5UmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgQ2hhbGxlbmdlUmVzcG9uc2VzOiB7XHJcbiAgICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBmaW5hbEF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LkFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIGlkVG9rZW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uSWRUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uUmVmcmVzaFRva2VuLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdUT1RQIE1GQSBzZXR1cCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgICBuZXh0U3RlcDogJ2F1dGhlbnRpY2F0ZWQnXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0ZXAgMzogSGFuZGxlIFNPRlRXQVJFX1RPS0VOX01GQSBjaGFsbGVuZ2UgZm9yIGV4aXN0aW5nIFRPVFAgdXNlcnNcclxuICAgIGlmIChhdXRoUmVzdWx0LkNoYWxsZW5nZU5hbWUgPT09IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSByZWNlaXZlZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gR2V0IHVzZXIncyBUT1RQIHNlY3JldCAodGhpcyB3b3VsZCBiZSBzdG9yZWQgc2VjdXJlbHkgaW4gQ29nbml0bylcclxuICAgICAgLy8gRm9yIGF1dG9ub21vdXMgd29ya2Zsb3csIHdlIG5lZWQgdG8gZ2VuZXJhdGUgdGhlIFRPVFAgY29kZSBzZXJ2ZXItc2lkZVxyXG4gICAgICBjb25zdCB0b3RwQ29kZSA9IGF3YWl0IGdlbmVyYXRlVE9UUENvZGVGb3JVc2VyKHJlcXVlc3QuZW1haWwsIGNvcnJlbGF0aW9uSWQpO1xyXG5cclxuICAgICAgLy8gUmVzcG9uZCB0byB0aGUgTUZBIGNoYWxsZW5nZVxyXG4gICAgICBjb25zdCBjaGFsbGVuZ2VSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IFJlc3BvbmRUb0F1dGhDaGFsbGVuZ2VDb21tYW5kKHtcclxuICAgICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICAgIENoYWxsZW5nZU5hbWU6IENoYWxsZW5nZU5hbWVUeXBlLlNPRlRXQVJFX1RPS0VOX01GQSxcclxuICAgICAgICBTZXNzaW9uOiBhdXRoUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgICAgQ2hhbGxlbmdlUmVzcG9uc2VzOiB7XHJcbiAgICAgICAgICBVU0VSTkFNRTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICAgIFNPRlRXQVJFX1RPS0VOX01GQV9DT0RFOiB0b3RwQ29kZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBjaGFsbGVuZ2VSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQ/LkFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIGlkVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uSWRUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uUmVmcmVzaFRva2VuLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdUT1RQIE1GQSB2ZXJpZmljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgbmV4dFN0ZXA6ICdhdXRoZW50aWNhdGVkJ1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBubyBNRkEgY2hhbGxlbmdlLCB1c2VyIG1pZ2h0IGFscmVhZHkgYmUgYXV0aGVudGljYXRlZFxyXG4gICAgaWYgKGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQpIHtcclxuICAgICAgcmV0dXJuIHN1Y2Nlc3NSZXNwb25zZSh7XHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBhY2Nlc3NUb2tlbjogYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdC5BY2Nlc3NUb2tlbixcclxuICAgICAgICBpZFRva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LklkVG9rZW4sXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LlJlZnJlc2hUb2tlbixcclxuICAgICAgICBtZXNzYWdlOiAnQXV0aGVudGljYXRpb24gY29tcGxldGVkIChubyBNRkEgcmVxdWlyZWQpJyxcclxuICAgICAgICBuZXh0U3RlcDogJ2F1dGhlbnRpY2F0ZWQnXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBhdXRoIHN0YXRlOiAke2F1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSB8fCAndW5rbm93bid9YCk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignQXV0b21hdGljIFRPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdBVVRPX1RPVFBfRkFJTEVEJywgZXJyb3IubWVzc2FnZSk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIG1hbnVhbCBUT1RQIHZlcmlmaWNhdGlvbiAoZm9yIHN0YW5kYXJkIHVzZXIgd29ya2Zsb3cpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVNYW51YWxUT1RQVmVyaWZpY2F0aW9uKFxyXG4gIHJlcXVlc3Q6IFZlcmlmeU9UUFJlcXVlc3QsIFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIFxyXG4gIC8vIFRoaXMgd291bGQgaGFuZGxlIG1hbnVhbCBPVFAgZW50cnkgYnkgdXNlcnNcclxuICAvLyBJbXBsZW1lbnRhdGlvbiBkZXBlbmRzIG9uIHRoZSBzcGVjaWZpYyBtYW51YWwgd29ya2Zsb3cgcmVxdWlyZW1lbnRzXHJcbiAgXHJcbiAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAxLCAnTk9UX0lNUExFTUVOVEVEJywgJ01hbnVhbCBUT1RQIHZlcmlmaWNhdGlvbiBub3QgeWV0IGltcGxlbWVudGVkJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBUT1RQIGNvZGUgZm9yIGEgdXNlciAoc2VydmVyLXNpZGUgZ2VuZXJhdGlvbiBmb3IgYXV0b25vbW91cyB3b3JrZmxvdylcclxuICogSW4gcHJvZHVjdGlvbiwgdGhpcyB3b3VsZCByZXRyaWV2ZSB0aGUgdXNlcidzIFRPVFAgc2VjcmV0IHNlY3VyZWx5XHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVRPVFBDb2RlRm9yVXNlcihlbWFpbDogc3RyaW5nLCBjb3JyZWxhdGlvbklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIC8vIE5PVEU6IFRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uXHJcbiAgLy8gSW4gcHJvZHVjdGlvbiwgeW91IHdvdWxkOlxyXG4gIC8vIDEuIFJldHJpZXZlIHRoZSB1c2VyJ3MgVE9UUCBzZWNyZXQgZnJvbSBzZWN1cmUgc3RvcmFnZSAoQ29nbml0byBzdG9yZXMgdGhpcyBpbnRlcm5hbGx5KVxyXG4gIC8vIDIuIFVzZSB0aGUgc2VjcmV0IHRvIGdlbmVyYXRlIHRoZSBjdXJyZW50IFRPVFAgY29kZVxyXG4gIC8vIDMuIEhhbmRsZSB0aW1lIHN5bmNocm9uaXphdGlvbiBhbmQgd2luZG93IHRvbGVyYW5jZVxyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdHZW5lcmF0aW5nIFRPVFAgY29kZSBmb3IgdXNlcicsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBlbWFpbFxyXG4gIH0pO1xyXG5cclxuICAvLyBGb3Igbm93LCB3ZSdsbCB1c2UgYSBwbGFjZWhvbGRlciBpbXBsZW1lbnRhdGlvblxyXG4gIC8vIFRoZSBhY3R1YWwgc2VjcmV0IHdvdWxkIGJlIHJldHJpZXZlZCBmcm9tIENvZ25pdG8ncyBpbnRlcm5hbCBzdG9yYWdlXHJcbiAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgZ2V0U3RvcmVkVE9UUFNlY3JldChlbWFpbCk7XHJcbiAgXHJcbiAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICBzZWNyZXQ6IHNlY3JldCxcclxuICAgIGVuY29kaW5nOiAnYmFzZTMyJyxcclxuICAgIHRpbWU6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApXHJcbiAgfSk7XHJcblxyXG4gIGxvZ2dlci5pbmZvKCdUT1RQIGNvZGUgZ2VuZXJhdGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBlbWFpbCxcclxuICAgIGNvZGVMZW5ndGg6IHRvdHBDb2RlLmxlbmd0aFxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gdG90cENvZGU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXRyaWV2ZSBzdG9yZWQgVE9UUCBzZWNyZXQgZm9yIGEgdXNlclxyXG4gKiBUaGlzIGlzIGEgcGxhY2Vob2xkZXIgLSBpbiBwcm9kdWN0aW9uLCBDb2duaXRvIG1hbmFnZXMgVE9UUCBzZWNyZXRzIGludGVybmFsbHlcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldFN0b3JlZFRPVFBTZWNyZXQoZW1haWw6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgLy8gSW4gdGhlIGFjdHVhbCBpbXBsZW1lbnRhdGlvbiwgdGhpcyB3b3VsZDpcclxuICAvLyAxLiBRdWVyeSBDb2duaXRvIHRvIGdldCB0aGUgdXNlcidzIE1GQSBzZXR0aW5nc1xyXG4gIC8vIDIuIEV4dHJhY3QgdGhlIFRPVFAgc2VjcmV0IChpZiBhY2Nlc3NpYmxlKVxyXG4gIC8vIDMuIFJldHVybiB0aGUgc2VjcmV0IGZvciBjb2RlIGdlbmVyYXRpb25cclxuICBcclxuICAvLyBGb3Igbm93LCByZXR1cm4gYSBwbGFjZWhvbGRlciBzZWNyZXRcclxuICAvLyBUaGlzIG5lZWRzIHRvIGJlIHJlcGxhY2VkIHdpdGggYWN0dWFsIENvZ25pdG8gaW50ZWdyYXRpb25cclxuICByZXR1cm4gJ1BMQUNFSE9MREVSX1NFQ1JFVF9GUk9NX0NPR05JVE8nO1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgdGVtcG9yYXJ5IHBhc3N3b3JkIGZvciB1c2VyICh1c2VkIGluIGF1dG9ub21vdXMgd29ya2Zsb3cpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVRlbXBvcmFyeVBhc3N3b3JkKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIC8vIFRoaXMgd291bGQgcmV0cmlldmUgb3IgZ2VuZXJhdGUgYSB0ZW1wb3JhcnkgcGFzc3dvcmQgZm9yIHRoZSB1c2VyXHJcbiAgLy8gSW4gdGhlIGF1dG9ub21vdXMgd29ya2Zsb3csIHVzZXJzIGFyZSBjcmVhdGVkIHdpdGgga25vd24gdGVtcG9yYXJ5IHBhc3N3b3Jkc1xyXG4gIHJldHVybiAnVGVtcFBhc3MxMjMhJzsgLy8gUGxhY2Vob2xkZXIgLSBzaG91bGQgYmUgcmV0cmlldmVkIGZyb20gc2VjdXJlIHN0b3JhZ2VcclxufVxyXG5cclxuZnVuY3Rpb24gc3VjY2Vzc1Jlc3BvbnNlKGRhdGE6IFZlcmlmeU9UUFJlc3BvbnNlKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShkYXRhKVxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2Uoc3RhdHVzQ29kZTogbnVtYmVyLCBjb2RlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZyk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNylcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59Il19
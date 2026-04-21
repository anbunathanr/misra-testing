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
        logger.error('OTP verification failed', error, {
            correlationId,
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
                step: 30, // 30 second time step
            }); // Type assertion to handle library type issues
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
        logger.error('Automatic TOTP verification failed', error, {
            correlationId,
            email: request.email,
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
        step: 30, // 30 second time step
    }); // Type assertion to handle library type issues
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LW90cC1jb2duaXRvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmVyaWZ5LW90cC1jb2duaXRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLGdHQVVtRDtBQUNuRCxxREFBdUM7QUFDdkMsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNoRCxNQUFNLGFBQWEsR0FBRyxJQUFJLGdFQUE2QixDQUFDO0lBQ3RELE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQW9CSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksU0FBUyxDQUFDO0lBRXJFLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUNBQW1DLEVBQUU7UUFDL0MsYUFBYTtRQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtRQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7S0FDekIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFxQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6RCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNs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SUFDdEUsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUUsa0JBQVc7UUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDbkQ7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFxyXG4gIENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50LFxyXG4gIEFzc29jaWF0ZVNvZnR3YXJlVG9rZW5Db21tYW5kLFxyXG4gIFZlcmlmeVNvZnR3YXJlVG9rZW5Db21tYW5kLFxyXG4gIFJlc3BvbmRUb0F1dGhDaGFsbGVuZ2VDb21tYW5kLFxyXG4gIEluaXRpYXRlQXV0aENvbW1hbmQsXHJcbiAgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kLFxyXG4gIEFkbWluU2V0VXNlck1GQVByZWZlcmVuY2VDb21tYW5kLFxyXG4gIENoYWxsZW5nZU5hbWVUeXBlLFxyXG4gIEF1dGhGbG93VHlwZVxyXG59IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJztcclxuaW1wb3J0ICogYXMgc3BlYWtlYXN5IGZyb20gJ3NwZWFrZWFzeSc7XHJcbmltcG9ydCB7IGNvcnNIZWFkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29ycyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ1ZlcmlmeU9UUENvZ25pdG8nKTtcclxuY29uc3QgY29nbml0b0NsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7IFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxufSk7XHJcblxyXG5pbnRlcmZhY2UgVmVyaWZ5T1RQUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBzZXNzaW9uPzogc3RyaW5nOyAvLyBDb2duaXRvIHNlc3Npb24gZnJvbSBwcmV2aW91cyBhdXRoIHN0ZXBcclxuICBjaGFsbGVuZ2VOYW1lPzogc3RyaW5nOyAvLyBUeXBlIG9mIE1GQSBjaGFsbGVuZ2VcclxuICBhdXRvbWF0aWNWZXJpZmljYXRpb24/OiBib29sZWFuOyAvLyBGbGFnIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbn1cclxuXHJcbmludGVyZmFjZSBWZXJpZnlPVFBSZXNwb25zZSB7XHJcbiAgc3VjY2VzczogYm9vbGVhbjtcclxuICBhY2Nlc3NUb2tlbj86IHN0cmluZztcclxuICBpZFRva2VuPzogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbj86IHN0cmluZztcclxuICBzZXNzaW9uPzogc3RyaW5nO1xyXG4gIGNoYWxsZW5nZU5hbWU/OiBzdHJpbmc7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIG5leHRTdGVwPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgJ3Vua25vd24nO1xyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdPVFAgdmVyaWZpY2F0aW9uIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBWZXJpZnlPVFBSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICBpZiAoIXJlcXVlc3QuZW1haWwpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19FTUFJTCcsICdFbWFpbCBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvciBhdXRvbm9tb3VzIHdvcmtmbG93LCBoYW5kbGUgYXV0b21hdGljIFRPVFAgdmVyaWZpY2F0aW9uXHJcbiAgICBpZiAocmVxdWVzdC5hdXRvbWF0aWNWZXJpZmljYXRpb24pIHtcclxuICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZUF1dG9tYXRpY1RPVFBWZXJpZmljYXRpb24ocmVxdWVzdCwgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRm9yIG1hbnVhbCB3b3JrZmxvdywgaGFuZGxlIHN0YW5kYXJkIE1GQSBjaGFsbGVuZ2VcclxuICAgIHJldHVybiBhd2FpdCBoYW5kbGVNYW51YWxUT1RQVmVyaWZpY2F0aW9uKHJlcXVlc3QsIGNvcnJlbGF0aW9uSWQpO1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ09UUCB2ZXJpZmljYXRpb24gZmFpbGVkJywgZXJyb3IsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ1ZFUklGSUNBVElPTl9FUlJPUicsICdPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZCcpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUgYXV0b21hdGljIFRPVFAgdmVyaWZpY2F0aW9uIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAqIFRoaXMgc2V0cyB1cCBUT1RQIE1GQSBhbmQgYXV0b21hdGljYWxseSBnZW5lcmF0ZXMvdmVyaWZpZXMgY29kZXNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUF1dG9tYXRpY1RPVFBWZXJpZmljYXRpb24oXHJcbiAgcmVxdWVzdDogVmVyaWZ5T1RQUmVxdWVzdCwgXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XHJcbiAgXHJcbiAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIGF1dG9tYXRpYyBUT1RQIHZlcmlmaWNhdGlvbicsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gU3RlcCAxOiBJbml0aWF0ZSBhdXRoIHRvIGdldCBzZXNzaW9uXHJcbiAgICBjb25zdCBhdXRoUmVzdWx0ID0gYXdhaXQgY29nbml0b0NsaWVudC5zZW5kKG5ldyBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQoe1xyXG4gICAgICBVc2VyUG9vbElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRCEsXHJcbiAgICAgIENsaWVudElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX0NMSUVOVF9JRCEsXHJcbiAgICAgIEF1dGhGbG93OiBBdXRoRmxvd1R5cGUuQURNSU5fTk9fU1JQX0FVVEgsXHJcbiAgICAgIEF1dGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgVVNFUk5BTUU6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgUEFTU1dPUkQ6IGF3YWl0IGdlbmVyYXRlVGVtcG9yYXJ5UGFzc3dvcmQocmVxdWVzdC5lbWFpbCksIC8vIFVzZSBzdG9yZWQgdGVtcCBwYXNzd29yZFxyXG4gICAgICB9LFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIFN0ZXAgMjogSGFuZGxlIE1GQV9TRVRVUCBjaGFsbGVuZ2UgaWYgdXNlciBuZWVkcyBUT1RQIHNldHVwXHJcbiAgICBpZiAoYXV0aFJlc3VsdC5DaGFsbGVuZ2VOYW1lID09PSBDaGFsbGVuZ2VOYW1lVHlwZS5NRkFfU0VUVVApIHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ01GQSBzZXR1cCByZXF1aXJlZCwgYXNzb2NpYXRpbmcgc29mdHdhcmUgdG9rZW4nLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEFzc29jaWF0ZSBzb2Z0d2FyZSB0b2tlbiAoZ2V0IFRPVFAgc2VjcmV0KVxyXG4gICAgICBjb25zdCBhc3NvY2lhdGVSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IEFzc29jaWF0ZVNvZnR3YXJlVG9rZW5Db21tYW5kKHtcclxuICAgICAgICBTZXNzaW9uOiBhdXRoUmVzdWx0LlNlc3Npb24sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICghYXNzb2NpYXRlUmVzdWx0LlNlY3JldENvZGUpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZXQgVE9UUCBzZWNyZXQgZnJvbSBDb2duaXRvJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdlbmVyYXRlIFRPVFAgY29kZSB1c2luZyB0aGUgc2VjcmV0XHJcbiAgICAgIGNvbnN0IHRvdHBDb2RlID0gc3BlYWtlYXN5LnRvdHAoe1xyXG4gICAgICAgIHNlY3JldDogYXNzb2NpYXRlUmVzdWx0LlNlY3JldENvZGUsXHJcbiAgICAgICAgZW5jb2Rpbmc6ICdiYXNlMzInLFxyXG4gICAgICAgIHRpbWU6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgICAgIHN0ZXA6IDMwLCAvLyAzMCBzZWNvbmQgdGltZSBzdGVwXHJcbiAgICAgIH0gYXMgYW55KTsgLy8gVHlwZSBhc3NlcnRpb24gdG8gaGFuZGxlIGxpYnJhcnkgdHlwZSBpc3N1ZXNcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdHZW5lcmF0ZWQgVE9UUCBjb2RlIGZvciB2ZXJpZmljYXRpb24nLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBjb2RlTGVuZ3RoOiB0b3RwQ29kZS5sZW5ndGhcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBWZXJpZnkgdGhlIHNvZnR3YXJlIHRva2VuXHJcbiAgICAgIGNvbnN0IHZlcmlmeVJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgVmVyaWZ5U29mdHdhcmVUb2tlbkNvbW1hbmQoe1xyXG4gICAgICAgIFNlc3Npb246IGF1dGhSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgICBVc2VyQ29kZTogdG90cENvZGUsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICh2ZXJpZnlSZXN1bHQuU3RhdHVzICE9PSAnU1VDQ0VTUycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPVFAgdmVyaWZpY2F0aW9uIGZhaWxlZDogJHt2ZXJpZnlSZXN1bHQuU3RhdHVzfWApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBFbmFibGUgVE9UUCBNRkEgZm9yIHRoZSB1c2VyXHJcbiAgICAgIGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZUNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEISxcclxuICAgICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBTb2Z0d2FyZVRva2VuTWZhU2V0dGluZ3M6IHtcclxuICAgICAgICAgIEVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICBQcmVmZXJyZWRNZmE6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1RPVFAgTUZBIGVuYWJsZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBDb250aW51ZSB3aXRoIGF1dGhlbnRpY2F0aW9uIHVzaW5nIHRoZSBuZXcgc2Vzc2lvblxyXG4gICAgICBjb25zdCBmaW5hbEF1dGhSZXN1bHQgPSBhd2FpdCBjb2duaXRvQ2xpZW50LnNlbmQobmV3IFJlc3BvbmRUb0F1dGhDaGFsbGVuZ2VDb21tYW5kKHtcclxuICAgICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICAgIENoYWxsZW5nZU5hbWU6IENoYWxsZW5nZU5hbWVUeXBlLk1GQV9TRVRVUCxcclxuICAgICAgICBTZXNzaW9uOiB2ZXJpZnlSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgICBDaGFsbGVuZ2VSZXNwb25zZXM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgYWNjZXNzVG9rZW46IGZpbmFsQXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uQWNjZXNzVG9rZW4sXHJcbiAgICAgICAgaWRUb2tlbjogZmluYWxBdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5JZFRva2VuLFxyXG4gICAgICAgIHJlZnJlc2hUb2tlbjogZmluYWxBdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5SZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgbWVzc2FnZTogJ1RPVFAgTUZBIHNldHVwIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICAgIG5leHRTdGVwOiAnYXV0aGVudGljYXRlZCdcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RlcCAzOiBIYW5kbGUgU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSBmb3IgZXhpc3RpbmcgVE9UUCB1c2Vyc1xyXG4gICAgaWYgKGF1dGhSZXN1bHQuQ2hhbGxlbmdlTmFtZSA9PT0gQ2hhbGxlbmdlTmFtZVR5cGUuU09GVFdBUkVfVE9LRU5fTUZBKSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdTT0ZUV0FSRV9UT0tFTl9NRkEgY2hhbGxlbmdlIHJlY2VpdmVkJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZXQgdXNlcidzIFRPVFAgc2VjcmV0ICh0aGlzIHdvdWxkIGJlIHN0b3JlZCBzZWN1cmVseSBpbiBDb2duaXRvKVxyXG4gICAgICAvLyBGb3IgYXV0b25vbW91cyB3b3JrZmxvdywgd2UgbmVlZCB0byBnZW5lcmF0ZSB0aGUgVE9UUCBjb2RlIHNlcnZlci1zaWRlXHJcbiAgICAgIGNvbnN0IHRvdHBDb2RlID0gYXdhaXQgZ2VuZXJhdGVUT1RQQ29kZUZvclVzZXIocmVxdWVzdC5lbWFpbCwgY29ycmVsYXRpb25JZCk7XHJcblxyXG4gICAgICAvLyBSZXNwb25kIHRvIHRoZSBNRkEgY2hhbGxlbmdlXHJcbiAgICAgIGNvbnN0IGNoYWxsZW5nZVJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgUmVzcG9uZFRvQXV0aENoYWxsZW5nZUNvbW1hbmQoe1xyXG4gICAgICAgIENsaWVudElkOiBwcm9jZXNzLmVudi5DT0dOSVRPX0NMSUVOVF9JRCEsXHJcbiAgICAgICAgQ2hhbGxlbmdlTmFtZTogQ2hhbGxlbmdlTmFtZVR5cGUuU09GVFdBUkVfVE9LRU5fTUZBLFxyXG4gICAgICAgIFNlc3Npb246IGF1dGhSZXN1bHQuU2Vzc2lvbixcclxuICAgICAgICBDaGFsbGVuZ2VSZXNwb25zZXM6IHtcclxuICAgICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgICAgU09GVFdBUkVfVE9LRU5fTUZBX0NPREU6IHRvdHBDb2RlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIHJldHVybiBzdWNjZXNzUmVzcG9uc2Uoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgYWNjZXNzVG9rZW46IGNoYWxsZW5nZVJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdD8uQWNjZXNzVG9rZW4sXHJcbiAgICAgICAgaWRUb2tlbjogY2hhbGxlbmdlUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5JZFRva2VuLFxyXG4gICAgICAgIHJlZnJlc2hUb2tlbjogY2hhbGxlbmdlUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0Py5SZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgbWVzc2FnZTogJ1RPVFAgTUZBIHZlcmlmaWNhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgICBuZXh0U3RlcDogJ2F1dGhlbnRpY2F0ZWQnXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIG5vIE1GQSBjaGFsbGVuZ2UsIHVzZXIgbWlnaHQgYWxyZWFkeSBiZSBhdXRoZW50aWNhdGVkXHJcbiAgICBpZiAoYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICByZXR1cm4gc3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkFjY2Vzc1Rva2VuLFxyXG4gICAgICAgIGlkVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuSWRUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdBdXRoZW50aWNhdGlvbiBjb21wbGV0ZWQgKG5vIE1GQSByZXF1aXJlZCknLFxyXG4gICAgICAgIG5leHRTdGVwOiAnYXV0aGVudGljYXRlZCdcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGF1dGggc3RhdGU6ICR7YXV0aFJlc3VsdC5DaGFsbGVuZ2VOYW1lIHx8ICd1bmtub3duJ31gKTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdBdXRvbWF0aWMgVE9UUCB2ZXJpZmljYXRpb24gZmFpbGVkJywgZXJyb3IsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdBVVRPX1RPVFBfRkFJTEVEJywgZXJyb3IubWVzc2FnZSk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIG1hbnVhbCBUT1RQIHZlcmlmaWNhdGlvbiAoZm9yIHN0YW5kYXJkIHVzZXIgd29ya2Zsb3cpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVNYW51YWxUT1RQVmVyaWZpY2F0aW9uKFxyXG4gIHJlcXVlc3Q6IFZlcmlmeU9UUFJlcXVlc3QsIFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIFxyXG4gIC8vIFRoaXMgd291bGQgaGFuZGxlIG1hbnVhbCBPVFAgZW50cnkgYnkgdXNlcnNcclxuICAvLyBJbXBsZW1lbnRhdGlvbiBkZXBlbmRzIG9uIHRoZSBzcGVjaWZpYyBtYW51YWwgd29ya2Zsb3cgcmVxdWlyZW1lbnRzXHJcbiAgXHJcbiAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAxLCAnTk9UX0lNUExFTUVOVEVEJywgJ01hbnVhbCBUT1RQIHZlcmlmaWNhdGlvbiBub3QgeWV0IGltcGxlbWVudGVkJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBUT1RQIGNvZGUgZm9yIGEgdXNlciAoc2VydmVyLXNpZGUgZ2VuZXJhdGlvbiBmb3IgYXV0b25vbW91cyB3b3JrZmxvdylcclxuICogSW4gcHJvZHVjdGlvbiwgdGhpcyB3b3VsZCByZXRyaWV2ZSB0aGUgdXNlcidzIFRPVFAgc2VjcmV0IHNlY3VyZWx5XHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVRPVFBDb2RlRm9yVXNlcihlbWFpbDogc3RyaW5nLCBjb3JyZWxhdGlvbklkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIC8vIE5PVEU6IFRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uXHJcbiAgLy8gSW4gcHJvZHVjdGlvbiwgeW91IHdvdWxkOlxyXG4gIC8vIDEuIFJldHJpZXZlIHRoZSB1c2VyJ3MgVE9UUCBzZWNyZXQgZnJvbSBzZWN1cmUgc3RvcmFnZSAoQ29nbml0byBzdG9yZXMgdGhpcyBpbnRlcm5hbGx5KVxyXG4gIC8vIDIuIFVzZSB0aGUgc2VjcmV0IHRvIGdlbmVyYXRlIHRoZSBjdXJyZW50IFRPVFAgY29kZVxyXG4gIC8vIDMuIEhhbmRsZSB0aW1lIHN5bmNocm9uaXphdGlvbiBhbmQgd2luZG93IHRvbGVyYW5jZVxyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdHZW5lcmF0aW5nIFRPVFAgY29kZSBmb3IgdXNlcicsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBlbWFpbFxyXG4gIH0pO1xyXG5cclxuICAvLyBGb3Igbm93LCB3ZSdsbCB1c2UgYSBwbGFjZWhvbGRlciBpbXBsZW1lbnRhdGlvblxyXG4gIC8vIFRoZSBhY3R1YWwgc2VjcmV0IHdvdWxkIGJlIHJldHJpZXZlZCBmcm9tIENvZ25pdG8ncyBpbnRlcm5hbCBzdG9yYWdlXHJcbiAgY29uc3Qgc2VjcmV0ID0gYXdhaXQgZ2V0U3RvcmVkVE9UUFNlY3JldChlbWFpbCk7XHJcbiAgXHJcbiAgY29uc3QgdG90cENvZGUgPSBzcGVha2Vhc3kudG90cCh7XHJcbiAgICBzZWNyZXQ6IHNlY3JldCxcclxuICAgIGVuY29kaW5nOiAnYmFzZTMyJyxcclxuICAgIHRpbWU6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgc3RlcDogMzAsIC8vIDMwIHNlY29uZCB0aW1lIHN0ZXBcclxuICB9IGFzIGFueSk7IC8vIFR5cGUgYXNzZXJ0aW9uIHRvIGhhbmRsZSBsaWJyYXJ5IHR5cGUgaXNzdWVzXHJcblxyXG4gIGxvZ2dlci5pbmZvKCdUT1RQIGNvZGUgZ2VuZXJhdGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBlbWFpbCxcclxuICAgIGNvZGVMZW5ndGg6IHRvdHBDb2RlLmxlbmd0aFxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gdG90cENvZGU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXRyaWV2ZSBzdG9yZWQgVE9UUCBzZWNyZXQgZm9yIGEgdXNlclxyXG4gKiBUaGlzIGlzIGEgcGxhY2Vob2xkZXIgLSBpbiBwcm9kdWN0aW9uLCBDb2duaXRvIG1hbmFnZXMgVE9UUCBzZWNyZXRzIGludGVybmFsbHlcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldFN0b3JlZFRPVFBTZWNyZXQoZW1haWw6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgLy8gSW4gdGhlIGFjdHVhbCBpbXBsZW1lbnRhdGlvbiwgdGhpcyB3b3VsZDpcclxuICAvLyAxLiBRdWVyeSBDb2duaXRvIHRvIGdldCB0aGUgdXNlcidzIE1GQSBzZXR0aW5nc1xyXG4gIC8vIDIuIEV4dHJhY3QgdGhlIFRPVFAgc2VjcmV0IChpZiBhY2Nlc3NpYmxlKVxyXG4gIC8vIDMuIFJldHVybiB0aGUgc2VjcmV0IGZvciBjb2RlIGdlbmVyYXRpb25cclxuICBcclxuICAvLyBGb3Igbm93LCByZXR1cm4gYSBwbGFjZWhvbGRlciBzZWNyZXRcclxuICAvLyBUaGlzIG5lZWRzIHRvIGJlIHJlcGxhY2VkIHdpdGggYWN0dWFsIENvZ25pdG8gaW50ZWdyYXRpb25cclxuICByZXR1cm4gJ1BMQUNFSE9MREVSX1NFQ1JFVF9GUk9NX0NPR05JVE8nO1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgdGVtcG9yYXJ5IHBhc3N3b3JkIGZvciB1c2VyICh1c2VkIGluIGF1dG9ub21vdXMgd29ya2Zsb3cpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZVRlbXBvcmFyeVBhc3N3b3JkKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIC8vIFRoaXMgd291bGQgcmV0cmlldmUgb3IgZ2VuZXJhdGUgYSB0ZW1wb3JhcnkgcGFzc3dvcmQgZm9yIHRoZSB1c2VyXHJcbiAgLy8gSW4gdGhlIGF1dG9ub21vdXMgd29ya2Zsb3csIHVzZXJzIGFyZSBjcmVhdGVkIHdpdGgga25vd24gdGVtcG9yYXJ5IHBhc3N3b3Jkc1xyXG4gIHJldHVybiAnVGVtcFBhc3MxMjMhJzsgLy8gUGxhY2Vob2xkZXIgLSBzaG91bGQgYmUgcmV0cmlldmVkIGZyb20gc2VjdXJlIHN0b3JhZ2VcclxufVxyXG5cclxuZnVuY3Rpb24gc3VjY2Vzc1Jlc3BvbnNlKGRhdGE6IFZlcmlmeU9UUFJlc3BvbnNlKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShkYXRhKVxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2Uoc3RhdHVzQ29kZTogbnVtYmVyLCBjb2RlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZyk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNylcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59Il19
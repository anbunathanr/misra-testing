"use strict";
/**
 * Get Profile Lambda Function
 *
 * Retrieves the authenticated user's profile information
 * Requires valid JWT token in Authorization header
 *
 * Request:
 * GET /auth/profile
 * Authorization: Bearer <jwt-token>
 *
 * Response:
 * {
 *   "userId": "cognito-user-id",
 *   "email": "user@example.com",
 *   "name": "John Doe",
 *   "emailVerified": true,
 *   "mfaEnabled": true,
 *   "createdAt": "2024-01-01T00:00:00Z",
 *   "lastModified": "2024-01-15T10:30:00Z"
 * }
 */
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
const AWS = __importStar(require("aws-sdk"));
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const auth_util_1 = require("../../utils/auth-util");
const logger = (0, logger_1.createLogger)('GetProfile');
const cognito = new AWS.CognitoIdentityServiceProvider();
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    logger.info('Get profile request received', {
        correlationId,
        path: event.path,
        method: event.httpMethod
    });
    try {
        // Extract user from token
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) {
            return errorResponse(401, 'MISSING_AUTH_HEADER', 'Authorization header is required', correlationId);
        }
        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            return errorResponse(401, 'INVALID_AUTH_HEADER', 'Invalid authorization header format', correlationId);
        }
        // Extract user info from token
        const userInfo = (0, auth_util_1.extractUserFromToken)(token);
        if (!userInfo) {
            return errorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token', correlationId);
        }
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        if (!userPoolId) {
            logger.error('COGNITO_USER_POOL_ID not configured', { correlationId });
            return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error', correlationId);
        }
        logger.info('Fetching user profile', {
            correlationId,
            userId: userInfo.sub,
            email: userInfo.email
        });
        // Get user details from Cognito
        const getUserResponse = await cognito.adminGetUser({
            UserPoolId: userPoolId,
            Username: userInfo.email
        }).promise();
        if (!getUserResponse.Username) {
            logger.warn('User not found in Cognito', {
                correlationId,
                userId: userInfo.sub,
                email: userInfo.email
            });
            return errorResponse(404, 'USER_NOT_FOUND', 'User not found', correlationId);
        }
        // Extract user attributes
        const attributes = {};
        getUserResponse.UserAttributes?.forEach(attr => {
            attributes[attr.Name || ''] = attr.Value || '';
        });
        // Check MFA status
        const mfaOptions = getUserResponse.UserMFASettingList || [];
        const mfaEnabled = mfaOptions.length > 0;
        const profile = {
            userId: userInfo.sub,
            email: attributes['email'] || userInfo.email,
            name: attributes['name'] || attributes['given_name'] || 'Unknown',
            emailVerified: attributes['email_verified'] === 'true',
            mfaEnabled,
            createdAt: getUserResponse.UserCreateDate?.toISOString() || new Date().toISOString(),
            lastModified: getUserResponse.UserLastModifiedDate?.toISOString() || new Date().toISOString(),
            attributes
        };
        logger.info('User profile retrieved successfully', {
            correlationId,
            userId: profile.userId,
            email: profile.email,
            mfaEnabled: profile.mfaEnabled
        });
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(profile)
        };
    }
    catch (error) {
        logger.error('Failed to get user profile', {
            correlationId,
            error: error.message,
            code: error.code,
            stack: error.stack
        });
        // Handle specific Cognito errors
        if (error.code === 'UserNotFoundException') {
            return errorResponse(404, 'USER_NOT_FOUND', 'User not found', correlationId);
        }
        else if (error.code === 'NotAuthorizedException') {
            return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized access', correlationId);
        }
        else if (error.code === 'InvalidParameterException') {
            return errorResponse(400, 'INVALID_PARAMETERS', error.message, correlationId);
        }
        return errorResponse(500, 'PROFILE_FETCH_FAILED', 'Failed to retrieve user profile', correlationId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXByb2ZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtcHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCw2Q0FBK0I7QUFDL0IsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUNsRCxxREFBNkQ7QUFFN0QsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzFDLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLDhCQUE4QixFQUFFLENBQUM7QUFhbEQsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5HLE1BQU0sQ0FBQyxJQUFJLENBQUMsOEJBQThCLEVBQUU7UUFDMUMsYUFBYTtRQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtRQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7S0FDekIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDO1FBQ0gsMEJBQTBCO1FBQzFCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzlFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUUsa0NBQWtDLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDdEcsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxF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QUMsQ0FBQztJQUN0RyxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBM0dXLFFBQUEsT0FBTyxXQTJHbEI7QUFFRjs7R0FFRztBQUNILFNBQVMsYUFBYSxDQUNwQixVQUFrQixFQUNsQixJQUFZLEVBQ1osT0FBZSxFQUNmLGFBQXFCO0lBRXJCLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFLGtCQUFXO1FBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsYUFBYTthQUN6QjtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBHZXQgUHJvZmlsZSBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIFJldHJpZXZlcyB0aGUgYXV0aGVudGljYXRlZCB1c2VyJ3MgcHJvZmlsZSBpbmZvcm1hdGlvblxyXG4gKiBSZXF1aXJlcyB2YWxpZCBKV1QgdG9rZW4gaW4gQXV0aG9yaXphdGlvbiBoZWFkZXJcclxuICogXHJcbiAqIFJlcXVlc3Q6XHJcbiAqIEdFVCAvYXV0aC9wcm9maWxlXHJcbiAqIEF1dGhvcml6YXRpb246IEJlYXJlciA8and0LXRva2VuPlxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBcInVzZXJJZFwiOiBcImNvZ25pdG8tdXNlci1pZFwiLFxyXG4gKiAgIFwiZW1haWxcIjogXCJ1c2VyQGV4YW1wbGUuY29tXCIsXHJcbiAqICAgXCJuYW1lXCI6IFwiSm9obiBEb2VcIixcclxuICogICBcImVtYWlsVmVyaWZpZWRcIjogdHJ1ZSxcclxuICogICBcIm1mYUVuYWJsZWRcIjogdHJ1ZSxcclxuICogICBcImNyZWF0ZWRBdFwiOiBcIjIwMjQtMDEtMDFUMDA6MDA6MDBaXCIsXHJcbiAqICAgXCJsYXN0TW9kaWZpZWRcIjogXCIyMDI0LTAxLTE1VDEwOjMwOjAwWlwiXHJcbiAqIH1cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIEFXUyBmcm9tICdhd3Mtc2RrJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuaW1wb3J0IHsgZXh0cmFjdFVzZXJGcm9tVG9rZW4gfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdHZXRQcm9maWxlJyk7XHJcbmNvbnN0IGNvZ25pdG8gPSBuZXcgQVdTLkNvZ25pdG9JZGVudGl0eVNlcnZpY2VQcm92aWRlcigpO1xyXG5cclxuaW50ZXJmYWNlIFVzZXJQcm9maWxlIHtcclxuICB1c2VySWQ6IHN0cmluZztcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIG5hbWU6IHN0cmluZztcclxuICBlbWFpbFZlcmlmaWVkOiBib29sZWFuO1xyXG4gIG1mYUVuYWJsZWQ6IGJvb2xlYW47XHJcbiAgY3JlYXRlZEF0OiBzdHJpbmc7XHJcbiAgbGFzdE1vZGlmaWVkOiBzdHJpbmc7XHJcbiAgYXR0cmlidXRlcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGV2ZW50LmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgXHJcbiAgbG9nZ2VyLmluZm8oJ0dldCBwcm9maWxlIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gdG9rZW5cclxuICAgIGNvbnN0IGF1dGhIZWFkZXIgPSBldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24gfHwgZXZlbnQuaGVhZGVycy5hdXRob3JpemF0aW9uO1xyXG4gICAgaWYgKCFhdXRoSGVhZGVyKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ01JU1NJTkdfQVVUSF9IRUFERVInLCAnQXV0aG9yaXphdGlvbiBoZWFkZXIgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0b2tlbiA9IGF1dGhIZWFkZXIucmVwbGFjZSgnQmVhcmVyICcsICcnKTtcclxuICAgIGlmICghdG9rZW4pIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnSU5WQUxJRF9BVVRIX0hFQURFUicsICdJbnZhbGlkIGF1dGhvcml6YXRpb24gaGVhZGVyIGZvcm1hdCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgdXNlciBpbmZvIGZyb20gdG9rZW5cclxuICAgIGNvbnN0IHVzZXJJbmZvID0gZXh0cmFjdFVzZXJGcm9tVG9rZW4odG9rZW4pO1xyXG4gICAgaWYgKCF1c2VySW5mbykge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdJTlZBTElEX1RPS0VOJywgJ0ludmFsaWQgb3IgZXhwaXJlZCB0b2tlbicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVzZXJQb29sSWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRDtcclxuICAgIGlmICghdXNlclBvb2xJZCkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0NPR05JVE9fVVNFUl9QT09MX0lEIG5vdCBjb25maWd1cmVkJywgeyBjb3JyZWxhdGlvbklkIH0gYXMgYW55KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQ09ORklHX0VSUk9SJywgJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgY29uZmlndXJhdGlvbiBlcnJvcicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGZXRjaGluZyB1c2VyIHByb2ZpbGUnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZDogdXNlckluZm8uc3ViLFxyXG4gICAgICBlbWFpbDogdXNlckluZm8uZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCB1c2VyIGRldGFpbHMgZnJvbSBDb2duaXRvXHJcbiAgICBjb25zdCBnZXRVc2VyUmVzcG9uc2UgPSBhd2FpdCBjb2duaXRvLmFkbWluR2V0VXNlcih7XHJcbiAgICAgIFVzZXJQb29sSWQ6IHVzZXJQb29sSWQsXHJcbiAgICAgIFVzZXJuYW1lOiB1c2VySW5mby5lbWFpbFxyXG4gICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgIGlmICghZ2V0VXNlclJlc3BvbnNlLlVzZXJuYW1lKSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKCdVc2VyIG5vdCBmb3VuZCBpbiBDb2duaXRvJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgdXNlcklkOiB1c2VySW5mby5zdWIsXHJcbiAgICAgICAgZW1haWw6IHVzZXJJbmZvLmVtYWlsXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDQsICdVU0VSX05PVF9GT1VORCcsICdVc2VyIG5vdCBmb3VuZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgdXNlciBhdHRyaWJ1dGVzXHJcbiAgICBjb25zdCBhdHRyaWJ1dGVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XHJcbiAgICBnZXRVc2VyUmVzcG9uc2UuVXNlckF0dHJpYnV0ZXM/LmZvckVhY2goYXR0ciA9PiB7XHJcbiAgICAgIGF0dHJpYnV0ZXNbYXR0ci5OYW1lIHx8ICcnXSA9IGF0dHIuVmFsdWUgfHwgJyc7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDaGVjayBNRkEgc3RhdHVzXHJcbiAgICBjb25zdCBtZmFPcHRpb25zID0gZ2V0VXNlclJlc3BvbnNlLlVzZXJNRkFTZXR0aW5nTGlzdCB8fCBbXTtcclxuICAgIGNvbnN0IG1mYUVuYWJsZWQgPSBtZmFPcHRpb25zLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgY29uc3QgcHJvZmlsZTogVXNlclByb2ZpbGUgPSB7XHJcbiAgICAgIHVzZXJJZDogdXNlckluZm8uc3ViLFxyXG4gICAgICBlbWFpbDogYXR0cmlidXRlc1snZW1haWwnXSB8fCB1c2VySW5mby5lbWFpbCxcclxuICAgICAgbmFtZTogYXR0cmlidXRlc1snbmFtZSddIHx8IGF0dHJpYnV0ZXNbJ2dpdmVuX25hbWUnXSB8fCAnVW5rbm93bicsXHJcbiAgICAgIGVtYWlsVmVyaWZpZWQ6IGF0dHJpYnV0ZXNbJ2VtYWlsX3ZlcmlmaWVkJ10gPT09ICd0cnVlJyxcclxuICAgICAgbWZhRW5hYmxlZCxcclxuICAgICAgY3JlYXRlZEF0OiBnZXRVc2VyUmVzcG9uc2UuVXNlckNyZWF0ZURhdGU/LnRvSVNPU3RyaW5nKCkgfHwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBsYXN0TW9kaWZpZWQ6IGdldFVzZXJSZXNwb25zZS5Vc2VyTGFzdE1vZGlmaWVkRGF0ZT8udG9JU09TdHJpbmcoKSB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIGF0dHJpYnV0ZXNcclxuICAgIH07XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1VzZXIgcHJvZmlsZSByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWQ6IHByb2ZpbGUudXNlcklkLFxyXG4gICAgICBlbWFpbDogcHJvZmlsZS5lbWFpbCxcclxuICAgICAgbWZhRW5hYmxlZDogcHJvZmlsZS5tZmFFbmFibGVkXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwcm9maWxlKVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gZ2V0IHVzZXIgcHJvZmlsZScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIGNvZGU6IGVycm9yLmNvZGUsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSGFuZGxlIHNwZWNpZmljIENvZ25pdG8gZXJyb3JzXHJcbiAgICBpZiAoZXJyb3IuY29kZSA9PT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDA0LCAnVVNFUl9OT1RfRk9VTkQnLCAnVXNlciBub3QgZm91bmQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3IuY29kZSA9PT0gJ05vdEF1dGhvcml6ZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ1VOQVVUSE9SSVpFRCcsICdVbmF1dGhvcml6ZWQgYWNjZXNzJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yLmNvZGUgPT09ICdJbnZhbGlkUGFyYW1ldGVyRXhjZXB0aW9uJykge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdJTlZBTElEX1BBUkFNRVRFUlMnLCBlcnJvci5tZXNzYWdlLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdQUk9GSUxFX0ZFVENIX0ZBSUxFRCcsICdGYWlsZWQgdG8gcmV0cmlldmUgdXNlciBwcm9maWxlJywgY29ycmVsYXRpb25JZCk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFN0YW5kYXJkIGVycm9yIHJlc3BvbnNlXHJcbiAqL1xyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZFxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH07XHJcbn1cclxuIl19
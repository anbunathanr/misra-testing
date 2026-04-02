"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const jwt_service_1 = require("../../services/auth/jwt-service");
// Initialize JWT service (module-level for caching)
const jwtService = new jwt_service_1.JWTService();
/**
 * Generate IAM policy document for API Gateway authorization
 * @param principalId - User identifier (userId for Allow, 'unauthorized' for Deny)
 * @param effect - Allow or Deny
 * @param resource - API Gateway method ARN
 * @param context - User context (only for Allow policies)
 * @returns IAM policy document
 */
function generatePolicy(principalId, effect, resource, context) {
    // For HTTP API, use wildcard to allow/deny all routes
    // Extract API Gateway ARN prefix (arn:aws:execute-api:region:account:apiId)
    const apiGatewayArn = resource.split('/').slice(0, 2).join('/') + '/*';
    const response = {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: apiGatewayArn,
                },
            ],
        },
    };
    // Add user context for Allow policies
    // API Gateway requires context values to be strings
    if (effect === 'Allow' && context) {
        response.context = {
            userId: context.userId,
            email: context.email,
            organizationId: context.organizationId,
            role: context.role,
        };
    }
    return response;
}
/**
 * Lambda Authorizer handler for API Gateway JWT authentication
 * Validates JWT tokens and returns IAM policy documents
 *
 * @param event - API Gateway authorizer event
 * @returns IAM policy document with user context
 */
const handler = async (event) => {
    try {
        // Log request (excluding sensitive token data)
        console.log('Authorization request:', {
            requestId: event.requestContext.requestId,
            apiId: event.requestContext.apiId,
            hasAuthHeader: !!(event.headers?.authorization || event.headers?.Authorization),
        });
        // Extract Authorization header (case-insensitive)
        const authHeader = event.headers?.authorization || event.headers?.Authorization;
        if (!authHeader) {
            console.log('Authorization header missing');
            return generatePolicy('unauthorized', 'Deny', event.methodArn);
        }
        // Extract token from "Bearer <token>" format
        const token = jwtService.extractTokenFromHeader(authHeader);
        if (!token) {
            console.log('Invalid Authorization header format (expected "Bearer <token>")');
            return generatePolicy('unauthorized', 'Deny', event.methodArn);
        }
        // Verify JWT token using existing JWT_Service
        try {
            const user = await jwtService.verifyAccessToken(token);
            console.log('Authorization successful', {
                userId: user.userId,
                email: user.email,
                role: user.role,
            });
            // Generate Allow policy with user context
            return generatePolicy(user.userId, 'Allow', event.methodArn, {
                userId: user.userId,
                email: user.email,
                organizationId: user.organizationId,
                role: user.role,
            });
        }
        catch (verifyError) {
            // Handle JWT verification errors
            const errorMessage = verifyError instanceof Error ? verifyError.message : 'Unknown error';
            console.error('JWT verification failed:', errorMessage);
            // Log specific error types for troubleshooting
            if (errorMessage.includes('expired')) {
                console.log('Token expired');
            }
            else if (errorMessage.includes('invalid')) {
                console.log('Invalid token signature or format');
            }
            else if (errorMessage.includes('Secrets Manager')) {
                console.error('Secrets Manager access failed:', errorMessage);
            }
            return generatePolicy('unauthorized', 'Deny', event.methodArn);
        }
    }
    catch (error) {
        // Handle unexpected errors
        console.error('Unexpected authorization error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        return generatePolicy('unauthorized', 'Deny', event.methodArn);
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aG9yaXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGhvcml6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaUVBQTZEO0FBcUM3RCxvREFBb0Q7QUFDcEQsTUFBTSxVQUFVLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7QUFFcEM7Ozs7Ozs7R0FPRztBQUNILFNBQVMsY0FBYyxDQUNyQixXQUFtQixFQUNuQixNQUF3QixFQUN4QixRQUFnQixFQUNoQixPQUtDO0lBRUQsc0RBQXNEO0lBQ3RELDRFQUE0RTtJQUM1RSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUV2RSxNQUFNLFFBQVEsR0FBdUI7UUFDbkMsV0FBVztRQUNYLGNBQWMsRUFBRTtZQUNkLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLFNBQVMsRUFBRTtnQkFDVDtvQkFDRSxNQUFNLEVBQUUsb0JBQW9CO29CQUM1QixNQUFNLEVBQUUsTUFBTTtvQkFDZCxRQUFRLEVBQUUsYUFBYTtpQkFDeEI7YUFDRjtTQUNGO0tBQ0YsQ0FBQztJQUVGLHNDQUFzQztJQUN0QyxvREFBb0Q7SUFDcEQsSUFBSSxNQUFNLEtBQUssT0FBTyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLFFBQVEsQ0FBQyxPQUFPLEdBQUc7WUFDakIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3RCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7WUFDdEMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1NBQ25CLENBQUM7SUFDSixDQUFDO0lBRUQsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUFzQixFQUErQixFQUFFO0lBQ25GLElBQUksQ0FBQztRQUNILCtDQUErQztRQUMvQyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFO1lBQ3BDLFNBQVMsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQVM7WUFDekMsS0FBSyxFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSztZQUNqQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUM7U0FDaEYsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxPQUFPLEVBQUUsYUFBYSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDO1FBRWhGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7WUFDNUMsT0FBTyxjQUFjLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVELDZDQUE2QztRQUM3QyxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFNUQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpRUFBaUUsQ0FBQyxDQUFDO1lBQy9FLE9BQU8sY0FBYyxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRTtnQkFDdEMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO2dCQUNuQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTthQUNoQixDQUFDLENBQUM7WUFFSCwwQ0FBMEM7WUFDMUMsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRTtnQkFDM0QsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO2dCQUNuQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7Z0JBQ2pCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztnQkFDbkMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2FBQ2hCLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLFdBQVcsRUFBRSxDQUFDO1lBQ3JCLGlDQUFpQztZQUNqQyxNQUFNLFlBQVksR0FBRyxXQUFXLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7WUFDMUYsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUV4RCwrQ0FBK0M7WUFDL0MsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDL0IsQ0FBQztpQkFBTSxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1lBQ25ELENBQUM7aUJBQU0sSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDcEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNoRSxDQUFDO1lBRUQsT0FBTyxjQUFjLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakUsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsMkJBQTJCO1FBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUU7WUFDL0MsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7WUFDL0QsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDeEQsQ0FBQyxDQUFDO1FBRUgsT0FBTyxjQUFjLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDakUsQ0FBQztBQUNILENBQUMsQ0FBQztBQW5FVyxRQUFBLE9BQU8sV0FtRWxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSldUU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1dGgvand0LXNlcnZpY2UnO1xyXG5cclxuLy8gQVBJIEdhdGV3YXkgTGFtYmRhIEF1dGhvcml6ZXIgRXZlbnQgKFJFUVVFU1QgdHlwZSlcclxuZXhwb3J0IGludGVyZmFjZSBBdXRob3JpemVyRXZlbnQge1xyXG4gIHR5cGU6ICdSRVFVRVNUJztcclxuICBtZXRob2RBcm46IHN0cmluZztcclxuICBoZWFkZXJzPzoge1xyXG4gICAgYXV0aG9yaXphdGlvbj86IHN0cmluZztcclxuICAgIEF1dGhvcml6YXRpb24/OiBzdHJpbmc7XHJcbiAgfTtcclxuICByZXF1ZXN0Q29udGV4dDoge1xyXG4gICAgYWNjb3VudElkOiBzdHJpbmc7XHJcbiAgICBhcGlJZDogc3RyaW5nO1xyXG4gICAgZG9tYWluTmFtZTogc3RyaW5nO1xyXG4gICAgcmVxdWVzdElkOiBzdHJpbmc7XHJcbiAgfTtcclxufVxyXG5cclxuLy8gSUFNIFBvbGljeSBEb2N1bWVudCBmb3IgQVBJIEdhdGV3YXkgSFRUUCBBUElcclxuZXhwb3J0IGludGVyZmFjZSBBdXRob3JpemVyUmVzcG9uc2Uge1xyXG4gIHByaW5jaXBhbElkOiBzdHJpbmc7XHJcbiAgcG9saWN5RG9jdW1lbnQ6IHtcclxuICAgIFZlcnNpb246ICcyMDEyLTEwLTE3JztcclxuICAgIFN0YXRlbWVudDogQXJyYXk8e1xyXG4gICAgICBBY3Rpb246ICdleGVjdXRlLWFwaTpJbnZva2UnO1xyXG4gICAgICBFZmZlY3Q6ICdBbGxvdycgfCAnRGVueSc7XHJcbiAgICAgIFJlc291cmNlOiBzdHJpbmc7XHJcbiAgICB9PjtcclxuICB9O1xyXG4gIGNvbnRleHQ/OiB7XHJcbiAgICB1c2VySWQ6IHN0cmluZztcclxuICAgIGVtYWlsOiBzdHJpbmc7XHJcbiAgICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gICAgcm9sZTogc3RyaW5nO1xyXG4gIH07XHJcbn1cclxuXHJcbi8vIEluaXRpYWxpemUgSldUIHNlcnZpY2UgKG1vZHVsZS1sZXZlbCBmb3IgY2FjaGluZylcclxuY29uc3Qgand0U2VydmljZSA9IG5ldyBKV1RTZXJ2aWNlKCk7XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgSUFNIHBvbGljeSBkb2N1bWVudCBmb3IgQVBJIEdhdGV3YXkgYXV0aG9yaXphdGlvblxyXG4gKiBAcGFyYW0gcHJpbmNpcGFsSWQgLSBVc2VyIGlkZW50aWZpZXIgKHVzZXJJZCBmb3IgQWxsb3csICd1bmF1dGhvcml6ZWQnIGZvciBEZW55KVxyXG4gKiBAcGFyYW0gZWZmZWN0IC0gQWxsb3cgb3IgRGVueVxyXG4gKiBAcGFyYW0gcmVzb3VyY2UgLSBBUEkgR2F0ZXdheSBtZXRob2QgQVJOXHJcbiAqIEBwYXJhbSBjb250ZXh0IC0gVXNlciBjb250ZXh0IChvbmx5IGZvciBBbGxvdyBwb2xpY2llcylcclxuICogQHJldHVybnMgSUFNIHBvbGljeSBkb2N1bWVudFxyXG4gKi9cclxuZnVuY3Rpb24gZ2VuZXJhdGVQb2xpY3koXHJcbiAgcHJpbmNpcGFsSWQ6IHN0cmluZyxcclxuICBlZmZlY3Q6ICdBbGxvdycgfCAnRGVueScsXHJcbiAgcmVzb3VyY2U6IHN0cmluZyxcclxuICBjb250ZXh0Pzoge1xyXG4gICAgdXNlcklkOiBzdHJpbmc7XHJcbiAgICBlbWFpbDogc3RyaW5nO1xyXG4gICAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICAgIHJvbGU6IHN0cmluZztcclxuICB9XHJcbik6IEF1dGhvcml6ZXJSZXNwb25zZSB7XHJcbiAgLy8gRm9yIEhUVFAgQVBJLCB1c2Ugd2lsZGNhcmQgdG8gYWxsb3cvZGVueSBhbGwgcm91dGVzXHJcbiAgLy8gRXh0cmFjdCBBUEkgR2F0ZXdheSBBUk4gcHJlZml4IChhcm46YXdzOmV4ZWN1dGUtYXBpOnJlZ2lvbjphY2NvdW50OmFwaUlkKVxyXG4gIGNvbnN0IGFwaUdhdGV3YXlBcm4gPSByZXNvdXJjZS5zcGxpdCgnLycpLnNsaWNlKDAsIDIpLmpvaW4oJy8nKSArICcvKic7XHJcblxyXG4gIGNvbnN0IHJlc3BvbnNlOiBBdXRob3JpemVyUmVzcG9uc2UgPSB7XHJcbiAgICBwcmluY2lwYWxJZCxcclxuICAgIHBvbGljeURvY3VtZW50OiB7XHJcbiAgICAgIFZlcnNpb246ICcyMDEyLTEwLTE3JyxcclxuICAgICAgU3RhdGVtZW50OiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgQWN0aW9uOiAnZXhlY3V0ZS1hcGk6SW52b2tlJyxcclxuICAgICAgICAgIEVmZmVjdDogZWZmZWN0LFxyXG4gICAgICAgICAgUmVzb3VyY2U6IGFwaUdhdGV3YXlBcm4sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgLy8gQWRkIHVzZXIgY29udGV4dCBmb3IgQWxsb3cgcG9saWNpZXNcclxuICAvLyBBUEkgR2F0ZXdheSByZXF1aXJlcyBjb250ZXh0IHZhbHVlcyB0byBiZSBzdHJpbmdzXHJcbiAgaWYgKGVmZmVjdCA9PT0gJ0FsbG93JyAmJiBjb250ZXh0KSB7XHJcbiAgICByZXNwb25zZS5jb250ZXh0ID0ge1xyXG4gICAgICB1c2VySWQ6IGNvbnRleHQudXNlcklkLFxyXG4gICAgICBlbWFpbDogY29udGV4dC5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IGNvbnRleHQub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIHJvbGU6IGNvbnRleHQucm9sZSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzcG9uc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgQXV0aG9yaXplciBoYW5kbGVyIGZvciBBUEkgR2F0ZXdheSBKV1QgYXV0aGVudGljYXRpb25cclxuICogVmFsaWRhdGVzIEpXVCB0b2tlbnMgYW5kIHJldHVybnMgSUFNIHBvbGljeSBkb2N1bWVudHNcclxuICogXHJcbiAqIEBwYXJhbSBldmVudCAtIEFQSSBHYXRld2F5IGF1dGhvcml6ZXIgZXZlbnRcclxuICogQHJldHVybnMgSUFNIHBvbGljeSBkb2N1bWVudCB3aXRoIHVzZXIgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEF1dGhvcml6ZXJFdmVudCk6IFByb21pc2U8QXV0aG9yaXplclJlc3BvbnNlPiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIExvZyByZXF1ZXN0IChleGNsdWRpbmcgc2Vuc2l0aXZlIHRva2VuIGRhdGEpXHJcbiAgICBjb25zb2xlLmxvZygnQXV0aG9yaXphdGlvbiByZXF1ZXN0OicsIHtcclxuICAgICAgcmVxdWVzdElkOiBldmVudC5yZXF1ZXN0Q29udGV4dC5yZXF1ZXN0SWQsXHJcbiAgICAgIGFwaUlkOiBldmVudC5yZXF1ZXN0Q29udGV4dC5hcGlJZCxcclxuICAgICAgaGFzQXV0aEhlYWRlcjogISEoZXZlbnQuaGVhZGVycz8uYXV0aG9yaXphdGlvbiB8fCBldmVudC5oZWFkZXJzPy5BdXRob3JpemF0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEV4dHJhY3QgQXV0aG9yaXphdGlvbiBoZWFkZXIgKGNhc2UtaW5zZW5zaXRpdmUpXHJcbiAgICBjb25zdCBhdXRoSGVhZGVyID0gZXZlbnQuaGVhZGVycz8uYXV0aG9yaXphdGlvbiB8fCBldmVudC5oZWFkZXJzPy5BdXRob3JpemF0aW9uO1xyXG5cclxuICAgIGlmICghYXV0aEhlYWRlcikge1xyXG4gICAgICBjb25zb2xlLmxvZygnQXV0aG9yaXphdGlvbiBoZWFkZXIgbWlzc2luZycpO1xyXG4gICAgICByZXR1cm4gZ2VuZXJhdGVQb2xpY3koJ3VuYXV0aG9yaXplZCcsICdEZW55JywgZXZlbnQubWV0aG9kQXJuKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBFeHRyYWN0IHRva2VuIGZyb20gXCJCZWFyZXIgPHRva2VuPlwiIGZvcm1hdFxyXG4gICAgY29uc3QgdG9rZW4gPSBqd3RTZXJ2aWNlLmV4dHJhY3RUb2tlbkZyb21IZWFkZXIoYXV0aEhlYWRlcik7XHJcblxyXG4gICAgaWYgKCF0b2tlbikge1xyXG4gICAgICBjb25zb2xlLmxvZygnSW52YWxpZCBBdXRob3JpemF0aW9uIGhlYWRlciBmb3JtYXQgKGV4cGVjdGVkIFwiQmVhcmVyIDx0b2tlbj5cIiknKTtcclxuICAgICAgcmV0dXJuIGdlbmVyYXRlUG9saWN5KCd1bmF1dGhvcml6ZWQnLCAnRGVueScsIGV2ZW50Lm1ldGhvZEFybik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmVyaWZ5IEpXVCB0b2tlbiB1c2luZyBleGlzdGluZyBKV1RfU2VydmljZVxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlciA9IGF3YWl0IGp3dFNlcnZpY2UudmVyaWZ5QWNjZXNzVG9rZW4odG9rZW4pO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coJ0F1dGhvcml6YXRpb24gc3VjY2Vzc2Z1bCcsIHtcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICAgIHJvbGU6IHVzZXIucm9sZSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBBbGxvdyBwb2xpY3kgd2l0aCB1c2VyIGNvbnRleHRcclxuICAgICAgcmV0dXJuIGdlbmVyYXRlUG9saWN5KHVzZXIudXNlcklkLCAnQWxsb3cnLCBldmVudC5tZXRob2RBcm4sIHtcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIHJvbGU6IHVzZXIucm9sZSxcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoICh2ZXJpZnlFcnJvcikge1xyXG4gICAgICAvLyBIYW5kbGUgSldUIHZlcmlmaWNhdGlvbiBlcnJvcnNcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gdmVyaWZ5RXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IHZlcmlmeUVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0pXVCB2ZXJpZmljYXRpb24gZmFpbGVkOicsIGVycm9yTWVzc2FnZSk7XHJcblxyXG4gICAgICAvLyBMb2cgc3BlY2lmaWMgZXJyb3IgdHlwZXMgZm9yIHRyb3VibGVzaG9vdGluZ1xyXG4gICAgICBpZiAoZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdleHBpcmVkJykpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnVG9rZW4gZXhwaXJlZCcpO1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yTWVzc2FnZS5pbmNsdWRlcygnaW52YWxpZCcpKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0ludmFsaWQgdG9rZW4gc2lnbmF0dXJlIG9yIGZvcm1hdCcpO1xyXG4gICAgICB9IGVsc2UgaWYgKGVycm9yTWVzc2FnZS5pbmNsdWRlcygnU2VjcmV0cyBNYW5hZ2VyJykpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdTZWNyZXRzIE1hbmFnZXIgYWNjZXNzIGZhaWxlZDonLCBlcnJvck1lc3NhZ2UpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gZ2VuZXJhdGVQb2xpY3koJ3VuYXV0aG9yaXplZCcsICdEZW55JywgZXZlbnQubWV0aG9kQXJuKTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgLy8gSGFuZGxlIHVuZXhwZWN0ZWQgZXJyb3JzXHJcbiAgICBjb25zb2xlLmVycm9yKCdVbmV4cGVjdGVkIGF1dGhvcml6YXRpb24gZXJyb3I6Jywge1xyXG4gICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIHN0YWNrOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiB1bmRlZmluZWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZ2VuZXJhdGVQb2xpY3koJ3VuYXV0aG9yaXplZCcsICdEZW55JywgZXZlbnQubWV0aG9kQXJuKTtcclxuICB9XHJcbn07XHJcbiJdfQ==
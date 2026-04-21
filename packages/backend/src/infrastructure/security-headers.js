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
exports.SecurityHeaders = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const constructs_1 = require("constructs");
class SecurityHeaders extends constructs_1.Construct {
    responseParameters;
    cloudfrontResponseHeadersPolicy;
    constructor(scope, id, props) {
        super(scope, id);
        const { environment } = props;
        // Define security headers for API Gateway responses
        this.responseParameters = {
            // Prevent clickjacking attacks
            'method.response.header.X-Frame-Options': "'DENY'",
            // Prevent MIME type sniffing
            'method.response.header.X-Content-Type-Options': "'nosniff'",
            // Enable XSS protection
            'method.response.header.X-XSS-Protection': "'1; mode=block'",
            // Enforce HTTPS
            'method.response.header.Strict-Transport-Security': "'max-age=31536000; includeSubDomains; preload'",
            // Content Security Policy
            'method.response.header.Content-Security-Policy': environment === 'production'
                ? "'default-src \\'self\\'; script-src \\'self\\' \\'unsafe-inline\\' \\'unsafe-eval\\' https://cdn.jsdelivr.net; style-src \\'self\\' \\'unsafe-inline\\' https://fonts.googleapis.com; font-src \\'self\\' https://fonts.gstatic.com; img-src \\'self\\' data: https:; connect-src \\'self\\' https://*.amazonaws.com; frame-ancestors \\'none\\'; base-uri \\'self\\'; form-action \\'self\\''"
                : "'default-src \\'self\\'; script-src \\'self\\' \\'unsafe-inline\\' \\'unsafe-eval\\'; style-src \\'self\\' \\'unsafe-inline\\'; img-src \\'self\\' data: https:; connect-src \\'self\\' http://localhost:* https://*.amazonaws.com https://*.vercel.app; frame-ancestors \\'none\\''",
            // Referrer Policy
            'method.response.header.Referrer-Policy': "'strict-origin-when-cross-origin'",
            // Permissions Policy (formerly Feature Policy)
            'method.response.header.Permissions-Policy': "'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'",
            // Cache Control for sensitive data
            'method.response.header.Cache-Control': "'no-store, no-cache, must-revalidate, proxy-revalidate'",
            'method.response.header.Pragma': "'no-cache'",
            'method.response.header.Expires': "'0'",
            // Custom security headers
            'method.response.header.X-Powered-By': "'MISRA Platform'",
            'method.response.header.X-Request-ID': "'$context.requestId'",
        };
        // Create CloudFront Response Headers Policy for frontend
        this.cloudfrontResponseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
            responseHeadersPolicyName: `misra-platform-security-headers-${environment}`,
            comment: `Security headers for MISRA Platform ${environment}`,
            securityHeadersBehavior: {
                // Prevent clickjacking
                frameOptions: {
                    frameOption: cloudfront.HeadersFrameOption.DENY,
                    override: true,
                },
                // Prevent MIME type sniffing
                contentTypeOptions: {
                    override: true,
                },
                // Enable XSS protection
                xssProtection: {
                    protection: true,
                    modeBlock: true,
                    override: true,
                },
                // Enforce HTTPS
                strictTransportSecurity: {
                    accessControlMaxAge: cdk.Duration.seconds(31536000),
                    includeSubdomains: true,
                    preload: true,
                    override: true,
                },
                // Referrer Policy
                referrerPolicy: {
                    referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                    override: true,
                },
                // Content Security Policy
                contentSecurityPolicy: {
                    contentSecurityPolicy: environment === 'production'
                        ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.amazonaws.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
                        : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:* https://*.amazonaws.com https://*.vercel.app; frame-ancestors 'none'",
                    override: true,
                },
            },
            // Custom headers
            customHeadersBehavior: {
                customHeaders: [
                    {
                        header: 'X-Powered-By',
                        value: 'MISRA Platform',
                        override: true,
                    },
                    {
                        header: 'Permissions-Policy',
                        value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
                        override: true,
                    },
                ],
            },
            // CORS headers (if needed)
            corsBehavior: environment !== 'production' ? {
                accessControlAllowOrigins: ['http://localhost:3000', 'http://localhost:5173', 'https://*.vercel.app'],
                accessControlAllowHeaders: ['*'],
                accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE', 'PATCH'],
                accessControlAllowCredentials: false,
                accessControlMaxAge: cdk.Duration.seconds(600),
                originOverride: true,
            } : undefined,
        });
        // Output the policy ID
        new cdk.CfnOutput(this, 'ResponseHeadersPolicyId', {
            value: this.cloudfrontResponseHeadersPolicy.responseHeadersPolicyId,
            description: `CloudFront Response Headers Policy ID for ${environment}`,
            exportName: `${cdk.Stack.of(this).stackName}-ResponseHeadersPolicyId`,
        });
    }
    /**
     * Get method response parameters for API Gateway
     */
    getMethodResponseParameters() {
        const parameters = {};
        Object.keys(this.responseParameters).forEach(key => {
            parameters[key] = true;
        });
        return parameters;
    }
    /**
     * Get integration response parameters for API Gateway
     */
    getIntegrationResponseParameters() {
        return this.responseParameters;
    }
    /**
     * Apply security headers to an API Gateway method
     */
    applyToMethod(method) {
        // Get the method resource
        const methodResource = method.node.defaultChild;
        // Add response parameters to method responses
        if (methodResource.methodResponses && Array.isArray(methodResource.methodResponses)) {
            methodResource.methodResponses = methodResource.methodResponses.map((response) => ({
                ...response,
                responseParameters: {
                    ...response.responseParameters,
                    ...this.getMethodResponseParameters(),
                },
            }));
        }
    }
    /**
     * Create a Gateway Response with security headers
     */
    createGatewayResponse(api, type, statusCode, id) {
        return api.addGatewayResponse(id, {
            type,
            statusCode,
            responseHeaders: this.responseParameters,
        });
    }
    /**
     * Apply security headers to all default Gateway Responses
     */
    applyToGatewayResponses(api) {
        // Apply to common error responses
        const responseTypes = [
            { type: apigateway.ResponseType.DEFAULT_4XX, statusCode: '400', id: 'Default4XXResponse' },
            { type: apigateway.ResponseType.DEFAULT_5XX, statusCode: '500', id: 'Default5XXResponse' },
            { type: apigateway.ResponseType.UNAUTHORIZED, statusCode: '401', id: 'UnauthorizedResponse' },
            { type: apigateway.ResponseType.ACCESS_DENIED, statusCode: '403', id: 'AccessDeniedResponse' },
            { type: apigateway.ResponseType.RESOURCE_NOT_FOUND, statusCode: '404', id: 'ResourceNotFoundResponse' },
            { type: apigateway.ResponseType.THROTTLED, statusCode: '429', id: 'ThrottledResponse' },
            { type: apigateway.ResponseType.BAD_REQUEST_BODY, statusCode: '400', id: 'BadRequestBodyResponse' },
            { type: apigateway.ResponseType.BAD_REQUEST_PARAMETERS, statusCode: '400', id: 'BadRequestParametersResponse' },
            { type: apigateway.ResponseType.EXPIRED_TOKEN, statusCode: '403', id: 'ExpiredTokenResponse' },
            { type: apigateway.ResponseType.INVALID_API_KEY, statusCode: '403', id: 'InvalidApiKeyResponse' },
            { type: apigateway.ResponseType.INVALID_SIGNATURE, statusCode: '403', id: 'InvalidSignatureResponse' },
            { type: apigateway.ResponseType.MISSING_AUTHENTICATION_TOKEN, statusCode: '403', id: 'MissingAuthTokenResponse' },
            { type: apigateway.ResponseType.QUOTA_EXCEEDED, statusCode: '429', id: 'QuotaExceededResponse' },
            { type: apigateway.ResponseType.REQUEST_TOO_LARGE, statusCode: '413', id: 'RequestTooLargeResponse' },
        ];
        responseTypes.forEach(({ type, statusCode, id }) => {
            this.createGatewayResponse(api, type, statusCode, id);
        });
    }
}
exports.SecurityHeaders = SecurityHeaders;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJpdHktaGVhZGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlY3VyaXR5LWhlYWRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCx1RUFBeUQ7QUFDekQsMkNBQXVDO0FBTXZDLE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQUM1QixrQkFBa0IsQ0FBNEI7SUFDOUMsK0JBQStCLENBQW1DO0lBRWxGLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTlCLG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsa0JBQWtCLEdBQUc7WUFDeEIsK0JBQStCO1lBQy9CLHdDQUF3QyxFQUFFLFFBQVE7WUFFbEQsNkJBQTZCO1lBQzdCLCtDQUErQyxFQUFFLFdBQVc7WUFFNUQsd0JBQXdCO1lBQ3hCLHlDQUF5QyxFQUFFLGlCQUFpQjtZQUU1RCxnQkFBZ0I7WUFDaEIsa0RBQWtELEVBQUUsZ0RBQWdEO1lBRXBHLDBCQUEwQjtZQUMxQixnREFBZ0QsRUFBRSxXQUFXLEtBQUssWUFBWTtnQkFDNUUsQ0FBQyxDQUFDLGdZQUFnWTtnQkFDbFksQ0FBQyxDQUFDLHNSQUFzUjtZQUUxUixrQkFBa0I7WUFDbEIsd0NBQXdDLEVBQUUsbUNBQW1DO1lBRTdFLCtDQUErQztZQUMvQywyQ0FBMkMsRUFBRSxpSEFBaUg7WUFFOUosbUNBQW1DO1lBQ25DLHNDQUFzQyxFQUFFLHlEQUF5RDtZQUNqRywrQkFBK0IsRUFBRSxZQUFZO1lBQzdDLGdDQUFnQyxFQUFFLEtBQUs7WUFFdkMsMEJBQTBCO1lBQzFCLHFDQUFxQyxFQUFFLGtCQUFrQjtZQUN6RCxxQ0FBcUMsRUFBRSxzQkFBc0I7U0FDOUQs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LEVBQUUsRUFBRSx1QkFBdUIsRUFBRTtZQUNqRyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLDBCQUEwQixFQUFFO1lBQ3RHLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsMEJBQTBCLEVBQUU7WUFDakgsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsdUJBQXVCLEVBQUU7WUFDaEcsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSx5QkFBeUIsRUFBRTtTQUN0RyxDQUFDO1FBRUYsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ2pELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQS9NRCwwQ0ErTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcclxuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTZWN1cml0eUhlYWRlcnNQcm9wcyB7XHJcbiAgZW52aXJvbm1lbnQ6ICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2VjdXJpdHlIZWFkZXJzIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xyXG4gIHB1YmxpYyByZWFkb25seSBjbG91ZGZyb250UmVzcG9uc2VIZWFkZXJzUG9saWN5OiBjbG91ZGZyb250LlJlc3BvbnNlSGVhZGVyc1BvbGljeTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFNlY3VyaXR5SGVhZGVyc1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQgfSA9IHByb3BzO1xyXG5cclxuICAgIC8vIERlZmluZSBzZWN1cml0eSBoZWFkZXJzIGZvciBBUEkgR2F0ZXdheSByZXNwb25zZXNcclxuICAgIHRoaXMucmVzcG9uc2VQYXJhbWV0ZXJzID0ge1xyXG4gICAgICAvLyBQcmV2ZW50IGNsaWNramFja2luZyBhdHRhY2tzXHJcbiAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLlgtRnJhbWUtT3B0aW9ucyc6IFwiJ0RFTlknXCIsXHJcbiAgICAgIFxyXG4gICAgICAvLyBQcmV2ZW50IE1JTUUgdHlwZSBzbmlmZmluZ1xyXG4gICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5YLUNvbnRlbnQtVHlwZS1PcHRpb25zJzogXCInbm9zbmlmZidcIixcclxuICAgICAgXHJcbiAgICAgIC8vIEVuYWJsZSBYU1MgcHJvdGVjdGlvblxyXG4gICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5YLVhTUy1Qcm90ZWN0aW9uJzogXCInMTsgbW9kZT1ibG9jaydcIixcclxuICAgICAgXHJcbiAgICAgIC8vIEVuZm9yY2UgSFRUUFNcclxuICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuU3RyaWN0LVRyYW5zcG9ydC1TZWN1cml0eSc6IFwiJ21heC1hZ2U9MzE1MzYwMDA7IGluY2x1ZGVTdWJEb21haW5zOyBwcmVsb2FkJ1wiLFxyXG4gICAgICBcclxuICAgICAgLy8gQ29udGVudCBTZWN1cml0eSBQb2xpY3lcclxuICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ29udGVudC1TZWN1cml0eS1Qb2xpY3knOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nXHJcbiAgICAgICAgPyBcIidkZWZhdWx0LXNyYyBcXFxcJ3NlbGZcXFxcJzsgc2NyaXB0LXNyYyBcXFxcJ3NlbGZcXFxcJyBcXFxcJ3Vuc2FmZS1pbmxpbmVcXFxcJyBcXFxcJ3Vuc2FmZS1ldmFsXFxcXCcgaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0OyBzdHlsZS1zcmMgXFxcXCdzZWxmXFxcXCcgXFxcXCd1bnNhZmUtaW5saW5lXFxcXCcgaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbTsgZm9udC1zcmMgXFxcXCdzZWxmXFxcXCcgaHR0cHM6Ly9mb250cy5nc3RhdGljLmNvbTsgaW1nLXNyYyBcXFxcJ3NlbGZcXFxcJyBkYXRhOiBodHRwczo7IGNvbm5lY3Qtc3JjIFxcXFwnc2VsZlxcXFwnIGh0dHBzOi8vKi5hbWF6b25hd3MuY29tOyBmcmFtZS1hbmNlc3RvcnMgXFxcXCdub25lXFxcXCc7IGJhc2UtdXJpIFxcXFwnc2VsZlxcXFwnOyBmb3JtLWFjdGlvbiBcXFxcJ3NlbGZcXFxcJydcIlxyXG4gICAgICAgIDogXCInZGVmYXVsdC1zcmMgXFxcXCdzZWxmXFxcXCc7IHNjcmlwdC1zcmMgXFxcXCdzZWxmXFxcXCcgXFxcXCd1bnNhZmUtaW5saW5lXFxcXCcgXFxcXCd1bnNhZmUtZXZhbFxcXFwnOyBzdHlsZS1zcmMgXFxcXCdzZWxmXFxcXCcgXFxcXCd1bnNhZmUtaW5saW5lXFxcXCc7IGltZy1zcmMgXFxcXCdzZWxmXFxcXCcgZGF0YTogaHR0cHM6OyBjb25uZWN0LXNyYyBcXFxcJ3NlbGZcXFxcJyBodHRwOi8vbG9jYWxob3N0OiogaHR0cHM6Ly8qLmFtYXpvbmF3cy5jb20gaHR0cHM6Ly8qLnZlcmNlbC5hcHA7IGZyYW1lLWFuY2VzdG9ycyBcXFxcJ25vbmVcXFxcJydcIixcclxuICAgICAgXHJcbiAgICAgIC8vIFJlZmVycmVyIFBvbGljeVxyXG4gICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5SZWZlcnJlci1Qb2xpY3knOiBcIidzdHJpY3Qtb3JpZ2luLXdoZW4tY3Jvc3Mtb3JpZ2luJ1wiLFxyXG4gICAgICBcclxuICAgICAgLy8gUGVybWlzc2lvbnMgUG9saWN5IChmb3JtZXJseSBGZWF0dXJlIFBvbGljeSlcclxuICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuUGVybWlzc2lvbnMtUG9saWN5JzogXCInZ2VvbG9jYXRpb249KCksIG1pY3JvcGhvbmU9KCksIGNhbWVyYT0oKSwgcGF5bWVudD0oKSwgdXNiPSgpLCBtYWduZXRvbWV0ZXI9KCksIGd5cm9zY29wZT0oKSwgYWNjZWxlcm9tZXRlcj0oKSdcIixcclxuICAgICAgXHJcbiAgICAgIC8vIENhY2hlIENvbnRyb2wgZm9yIHNlbnNpdGl2ZSBkYXRhXHJcbiAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkNhY2hlLUNvbnRyb2wnOiBcIiduby1zdG9yZSwgbm8tY2FjaGUsIG11c3QtcmV2YWxpZGF0ZSwgcHJveHktcmV2YWxpZGF0ZSdcIixcclxuICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuUHJhZ21hJzogXCInbm8tY2FjaGUnXCIsXHJcbiAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkV4cGlyZXMnOiBcIicwJ1wiLFxyXG4gICAgICBcclxuICAgICAgLy8gQ3VzdG9tIHNlY3VyaXR5IGhlYWRlcnNcclxuICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuWC1Qb3dlcmVkLUJ5JzogXCInTUlTUkEgUGxhdGZvcm0nXCIsXHJcbiAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLlgtUmVxdWVzdC1JRCc6IFwiJyRjb250ZXh0LnJlcXVlc3RJZCdcIixcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ3JlYXRlIENsb3VkRnJvbnQgUmVzcG9uc2UgSGVhZGVycyBQb2xpY3kgZm9yIGZyb250ZW5kXHJcbiAgICB0aGlzLmNsb3VkZnJvbnRSZXNwb25zZUhlYWRlcnNQb2xpY3kgPSBuZXcgY2xvdWRmcm9udC5SZXNwb25zZUhlYWRlcnNQb2xpY3kodGhpcywgJ1NlY3VyaXR5SGVhZGVyc1BvbGljeScsIHtcclxuICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5TmFtZTogYG1pc3JhLXBsYXRmb3JtLXNlY3VyaXR5LWhlYWRlcnMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBjb21tZW50OiBgU2VjdXJpdHkgaGVhZGVycyBmb3IgTUlTUkEgUGxhdGZvcm0gJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBcclxuICAgICAgc2VjdXJpdHlIZWFkZXJzQmVoYXZpb3I6IHtcclxuICAgICAgICAvLyBQcmV2ZW50IGNsaWNramFja2luZ1xyXG4gICAgICAgIGZyYW1lT3B0aW9uczoge1xyXG4gICAgICAgICAgZnJhbWVPcHRpb246IGNsb3VkZnJvbnQuSGVhZGVyc0ZyYW1lT3B0aW9uLkRFTlksXHJcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFByZXZlbnQgTUlNRSB0eXBlIHNuaWZmaW5nXHJcbiAgICAgICAgY29udGVudFR5cGVPcHRpb25zOiB7XHJcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEVuYWJsZSBYU1MgcHJvdGVjdGlvblxyXG4gICAgICAgIHhzc1Byb3RlY3Rpb246IHtcclxuICAgICAgICAgIHByb3RlY3Rpb246IHRydWUsXHJcbiAgICAgICAgICBtb2RlQmxvY2s6IHRydWUsXHJcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEVuZm9yY2UgSFRUUFNcclxuICAgICAgICBzdHJpY3RUcmFuc3BvcnRTZWN1cml0eToge1xyXG4gICAgICAgICAgYWNjZXNzQ29udHJvbE1heEFnZTogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzE1MzYwMDApLFxyXG4gICAgICAgICAgaW5jbHVkZVN1YmRvbWFpbnM6IHRydWUsXHJcbiAgICAgICAgICBwcmVsb2FkOiB0cnVlLFxyXG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBcclxuICAgICAgICAvLyBSZWZlcnJlciBQb2xpY3lcclxuICAgICAgICByZWZlcnJlclBvbGljeToge1xyXG4gICAgICAgICAgcmVmZXJyZXJQb2xpY3k6IGNsb3VkZnJvbnQuSGVhZGVyc1JlZmVycmVyUG9saWN5LlNUUklDVF9PUklHSU5fV0hFTl9DUk9TU19PUklHSU4sXHJcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENvbnRlbnQgU2VjdXJpdHkgUG9saWN5XHJcbiAgICAgICAgY29udGVudFNlY3VyaXR5UG9saWN5OiB7XHJcbiAgICAgICAgICBjb250ZW50U2VjdXJpdHlQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbidcclxuICAgICAgICAgICAgPyBcImRlZmF1bHQtc3JjICdzZWxmJzsgc2NyaXB0LXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnICd1bnNhZmUtZXZhbCcgaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0OyBzdHlsZS1zcmMgJ3NlbGYnICd1bnNhZmUtaW5saW5lJyBodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tOyBmb250LXNyYyAnc2VsZicgaHR0cHM6Ly9mb250cy5nc3RhdGljLmNvbTsgaW1nLXNyYyAnc2VsZicgZGF0YTogaHR0cHM6OyBjb25uZWN0LXNyYyAnc2VsZicgaHR0cHM6Ly8qLmFtYXpvbmF3cy5jb207IGZyYW1lLWFuY2VzdG9ycyAnbm9uZSc7IGJhc2UtdXJpICdzZWxmJzsgZm9ybS1hY3Rpb24gJ3NlbGYnXCJcclxuICAgICAgICAgICAgOiBcImRlZmF1bHQtc3JjICdzZWxmJzsgc2NyaXB0LXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnICd1bnNhZmUtZXZhbCc7IHN0eWxlLXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnOyBpbWctc3JjICdzZWxmJyBkYXRhOiBodHRwczo7IGNvbm5lY3Qtc3JjICdzZWxmJyBodHRwOi8vbG9jYWxob3N0OiogaHR0cHM6Ly8qLmFtYXpvbmF3cy5jb20gaHR0cHM6Ly8qLnZlcmNlbC5hcHA7IGZyYW1lLWFuY2VzdG9ycyAnbm9uZSdcIixcclxuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIFxyXG4gICAgICAvLyBDdXN0b20gaGVhZGVyc1xyXG4gICAgICBjdXN0b21IZWFkZXJzQmVoYXZpb3I6IHtcclxuICAgICAgICBjdXN0b21IZWFkZXJzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGhlYWRlcjogJ1gtUG93ZXJlZC1CeScsXHJcbiAgICAgICAgICAgIHZhbHVlOiAnTUlTUkEgUGxhdGZvcm0nLFxyXG4gICAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGhlYWRlcjogJ1Blcm1pc3Npb25zLVBvbGljeScsXHJcbiAgICAgICAgICAgIHZhbHVlOiAnZ2VvbG9jYXRpb249KCksIG1pY3JvcGhvbmU9KCksIGNhbWVyYT0oKSwgcGF5bWVudD0oKSwgdXNiPSgpLCBtYWduZXRvbWV0ZXI9KCksIGd5cm9zY29wZT0oKSwgYWNjZWxlcm9tZXRlcj0oKScsXHJcbiAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICBcclxuICAgICAgLy8gQ09SUyBoZWFkZXJzIChpZiBuZWVkZWQpXHJcbiAgICAgIGNvcnNCZWhhdmlvcjogZW52aXJvbm1lbnQgIT09ICdwcm9kdWN0aW9uJyA/IHtcclxuICAgICAgICBhY2Nlc3NDb250cm9sQWxsb3dPcmlnaW5zOiBbJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsICdodHRwOi8vbG9jYWxob3N0OjUxNzMnLCAnaHR0cHM6Ly8qLnZlcmNlbC5hcHAnXSxcclxuICAgICAgICBhY2Nlc3NDb250cm9sQWxsb3dIZWFkZXJzOiBbJyonXSxcclxuICAgICAgICBhY2Nlc3NDb250cm9sQWxsb3dNZXRob2RzOiBbJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnLCAnREVMRVRFJywgJ1BBVENIJ10sXHJcbiAgICAgICAgYWNjZXNzQ29udHJvbEFsbG93Q3JlZGVudGlhbHM6IGZhbHNlLFxyXG4gICAgICAgIGFjY2Vzc0NvbnRyb2xNYXhBZ2U6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwMCksXHJcbiAgICAgICAgb3JpZ2luT3ZlcnJpZGU6IHRydWUsXHJcbiAgICAgIH0gOiB1bmRlZmluZWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgdGhlIHBvbGljeSBJRFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Jlc3BvbnNlSGVhZGVyc1BvbGljeUlkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5jbG91ZGZyb250UmVzcG9uc2VIZWFkZXJzUG9saWN5LnJlc3BvbnNlSGVhZGVyc1BvbGljeUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYENsb3VkRnJvbnQgUmVzcG9uc2UgSGVhZGVycyBQb2xpY3kgSUQgZm9yICR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7Y2RrLlN0YWNrLm9mKHRoaXMpLnN0YWNrTmFtZX0tUmVzcG9uc2VIZWFkZXJzUG9saWN5SWRgLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgbWV0aG9kIHJlc3BvbnNlIHBhcmFtZXRlcnMgZm9yIEFQSSBHYXRld2F5XHJcbiAgICovXHJcbiAgcHVibGljIGdldE1ldGhvZFJlc3BvbnNlUGFyYW1ldGVycygpOiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSB7XHJcbiAgICBjb25zdCBwYXJhbWV0ZXJzOiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSA9IHt9O1xyXG4gICAgXHJcbiAgICBPYmplY3Qua2V5cyh0aGlzLnJlc3BvbnNlUGFyYW1ldGVycykuZm9yRWFjaChrZXkgPT4ge1xyXG4gICAgICBwYXJhbWV0ZXJzW2tleV0gPSB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIHJldHVybiBwYXJhbWV0ZXJzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGludGVncmF0aW9uIHJlc3BvbnNlIHBhcmFtZXRlcnMgZm9yIEFQSSBHYXRld2F5XHJcbiAgICovXHJcbiAgcHVibGljIGdldEludGVncmF0aW9uUmVzcG9uc2VQYXJhbWV0ZXJzKCk6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0ge1xyXG4gICAgcmV0dXJuIHRoaXMucmVzcG9uc2VQYXJhbWV0ZXJzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQXBwbHkgc2VjdXJpdHkgaGVhZGVycyB0byBhbiBBUEkgR2F0ZXdheSBtZXRob2RcclxuICAgKi9cclxuICBwdWJsaWMgYXBwbHlUb01ldGhvZChtZXRob2Q6IGFwaWdhdGV3YXkuTWV0aG9kKTogdm9pZCB7XHJcbiAgICAvLyBHZXQgdGhlIG1ldGhvZCByZXNvdXJjZVxyXG4gICAgY29uc3QgbWV0aG9kUmVzb3VyY2UgPSBtZXRob2Qubm9kZS5kZWZhdWx0Q2hpbGQgYXMgYXBpZ2F0ZXdheS5DZm5NZXRob2Q7XHJcbiAgICBcclxuICAgIC8vIEFkZCByZXNwb25zZSBwYXJhbWV0ZXJzIHRvIG1ldGhvZCByZXNwb25zZXNcclxuICAgIGlmIChtZXRob2RSZXNvdXJjZS5tZXRob2RSZXNwb25zZXMgJiYgQXJyYXkuaXNBcnJheShtZXRob2RSZXNvdXJjZS5tZXRob2RSZXNwb25zZXMpKSB7XHJcbiAgICAgIG1ldGhvZFJlc291cmNlLm1ldGhvZFJlc3BvbnNlcyA9IG1ldGhvZFJlc291cmNlLm1ldGhvZFJlc3BvbnNlcy5tYXAoKHJlc3BvbnNlOiBhbnkpID0+ICh7XHJcbiAgICAgICAgLi4ucmVzcG9uc2UsXHJcbiAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICAuLi5yZXNwb25zZS5yZXNwb25zZVBhcmFtZXRlcnMsXHJcbiAgICAgICAgICAuLi50aGlzLmdldE1ldGhvZFJlc3BvbnNlUGFyYW1ldGVycygpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIEdhdGV3YXkgUmVzcG9uc2Ugd2l0aCBzZWN1cml0eSBoZWFkZXJzXHJcbiAgICovXHJcbiAgcHVibGljIGNyZWF0ZUdhdGV3YXlSZXNwb25zZShcclxuICAgIGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpLFxyXG4gICAgdHlwZTogYXBpZ2F0ZXdheS5SZXNwb25zZVR5cGUsXHJcbiAgICBzdGF0dXNDb2RlOiBzdHJpbmcsXHJcbiAgICBpZDogc3RyaW5nXHJcbiAgKTogYXBpZ2F0ZXdheS5HYXRld2F5UmVzcG9uc2Uge1xyXG4gICAgcmV0dXJuIGFwaS5hZGRHYXRld2F5UmVzcG9uc2UoaWQsIHtcclxuICAgICAgdHlwZSxcclxuICAgICAgc3RhdHVzQ29kZSxcclxuICAgICAgcmVzcG9uc2VIZWFkZXJzOiB0aGlzLnJlc3BvbnNlUGFyYW1ldGVycyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQXBwbHkgc2VjdXJpdHkgaGVhZGVycyB0byBhbGwgZGVmYXVsdCBHYXRld2F5IFJlc3BvbnNlc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBhcHBseVRvR2F0ZXdheVJlc3BvbnNlcyhhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaSk6IHZvaWQge1xyXG4gICAgLy8gQXBwbHkgdG8gY29tbW9uIGVycm9yIHJlc3BvbnNlc1xyXG4gICAgY29uc3QgcmVzcG9uc2VUeXBlcyA9IFtcclxuICAgICAgeyB0eXBlOiBhcGlnYXRld2F5LlJlc3BvbnNlVHlwZS5ERUZBVUxUXzRYWCwgc3RhdHVzQ29kZTogJzQwMCcsIGlkOiAnRGVmYXVsdDRYWFJlc3BvbnNlJyB9LFxyXG4gICAgICB7IHR5cGU6IGFwaWdhdGV3YXkuUmVzcG9uc2VUeXBlLkRFRkFVTFRfNVhYLCBzdGF0dXNDb2RlOiAnNTAwJywgaWQ6ICdEZWZhdWx0NVhYUmVzcG9uc2UnIH0sXHJcbiAgICAgIHsgdHlwZTogYXBpZ2F0ZXdheS5SZXNwb25zZVR5cGUuVU5BVVRIT1JJWkVELCBzdGF0dXNDb2RlOiAnNDAxJywgaWQ6ICdVbmF1dGhvcml6ZWRSZXNwb25zZScgfSxcclxuICAgICAgeyB0eXBlOiBhcGlnYXRld2F5LlJlc3BvbnNlVHlwZS5BQ0NFU1NfREVOSUVELCBzdGF0dXNDb2RlOiAnNDAzJywgaWQ6ICdBY2Nlc3NEZW5pZWRSZXNwb25zZScgfSxcclxuICAgICAgeyB0eXBlOiBhcGlnYXRld2F5LlJlc3BvbnNlVHlwZS5SRVNPVVJDRV9OT1RfRk9VTkQsIHN0YXR1c0NvZGU6ICc0MDQnLCBpZDogJ1Jlc291cmNlTm90Rm91bmRSZXNwb25zZScgfSxcclxuICAgICAgeyB0eXBlOiBhcGlnYXRld2F5LlJlc3BvbnNlVHlwZS5USFJPVFRMRUQsIHN0YXR1c0NvZGU6ICc0MjknLCBpZDogJ1Rocm90dGxlZFJlc3BvbnNlJyB9LFxyXG4gICAgICB7IHR5cGU6IGFwaWdhdGV3YXkuUmVzcG9uc2VUeXBlLkJBRF9SRVFVRVNUX0JPRFksIHN0YXR1c0NvZGU6ICc0MDAnLCBpZDogJ0JhZFJlcXVlc3RCb2R5UmVzcG9uc2UnIH0sXHJcbiAgICAgIHsgdHlwZTogYXBpZ2F0ZXdheS5SZXNwb25zZVR5cGUuQkFEX1JFUVVFU1RfUEFSQU1FVEVSUywgc3RhdHVzQ29kZTogJzQwMCcsIGlkOiAnQmFkUmVxdWVzdFBhcmFtZXRlcnNSZXNwb25zZScgfSxcclxuICAgICAgeyB0eXBlOiBhcGlnYXRld2F5LlJlc3BvbnNlVHlwZS5FWFBJUkVEX1RPS0VOLCBzdGF0dXNDb2RlOiAnNDAzJywgaWQ6ICdFeHBpcmVkVG9rZW5SZXNwb25zZScgfSxcclxuICAgICAgeyB0eXBlOiBhcGlnYXRld2F5LlJlc3BvbnNlVHlwZS5JTlZBTElEX0FQSV9LRVksIHN0YXR1c0NvZGU6ICc0MDMnLCBpZDogJ0ludmFsaWRBcGlLZXlSZXNwb25zZScgfSxcclxuICAgICAgeyB0eXBlOiBhcGlnYXRld2F5LlJlc3BvbnNlVHlwZS5JTlZBTElEX1NJR05BVFVSRSwgc3RhdHVzQ29kZTogJzQwMycsIGlkOiAnSW52YWxpZFNpZ25hdHVyZVJlc3BvbnNlJyB9LFxyXG4gICAgICB7IHR5cGU6IGFwaWdhdGV3YXkuUmVzcG9uc2VUeXBlLk1JU1NJTkdfQVVUSEVOVElDQVRJT05fVE9LRU4sIHN0YXR1c0NvZGU6ICc0MDMnLCBpZDogJ01pc3NpbmdBdXRoVG9rZW5SZXNwb25zZScgfSxcclxuICAgICAgeyB0eXBlOiBhcGlnYXRld2F5LlJlc3BvbnNlVHlwZS5RVU9UQV9FWENFRURFRCwgc3RhdHVzQ29kZTogJzQyOScsIGlkOiAnUXVvdGFFeGNlZWRlZFJlc3BvbnNlJyB9LFxyXG4gICAgICB7IHR5cGU6IGFwaWdhdGV3YXkuUmVzcG9uc2VUeXBlLlJFUVVFU1RfVE9PX0xBUkdFLCBzdGF0dXNDb2RlOiAnNDEzJywgaWQ6ICdSZXF1ZXN0VG9vTGFyZ2VSZXNwb25zZScgfSxcclxuICAgIF07XHJcblxyXG4gICAgcmVzcG9uc2VUeXBlcy5mb3JFYWNoKCh7IHR5cGUsIHN0YXR1c0NvZGUsIGlkIH0pID0+IHtcclxuICAgICAgdGhpcy5jcmVhdGVHYXRld2F5UmVzcG9uc2UoYXBpLCB0eXBlLCBzdGF0dXNDb2RlLCBpZCk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19
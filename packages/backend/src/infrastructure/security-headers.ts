import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export interface SecurityHeadersProps {
  environment: 'dev' | 'staging' | 'production';
}

export class SecurityHeaders extends Construct {
  public readonly responseParameters: { [key: string]: string };
  public readonly cloudfrontResponseHeadersPolicy: cloudfront.ResponseHeadersPolicy;

  constructor(scope: Construct, id: string, props: SecurityHeadersProps) {
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
  public getMethodResponseParameters(): { [key: string]: boolean } {
    const parameters: { [key: string]: boolean } = {};
    
    Object.keys(this.responseParameters).forEach(key => {
      parameters[key] = true;
    });
    
    return parameters;
  }

  /**
   * Get integration response parameters for API Gateway
   */
  public getIntegrationResponseParameters(): { [key: string]: string } {
    return this.responseParameters;
  }

  /**
   * Apply security headers to an API Gateway method
   */
  public applyToMethod(method: apigateway.Method): void {
    // Get the method resource
    const methodResource = method.node.defaultChild as apigateway.CfnMethod;
    
    // Add response parameters to method responses
    if (methodResource.methodResponses && Array.isArray(methodResource.methodResponses)) {
      methodResource.methodResponses = methodResource.methodResponses.map((response: any) => ({
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
  public createGatewayResponse(
    api: apigateway.RestApi,
    type: apigateway.ResponseType,
    statusCode: string,
    id: string
  ): apigateway.GatewayResponse {
    return api.addGatewayResponse(id, {
      type,
      statusCode,
      responseHeaders: this.responseParameters,
    });
  }

  /**
   * Apply security headers to all default Gateway Responses
   */
  public applyToGatewayResponses(api: apigateway.RestApi): void {
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

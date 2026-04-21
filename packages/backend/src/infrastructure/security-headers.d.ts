import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
export interface SecurityHeadersProps {
    environment: 'dev' | 'staging' | 'production';
}
export declare class SecurityHeaders extends Construct {
    readonly responseParameters: {
        [key: string]: string;
    };
    readonly cloudfrontResponseHeadersPolicy: cloudfront.ResponseHeadersPolicy;
    constructor(scope: Construct, id: string, props: SecurityHeadersProps);
    /**
     * Get method response parameters for API Gateway
     */
    getMethodResponseParameters(): {
        [key: string]: boolean;
    };
    /**
     * Get integration response parameters for API Gateway
     */
    getIntegrationResponseParameters(): {
        [key: string]: string;
    };
    /**
     * Apply security headers to an API Gateway method
     */
    applyToMethod(method: apigateway.Method): void;
    /**
     * Create a Gateway Response with security headers
     */
    createGatewayResponse(api: apigateway.RestApi, type: apigateway.ResponseType, statusCode: string, id: string): apigateway.GatewayResponse;
    /**
     * Apply security headers to all default Gateway Responses
     */
    applyToGatewayResponses(api: apigateway.RestApi): void;
}

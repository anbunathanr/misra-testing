export interface AuthorizerEvent {
    type: 'REQUEST';
    methodArn: string;
    headers?: {
        authorization?: string;
        Authorization?: string;
    };
    requestContext: {
        accountId: string;
        apiId: string;
        domainName: string;
        requestId: string;
    };
}
export interface AuthorizerResponse {
    principalId: string;
    policyDocument: {
        Version: '2012-10-17';
        Statement: Array<{
            Action: 'execute-api:Invoke';
            Effect: 'Allow' | 'Deny';
            Resource: string;
        }>;
    };
    context?: {
        userId: string;
        email: string;
        organizationId: string;
        role: string;
    };
}
/**
 * Lambda Authorizer handler for API Gateway JWT authentication
 * Validates JWT tokens and returns IAM policy documents
 *
 * @param event - API Gateway authorizer event
 * @returns IAM policy document with user context
 */
export declare const handler: (event: AuthorizerEvent) => Promise<AuthorizerResponse>;

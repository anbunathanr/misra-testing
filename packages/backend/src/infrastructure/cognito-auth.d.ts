/**
 * AWS Cognito Authentication Infrastructure
 * Provides user authentication and authorization using AWS Cognito
 */
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
export interface CognitoAuthProps {
    /**
     * Name prefix for Cognito resources
     */
    readonly namePrefix?: string;
    /**
     * Whether to enable email verification
     * @default true
     */
    readonly emailVerification?: boolean;
    /**
     * Whether to allow self sign-up
     * @default true
     */
    readonly selfSignUpEnabled?: boolean;
    /**
     * Minimum password length
     * @default 8
     */
    readonly passwordMinLength?: number;
}
export declare class CognitoAuth extends Construct {
    readonly userPool: cognito.UserPool;
    readonly userPoolClient: cognito.UserPoolClient;
    readonly userPoolId: string;
    readonly userPoolClientId: string;
    readonly userPoolArn: string;
    constructor(scope: Construct, id: string, props?: CognitoAuthProps);
    /**
     * Create a Cognito User Pool Group
     */
    addGroup(groupName: string, description?: string, precedence?: number): cognito.CfnUserPoolGroup;
    /**
     * Grant a Lambda function permission to manage users
     */
    grantManageUsers(grantee: cdk.aws_iam.IGrantable): void;
}

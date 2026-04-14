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

export class CognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolId: string;
  public readonly userPoolClientId: string;
  public readonly userPoolArn: string;

  constructor(scope: Construct, id: string, props?: CognitoAuthProps) {
    super(scope, id);

    const namePrefix = props?.namePrefix || 'aibts';
    const emailVerification = props?.emailVerification ?? true;
    const selfSignUpEnabled = props?.selfSignUpEnabled ?? true;
    const passwordMinLength = props?.passwordMinLength || 8;

    // Create User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${namePrefix}-users`,
      selfSignUpEnabled,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: emailVerification,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        organizationId: new cognito.StringAttribute({ 
          minLen: 1, 
          maxLen: 256,
          mutable: true,
        }),
        role: new cognito.StringAttribute({ 
          minLen: 1, 
          maxLen: 50,
          mutable: true,
        }),
        otpSecret: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 256,
          mutable: true,
        }),
        backupCodes: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 2048,
          mutable: true,
        }),
        otpEnabled: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 10,
          mutable: true,
        }),
      },
      passwordPolicy: {
        minLength: passwordMinLength,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep user data on stack deletion
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      userVerification: {
        emailSubject: 'Verify your email for AIBTS Platform',
        emailBody: 'Thank you for signing up to AIBTS Platform! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      userInvitation: {
        emailSubject: 'Welcome to AIBTS Platform',
        emailBody: 'Hello {username}, you have been invited to join AIBTS Platform. Your temporary password is {####}',
      },
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true,
      },
    });

    // Create User Pool Client for web application
    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: `${namePrefix}-web-client`,
      generateSecret: false, // Public client (SPA)
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: false,
        adminUserPassword: false,
      },
      preventUserExistenceErrors: true,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      enableTokenRevocation: true,
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          emailVerified: true,
          fullname: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('organizationId', 'role', 'otpSecret', 'backupCodes', 'otpEnabled'),
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          fullname: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('organizationId', 'role', 'otpSecret', 'backupCodes', 'otpEnabled'),
    });

    // Store IDs for easy access
    this.userPoolId = this.userPool.userPoolId;
    this.userPoolClientId = this.userPoolClient.userPoolClientId;
    this.userPoolArn = this.userPool.userPoolArn;

    // Add pre-signup Lambda trigger (optional - for custom validation)
    // this.userPool.addTrigger(
    //   cognito.UserPoolOperation.PRE_SIGN_UP,
    //   preSignUpFunction
    // );

    // Add post-confirmation Lambda trigger (optional - for user sync to DynamoDB)
    // this.userPool.addTrigger(
    //   cognito.UserPoolOperation.POST_CONFIRMATION,
    //   postConfirmationFunction
    // );

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${namePrefix}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${namePrefix}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: `${namePrefix}-UserPoolArn`,
    });

    // Add tags
    cdk.Tags.of(this.userPool).add('Component', 'Authentication');
    cdk.Tags.of(this.userPool).add('ManagedBy', 'CDK');
  }

  /**
   * Create a Cognito User Pool Group
   */
  public addGroup(groupName: string, description?: string, precedence?: number): cognito.CfnUserPoolGroup {
    return new cognito.CfnUserPoolGroup(this, `Group-${groupName}`, {
      userPoolId: this.userPoolId,
      groupName,
      description,
      precedence,
    });
  }

  /**
   * Grant a Lambda function permission to manage users
   */
  public grantManageUsers(grantee: cdk.aws_iam.IGrantable): void {
    this.userPool.grant(grantee,
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminUpdateUserAttributes',
      'cognito-idp:AdminDeleteUser',
      'cognito-idp:ListUsers'
    );
  }
}

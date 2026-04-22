"use strict";
/**
 * AWS Cognito Authentication Infrastructure
 * Provides user authentication and authorization using AWS Cognito
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
exports.CognitoAuth = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const constructs_1 = require("constructs");
class CognitoAuth extends constructs_1.Construct {
    userPool;
    userPoolClient;
    userPoolId;
    userPoolClientId;
    userPoolArn;
    constructor(scope, id, props) {
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
                adminUserPassword: true,
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
    addGroup(groupName, description, precedence) {
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
    grantManageUsers(grantee) {
        this.userPool.grant(grantee, 'cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes', 'cognito-idp:AdminDeleteUser', 'cognito-idp:ListUsers');
    }
}
exports.CognitoAuth = CognitoAuth;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by1hdXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29nbml0by1hdXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILGlEQUFtQztBQUNuQyxpRUFBbUQ7QUFDbkQsMkNBQXVDO0FBMkJ2QyxNQUFhLFdBQVksU0FBUSxzQkFBUztJQUN4QixRQUFRLENBQW1CO0lBQzNCLGNBQWMsQ0FBeUI7SUFDdkMsVUFBVSxDQUFTO0lBQ25CLGdCQUFnQixDQUFTO0lBQ3pCLFdBQVcsQ0FBUztJQUVwQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxVQUFVLEdBQUcsS0FBSyxFQUFFLFVBQVUsSUFBSSxPQUFPLENBQUM7UUFDaEQsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLEVBQUUsaUJBQWlCLElBQUksSUFBSSxDQUFDO1FBQzNELE1BQU0saUJBQWlCLEdBQUcsS0FBSyxFQUFFLGlCQUFpQixJQUFJLElBQUksQ0FBQztRQUMzRCxNQUFNLGlCQUFpQixHQUFHLEtBQUssRUFBRSxpQkFBaUIsSUFBSSxDQUFDLENBQUM7UUFFeEQsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDckQsWUFBWSxFQUFFLEdBQUcsVUFBVSxRQUFRO1lBQ25DLGlCQUFpQjtZQUNqQixhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsUUFBUSxFQUFFLEtBQUs7YUFDaEI7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLGlCQUFpQjthQUN6QjtZQUNELGtCQUFrQixFQUFFO2dCQUNsQixLQUFLLEVBQUU7b0JBQ0wsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FB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QUNULFdBQVc7WUFDWCxVQUFVO1NBQ1gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZ0JBQWdCLENBQUMsT0FBK0I7UUFDckQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUN6QiwwQkFBMEIsRUFDMUIsdUNBQXVDLEVBQ3ZDLDZCQUE2QixFQUM3Qix1QkFBdUIsQ0FDeEIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXZNRCxrQ0F1TUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQVdTIENvZ25pdG8gQXV0aGVudGljYXRpb24gSW5mcmFzdHJ1Y3R1cmVcclxuICogUHJvdmlkZXMgdXNlciBhdXRoZW50aWNhdGlvbiBhbmQgYXV0aG9yaXphdGlvbiB1c2luZyBBV1MgQ29nbml0b1xyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ29nbml0b0F1dGhQcm9wcyB7XHJcbiAgLyoqXHJcbiAgICogTmFtZSBwcmVmaXggZm9yIENvZ25pdG8gcmVzb3VyY2VzXHJcbiAgICovXHJcbiAgcmVhZG9ubHkgbmFtZVByZWZpeD86IHN0cmluZztcclxuXHJcbiAgLyoqXHJcbiAgICogV2hldGhlciB0byBlbmFibGUgZW1haWwgdmVyaWZpY2F0aW9uXHJcbiAgICogQGRlZmF1bHQgdHJ1ZVxyXG4gICAqL1xyXG4gIHJlYWRvbmx5IGVtYWlsVmVyaWZpY2F0aW9uPzogYm9vbGVhbjtcclxuXHJcbiAgLyoqXHJcbiAgICogV2hldGhlciB0byBhbGxvdyBzZWxmIHNpZ24tdXBcclxuICAgKiBAZGVmYXVsdCB0cnVlXHJcbiAgICovXHJcbiAgcmVhZG9ubHkgc2VsZlNpZ25VcEVuYWJsZWQ/OiBib29sZWFuO1xyXG5cclxuICAvKipcclxuICAgKiBNaW5pbXVtIHBhc3N3b3JkIGxlbmd0aFxyXG4gICAqIEBkZWZhdWx0IDhcclxuICAgKi9cclxuICByZWFkb25seSBwYXNzd29yZE1pbkxlbmd0aD86IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIENvZ25pdG9BdXRoIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xyXG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbElkOiBzdHJpbmc7XHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50SWQ6IHN0cmluZztcclxuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xBcm46IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBDb2duaXRvQXV0aFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IG5hbWVQcmVmaXggPSBwcm9wcz8ubmFtZVByZWZpeCB8fCAnYWlidHMnO1xyXG4gICAgY29uc3QgZW1haWxWZXJpZmljYXRpb24gPSBwcm9wcz8uZW1haWxWZXJpZmljYXRpb24gPz8gdHJ1ZTtcclxuICAgIGNvbnN0IHNlbGZTaWduVXBFbmFibGVkID0gcHJvcHM/LnNlbGZTaWduVXBFbmFibGVkID8/IHRydWU7XHJcbiAgICBjb25zdCBwYXNzd29yZE1pbkxlbmd0aCA9IHByb3BzPy5wYXNzd29yZE1pbkxlbmd0aCB8fCA4O1xyXG5cclxuICAgIC8vIENyZWF0ZSBVc2VyIFBvb2xcclxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnVXNlclBvb2wnLCB7XHJcbiAgICAgIHVzZXJQb29sTmFtZTogYCR7bmFtZVByZWZpeH0tdXNlcnNgLFxyXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZCxcclxuICAgICAgc2lnbkluQWxpYXNlczoge1xyXG4gICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgIHVzZXJuYW1lOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgYXV0b1ZlcmlmeToge1xyXG4gICAgICAgIGVtYWlsOiBlbWFpbFZlcmlmaWNhdGlvbixcclxuICAgICAgfSxcclxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgZW1haWw6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGZ1bGxuYW1lOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBnaXZlbk5hbWU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmYW1pbHlOYW1lOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgXHJcbiAgICAgICAgICBtaW5MZW46IDEsIFxyXG4gICAgICAgICAgbWF4TGVuOiAyNTYsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIHJvbGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IFxyXG4gICAgICAgICAgbWluTGVuOiAxLCBcclxuICAgICAgICAgIG1heExlbjogNTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIG90cFNlY3JldDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMSxcclxuICAgICAgICAgIG1heExlbjogMjU2LFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuICAgICAgICBiYWNrdXBDb2RlczogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMSxcclxuICAgICAgICAgIG1heExlbjogMjA0OCxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgb3RwRW5hYmxlZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHtcclxuICAgICAgICAgIG1pbkxlbjogMSxcclxuICAgICAgICAgIG1heExlbjogMTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9LFxyXG4gICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgIG1pbkxlbmd0aDogcGFzc3dvcmRNaW5MZW5ndGgsXHJcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxyXG4gICAgICAgIHRlbXBQYXNzd29yZFZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgfSxcclxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sIC8vIEtlZXAgdXNlciBkYXRhIG9uIHN0YWNrIGRlbGV0aW9uXHJcbiAgICAgIG1mYTogY29nbml0by5NZmEuT1BUSU9OQUwsXHJcbiAgICAgIG1mYVNlY29uZEZhY3Rvcjoge1xyXG4gICAgICAgIHNtczogZmFsc2UsXHJcbiAgICAgICAgb3RwOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICB1c2VyVmVyaWZpY2F0aW9uOiB7XHJcbiAgICAgICAgZW1haWxTdWJqZWN0OiAnVmVyaWZ5IHlvdXIgZW1haWwgZm9yIEFJQlRTIFBsYXRmb3JtJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdUaGFuayB5b3UgZm9yIHNpZ25pbmcgdXAgdG8gQUlCVFMgUGxhdGZvcm0hIFlvdXIgdmVyaWZpY2F0aW9uIGNvZGUgaXMgeyMjIyN9JyxcclxuICAgICAgICBlbWFpbFN0eWxlOiBjb2duaXRvLlZlcmlmaWNhdGlvbkVtYWlsU3R5bGUuQ09ERSxcclxuICAgICAgfSxcclxuICAgICAgdXNlckludml0YXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdXZWxjb21lIHRvIEFJQlRTIFBsYXRmb3JtJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdIZWxsbyB7dXNlcm5hbWV9LCB5b3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gam9pbiBBSUJUUyBQbGF0Zm9ybS4gWW91ciB0ZW1wb3JhcnkgcGFzc3dvcmQgaXMgeyMjIyN9JyxcclxuICAgICAgfSxcclxuICAgICAgZGV2aWNlVHJhY2tpbmc6IHtcclxuICAgICAgICBjaGFsbGVuZ2VSZXF1aXJlZE9uTmV3RGV2aWNlOiB0cnVlLFxyXG4gICAgICAgIGRldmljZU9ubHlSZW1lbWJlcmVkT25Vc2VyUHJvbXB0OiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFVzZXIgUG9vbCBDbGllbnQgZm9yIHdlYiBhcHBsaWNhdGlvblxyXG4gICAgdGhpcy51c2VyUG9vbENsaWVudCA9IHRoaXMudXNlclBvb2wuYWRkQ2xpZW50KCdXZWJDbGllbnQnLCB7XHJcbiAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogYCR7bmFtZVByZWZpeH0td2ViLWNsaWVudGAsXHJcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSwgLy8gUHVibGljIGNsaWVudCAoU1BBKVxyXG4gICAgICBhdXRoRmxvd3M6IHtcclxuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXHJcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcclxuICAgICAgICBjdXN0b206IGZhbHNlLFxyXG4gICAgICAgIGFkbWluVXNlclBhc3N3b3JkOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBwcmV2ZW50VXNlckV4aXN0ZW5jZUVycm9yczogdHJ1ZSxcclxuICAgICAgcmVmcmVzaFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICBpZFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgZW5hYmxlVG9rZW5SZXZvY2F0aW9uOiB0cnVlLFxyXG4gICAgICByZWFkQXR0cmlidXRlczogbmV3IGNvZ25pdG8uQ2xpZW50QXR0cmlidXRlcygpXHJcbiAgICAgICAgLndpdGhTdGFuZGFyZEF0dHJpYnV0ZXMoe1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBlbWFpbFZlcmlmaWVkOiB0cnVlLFxyXG4gICAgICAgICAgZnVsbG5hbWU6IHRydWUsXHJcbiAgICAgICAgICBnaXZlbk5hbWU6IHRydWUsXHJcbiAgICAgICAgICBmYW1pbHlOYW1lOiB0cnVlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKCdvcmdhbml6YXRpb25JZCcsICdyb2xlJywgJ290cFNlY3JldCcsICdiYWNrdXBDb2RlcycsICdvdHBFbmFibGVkJyksXHJcbiAgICAgIHdyaXRlQXR0cmlidXRlczogbmV3IGNvZ25pdG8uQ2xpZW50QXR0cmlidXRlcygpXHJcbiAgICAgICAgLndpdGhTdGFuZGFyZEF0dHJpYnV0ZXMoe1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBmdWxsbmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ29yZ2FuaXphdGlvbklkJywgJ3JvbGUnLCAnb3RwU2VjcmV0JywgJ2JhY2t1cENvZGVzJywgJ290cEVuYWJsZWQnKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3JlIElEcyBmb3IgZWFzeSBhY2Nlc3NcclxuICAgIHRoaXMudXNlclBvb2xJZCA9IHRoaXMudXNlclBvb2wudXNlclBvb2xJZDtcclxuICAgIHRoaXMudXNlclBvb2xDbGllbnRJZCA9IHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZDtcclxuICAgIHRoaXMudXNlclBvb2xBcm4gPSB0aGlzLnVzZXJQb29sLnVzZXJQb29sQXJuO1xyXG5cclxuICAgIC8vIEFkZCBwcmUtc2lnbnVwIExhbWJkYSB0cmlnZ2VyIChvcHRpb25hbCAtIGZvciBjdXN0b20gdmFsaWRhdGlvbilcclxuICAgIC8vIHRoaXMudXNlclBvb2wuYWRkVHJpZ2dlcihcclxuICAgIC8vICAgY29nbml0by5Vc2VyUG9vbE9wZXJhdGlvbi5QUkVfU0lHTl9VUCxcclxuICAgIC8vICAgcHJlU2lnblVwRnVuY3Rpb25cclxuICAgIC8vICk7XHJcblxyXG4gICAgLy8gQWRkIHBvc3QtY29uZmlybWF0aW9uIExhbWJkYSB0cmlnZ2VyIChvcHRpb25hbCAtIGZvciB1c2VyIHN5bmMgdG8gRHluYW1vREIpXHJcbiAgICAvLyB0aGlzLnVzZXJQb29sLmFkZFRyaWdnZXIoXHJcbiAgICAvLyAgIGNvZ25pdG8uVXNlclBvb2xPcGVyYXRpb24uUE9TVF9DT05GSVJNQVRJT04sXHJcbiAgICAvLyAgIHBvc3RDb25maXJtYXRpb25GdW5jdGlvblxyXG4gICAgLy8gKTtcclxuXHJcbiAgICAvLyBDbG91ZEZvcm1hdGlvbiBPdXRwdXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2xJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke25hbWVQcmVmaXh9LVVzZXJQb29sSWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgQ2xpZW50IElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7bmFtZVByZWZpeH0tVXNlclBvb2xDbGllbnRJZGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIEFSTicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke25hbWVQcmVmaXh9LVVzZXJQb29sQXJuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCB0YWdzXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnVzZXJQb29sKS5hZGQoJ0NvbXBvbmVudCcsICdBdXRoZW50aWNhdGlvbicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy51c2VyUG9vbCkuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBDb2duaXRvIFVzZXIgUG9vbCBHcm91cFxyXG4gICAqL1xyXG4gIHB1YmxpYyBhZGRHcm91cChncm91cE5hbWU6IHN0cmluZywgZGVzY3JpcHRpb24/OiBzdHJpbmcsIHByZWNlZGVuY2U/OiBudW1iZXIpOiBjb2duaXRvLkNmblVzZXJQb29sR3JvdXAge1xyXG4gICAgcmV0dXJuIG5ldyBjb2duaXRvLkNmblVzZXJQb29sR3JvdXAodGhpcywgYEdyb3VwLSR7Z3JvdXBOYW1lfWAsIHtcclxuICAgICAgdXNlclBvb2xJZDogdGhpcy51c2VyUG9vbElkLFxyXG4gICAgICBncm91cE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uLFxyXG4gICAgICBwcmVjZWRlbmNlLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCBhIExhbWJkYSBmdW5jdGlvbiBwZXJtaXNzaW9uIHRvIG1hbmFnZSB1c2Vyc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudE1hbmFnZVVzZXJzKGdyYW50ZWU6IGNkay5hd3NfaWFtLklHcmFudGFibGUpOiB2b2lkIHtcclxuICAgIHRoaXMudXNlclBvb2wuZ3JhbnQoZ3JhbnRlZSxcclxuICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXHJcbiAgICAgICdjb2duaXRvLWlkcDpBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzJyxcclxuICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRGVsZXRlVXNlcicsXHJcbiAgICAgICdjb2duaXRvLWlkcDpMaXN0VXNlcnMnXHJcbiAgICApO1xyXG4gIH1cclxufVxyXG4iXX0=
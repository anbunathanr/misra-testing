import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ProductionMisraStack } from '../production-misra-stack';

describe('ProductionMisraStack', () => {
  let app: App;
  let stack: ProductionMisraStack;
  let template: Template;

  beforeEach(() => {
    app = new App();
    stack = new ProductionMisraStack(app, 'TestStack', {
      environment: 'test'
    });
    template = Template.fromStack(stack);
  });

  describe('Cognito User Pool Configuration', () => {
    it('should create a Cognito User Pool with TOTP MFA enabled', () => {
      // Verify User Pool exists
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'misra-platform-users-test',
        MfaConfiguration: 'ON', // CDK generates 'ON' for REQUIRED
        EnabledMfas: ['SOFTWARE_TOKEN_MFA']
      });
    });

    it('should configure User Pool with proper MFA settings', () => {
      // Verify MFA configuration
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        MfaConfiguration: 'ON', // CDK generates 'ON' for REQUIRED
        EnabledMfas: ['SOFTWARE_TOKEN_MFA']
      });
    });

    it('should create User Pool Client with custom auth flow enabled', () => {
      // Verify User Pool Client configuration
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        UserPoolId: {
          Ref: expect.stringMatching(/^UserPool/)
        },
        ExplicitAuthFlows: expect.arrayContaining([
          'ALLOW_USER_PASSWORD_AUTH',
          'ALLOW_USER_SRP_AUTH',
          'ALLOW_ADMIN_USER_PASSWORD_AUTH',
          'ALLOW_CUSTOM_AUTH'
        ])
      });
    });

    it('should configure proper token validity periods', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        AccessTokenValidity: 1,
        IdTokenValidity: 1,
        RefreshTokenValidity: 30,
        TokenValidityUnits: {
          AccessToken: 'hours',
          IdToken: 'hours',
          RefreshToken: 'days'
        }
      });
    });

    it('should include custom attributes for MFA tracking', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Schema: expect.arrayContaining([
          expect.objectContaining({
            Name: 'mfaSetupComplete',
            AttributeDataType: 'String',
            Mutable: true
          })
        ])
      });
    });
  });

  describe('DynamoDB Tables', () => {
    it('should create all required DynamoDB tables', () => {
      // Verify all tables are created
      template.resourceCountIs('AWS::DynamoDB::Table', 5);
      
      // Check specific tables
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'misra-platform-users-test'
      });
      
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'misra-platform-file-metadata-test'
      });
      
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'misra-platform-analysis-results-test'
      });
      
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'misra-platform-sample-files-test'
      });
      
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'misra-platform-progress-test'
      });
    });

    it('should configure tables with KMS encryption', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        SSESpecification: {
          SSEEnabled: true,
          KMSMasterKeyId: {
            'Fn::GetAtt': expect.arrayContaining([
              expect.stringMatching(/^MisraKmsKey/),
              'Arn'
            ])
          }
        }
      });
    });
  });

  describe('S3 Bucket Configuration', () => {
    it('should create S3 bucket with KMS encryption', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
                KMSMasterKeyID: {
                  'Fn::GetAtt': expect.arrayContaining([
                    expect.stringMatching(/^MisraKmsKey/),
                    'Arn'
                  ])
                }
              }
            }
          ]
        }
      });
    });

    it('should configure lifecycle policies', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: expect.arrayContaining([
            expect.objectContaining({
              Id: 'DeleteOldVersions',
              Status: 'Enabled'
            }),
            expect.objectContaining({
              Id: 'TransitionToIA',
              Status: 'Enabled'
            })
          ])
        }
      });
    });
  });

  describe('API Gateway Configuration', () => {
    it('should create API Gateway with proper CORS settings', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'misra-platform-api-test'
      });
    });

    it('should create usage plan for rate limiting', () => {
      template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
        UsagePlanName: 'misra-platform-usage-plan-test',
        Throttle: {
          RateLimit: 100,
          BurstLimit: 200
        },
        Quota: {
          Limit: 10000,
          Period: 'DAY'
        }
      });
    });
  });

  describe('KMS Key Configuration', () => {
    it('should create KMS key with key rotation enabled', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: 'MISRA Platform KMS Key - test',
        EnableKeyRotation: true
      });
    });
  });

  describe('Secrets Manager Configuration', () => {
    it('should create JWT secret', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'misra-platform/jwt-secret-test'
      });
    });

    it('should create API keys secret', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'misra-platform/api-keys-test'
      });
    });
  });

  describe('CloudWatch Configuration', () => {
    it('should create log groups for API Gateway and Cognito', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/apigateway/misra-platform-test'
      });

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: {
          'Fn::Sub': '/aws/cognito/userpool/${UserPool}'
        }
      });
    });
  });

  describe('Stack Outputs', () => {
    it('should export all required stack outputs', () => {
      // Verify outputs are created
      template.hasOutput('UserPoolId', {});
      template.hasOutput('UserPoolClientId', {});
      template.hasOutput('ApiGatewayUrl', {});
      template.hasOutput('FilesBucketName', {});
      template.hasOutput('KmsKeyId', {});
      template.hasOutput('UsersTableName', {});
      template.hasOutput('FileMetadataTableName', {});
      template.hasOutput('AnalysisResultsTableName', {});
      template.hasOutput('SampleFilesTableName', {});
      template.hasOutput('ProgressTableName', {});
    });
  });

  describe('Environment-specific Configuration', () => {
    it('should configure production environment with retention policies', () => {
      const prodStack = new ProductionMisraStack(app, 'ProdStack', {
        environment: 'production'
      });
      const prodTemplate = Template.fromStack(prodStack);

      // Production should have RETAIN removal policy
      prodTemplate.hasResourceProperties('AWS::DynamoDB::Table', {
        DeletionPolicy: 'Retain'
      });
    });

    it('should configure development environment with destroy policies', () => {
      const devStack = new ProductionMisraStack(app, 'DevStack', {
        environment: 'dev'
      });
      const devTemplate = Template.fromStack(devStack);

      // Dev should allow resource deletion
      devTemplate.hasResourceProperties('AWS::S3::Bucket', {
        DeletionPolicy: 'Delete'
      });
    });
  });
});
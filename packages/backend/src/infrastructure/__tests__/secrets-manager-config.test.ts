import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ProductionMisraStack } from '../production-misra-stack';

describe('Secrets Manager Configuration', () => {
  let app: cdk.App;
  let stack: ProductionMisraStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new ProductionMisraStack(app, 'TestStack', {
      environment: 'dev',
      alertEmail: 'test@example.com'
    });
    template = Template.fromStack(stack);
  });

  describe('JWT Secret Configuration', () => {
    it('should create JWT secret with proper configuration', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'misra-platform/jwt-secret-dev',
        Description: 'JWT signing secret for MISRA platform authentication',
        GenerateSecretString: {
          SecretStringTemplate: JSON.stringify({ 
            algorithm: 'HS256',
            issuer: 'misra-platform-dev',
            audience: 'misra-platform-users-dev',
            accessTokenExpiry: '1h',
            refreshTokenExpiry: '30d'
          }),
          GenerateStringKey: 'secret',
          ExcludeCharacters: '"@/\\`\'',
          PasswordLength: 64
        }
      });
    });

    it('should encrypt JWT secret with KMS', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'misra-platform/jwt-secret-dev',
        KmsKeyId: {
          Ref: expect.stringMatching(/MisraKmsKey/)
        }
      });
    });
  });

  describe('OTP Secret Configuration', () => {
    it('should create OTP secrets with proper structure', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'misra-platform/otp-secrets-dev',
        Description: 'OTP and TOTP secrets for autonomous MFA workflow'
      });
    });

    it('should include TOTP configuration in OTP secret', () => {
      // The secret should contain TOTP configuration
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'misra-platform/otp-secrets-dev',
        SecretString: expect.stringContaining('totpConfig')
      });
    });
  });

  describe('API Keys Secret Configuration', () => {
    it('should create API keys secret', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'misra-platform/api-keys-dev',
        Description: 'API keys for external services (OpenAI, monitoring, etc.)'
      });
    });
  });

  describe('Database Secret Configuration', () => {
    it('should create database secrets', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'misra-platform/database-secrets-dev',
        Description: 'Database encryption and connection secrets'
      });
    });
  });

  describe('Lambda Function Access', () => {
    it('should grant authorizer function access to JWT secret', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret'
              ],
              Resource: expect.arrayContaining([
                expect.objectContaining({
                  Ref: expect.stringMatching(/JwtSecret/)
                })
              ])
            })
          ])
        }
      });
    });

    it('should grant KMS permissions for secret decryption', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: [
                'kms:Decrypt',
                'kms:DescribeKey'
              ],
              Resource: expect.objectContaining({
                'Fn::GetAtt': expect.arrayContaining([
                  expect.stringMatching(/MisraKmsKey/),
                  'Arn'
                ])
              }),
              Condition: {
                StringEquals: {
                  'kms:ViaService': expect.stringMatching(/secretsmanager\..*\.amazonaws\.com/)
                }
              }
            })
          ])
        }
      });
    });
  });

  describe('Environment Variables', () => {
    it('should set JWT secret name in authorizer function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'misra-platform-authorizer-dev',
        Environment: {
          Variables: expect.objectContaining({
            JWT_SECRET_NAME: 'misra-platform/jwt-secret-dev'
          })
        }
      });
    });
  });

  describe('Stack Outputs', () => {
    it('should export JWT secret name', () => {
      template.hasOutput('JwtSecretName', {
        Value: 'misra-platform/jwt-secret-dev',
        Export: {
          Name: 'TestStack-JwtSecretName'
        }
      });
    });

    it('should export OTP secret name', () => {
      template.hasOutput('OtpSecretName', {
        Value: 'misra-platform/otp-secrets-dev',
        Export: {
          Name: 'TestStack-OtpSecretName'
        }
      });
    });

    it('should export API keys secret name', () => {
      template.hasOutput('ApiKeysSecretName', {
        Value: 'misra-platform/api-keys-dev',
        Export: {
          Name: 'TestStack-ApiKeysSecretName'
        }
      });
    });

    it('should export database secret name', () => {
      template.hasOutput('DatabaseSecretName', {
        Value: 'misra-platform/database-secrets-dev',
        Export: {
          Name: 'TestStack-DatabaseSecretName'
        }
      });
    });
  });

  describe('Production Environment Specific', () => {
    it('should enable automatic rotation for JWT secret in production', () => {
      const prodStack = new ProductionMisraStack(app, 'ProdStack', {
        environment: 'production',
        alertEmail: 'prod@example.com'
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties('AWS::SecretsManager::RotationSchedule', {
        SecretId: {
          Ref: expect.stringMatching(/JwtSecret/)
        },
        RotationRules: {
          AutomaticallyAfterDays: 90
        }
      });
    });

    it('should set retention policy to RETAIN for production secrets', () => {
      const prodStack = new ProductionMisraStack(app, 'ProdStack', {
        environment: 'production',
        alertEmail: 'prod@example.com'
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResource('AWS::SecretsManager::Secret', {
        DeletionPolicy: 'Retain'
      });
    });
  });

  describe('Development Environment Specific', () => {
    it('should set retention policy to DESTROY for development secrets', () => {
      template.hasResource('AWS::SecretsManager::Secret', {
        DeletionPolicy: 'Delete'
      });
    });

    it('should not enable automatic rotation for development', () => {
      template.resourceCountIs('AWS::SecretsManager::RotationSchedule', 0);
    });
  });
});
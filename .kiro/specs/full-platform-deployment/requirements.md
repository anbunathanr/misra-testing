# Requirements Document: Full AIBTS Platform Infrastructure Deployment

## Introduction

This document specifies the requirements for deploying the complete AIBTS (AI-Based Testing System) platform infrastructure to a fresh AWS account. This is a clean deployment with no existing resources or data to migrate.

The deployment will create a complete SaaS product with all features operational: Projects, Test Cases, Test Suites, Test Executions, AI Test Generation, Screenshots storage, Authentication, and the Notification System.

## Glossary

- **AIBTS**: AI-Based Testing System - the complete platform for web application testing
- **MisraPlatformStack**: Complete platform CDK stack with all features (Projects, Test Suites, Test Cases, Test Executions, AI Generation, Notifications, Authentication)
- **CDK**: AWS Cloud Development Kit - infrastructure as code framework
- **DynamoDB**: AWS NoSQL database service for storing application data
- **Lambda**: AWS serverless compute service for running backend functions
- **API_Gateway**: AWS service for creating and managing HTTP APIs
- **S3**: AWS Simple Storage Service for object storage
- **SQS**: AWS Simple Queue Service for message queuing
- **SNS**: AWS Simple Notification Service for pub/sub messaging
- **EventBridge**: AWS event bus service for event-driven architecture
- **Cognito**: AWS authentication and user management service (not used in current implementation)
- **CloudWatch**: AWS monitoring and observability service
- **Deployment_Script**: PowerShell or bash script that executes CDK deployment commands
- **Frontend**: React application deployed on Vercel
- **Backend_API**: API Gateway endpoint serving Lambda functions
- **Infrastructure_Code**: CDK TypeScript code defining AWS resources
- **Free_Tier**: AWS Free Tier - 12 months of free usage for most services

## Requirements

### Requirement 1: Deploy Core Testing Platform Tables

**User Story:** As a platform administrator, I want to deploy all DynamoDB tables for the testing platform, so that the application can store projects, test suites, test cases, and execution data.

#### Acceptance Criteria

1. THE Deployment_Script SHALL create the Projects DynamoDB table with projectId as partition key and organizationId as sort key
2. THE Deployment_Script SHALL create the Test_Suites DynamoDB table with suiteId as partition key and projectId as sort key
3. THE Deployment_Script SHALL create the Test_Cases DynamoDB table with testCaseId as partition key and suiteId as sort key
4. THE Deployment_Script SHALL create the Test_Executions DynamoDB table with executionId as partition key and timestamp as sort key
5. THE Deployment_Script SHALL configure all tables with PAY_PER_REQUEST billing mode
6. THE Deployment_Script SHALL configure all tables with AWS_MANAGED encryption
7. THE Deployment_Script SHALL create required Global Secondary Indexes for efficient querying
8. WHEN deployment completes, THE Deployment_Script SHALL output all table names to the console

### Requirement 2: Deploy Storage Infrastructure

**User Story:** As a platform administrator, I want to deploy S3 buckets for file and screenshot storage, so that the application can store uploaded files and test execution screenshots.

#### Acceptance Criteria

1. THE Deployment_Script SHALL create an S3 bucket for file storage with versioning enabled
2. THE Deployment_Script SHALL create an S3 bucket for test execution screenshots
3. THE Deployment_Script SHALL configure both buckets with S3_MANAGED encryption
4. THE Deployment_Script SHALL configure both buckets with BLOCK_ALL public access
5. THE Deployment_Script SHALL set bucket removal policy to DESTROY for development environment
6. WHEN deployment completes, THE Deployment_Script SHALL output bucket names to the console

### Requirement 3: Deploy Project Management Lambda Functions

**User Story:** As a developer, I want to deploy Lambda functions for project management, so that users can create, read, and update projects through the API.

#### Acceptance Criteria

1. THE Deployment_Script SHALL deploy the create-project Lambda function with 30-second timeout
2. THE Deployment_Script SHALL deploy the get-projects Lambda function with 30-second timeout
3. THE Deployment_Script SHALL deploy the update-project Lambda function with 30-second timeout
4. THE Deployment_Script SHALL grant each Lambda function read/write access to the Projects table
5. THE Deployment_Script SHALL grant each Lambda function read access to JWT secrets
6. THE Deployment_Script SHALL configure each Lambda function with NODEJS_20_X runtime
7. THE Deployment_Script SHALL configure each Lambda function with 256MB memory allocation

### Requirement 4: Deploy Test Suite Management Lambda Functions

**User Story:** As a developer, I want to deploy Lambda functions for test suite management, so that users can create, read, and update test suites through the API.

#### Acceptance Criteria

1. THE Deployment_Script SHALL deploy the create-suite Lambda function with 30-second timeout
2. THE Deployment_Script SHALL deploy the get-suites Lambda function with 30-second timeout
3. THE Deployment_Script SHALL deploy the update-suite Lambda function with 30-second timeout
4. THE Deployment_Script SHALL grant each Lambda function read/write access to the Test_Suites table
5. THE Deployment_Script SHALL grant each Lambda function read access to JWT secrets
6. THE Deployment_Script SHALL configure each Lambda function with NODEJS_20_X runtime
7. THE Deployment_Script SHALL configure each Lambda function with 256MB memory allocation

### Requirement 5: Deploy Test Case Management Lambda Functions

**User Story:** As a developer, I want to deploy Lambda functions for test case management, so that users can create, read, and update test cases through the API.

#### Acceptance Criteria

1. THE Deployment_Script SHALL deploy the create-test-case Lambda function with 30-second timeout
2. THE Deployment_Script SHALL deploy the get-test-cases Lambda function with 30-second timeout
3. THE Deployment_Script SHALL deploy the update-test-case Lambda function with 30-second timeout
4. THE Deployment_Script SHALL grant each Lambda function read/write access to the Test_Cases table
5. THE Deployment_Script SHALL grant each Lambda function read access to JWT secrets
6. THE Deployment_Script SHALL configure each Lambda function with NODEJS_20_X runtime
7. THE Deployment_Script SHALL configure each Lambda function with 256MB memory allocation

### Requirement 6: Deploy Test Execution Infrastructure

**User Story:** As a developer, I want to deploy the test execution infrastructure, so that users can trigger and monitor automated test executions.

#### Acceptance Criteria

1. THE Deployment_Script SHALL create an SQS queue for test execution with 15-minute visibility timeout
2. THE Deployment_Script SHALL create a Dead Letter Queue for failed test executions
3. THE Deployment_Script SHALL configure the DLQ with 3 max receive attempts before moving messages
4. THE Deployment_Script SHALL deploy the test-executor Lambda function with 15-minute timeout and 2048MB memory
5. THE Deployment_Script SHALL deploy the trigger-execution Lambda function with 30-second timeout
6. THE Deployment_Script SHALL deploy the get-execution-status Lambda function with 30-second timeout
7. THE Deployment_Script SHALL deploy the get-execution-results Lambda function with 30-second timeout
8. THE Deployment_Script SHALL deploy the get-execution-history Lambda function with 30-second timeout
9. THE Deployment_Script SHALL deploy the get-suite-results Lambda function with 30-second timeout
10. THE Deployment_Script SHALL configure the test-executor Lambda to trigger from the SQS queue
11. THE Deployment_Script SHALL grant test-executor Lambda read/write access to Test_Executions table and Screenshots bucket
12. THE Deployment_Script SHALL grant trigger-execution Lambda send message permissions to the execution queue

### Requirement 7: Deploy Notification System Infrastructure

**User Story:** As a platform administrator, I want to deploy the notification system infrastructure, so that users can receive notifications about test execution results.

#### Acceptance Criteria

1. THE Deployment_Script SHALL create the Notification_Preferences DynamoDB table
2. THE Deployment_Script SHALL create the Notification_Templates DynamoDB table
3. THE Deployment_Script SHALL create the Notification_History DynamoDB table
4. THE Deployment_Script SHALL create SNS topics for email, SMS, and webhook notifications
5. THE Deployment_Script SHALL create an SQS queue for notification processing with 30-second visibility timeout
6. THE Deployment_Script SHALL create a Dead Letter Queue for failed notifications
7. THE Deployment_Script SHALL deploy the notification-processor Lambda function with 30-second timeout
8. THE Deployment_Script SHALL deploy the scheduled-reports Lambda function with 5-minute timeout
9. THE Deployment_Script SHALL configure the notification-processor Lambda to trigger from the notification queue
10. THE Deployment_Script SHALL grant notification-processor Lambda publish permissions to all SNS topics
11. THE Deployment_Script SHALL grant notification-processor Lambda read/write access to notification tables

### Requirement 8: Deploy EventBridge Rules for Scheduled Reports

**User Story:** As a user, I want to receive scheduled test execution reports, so that I can monitor testing activity without manual checking.

#### Acceptance Criteria

1. THE Deployment_Script SHALL create an EventBridge rule for daily reports at 09:00 UTC
2. THE Deployment_Script SHALL create an EventBridge rule for weekly reports at 09:00 UTC every Monday
3. THE Deployment_Script SHALL configure both rules to trigger the scheduled-reports Lambda function
4. THE Deployment_Script SHALL create an EventBridge rule for test completion events
5. THE Deployment_Script SHALL configure the test completion rule to send events to the notification queue

### Requirement 9: Deploy API Gateway Routes

**User Story:** As a frontend developer, I want all API routes deployed, so that the frontend can communicate with all backend features.

#### Acceptance Criteria

1. THE Deployment_Script SHALL create API Gateway routes for all project management endpoints (POST /projects, GET /projects, PUT /projects/{projectId})
2. THE Deployment_Script SHALL create API Gateway routes for all test suite endpoints (POST /test-suites, GET /test-suites, PUT /test-suites/{suiteId})
3. THE Deployment_Script SHALL create API Gateway routes for all test case endpoints (POST /test-cases, GET /test-cases, PUT /test-cases/{testCaseId})
4. THE Deployment_Script SHALL create API Gateway routes for all test execution endpoints (POST /executions/trigger, GET /executions/{executionId}/status, GET /executions/{executionId}, GET /executions/history, GET /executions/suites/{suiteExecutionId})
5. THE Deployment_Script SHALL create API Gateway routes for all notification preference endpoints (GET /notifications/preferences, POST /notifications/preferences)
6. THE Deployment_Script SHALL create API Gateway routes for all notification history endpoints (GET /notifications/history, GET /notifications/history/{notificationId})
7. THE Deployment_Script SHALL create API Gateway routes for all notification template endpoints (POST /notifications/templates, PUT /notifications/templates/{templateId}, GET /notifications/templates)
8. THE Deployment_Script SHALL configure CORS for all routes to allow requests from the Vercel frontend
9. THE Deployment_Script SHALL integrate each route with its corresponding Lambda function

### Requirement 10: Optimize for AWS Free Tier

**User Story:** As a platform administrator, I want the deployment optimized for AWS Free Tier, so that monthly costs stay under $5.

#### Acceptance Criteria

1. THE Infrastructure_Code SHALL configure DynamoDB tables with PAY_PER_REQUEST billing mode
2. THE Infrastructure_Code SHALL use HTTP API Gateway (not REST API) for lower costs
3. THE Infrastructure_Code SHALL configure Lambda functions with appropriate memory allocations (256MB-2048MB)
4. THE Infrastructure_Code SHALL configure S3 lifecycle policies to delete old screenshots after 30 days
5. THE Infrastructure_Code SHALL use AWS-managed encryption (not KMS) to avoid KMS costs
6. WHEN deployment completes, THE estimated monthly cost SHALL be under $5

### Requirement 11: Deploy CloudWatch Monitoring

**User Story:** As a platform administrator, I want CloudWatch monitoring deployed, so that I can observe system health and receive alerts for issues.

#### Acceptance Criteria

1. THE Deployment_Script SHALL create CloudWatch alarms for notification DLQ depth greater than 0
2. THE Deployment_Script SHALL create CloudWatch alarms for notification queue depth greater than 1000
3. THE Deployment_Script SHALL create CloudWatch alarms for notification processor Lambda errors greater than 5 in 5 minutes
4. THE Deployment_Script SHALL create CloudWatch alarms for scheduled reports Lambda errors greater than 1
5. THE Deployment_Script SHALL create CloudWatch alarms for SNS email delivery failures greater than 5 in 5 minutes
6. THE Deployment_Script SHALL create CloudWatch alarms for SNS SMS delivery failures greater than 5 in 5 minutes
7. THE Deployment_Script SHALL create a CloudWatch dashboard for the notification system
8. THE Deployment_Script SHALL add widgets to the dashboard showing queue depth, DLQ depth, Lambda performance, and SNS delivery metrics
9. WHEN deployment completes, THE Deployment_Script SHALL output the dashboard URL to the console

### Requirement 12: CDK Bootstrap and Initial Setup

**User Story:** As a platform administrator, I want to bootstrap CDK in my new AWS account, so that CDK can deploy resources.

#### Acceptance Criteria

1. THE Deployment_Script SHALL run `cdk bootstrap` to set up CDK toolkit stack
2. THE Deployment_Script SHALL verify AWS credentials are configured correctly
3. THE Deployment_Script SHALL verify the target region is set (default: us-east-1)
4. WHEN bootstrap completes, THE Deployment_Script SHALL output the CDK toolkit stack name
5. THE Deployment_Script SHALL handle bootstrap errors gracefully

### Requirement 13: Seed Default Notification Templates

**User Story:** As a platform administrator, I want default notification templates seeded after deployment, so that the notification system works immediately without manual configuration.

#### Acceptance Criteria

1. THE Deployment_Script SHALL deploy a seed-templates Lambda function
2. THE Deployment_Script SHALL invoke the seed-templates Lambda function after stack deployment completes
3. THE seed-templates Lambda function SHALL create default templates for test execution completion
4. THE seed-templates Lambda function SHALL create default templates for test execution failure
5. THE seed-templates Lambda function SHALL create default templates for daily summary reports
6. THE seed-templates Lambda function SHALL create default templates for weekly summary reports
7. WHEN seeding completes, THE seed-templates Lambda function SHALL log the number of templates created

### Requirement 14: Validate Deployment Success

**User Story:** As a platform administrator, I want deployment validation, so that I can confirm all resources were created successfully.

#### Acceptance Criteria

1. WHEN deployment completes, THE Deployment_Script SHALL verify all DynamoDB tables exist
2. WHEN deployment completes, THE Deployment_Script SHALL verify all Lambda functions exist
3. WHEN deployment completes, THE Deployment_Script SHALL verify all S3 buckets exist
4. WHEN deployment completes, THE Deployment_Script SHALL verify all SQS queues exist
5. WHEN deployment completes, THE Deployment_Script SHALL verify all SNS topics exist
6. WHEN deployment completes, THE Deployment_Script SHALL verify all API Gateway routes exist
7. WHEN deployment completes, THE Deployment_Script SHALL verify all EventBridge rules exist
8. IF any resource is missing, THEN THE Deployment_Script SHALL report the missing resource and exit with error code
9. IF all resources exist, THEN THE Deployment_Script SHALL output a success message with the API Gateway endpoint URL

### Requirement 15: Document Deployment Process

**User Story:** As a developer, I want clear deployment documentation, so that I can deploy the platform or troubleshoot deployment issues.

#### Acceptance Criteria

1. THE Documentation SHALL list all prerequisites including AWS credentials, CDK CLI, and Node.js version
2. THE Documentation SHALL provide step-by-step deployment instructions
3. THE Documentation SHALL document all environment variables required for deployment
4. THE Documentation SHALL document the expected deployment time
5. THE Documentation SHALL document the expected monthly AWS costs
6. THE Documentation SHALL provide troubleshooting steps for common deployment errors
7. THE Documentation SHALL document how to verify deployment success
8. THE Documentation SHALL document how to rollback the deployment if needed

### Requirement 16: Configure Environment Variables

**User Story:** As a platform administrator, I want environment variables properly configured, so that Lambda functions can access external services and secrets.

#### Acceptance Criteria

1. THE Deployment_Script SHALL configure OPENAI_API_KEY environment variable for AI test generation functions
2. THE Deployment_Script SHALL configure N8N_WEBHOOK_URL environment variable for notification functions
3. THE Deployment_Script SHALL configure N8N_API_KEY environment variable for notification functions
4. THE Deployment_Script SHALL configure table name environment variables for all Lambda functions
5. THE Deployment_Script SHALL configure bucket name environment variables for all Lambda functions
6. THE Deployment_Script SHALL configure queue URL environment variables for all Lambda functions
7. THE Deployment_Script SHALL configure SNS topic ARN environment variables for notification processor
8. IF an environment variable is not provided, THEN THE Deployment_Script SHALL use a safe default value or empty string

### Requirement 17: Create AWS Secrets for API Keys

**User Story:** As a platform administrator, I want to securely store API keys in AWS Secrets Manager, so that Lambda functions can access external services.

#### Acceptance Criteria

1. THE Deployment_Script SHALL create a secret for OpenAI API key (optional)
2. THE Deployment_Script SHALL create a secret for Hugging Face API key (optional)
3. THE Deployment_Script SHALL create a secret for N8N webhook URL (optional)
4. THE Deployment_Script SHALL create a secret for N8N API key (optional)
5. IF a secret already exists, THE Deployment_Script SHALL skip creation
6. THE Deployment_Script SHALL output instructions for updating secret values

### Requirement 18: Output Deployment Information

**User Story:** As a platform administrator, I want deployment information output to the console, so that I can configure the frontend and verify the deployment.

#### Acceptance Criteria

1. WHEN deployment completes, THE Deployment_Script SHALL output the API Gateway endpoint URL
2. WHEN deployment completes, THE Deployment_Script SHALL output all DynamoDB table names
3. WHEN deployment completes, THE Deployment_Script SHALL output all S3 bucket names
4. WHEN deployment completes, THE Deployment_Script SHALL output all SQS queue URLs
5. WHEN deployment completes, THE Deployment_Script SHALL output all SNS topic ARNs
6. WHEN deployment completes, THE Deployment_Script SHALL output the CloudWatch dashboard URL
7. WHEN deployment completes, THE Deployment_Script SHALL output the Cognito User Pool ID
8. WHEN deployment completes, THE Deployment_Script SHALL output the Cognito User Pool Client ID
9. THE Deployment_Script SHALL format all outputs in a clear, copy-paste friendly format

/**
 * Tests for CloudWatch Monitoring Infrastructure
 */

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import { CloudWatchMonitoring } from '../cloudwatch-monitoring';

describe('CloudWatchMonitoring', () => {
  let stack: cdk.Stack;
  let api: apigateway.RestApi;
  let lambdaFunctions: { [key: string]: lambda.Function };

  beforeEach(() => {
    stack = new cdk.Stack();
    
    // Create mock API Gateway
    api = new apigateway.RestApi(stack, 'TestApi', {
      restApiName: 'test-api',
    });

    // Create mock Lambda functions
    lambdaFunctions = {
      analyzeFile: new lambda.Function(stack, 'AnalyzeFileFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200 });'),
      }),
      uploadFile: new lambda.Function(stack, 'UploadFileFunction', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200 });'),
      }),
    };
  });

  describe('Production Environment', () => {
    it('should create monitoring infrastructure with alarms', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
        alertEmail: 'alerts@example.com',
      });

      const template = Template.fromStack(stack);

      // Verify SNS topic created
      template.resourceCountIs('AWS::SNS::Topic', 1);

      // Verify dashboard created
      template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);

      // Verify alarms created (should have multiple alarms)
      template.resourceCountIs('AWS::CloudWatch::Alarm', 15); // Approximate count
    });

    it('should create dashboard with correct name', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'MISRA-Platform-production',
      });
    });

    it('should create high error rate alarm', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
        alertEmail: 'alerts@example.com',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'MISRA-Platform-HighErrorRate-production',
        Threshold: 5,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    it('should create API Gateway 5XX alarm', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
        alertEmail: 'alerts@example.com',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'MISRA-Platform-ApiGateway5XX-production',
        Threshold: 5,
      });
    });

    it('should create DynamoDB throttling alarm', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
        alertEmail: 'alerts@example.com',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'MISRA-Platform-DynamoDBThrottling-production',
        Threshold: 1,
      });
    });

    it('should create Lambda error alarms for each function', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
        alertEmail: 'alerts@example.com',
      });

      const template = Template.fromStack(stack);

      // Should have error alarms for both functions
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'MISRA-Platform-analyzeFile-Errors-production',
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'MISRA-Platform-uploadFile-Errors-production',
      });
    });

    it('should create Lambda throttling alarms', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
        alertEmail: 'alerts@example.com',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'MISRA-Platform-analyzeFile-Throttling-production',
        Threshold: 1,
      });
    });

    it('should subscribe email to SNS topic', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
        alertEmail: 'alerts@example.com',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: 'alerts@example.com',
      });
    });
  });

  describe('Staging Environment', () => {
    it('should create monitoring with relaxed thresholds', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'staging',
        api,
        lambdaFunctions,
        alertEmail: 'alerts@example.com',
      });

      const template = Template.fromStack(stack);

      // Verify alarms created with staging thresholds
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'MISRA-Platform-HighErrorRate-staging',
        Threshold: 10, // Higher threshold for staging
      });
    });

    it('should create dashboard with staging name', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'staging',
        api,
        lambdaFunctions,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'MISRA-Platform-staging',
      });
    });
  });

  describe('Development Environment', () => {
    it('should create monitoring without alarms', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'dev',
        api,
        lambdaFunctions,
      });

      const template = Template.fromStack(stack);

      // Dev environment should not have alarms
      template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
    });

    it('should still create dashboard for dev', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'dev',
        api,
        lambdaFunctions,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'MISRA-Platform-dev',
      });
    });
  });

  describe('Configuration Methods', () => {
    it('should provide structured logging config', () => {
      const monitoring = new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      const config = monitoring.getStructuredLoggingConfig();

      expect(config).toEqual({
        LOG_LEVEL: 'INFO',
        ENABLE_STRUCTURED_LOGGING: 'true',
        CORRELATION_ID_HEADER: 'X-Correlation-ID',
        LOG_FORMAT: 'JSON',
        ENABLE_PERFORMANCE_LOGGING: 'true',
        ENABLE_SECURITY_LOGGING: 'true',
      });
    });

    it('should provide metrics config', () => {
      const monitoring = new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      const config = monitoring.getMetricsConfig();

      expect(config).toEqual({
        CLOUDWATCH_NAMESPACE: 'MISRA/Platform',
        ENABLE_CUSTOM_METRICS: 'true',
        METRICS_BUFFER_SIZE: '10',
        METRICS_FLUSH_INTERVAL: '30000',
      });
    });

    it('should provide X-Ray config', () => {
      const monitoring = new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      const config = monitoring.getXRayConfig();

      expect(config).toEqual({
        AWS_XRAY_CONTEXT_MISSING: 'LOG_ERROR',
        AWS_XRAY_TRACING_NAME: 'MISRA-Platform',
        AWS_XRAY_DEBUG_MODE: 'false',
      });
    });
  });

  describe('Custom Metrics', () => {
    it('should define workflow metrics', () => {
      const monitoring = new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      expect(monitoring.customMetrics.workflowStarted).toBeDefined();
      expect(monitoring.customMetrics.workflowCompleted).toBeDefined();
      expect(monitoring.customMetrics.workflowFailed).toBeDefined();
      expect(monitoring.customMetrics.workflowDuration).toBeDefined();
    });

    it('should define analysis metrics', () => {
      const monitoring = new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      expect(monitoring.customMetrics.analysisStarted).toBeDefined();
      expect(monitoring.customMetrics.analysisCompleted).toBeDefined();
      expect(monitoring.customMetrics.analysisFailed).toBeDefined();
      expect(monitoring.customMetrics.analysisDuration).toBeDefined();
      expect(monitoring.customMetrics.complianceScore).toBeDefined();
      expect(monitoring.customMetrics.violationsDetected).toBeDefined();
      expect(monitoring.customMetrics.rulesProcessed).toBeDefined();
    });

    it('should define DynamoDB metrics', () => {
      const monitoring = new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      expect(monitoring.customMetrics.dynamodbReadLatency).toBeDefined();
      expect(monitoring.customMetrics.dynamodbWriteLatency).toBeDefined();
      expect(monitoring.customMetrics.dynamodbThrottles).toBeDefined();
    });

    it('should define system health metrics', () => {
      const monitoring = new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      expect(monitoring.customMetrics.systemHealth).toBeDefined();
      expect(monitoring.customMetrics.errorRate).toBeDefined();
      expect(monitoring.customMetrics.coldStarts).toBeDefined();
    });
  });

  describe('Log Groups', () => {
    it('should create log groups for Lambda functions', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      const template = Template.fromStack(stack);

      // Should create log groups for each Lambda function plus system log groups
      template.resourceCountIs('AWS::Logs::LogGroup', 6); // 2 Lambda + 4 system
    });

    it('should set correct retention for production', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'production',
        api,
        lambdaFunctions,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 30,
      });
    });

    it('should set shorter retention for dev', () => {
      new CloudWatchMonitoring(stack, 'Monitoring', {
        environment: 'dev',
        api,
        lambdaFunctions,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 7,
      });
    });
  });
});

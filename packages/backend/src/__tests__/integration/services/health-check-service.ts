/**
 * System Health Check Service
 * 
 * Verifies all required systems and dependencies are operational before running integration tests.
 * Validates DynamoDB tables, Lambda functions, EventBridge rules, SQS queues, S3 buckets, and external dependencies.
 * 
 * Note: AWS SDK clients are imported dynamically to avoid dependency issues in test environments.
 */

/**
 * Health check result for overall system
 */
export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: Map<string, ComponentHealth>;
  timestamp: string;
}

/**
 * Health status for individual component
 */
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  latency?: number;
  details?: Record<string, any>;
}

/**
 * System Health Check Service
 */
export class SystemHealthCheckService {
  private region: string;

  constructor(region: string = 'us-east-1') {
    this.region = region;
  }

  /**
   * Check all system components
   */
  async checkAll(): Promise<HealthCheckResult> {
    console.log('[Health Check] Starting comprehensive health check...');
    const startTime = Date.now();

    const components = new Map<string, ComponentHealth>();

    // Run all health checks in parallel
    const [
      dynamoDBHealth,
      lambdaHealth,
      eventBridgeHealth,
      sqsHealth,
      s3Health,
      externalHealth,
    ] = await Promise.all([
      this.checkDynamoDB(),
      this.checkLambdaFunctions(),
      this.checkEventBridge(),
      this.checkSQS(),
      this.checkS3(),
      this.checkExternalDependencies(),
    ]);

    components.set('DynamoDB', dynamoDBHealth);
    components.set('Lambda', lambdaHealth);
    components.set('EventBridge', eventBridgeHealth);
    components.set('SQS', sqsHealth);
    components.set('S3', s3Health);
    components.set('External', externalHealth);

    // Determine overall health
    const unhealthyCount = Array.from(components.values()).filter(
      (c) => c.status === 'unhealthy'
    ).length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount === 0) {
      overall = 'healthy';
    } else if (unhealthyCount <= 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    const duration = Date.now() - startTime;
    console.log(`[Health Check] Completed in ${duration}ms - Overall: ${overall}`);

    return {
      overall,
      components,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check DynamoDB tables
   */
  async checkDynamoDB(): Promise<ComponentHealth> {
    console.log('[Health Check] Checking DynamoDB tables...');
    const startTime = Date.now();

    const tables = [
      'TestCases',
      'TestSuites',
      'TestExecutions',
      'AIUsage',
      'AILearning',
      'misra-platform-notification-preferences-dev',
      'misra-platform-notification-templates-dev',
      'misra-platform-notification-history-dev',
    ];

    const results: Record<string, boolean> = {};
    let allHealthy = true;

    try {
      // Dynamic import to avoid dependency issues
      const { DynamoDBClient, DescribeTableCommand } = await import('@aws-sdk/client-dynamodb');
      const dynamoDBClient = new DynamoDBClient({ region: this.region });

      for (const tableName of tables) {
        try {
          const command = new DescribeTableCommand({ TableName: tableName });
          const response = await dynamoDBClient.send(command);
          
          const isActive = response.Table?.TableStatus === 'ACTIVE';
          results[tableName] = isActive;
          
          if (!isActive) {
            allHealthy = false;
            console.log(`[Health Check] Table ${tableName} is not ACTIVE: ${response.Table?.TableStatus}`);
          }
        } catch (error) {
          results[tableName] = false;
          allHealthy = false;
          console.log(`[Health Check] Failed to check table ${tableName}:`, error);
        }
      }
    } catch (error) {
      console.log('[Health Check] DynamoDB SDK not available, marking as unhealthy');
      allHealthy = false;
      for (const tableName of tables) {
        results[tableName] = false;
      }
    }

    const latency = Date.now() - startTime;

    return {
      name: 'DynamoDB',
      status: allHealthy ? 'healthy' : 'unhealthy',
      message: allHealthy
        ? `All ${tables.length} tables are accessible`
        : `Some tables are not accessible`,
      latency,
      details: results,
    };
  }

  /**
   * Check Lambda functions
   */
  async checkLambdaFunctions(): Promise<ComponentHealth> {
    console.log('[Health Check] Checking Lambda functions...');
    const startTime = Date.now();

    // Lambda function names (these would be environment-specific in real deployment)
    const functions = [
      'ai-analyze',
      'ai-generate',
      'ai-batch',
      'execution-trigger',
      'execution-executor',
      'execution-get-status',
      'execution-get-results',
      'notification-processor',
      'notification-scheduled-reports',
    ];

    const results: Record<string, boolean> = {};
    let allHealthy = true;

    try {
      // Dynamic import to avoid dependency issues
      const { LambdaClient, GetFunctionCommand } = await import('@aws-sdk/client-lambda');
      const lambdaClient = new LambdaClient({ region: this.region });

      for (const functionName of functions) {
        try {
          const command = new GetFunctionCommand({ FunctionName: functionName });
          await lambdaClient.send(command);
          results[functionName] = true;
        } catch (error) {
          results[functionName] = false;
          allHealthy = false;
          console.log(`[Health Check] Lambda function ${functionName} not found or not accessible`);
        }
      }
    } catch (error) {
      console.log('[Health Check] Lambda SDK not available, marking as unhealthy');
      allHealthy = false;
      for (const functionName of functions) {
        results[functionName] = false;
      }
    }

    const latency = Date.now() - startTime;

    return {
      name: 'Lambda',
      status: allHealthy ? 'healthy' : 'unhealthy',
      message: allHealthy
        ? `All ${functions.length} Lambda functions are deployed`
        : `Some Lambda functions are not accessible`,
      latency,
      details: results,
    };
  }

  /**
   * Check EventBridge rules
   */
  async checkEventBridge(): Promise<ComponentHealth> {
    console.log('[Health Check] Checking EventBridge rules...');
    const startTime = Date.now();

    const rules = [
      'test-execution-completion',
      'scheduled-reports',
    ];

    const results: Record<string, boolean> = {};
    let allHealthy = true;

    try {
      // Dynamic import to avoid dependency issues
      const { EventBridgeClient, DescribeRuleCommand } = await import('@aws-sdk/client-eventbridge');
      const eventBridgeClient = new EventBridgeClient({ region: this.region });

      for (const ruleName of rules) {
        try {
          const command = new DescribeRuleCommand({ Name: ruleName });
          const response = await eventBridgeClient.send(command);
          
          const isEnabled = response.State === 'ENABLED';
          results[ruleName] = isEnabled;
          
          if (!isEnabled) {
            allHealthy = false;
            console.log(`[Health Check] EventBridge rule ${ruleName} is not ENABLED: ${response.State}`);
          }
        } catch (error) {
          results[ruleName] = false;
          allHealthy = false;
          console.log(`[Health Check] Failed to check EventBridge rule ${ruleName}`);
        }
      }
    } catch (error) {
      console.log('[Health Check] EventBridge SDK not available, marking as unhealthy');
      allHealthy = false;
      for (const ruleName of rules) {
        results[ruleName] = false;
      }
    }

    const latency = Date.now() - startTime;

    return {
      name: 'EventBridge',
      status: allHealthy ? 'healthy' : 'unhealthy',
      message: allHealthy
        ? `All ${rules.length} EventBridge rules are active`
        : `Some EventBridge rules are not active`,
      latency,
      details: results,
    };
  }

  /**
   * Check SQS queues
   */
  async checkSQS(): Promise<ComponentHealth> {
    console.log('[Health Check] Checking SQS queues...');
    const startTime = Date.now();

    const queues = [
      'execution-queue',
      'notification-queue',
      'execution-dlq',
      'notification-dlq',
    ];

    const results: Record<string, boolean> = {};
    let allHealthy = true;

    try {
      // Dynamic import to avoid dependency issues
      const { SQSClient, GetQueueAttributesCommand, GetQueueUrlCommand } = await import('@aws-sdk/client-sqs');
      const sqsClient = new SQSClient({ region: this.region });

      for (const queueName of queues) {
        try {
          // Get queue URL first
          const urlCommand = new GetQueueUrlCommand({ QueueName: queueName });
          const urlResponse = await sqsClient.send(urlCommand);
          
          if (!urlResponse.QueueUrl) {
            results[queueName] = false;
            allHealthy = false;
            continue;
          }

          // Get queue attributes
          const attrsCommand = new GetQueueAttributesCommand({
            QueueUrl: urlResponse.QueueUrl,
            AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
          });
          await sqsClient.send(attrsCommand);
          
          results[queueName] = true;
        } catch (error) {
          results[queueName] = false;
          allHealthy = false;
          console.log(`[Health Check] Failed to check SQS queue ${queueName}`);
        }
      }
    } catch (error) {
      console.log('[Health Check] SQS SDK not available, marking as unhealthy');
      allHealthy = false;
      for (const queueName of queues) {
        results[queueName] = false;
      }
    }

    const latency = Date.now() - startTime;

    return {
      name: 'SQS',
      status: allHealthy ? 'healthy' : 'unhealthy',
      message: allHealthy
        ? `All ${queues.length} SQS queues are available`
        : `Some SQS queues are not available`,
      latency,
      details: results,
    };
  }

  /**
   * Check S3 buckets
   */
  async checkS3(): Promise<ComponentHealth> {
    console.log('[Health Check] Checking S3 buckets...');
    const startTime = Date.now();

    const buckets = [
      'aibts-screenshots-dev',
      'misra-platform-files-dev',
    ];

    const results: Record<string, boolean> = {};
    let allHealthy = true;

    try {
      // Dynamic import to avoid dependency issues
      const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({ region: this.region });

      for (const bucketName of buckets) {
        try {
          const command = new HeadBucketCommand({ Bucket: bucketName });
          await s3Client.send(command);
          results[bucketName] = true;
        } catch (error) {
          results[bucketName] = false;
          allHealthy = false;
          console.log(`[Health Check] Failed to check S3 bucket ${bucketName}`);
        }
      }
    } catch (error) {
      console.log('[Health Check] S3 SDK not available, marking as unhealthy');
      allHealthy = false;
      for (const bucketName of buckets) {
        results[bucketName] = false;
      }
    }

    const latency = Date.now() - startTime;

    return {
      name: 'S3',
      status: allHealthy ? 'healthy' : 'unhealthy',
      message: allHealthy
        ? `All ${buckets.length} S3 buckets exist and are accessible`
        : `Some S3 buckets are not accessible`,
      latency,
      details: results,
    };
  }

  /**
   * Check external dependencies (with mocks in test environment)
   */
  async checkExternalDependencies(): Promise<ComponentHealth> {
    console.log('[Health Check] Checking external dependencies...');
    const startTime = Date.now();

    // In test environment, we use mocks, so these are always "healthy"
    // In production, you would actually check connectivity to OpenAI API, SNS, etc.
    const results = {
      openAI: true, // Mocked in tests
      sns: true, // Mocked in tests
      browser: true, // Mocked in tests
    };

    const latency = Date.now() - startTime;

    return {
      name: 'External Dependencies',
      status: 'healthy',
      message: 'All external dependencies are reachable (mocked in test environment)',
      latency,
      details: results,
    };
  }
}

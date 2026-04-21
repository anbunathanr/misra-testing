import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDB, S3, SecretsManager, CognitoIdentityServiceProvider, CloudWatch } from 'aws-sdk';
import { CentralizedLogger, withCorrelationId } from '../../utils/centralized-logger';
import { monitoringService, HealthCheckResult } from '../../services/monitoring-service';

const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();
const secretsManager = new SecretsManager();
const cognito = new CognitoIdentityServiceProvider();
const cloudwatch = new CloudWatch();

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'unhealthy' | 'degraded';
      responseTime: number;
      details?: any;
    };
  };
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

/**
 * Health Check Lambda Function
 * 
 * Provides comprehensive health monitoring for all MISRA Platform services.
 * Used by load balancers, monitoring systems, and operational dashboards.
 * 
 * Endpoints:
 * - GET /health - Basic health check
 * - GET /health/detailed - Detailed health report with all services
 * - GET /health/service/{serviceName} - Individual service health check
 */
async function healthCheckHandler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const logger = CentralizedLogger.getInstance({
    correlationId: event.headers['x-correlation-id'],
    requestId: context.awsRequestId,
    functionName: context.functionName,
  });

  try {
    logger.info('Health check request received', {
      path: event.path,
      httpMethod: event.httpMethod,
      queryParameters: event.queryStringParameters,
    });

    const path = event.path;
    const isDetailed = path.includes('/detailed') || event.queryStringParameters?.detailed === 'true';
    const serviceName = event.pathParameters?.serviceName;

    let healthResponse: HealthCheckResponse;

    if (serviceName) {
      // Individual service health check
      healthResponse = await checkIndividualService(serviceName, logger);
    } else if (isDetailed) {
      // Detailed health check for all services
      healthResponse = await performDetailedHealthCheck(logger);
    } else {
      // Basic health check
      healthResponse = await performBasicHealthCheck(logger);
    }

    const statusCode = healthResponse.status === 'healthy' ? 200 :
                      healthResponse.status === 'degraded' ? 200 : 503;

    logger.info('Health check completed', {
      status: healthResponse.status,
      statusCode,
      serviceCount: Object.keys(healthResponse.services).length,
    });

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Correlation-ID': logger.getCorrelationId(),
      },
      body: JSON.stringify(healthResponse, null, 2),
    };
  } catch (error) {
    logger.error('Health check failed', error as Error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': logger.getCorrelationId(),
      },
      body: JSON.stringify({
        status: 'unhealthy',
        error: 'Health check system failure',
        timestamp: new Date().toISOString(),
      }),
    };
  }
}

/**
 * Perform basic health check (minimal dependencies)
 */
async function performBasicHealthCheck(logger: CentralizedLogger): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  
  // Basic system checks
  const services: HealthCheckResponse['services'] = {};
  
  // Check Lambda runtime
  services.lambda = await checkLambdaHealth();
  
  // Check environment variables
  services.environment = await checkEnvironmentHealth();

  const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
  const unhealthyCount = Object.values(services).filter(s => s.status === 'unhealthy').length;
  const degradedCount = Object.values(services).filter(s => s.status === 'degraded').length;
  
  const overallStatus = unhealthyCount > 0 ? 'unhealthy' :
                       degradedCount > 0 ? 'degraded' : 'healthy';

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0',
    environment: process.env.ENVIRONMENT || 'unknown',
    services,
    summary: {
      total: Object.keys(services).length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      degraded: degradedCount,
    },
  };

  const duration = Date.now() - startTime;
  logger.logPerformanceMetric('health_check_basic', duration);

  return response;
}

/**
 * Perform detailed health check (all services)
 */
async function performDetailedHealthCheck(logger: CentralizedLogger): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  
  const services: HealthCheckResponse['services'] = {};
  
  // Check all services in parallel
  const healthChecks = await Promise.allSettled([
    checkLambdaHealth(),
    checkEnvironmentHealth(),
    checkDynamoDBHealth(),
    checkS3Health(),
    checkCognitoHealth(),
    checkSecretsManagerHealth(),
    checkCloudWatchHealth(),
  ]);

  // Process results
  const serviceNames = ['lambda', 'environment', 'dynamodb', 's3', 'cognito', 'secretsmanager', 'cloudwatch'];
  
  healthChecks.forEach((result, index) => {
    const serviceName = serviceNames[index];
    if (result.status === 'fulfilled') {
      services[serviceName] = result.value;
    } else {
      services[serviceName] = {
        status: 'unhealthy',
        responseTime: 0,
        details: { error: result.reason?.message || 'Unknown error' },
      };
    }
  });

  const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
  const unhealthyCount = Object.values(services).filter(s => s.status === 'unhealthy').length;
  const degradedCount = Object.values(services).filter(s => s.status === 'degraded').length;
  
  const overallStatus = unhealthyCount > 0 ? 'unhealthy' :
                       degradedCount > 0 ? 'degraded' : 'healthy';

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0',
    environment: process.env.ENVIRONMENT || 'unknown',
    services,
    summary: {
      total: Object.keys(services).length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      degraded: degradedCount,
    },
  };

  const duration = Date.now() - startTime;
  logger.logPerformanceMetric('health_check_detailed', duration);

  // Record health check metrics for CloudWatch alarms
  await monitoringService.recordBusinessMetric('HealthCheckCompleted', 1, {
    type: 'detailed',
    status: overallStatus,
  });

  // Record health check duration
  await monitoringService.recordBusinessMetric('HealthCheckDuration', duration, {
    type: 'detailed',
  });

  // Record failure metric if unhealthy
  if (overallStatus === 'unhealthy') {
    await monitoringService.recordBusinessMetric('HealthCheckFailed', 1, {
      type: 'detailed',
      unhealthyServices: unhealthyCount.toString(),
    });
  }

  // Record degradation metric if degraded
  if (degradedCount > 0) {
    await monitoringService.recordBusinessMetric('ServiceDegraded', degradedCount, {
      type: 'detailed',
    });
  }

  return response;
}

/**
 * Check individual service health
 */
async function checkIndividualService(serviceName: string, logger: CentralizedLogger): Promise<HealthCheckResponse> {
  const startTime = Date.now();
  let serviceResult: any;

  switch (serviceName.toLowerCase()) {
    case 'lambda':
      serviceResult = await checkLambdaHealth();
      break;
    case 'dynamodb':
      serviceResult = await checkDynamoDBHealth();
      break;
    case 's3':
      serviceResult = await checkS3Health();
      break;
    case 'cognito':
      serviceResult = await checkCognitoHealth();
      break;
    case 'secretsmanager':
      serviceResult = await checkSecretsManagerHealth();
      break;
    case 'cloudwatch':
      serviceResult = await checkCloudWatchHealth();
      break;
    case 'environment':
      serviceResult = await checkEnvironmentHealth();
      break;
    default:
      throw new Error(`Unknown service: ${serviceName}`);
  }

  const response: HealthCheckResponse = {
    status: serviceResult.status,
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '1.0.0',
    environment: process.env.ENVIRONMENT || 'unknown',
    services: {
      [serviceName]: serviceResult,
    },
    summary: {
      total: 1,
      healthy: serviceResult.status === 'healthy' ? 1 : 0,
      unhealthy: serviceResult.status === 'unhealthy' ? 1 : 0,
      degraded: serviceResult.status === 'degraded' ? 1 : 0,
    },
  };

  const duration = Date.now() - startTime;
  logger.logPerformanceMetric(`health_check_${serviceName}`, duration);

  return response;
}

/**
 * Check Lambda runtime health
 */
async function checkLambdaHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryLimitMB = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '512');
    const memoryUtilization = (memoryUsedMB / memoryLimitMB) * 100;

    const responseTime = Date.now() - startTime;
    
    return {
      service: 'lambda',
      status: memoryUtilization > 90 ? 'degraded' : 'healthy',
      responseTime,
      details: {
        memoryUsedMB: Math.round(memoryUsedMB),
        memoryLimitMB,
        memoryUtilization: Math.round(memoryUtilization),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      service: 'lambda',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: (error as Error).message },
      timestamp: new Date(),
    };
  }
}

/**
 * Check environment configuration health
 */
async function checkEnvironmentHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const requiredEnvVars = [
      'ENVIRONMENT',
      'FILES_BUCKET_NAME',
      'USERS_TABLE_NAME',
      'FILE_METADATA_TABLE_NAME',
      'ANALYSIS_RESULTS_TABLE_NAME',
      'SAMPLE_FILES_TABLE_NAME',
      'PROGRESS_TABLE_NAME',
      'USER_POOL_ID',
      'USER_POOL_CLIENT_ID',
      'AWS_REGION',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const responseTime = Date.now() - startTime;

    return {
      service: 'environment',
      status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
      responseTime,
      details: {
        requiredVariables: requiredEnvVars.length,
        configuredVariables: requiredEnvVars.length - missingVars.length,
        missingVariables: missingVars,
        environment: process.env.ENVIRONMENT,
        region: process.env.AWS_REGION,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      service: 'environment',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: (error as Error).message },
      timestamp: new Date(),
    };
  }
}

/**
 * Check DynamoDB health - checks all critical tables
 */
async function checkDynamoDBHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const tableNames = [
      process.env.USERS_TABLE_NAME,
      process.env.FILE_METADATA_TABLE_NAME,
      process.env.ANALYSIS_RESULTS_TABLE_NAME,
      process.env.SAMPLE_FILES_TABLE_NAME,
      process.env.PROGRESS_TABLE_NAME,
    ].filter(Boolean) as string[];

    if (tableNames.length === 0) {
      throw new Error('No DynamoDB table names configured');
    }

    // Check all tables in parallel
    const tableChecks = await Promise.allSettled(
      tableNames.map(async (tableName) => {
        const result = await dynamodb.scan({
          TableName: tableName,
          Limit: 1,
          Select: 'COUNT',
        }).promise();
        return { tableName, count: result.ScannedCount || 0 };
      })
    );

    const successfulChecks = tableChecks.filter(r => r.status === 'fulfilled').length;
    const failedChecks = tableChecks.filter(r => r.status === 'rejected');
    const responseTime = Date.now() - startTime;

    const tableDetails: Record<string, any> = {};
    tableChecks.forEach((result, index) => {
      const tableName = tableNames[index];
      if (result.status === 'fulfilled') {
        tableDetails[tableName] = {
          status: 'healthy',
          count: result.value.count,
        };
      } else {
        tableDetails[tableName] = {
          status: 'unhealthy',
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    const status = failedChecks.length === 0 ? 'healthy' :
                  failedChecks.length < tableNames.length ? 'degraded' : 'unhealthy';

    return {
      service: 'dynamodb',
      status,
      responseTime,
      details: {
        totalTables: tableNames.length,
        healthyTables: successfulChecks,
        unhealthyTables: failedChecks.length,
        responseTimeMs: responseTime,
        tables: tableDetails,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      service: 'dynamodb',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: (error as Error).message },
      timestamp: new Date(),
    };
  }
}

/**
 * Check S3 health
 */
async function checkS3Health(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const bucketName = process.env.FILE_STORAGE_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('FILE_STORAGE_BUCKET_NAME not configured');
    }

    // Perform a simple head bucket operation
    await s3.headBucket({ Bucket: bucketName }).promise();
    const responseTime = Date.now() - startTime;

    return {
      service: 's3',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        bucketName,
        responseTimeMs: responseTime,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      service: 's3',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: (error as Error).message },
      timestamp: new Date(),
    };
  }
}

/**
 * Check Secrets Manager health
 */
async function checkSecretsManagerHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const secretNames = [
      process.env.JWT_SECRET_NAME,
      process.env.OTP_SECRET_NAME,
      process.env.API_KEYS_SECRET_NAME,
      process.env.DATABASE_SECRET_NAME,
    ].filter(Boolean) as string[];

    if (secretNames.length === 0) {
      // If no secrets configured, return healthy but with note
      return {
        service: 'secretsmanager',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          note: 'No secrets configured for health check',
          responseTimeMs: Date.now() - startTime,
        },
        timestamp: new Date(),
      };
    }

    // Check all secrets in parallel (just describe, don't retrieve values)
    const secretChecks = await Promise.allSettled(
      secretNames.map(async (secretName) => {
        const result = await secretsManager.describeSecret({
          SecretId: secretName,
        }).promise();
        return { secretName, arn: result.ARN };
      })
    );

    const successfulChecks = secretChecks.filter(r => r.status === 'fulfilled').length;
    const failedChecks = secretChecks.filter(r => r.status === 'rejected');
    const responseTime = Date.now() - startTime;

    const secretDetails: Record<string, any> = {};
    secretChecks.forEach((result, index) => {
      const secretName = secretNames[index];
      if (result.status === 'fulfilled') {
        secretDetails[secretName] = {
          status: 'healthy',
          exists: true,
        };
      } else {
        secretDetails[secretName] = {
          status: 'unhealthy',
          error: result.reason?.message || 'Unknown error',
        };
      }
    });

    const status = failedChecks.length === 0 ? 'healthy' :
                  failedChecks.length < secretNames.length ? 'degraded' : 'unhealthy';

    return {
      service: 'secretsmanager',
      status,
      responseTime,
      details: {
        totalSecrets: secretNames.length,
        healthySecrets: successfulChecks,
        unhealthySecrets: failedChecks.length,
        responseTimeMs: responseTime,
        secrets: secretDetails,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      service: 'secretsmanager',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: (error as Error).message },
      timestamp: new Date(),
    };
  }
}

/**
 * Check Cognito User Pool health
 */
async function checkCognitoHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
      throw new Error('USER_POOL_ID not configured');
    }

    // Describe the user pool to check if it's accessible
    const result = await cognito.describeUserPool({
      UserPoolId: userPoolId,
    }).promise();

    const responseTime = Date.now() - startTime;

    return {
      service: 'cognito',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        userPoolId,
        userPoolName: result.UserPool?.Name,
        status: result.UserPool?.Status,
        mfaConfiguration: result.UserPool?.MfaConfiguration,
        responseTimeMs: responseTime,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      service: 'cognito',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: (error as Error).message },
      timestamp: new Date(),
    };
  }
}

/**
 * Check CloudWatch health
 */
async function checkCloudWatchHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // List metrics to verify CloudWatch API is accessible
    const result = await cloudwatch.listMetrics({
      Namespace: process.env.CLOUDWATCH_NAMESPACE || 'MISRA/Platform',
    }).promise();

    const responseTime = Date.now() - startTime;

    return {
      service: 'cloudwatch',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        namespace: process.env.CLOUDWATCH_NAMESPACE || 'MISRA/Platform',
        accessible: true,
        metricsCount: result.Metrics?.length || 0,
        responseTimeMs: responseTime,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      service: 'cloudwatch',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: { error: (error as Error).message },
      timestamp: new Date(),
    };
  }
}

// Export the handler with correlation ID middleware
export const handler = withCorrelationId(healthCheckHandler);
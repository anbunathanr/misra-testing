import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDB, S3 } from 'aws-sdk';
import { CentralizedLogger, withCorrelationId } from '../../utils/centralized-logger';
import { monitoringService, HealthCheckResult } from '../../services/monitoring-service';

const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

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
    checkSecretsManagerHealth(),
    checkCloudWatchHealth(),
  ]);

  // Process results
  const serviceNames = ['lambda', 'environment', 'dynamodb', 's3', 'secretsmanager', 'cloudwatch'];
  
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

  // Record health check metrics
  await monitoringService.recordBusinessMetric('HealthCheckCompleted', 1, {
    type: 'detailed',
    status: overallStatus,
  });

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
      'FILE_STORAGE_BUCKET_NAME',
      'USERS_TABLE_NAME',
      'PROJECTS_TABLE_NAME',
      'FILE_METADATA_TABLE_NAME',
      'ANALYSIS_RESULTS_TABLE_NAME',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const responseTime = Date.now() - startTime;

    return {
      service: 'environment',
      status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
      responseTime,
      details: {
        requiredVariables: requiredEnvVars.length,
        missingVariables: missingVars,
        environment: process.env.ENVIRONMENT,
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
 * Check DynamoDB health
 */
async function checkDynamoDBHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const tableName = process.env.USERS_TABLE_NAME;
    if (!tableName) {
      throw new Error('USERS_TABLE_NAME not configured');
    }

    // Perform a simple describe table operation
    const result = await dynamodb.scan({
      TableName: tableName,
      Limit: 1,
      Select: 'COUNT',
    }).promise();

    const responseTime = Date.now() - startTime;

    return {
      service: 'dynamodb',
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        tableName,
        responseTimeMs: responseTime,
        scannedCount: result.ScannedCount,
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
    // This is a placeholder - in production, you'd check actual secrets
    const responseTime = Date.now() - startTime;

    return {
      service: 'secretsmanager',
      status: 'healthy',
      responseTime,
      details: {
        responseTimeMs: responseTime,
        note: 'Secrets Manager check not implemented',
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
 * Check CloudWatch health
 */
async function checkCloudWatchHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // This is a placeholder - in production, you'd check CloudWatch API
    const responseTime = Date.now() - startTime;

    return {
      service: 'cloudwatch',
      status: 'healthy',
      responseTime,
      details: {
        responseTimeMs: responseTime,
        note: 'CloudWatch check not implemented',
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
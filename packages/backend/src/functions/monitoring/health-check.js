"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aws_sdk_1 = require("aws-sdk");
const centralized_logger_1 = require("../../utils/centralized-logger");
const monitoring_service_1 = require("../../services/monitoring-service");
const dynamodb = new aws_sdk_1.DynamoDB.DocumentClient();
const s3 = new aws_sdk_1.S3();
const secretsManager = new aws_sdk_1.SecretsManager();
const cognito = new aws_sdk_1.CognitoIdentityServiceProvider();
const cloudwatch = new aws_sdk_1.CloudWatch();
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
async function healthCheckHandler(event, context) {
    const logger = centralized_logger_1.CentralizedLogger.getInstance({
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
        let healthResponse;
        if (serviceName) {
            // Individual service health check
            healthResponse = await checkIndividualService(serviceName, logger);
        }
        else if (isDetailed) {
            // Detailed health check for all services
            healthResponse = await performDetailedHealthCheck(logger);
        }
        else {
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
    }
    catch (error) {
        logger.error('Health check failed', error);
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
async function performBasicHealthCheck(logger) {
    const startTime = Date.now();
    // Basic system checks
    const services = {};
    // Check Lambda runtime
    services.lambda = await checkLambdaHealth();
    // Check environment variables
    services.environment = await checkEnvironmentHealth();
    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
    const unhealthyCount = Object.values(services).filter(s => s.status === 'unhealthy').length;
    const degradedCount = Object.values(services).filter(s => s.status === 'degraded').length;
    const overallStatus = unhealthyCount > 0 ? 'unhealthy' :
        degradedCount > 0 ? 'degraded' : 'healthy';
    const response = {
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
async function performDetailedHealthCheck(logger) {
    const startTime = Date.now();
    const services = {};
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
        }
        else {
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
    const response = {
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
    await monitoring_service_1.monitoringService.recordBusinessMetric('HealthCheckCompleted', 1, {
        type: 'detailed',
        status: overallStatus,
    });
    // Record health check duration
    await monitoring_service_1.monitoringService.recordBusinessMetric('HealthCheckDuration', duration, {
        type: 'detailed',
    });
    // Record failure metric if unhealthy
    if (overallStatus === 'unhealthy') {
        await monitoring_service_1.monitoringService.recordBusinessMetric('HealthCheckFailed', 1, {
            type: 'detailed',
            unhealthyServices: unhealthyCount.toString(),
        });
    }
    // Record degradation metric if degraded
    if (degradedCount > 0) {
        await monitoring_service_1.monitoringService.recordBusinessMetric('ServiceDegraded', degradedCount, {
            type: 'detailed',
        });
    }
    return response;
}
/**
 * Check individual service health
 */
async function checkIndividualService(serviceName, logger) {
    const startTime = Date.now();
    let serviceResult;
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
    const response = {
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
async function checkLambdaHealth() {
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
    }
    catch (error) {
        return {
            service: 'lambda',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            details: { error: error.message },
            timestamp: new Date(),
        };
    }
}
/**
 * Check environment configuration health
 */
async function checkEnvironmentHealth() {
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
    }
    catch (error) {
        return {
            service: 'environment',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            details: { error: error.message },
            timestamp: new Date(),
        };
    }
}
/**
 * Check DynamoDB health - checks all critical tables
 */
async function checkDynamoDBHealth() {
    const startTime = Date.now();
    try {
        const tableNames = [
            process.env.USERS_TABLE_NAME,
            process.env.FILE_METADATA_TABLE_NAME,
            process.env.ANALYSIS_RESULTS_TABLE_NAME,
            process.env.SAMPLE_FILES_TABLE_NAME,
            process.env.PROGRESS_TABLE_NAME,
        ].filter(Boolean);
        if (tableNames.length === 0) {
            throw new Error('No DynamoDB table names configured');
        }
        // Check all tables in parallel
        const tableChecks = await Promise.allSettled(tableNames.map(async (tableName) => {
            const result = await dynamodb.scan({
                TableName: tableName,
                Limit: 1,
                Select: 'COUNT',
            }).promise();
            return { tableName, count: result.ScannedCount || 0 };
        }));
        const successfulChecks = tableChecks.filter(r => r.status === 'fulfilled').length;
        const failedChecks = tableChecks.filter(r => r.status === 'rejected');
        const responseTime = Date.now() - startTime;
        const tableDetails = {};
        tableChecks.forEach((result, index) => {
            const tableName = tableNames[index];
            if (result.status === 'fulfilled') {
                tableDetails[tableName] = {
                    status: 'healthy',
                    count: result.value.count,
                };
            }
            else {
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
    }
    catch (error) {
        return {
            service: 'dynamodb',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            details: { error: error.message },
            timestamp: new Date(),
        };
    }
}
/**
 * Check S3 health
 */
async function checkS3Health() {
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
    }
    catch (error) {
        return {
            service: 's3',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            details: { error: error.message },
            timestamp: new Date(),
        };
    }
}
/**
 * Check Secrets Manager health
 */
async function checkSecretsManagerHealth() {
    const startTime = Date.now();
    try {
        const secretNames = [
            process.env.JWT_SECRET_NAME,
            process.env.OTP_SECRET_NAME,
            process.env.API_KEYS_SECRET_NAME,
            process.env.DATABASE_SECRET_NAME,
        ].filter(Boolean);
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
        const secretChecks = await Promise.allSettled(secretNames.map(async (secretName) => {
            const result = await secretsManager.describeSecret({
                SecretId: secretName,
            }).promise();
            return { secretName, arn: result.ARN };
        }));
        const successfulChecks = secretChecks.filter(r => r.status === 'fulfilled').length;
        const failedChecks = secretChecks.filter(r => r.status === 'rejected');
        const responseTime = Date.now() - startTime;
        const secretDetails = {};
        secretChecks.forEach((result, index) => {
            const secretName = secretNames[index];
            if (result.status === 'fulfilled') {
                secretDetails[secretName] = {
                    status: 'healthy',
                    exists: true,
                };
            }
            else {
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
    }
    catch (error) {
        return {
            service: 'secretsmanager',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            details: { error: error.message },
            timestamp: new Date(),
        };
    }
}
/**
 * Check Cognito User Pool health
 */
async function checkCognitoHealth() {
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
    }
    catch (error) {
        return {
            service: 'cognito',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            details: { error: error.message },
            timestamp: new Date(),
        };
    }
}
/**
 * Check CloudWatch health
 */
async function checkCloudWatchHealth() {
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
    }
    catch (error) {
        return {
            service: 'cloudwatch',
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            details: { error: error.message },
            timestamp: new Date(),
        };
    }
}
// Export the handler with correlation ID middleware
exports.handler = (0, centralized_logger_1.withCorrelationId)(healthCheckHandler);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhbHRoLWNoZWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGVhbHRoLWNoZWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFDQUFtRztBQUNuRyx1RUFBc0Y7QUFDdEYsMEVBQXlGO0FBRXpGLE1BQU0sUUFBUSxHQUFHLElBQUksa0JBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUMvQyxNQUFNLEVBQUUsR0FBRyxJQUFJLFlBQUUsRUFBRSxDQUFDO0FBQ3BCLE1BQU0sY0FBYyxHQUFHLElBQUksd0JBQWMsRUFBRSxDQUFDO0FBQzVDLE1BQU0sT0FBTyxHQUFHLElBQUksd0NBQThCLEVBQUUsQ0FBQztBQUNyRCxNQUFNLFVBQVUsR0FBRyxJQUFJLG9CQUFVLEVBQUUsQ0FBQztBQXNCcEM7Ozs7Ozs7Ozs7R0FVRztBQUNILEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxLQUEyQixFQUFFLE9BQWdCO0lBQzdFLE1BQU0sTUFBTSxHQUFHLHNDQUFpQixDQUFDLFdBQVcsQ0FBQztRQUMzQyxhQUFhLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztRQUNoRCxTQUFTLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDL0IsWUFBWSxFQUFFLE9BQU8sQ0FBQyxZQUFZO0tBQ25DLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUU7WUFDM0MsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtZQUM1QixlQUFlLEVBQUUsS0FBSyxDQUFDLHFCQUFxQjtTQUM3QyxDQUFDLENBQUM7UUFFSCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLHFCQUFxQixFQUFFLFFBQVEsS0FBSyxNQUFNLENB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QUUsR0FBRyxTQUFTO1lBQ3BDLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRyxLQUFlLENBQUMsT0FBTyxFQUFFO1lBQzVDLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRTtTQUN0QixDQUFDO0lBQ0osQ0FBQztBQUNILENBQUM7QUFFRCxvREFBb0Q7QUFDdkMsUUFBQSxPQUFPLEdBQUcsSUFBQSxzQ0FBaUIsRUFBQyxrQkFBa0IsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQiwgUzMsIFNlY3JldHNNYW5hZ2VyLCBDb2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXIsIENsb3VkV2F0Y2ggfSBmcm9tICdhd3Mtc2RrJztcclxuaW1wb3J0IHsgQ2VudHJhbGl6ZWRMb2dnZXIsIHdpdGhDb3JyZWxhdGlvbklkIH0gZnJvbSAnLi4vLi4vdXRpbHMvY2VudHJhbGl6ZWQtbG9nZ2VyJztcclxuaW1wb3J0IHsgbW9uaXRvcmluZ1NlcnZpY2UsIEhlYWx0aENoZWNrUmVzdWx0IH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbW9uaXRvcmluZy1zZXJ2aWNlJztcclxuXHJcbmNvbnN0IGR5bmFtb2RiID0gbmV3IER5bmFtb0RCLkRvY3VtZW50Q2xpZW50KCk7XHJcbmNvbnN0IHMzID0gbmV3IFMzKCk7XHJcbmNvbnN0IHNlY3JldHNNYW5hZ2VyID0gbmV3IFNlY3JldHNNYW5hZ2VyKCk7XHJcbmNvbnN0IGNvZ25pdG8gPSBuZXcgQ29nbml0b0lkZW50aXR5U2VydmljZVByb3ZpZGVyKCk7XHJcbmNvbnN0IGNsb3Vkd2F0Y2ggPSBuZXcgQ2xvdWRXYXRjaCgpO1xyXG5cclxuaW50ZXJmYWNlIEhlYWx0aENoZWNrUmVzcG9uc2Uge1xyXG4gIHN0YXR1czogJ2hlYWx0aHknIHwgJ2RlZ3JhZGVkJyB8ICd1bmhlYWx0aHknO1xyXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xyXG4gIHZlcnNpb246IHN0cmluZztcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIHNlcnZpY2VzOiB7XHJcbiAgICBbc2VydmljZU5hbWU6IHN0cmluZ106IHtcclxuICAgICAgc3RhdHVzOiAnaGVhbHRoeScgfCAndW5oZWFsdGh5JyB8ICdkZWdyYWRlZCc7XHJcbiAgICAgIHJlc3BvbnNlVGltZTogbnVtYmVyO1xyXG4gICAgICBkZXRhaWxzPzogYW55O1xyXG4gICAgfTtcclxuICB9O1xyXG4gIHN1bW1hcnk6IHtcclxuICAgIHRvdGFsOiBudW1iZXI7XHJcbiAgICBoZWFsdGh5OiBudW1iZXI7XHJcbiAgICB1bmhlYWx0aHk6IG51bWJlcjtcclxuICAgIGRlZ3JhZGVkOiBudW1iZXI7XHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhlYWx0aCBDaGVjayBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIFByb3ZpZGVzIGNvbXByZWhlbnNpdmUgaGVhbHRoIG1vbml0b3JpbmcgZm9yIGFsbCBNSVNSQSBQbGF0Zm9ybSBzZXJ2aWNlcy5cclxuICogVXNlZCBieSBsb2FkIGJhbGFuY2VycywgbW9uaXRvcmluZyBzeXN0ZW1zLCBhbmQgb3BlcmF0aW9uYWwgZGFzaGJvYXJkcy5cclxuICogXHJcbiAqIEVuZHBvaW50czpcclxuICogLSBHRVQgL2hlYWx0aCAtIEJhc2ljIGhlYWx0aCBjaGVja1xyXG4gKiAtIEdFVCAvaGVhbHRoL2RldGFpbGVkIC0gRGV0YWlsZWQgaGVhbHRoIHJlcG9ydCB3aXRoIGFsbCBzZXJ2aWNlc1xyXG4gKiAtIEdFVCAvaGVhbHRoL3NlcnZpY2Uve3NlcnZpY2VOYW1lfSAtIEluZGl2aWR1YWwgc2VydmljZSBoZWFsdGggY2hlY2tcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGhlYWx0aENoZWNrSGFuZGxlcihldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQsIGNvbnRleHQ6IENvbnRleHQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIGNvbnN0IGxvZ2dlciA9IENlbnRyYWxpemVkTG9nZ2VyLmdldEluc3RhbmNlKHtcclxuICAgIGNvcnJlbGF0aW9uSWQ6IGV2ZW50LmhlYWRlcnNbJ3gtY29ycmVsYXRpb24taWQnXSxcclxuICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICBmdW5jdGlvbk5hbWU6IGNvbnRleHQuZnVuY3Rpb25OYW1lLFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ0hlYWx0aCBjaGVjayByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgICBodHRwTWV0aG9kOiBldmVudC5odHRwTWV0aG9kLFxyXG4gICAgICBxdWVyeVBhcmFtZXRlcnM6IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHBhdGggPSBldmVudC5wYXRoO1xyXG4gICAgY29uc3QgaXNEZXRhaWxlZCA9IHBhdGguaW5jbHVkZXMoJy9kZXRhaWxlZCcpIHx8IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8uZGV0YWlsZWQgPT09ICd0cnVlJztcclxuICAgIGNvbnN0IHNlcnZpY2VOYW1lID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnNlcnZpY2VOYW1lO1xyXG5cclxuICAgIGxldCBoZWFsdGhSZXNwb25zZTogSGVhbHRoQ2hlY2tSZXNwb25zZTtcclxuXHJcbiAgICBpZiAoc2VydmljZU5hbWUpIHtcclxuICAgICAgLy8gSW5kaXZpZHVhbCBzZXJ2aWNlIGhlYWx0aCBjaGVja1xyXG4gICAgICBoZWFsdGhSZXNwb25zZSA9IGF3YWl0IGNoZWNrSW5kaXZpZHVhbFNlcnZpY2Uoc2VydmljZU5hbWUsIGxvZ2dlcik7XHJcbiAgICB9IGVsc2UgaWYgKGlzRGV0YWlsZWQpIHtcclxuICAgICAgLy8gRGV0YWlsZWQgaGVhbHRoIGNoZWNrIGZvciBhbGwgc2VydmljZXNcclxuICAgICAgaGVhbHRoUmVzcG9uc2UgPSBhd2FpdCBwZXJmb3JtRGV0YWlsZWRIZWFsdGhDaGVjayhsb2dnZXIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gQmFzaWMgaGVhbHRoIGNoZWNrXHJcbiAgICAgIGhlYWx0aFJlc3BvbnNlID0gYXdhaXQgcGVyZm9ybUJhc2ljSGVhbHRoQ2hlY2sobG9nZ2VyKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzdGF0dXNDb2RlID0gaGVhbHRoUmVzcG9uc2Uuc3RhdHVzID09PSAnaGVhbHRoeScgPyAyMDAgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgaGVhbHRoUmVzcG9uc2Uuc3RhdHVzID09PSAnZGVncmFkZWQnID8gMjAwIDogNTAzO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdIZWFsdGggY2hlY2sgY29tcGxldGVkJywge1xyXG4gICAgICBzdGF0dXM6IGhlYWx0aFJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgc3RhdHVzQ29kZSxcclxuICAgICAgc2VydmljZUNvdW50OiBPYmplY3Qua2V5cyhoZWFsdGhSZXNwb25zZS5zZXJ2aWNlcykubGVuZ3RoLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZSxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0NhY2hlLUNvbnRyb2wnOiAnbm8tY2FjaGUsIG5vLXN0b3JlLCBtdXN0LXJldmFsaWRhdGUnLFxyXG4gICAgICAgICdYLUNvcnJlbGF0aW9uLUlEJzogbG9nZ2VyLmdldENvcnJlbGF0aW9uSWQoKSxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoaGVhbHRoUmVzcG9uc2UsIG51bGwsIDIpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdIZWFsdGggY2hlY2sgZmFpbGVkJywgZXJyb3IgYXMgRXJyb3IpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ1gtQ29ycmVsYXRpb24tSUQnOiBsb2dnZXIuZ2V0Q29ycmVsYXRpb25JZCgpLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgICBlcnJvcjogJ0hlYWx0aCBjaGVjayBzeXN0ZW0gZmFpbHVyZScsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQZXJmb3JtIGJhc2ljIGhlYWx0aCBjaGVjayAobWluaW1hbCBkZXBlbmRlbmNpZXMpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtQmFzaWNIZWFsdGhDaGVjayhsb2dnZXI6IENlbnRyYWxpemVkTG9nZ2VyKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3BvbnNlPiB7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBcclxuICAvLyBCYXNpYyBzeXN0ZW0gY2hlY2tzXHJcbiAgY29uc3Qgc2VydmljZXM6IEhlYWx0aENoZWNrUmVzcG9uc2VbJ3NlcnZpY2VzJ10gPSB7fTtcclxuICBcclxuICAvLyBDaGVjayBMYW1iZGEgcnVudGltZVxyXG4gIHNlcnZpY2VzLmxhbWJkYSA9IGF3YWl0IGNoZWNrTGFtYmRhSGVhbHRoKCk7XHJcbiAgXHJcbiAgLy8gQ2hlY2sgZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbiAgc2VydmljZXMuZW52aXJvbm1lbnQgPSBhd2FpdCBjaGVja0Vudmlyb25tZW50SGVhbHRoKCk7XHJcblxyXG4gIGNvbnN0IGhlYWx0aHlDb3VudCA9IE9iamVjdC52YWx1ZXMoc2VydmljZXMpLmZpbHRlcihzID0+IHMuc3RhdHVzID09PSAnaGVhbHRoeScpLmxlbmd0aDtcclxuICBjb25zdCB1bmhlYWx0aHlDb3VudCA9IE9iamVjdC52YWx1ZXMoc2VydmljZXMpLmZpbHRlcihzID0+IHMuc3RhdHVzID09PSAndW5oZWFsdGh5JykubGVuZ3RoO1xyXG4gIGNvbnN0IGRlZ3JhZGVkQ291bnQgPSBPYmplY3QudmFsdWVzKHNlcnZpY2VzKS5maWx0ZXIocyA9PiBzLnN0YXR1cyA9PT0gJ2RlZ3JhZGVkJykubGVuZ3RoO1xyXG4gIFxyXG4gIGNvbnN0IG92ZXJhbGxTdGF0dXMgPSB1bmhlYWx0aHlDb3VudCA+IDAgPyAndW5oZWFsdGh5JyA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgZGVncmFkZWRDb3VudCA+IDAgPyAnZGVncmFkZWQnIDogJ2hlYWx0aHknO1xyXG5cclxuICBjb25zdCByZXNwb25zZTogSGVhbHRoQ2hlY2tSZXNwb25zZSA9IHtcclxuICAgIHN0YXR1czogb3ZlcmFsbFN0YXR1cyxcclxuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgdmVyc2lvbjogcHJvY2Vzcy5lbnYuVkVSU0lPTiB8fCAnMS4wLjAnLFxyXG4gICAgZW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICd1bmtub3duJyxcclxuICAgIHNlcnZpY2VzLFxyXG4gICAgc3VtbWFyeToge1xyXG4gICAgICB0b3RhbDogT2JqZWN0LmtleXMoc2VydmljZXMpLmxlbmd0aCxcclxuICAgICAgaGVhbHRoeTogaGVhbHRoeUNvdW50LFxyXG4gICAgICB1bmhlYWx0aHk6IHVuaGVhbHRoeUNvdW50LFxyXG4gICAgICBkZWdyYWRlZDogZGVncmFkZWRDb3VudCxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gIGxvZ2dlci5sb2dQZXJmb3JtYW5jZU1ldHJpYygnaGVhbHRoX2NoZWNrX2Jhc2ljJywgZHVyYXRpb24pO1xyXG5cclxuICByZXR1cm4gcmVzcG9uc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQZXJmb3JtIGRldGFpbGVkIGhlYWx0aCBjaGVjayAoYWxsIHNlcnZpY2VzKVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcGVyZm9ybURldGFpbGVkSGVhbHRoQ2hlY2sobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8SGVhbHRoQ2hlY2tSZXNwb25zZT4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgY29uc3Qgc2VydmljZXM6IEhlYWx0aENoZWNrUmVzcG9uc2VbJ3NlcnZpY2VzJ10gPSB7fTtcclxuICBcclxuICAvLyBDaGVjayBhbGwgc2VydmljZXMgaW4gcGFyYWxsZWxcclxuICBjb25zdCBoZWFsdGhDaGVja3MgPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoW1xyXG4gICAgY2hlY2tMYW1iZGFIZWFsdGgoKSxcclxuICAgIGNoZWNrRW52aXJvbm1lbnRIZWFsdGgoKSxcclxuICAgIGNoZWNrRHluYW1vREJIZWFsdGgoKSxcclxuICAgIGNoZWNrUzNIZWFsdGgoKSxcclxuICAgIGNoZWNrQ29nbml0b0hlYWx0aCgpLFxyXG4gICAgY2hlY2tTZWNyZXRzTWFuYWdlckhlYWx0aCgpLFxyXG4gICAgY2hlY2tDbG91ZFdhdGNoSGVhbHRoKCksXHJcbiAgXSk7XHJcblxyXG4gIC8vIFByb2Nlc3MgcmVzdWx0c1xyXG4gIGNvbnN0IHNlcnZpY2VOYW1lcyA9IFsnbGFtYmRhJywgJ2Vudmlyb25tZW50JywgJ2R5bmFtb2RiJywgJ3MzJywgJ2NvZ25pdG8nLCAnc2VjcmV0c21hbmFnZXInLCAnY2xvdWR3YXRjaCddO1xyXG4gIFxyXG4gIGhlYWx0aENoZWNrcy5mb3JFYWNoKChyZXN1bHQsIGluZGV4KSA9PiB7XHJcbiAgICBjb25zdCBzZXJ2aWNlTmFtZSA9IHNlcnZpY2VOYW1lc1tpbmRleF07XHJcbiAgICBpZiAocmVzdWx0LnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcpIHtcclxuICAgICAgc2VydmljZXNbc2VydmljZU5hbWVdID0gcmVzdWx0LnZhbHVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2VydmljZXNbc2VydmljZU5hbWVdID0ge1xyXG4gICAgICAgIHN0YXR1czogJ3VuaGVhbHRoeScsXHJcbiAgICAgICAgcmVzcG9uc2VUaW1lOiAwLFxyXG4gICAgICAgIGRldGFpbHM6IHsgZXJyb3I6IHJlc3VsdC5yZWFzb24/Lm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InIH0sXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGhlYWx0aHlDb3VudCA9IE9iamVjdC52YWx1ZXMoc2VydmljZXMpLmZpbHRlcihzID0+IHMuc3RhdHVzID09PSAnaGVhbHRoeScpLmxlbmd0aDtcclxuICBjb25zdCB1bmhlYWx0aHlDb3VudCA9IE9iamVjdC52YWx1ZXMoc2VydmljZXMpLmZpbHRlcihzID0+IHMuc3RhdHVzID09PSAndW5oZWFsdGh5JykubGVuZ3RoO1xyXG4gIGNvbnN0IGRlZ3JhZGVkQ291bnQgPSBPYmplY3QudmFsdWVzKHNlcnZpY2VzKS5maWx0ZXIocyA9PiBzLnN0YXR1cyA9PT0gJ2RlZ3JhZGVkJykubGVuZ3RoO1xyXG4gIFxyXG4gIGNvbnN0IG92ZXJhbGxTdGF0dXMgPSB1bmhlYWx0aHlDb3VudCA+IDAgPyAndW5oZWFsdGh5JyA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgZGVncmFkZWRDb3VudCA+IDAgPyAnZGVncmFkZWQnIDogJ2hlYWx0aHknO1xyXG5cclxuICBjb25zdCByZXNwb25zZTogSGVhbHRoQ2hlY2tSZXNwb25zZSA9IHtcclxuICAgIHN0YXR1czogb3ZlcmFsbFN0YXR1cyxcclxuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgdmVyc2lvbjogcHJvY2Vzcy5lbnYuVkVSU0lPTiB8fCAnMS4wLjAnLFxyXG4gICAgZW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICd1bmtub3duJyxcclxuICAgIHNlcnZpY2VzLFxyXG4gICAgc3VtbWFyeToge1xyXG4gICAgICB0b3RhbDogT2JqZWN0LmtleXMoc2VydmljZXMpLmxlbmd0aCxcclxuICAgICAgaGVhbHRoeTogaGVhbHRoeUNvdW50LFxyXG4gICAgICB1bmhlYWx0aHk6IHVuaGVhbHRoeUNvdW50LFxyXG4gICAgICBkZWdyYWRlZDogZGVncmFkZWRDb3VudCxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gIGxvZ2dlci5sb2dQZXJmb3JtYW5jZU1ldHJpYygnaGVhbHRoX2NoZWNrX2RldGFpbGVkJywgZHVyYXRpb24pO1xyXG5cclxuICAvLyBSZWNvcmQgaGVhbHRoIGNoZWNrIG1ldHJpY3MgZm9yIENsb3VkV2F0Y2ggYWxhcm1zXHJcbiAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkQnVzaW5lc3NNZXRyaWMoJ0hlYWx0aENoZWNrQ29tcGxldGVkJywgMSwge1xyXG4gICAgdHlwZTogJ2RldGFpbGVkJyxcclxuICAgIHN0YXR1czogb3ZlcmFsbFN0YXR1cyxcclxuICB9KTtcclxuXHJcbiAgLy8gUmVjb3JkIGhlYWx0aCBjaGVjayBkdXJhdGlvblxyXG4gIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEJ1c2luZXNzTWV0cmljKCdIZWFsdGhDaGVja0R1cmF0aW9uJywgZHVyYXRpb24sIHtcclxuICAgIHR5cGU6ICdkZXRhaWxlZCcsXHJcbiAgfSk7XHJcblxyXG4gIC8vIFJlY29yZCBmYWlsdXJlIG1ldHJpYyBpZiB1bmhlYWx0aHlcclxuICBpZiAob3ZlcmFsbFN0YXR1cyA9PT0gJ3VuaGVhbHRoeScpIHtcclxuICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEJ1c2luZXNzTWV0cmljKCdIZWFsdGhDaGVja0ZhaWxlZCcsIDEsIHtcclxuICAgICAgdHlwZTogJ2RldGFpbGVkJyxcclxuICAgICAgdW5oZWFsdGh5U2VydmljZXM6IHVuaGVhbHRoeUNvdW50LnRvU3RyaW5nKCksXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIFJlY29yZCBkZWdyYWRhdGlvbiBtZXRyaWMgaWYgZGVncmFkZWRcclxuICBpZiAoZGVncmFkZWRDb3VudCA+IDApIHtcclxuICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEJ1c2luZXNzTWV0cmljKCdTZXJ2aWNlRGVncmFkZWQnLCBkZWdyYWRlZENvdW50LCB7XHJcbiAgICAgIHR5cGU6ICdkZXRhaWxlZCcsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHJldHVybiByZXNwb25zZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGluZGl2aWR1YWwgc2VydmljZSBoZWFsdGhcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrSW5kaXZpZHVhbFNlcnZpY2Uoc2VydmljZU5hbWU6IHN0cmluZywgbG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8SGVhbHRoQ2hlY2tSZXNwb25zZT4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgbGV0IHNlcnZpY2VSZXN1bHQ6IGFueTtcclxuXHJcbiAgc3dpdGNoIChzZXJ2aWNlTmFtZS50b0xvd2VyQ2FzZSgpKSB7XHJcbiAgICBjYXNlICdsYW1iZGEnOlxyXG4gICAgICBzZXJ2aWNlUmVzdWx0ID0gYXdhaXQgY2hlY2tMYW1iZGFIZWFsdGgoKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdkeW5hbW9kYic6XHJcbiAgICAgIHNlcnZpY2VSZXN1bHQgPSBhd2FpdCBjaGVja0R5bmFtb0RCSGVhbHRoKCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnczMnOlxyXG4gICAgICBzZXJ2aWNlUmVzdWx0ID0gYXdhaXQgY2hlY2tTM0hlYWx0aCgpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ2NvZ25pdG8nOlxyXG4gICAgICBzZXJ2aWNlUmVzdWx0ID0gYXdhaXQgY2hlY2tDb2duaXRvSGVhbHRoKCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnc2VjcmV0c21hbmFnZXInOlxyXG4gICAgICBzZXJ2aWNlUmVzdWx0ID0gYXdhaXQgY2hlY2tTZWNyZXRzTWFuYWdlckhlYWx0aCgpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ2Nsb3Vkd2F0Y2gnOlxyXG4gICAgICBzZXJ2aWNlUmVzdWx0ID0gYXdhaXQgY2hlY2tDbG91ZFdhdGNoSGVhbHRoKCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnZW52aXJvbm1lbnQnOlxyXG4gICAgICBzZXJ2aWNlUmVzdWx0ID0gYXdhaXQgY2hlY2tFbnZpcm9ubWVudEhlYWx0aCgpO1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBzZXJ2aWNlOiAke3NlcnZpY2VOYW1lfWApO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcmVzcG9uc2U6IEhlYWx0aENoZWNrUmVzcG9uc2UgPSB7XHJcbiAgICBzdGF0dXM6IHNlcnZpY2VSZXN1bHQuc3RhdHVzLFxyXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICB2ZXJzaW9uOiBwcm9jZXNzLmVudi5WRVJTSU9OIHx8ICcxLjAuMCcsXHJcbiAgICBlbnZpcm9ubWVudDogcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ3Vua25vd24nLFxyXG4gICAgc2VydmljZXM6IHtcclxuICAgICAgW3NlcnZpY2VOYW1lXTogc2VydmljZVJlc3VsdCxcclxuICAgIH0sXHJcbiAgICBzdW1tYXJ5OiB7XHJcbiAgICAgIHRvdGFsOiAxLFxyXG4gICAgICBoZWFsdGh5OiBzZXJ2aWNlUmVzdWx0LnN0YXR1cyA9PT0gJ2hlYWx0aHknID8gMSA6IDAsXHJcbiAgICAgIHVuaGVhbHRoeTogc2VydmljZVJlc3VsdC5zdGF0dXMgPT09ICd1bmhlYWx0aHknID8gMSA6IDAsXHJcbiAgICAgIGRlZ3JhZGVkOiBzZXJ2aWNlUmVzdWx0LnN0YXR1cyA9PT0gJ2RlZ3JhZGVkJyA/IDEgOiAwLFxyXG4gICAgfSxcclxuICB9O1xyXG5cclxuICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgbG9nZ2VyLmxvZ1BlcmZvcm1hbmNlTWV0cmljKGBoZWFsdGhfY2hlY2tfJHtzZXJ2aWNlTmFtZX1gLCBkdXJhdGlvbik7XHJcblxyXG4gIHJldHVybiByZXNwb25zZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIExhbWJkYSBydW50aW1lIGhlYWx0aFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY2hlY2tMYW1iZGFIZWFsdGgoKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIC8vIENoZWNrIG1lbW9yeSB1c2FnZVxyXG4gICAgY29uc3QgbWVtb3J5VXNhZ2UgPSBwcm9jZXNzLm1lbW9yeVVzYWdlKCk7XHJcbiAgICBjb25zdCBtZW1vcnlVc2VkTUIgPSBtZW1vcnlVc2FnZS5oZWFwVXNlZCAvIDEwMjQgLyAxMDI0O1xyXG4gICAgY29uc3QgbWVtb3J5TGltaXRNQiA9IHBhcnNlSW50KHByb2Nlc3MuZW52LkFXU19MQU1CREFfRlVOQ1RJT05fTUVNT1JZX1NJWkUgfHwgJzUxMicpO1xyXG4gICAgY29uc3QgbWVtb3J5VXRpbGl6YXRpb24gPSAobWVtb3J5VXNlZE1CIC8gbWVtb3J5TGltaXRNQikgKiAxMDA7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2VUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ2xhbWJkYScsXHJcbiAgICAgIHN0YXR1czogbWVtb3J5VXRpbGl6YXRpb24gPiA5MCA/ICdkZWdyYWRlZCcgOiAnaGVhbHRoeScsXHJcbiAgICAgIHJlc3BvbnNlVGltZSxcclxuICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgIG1lbW9yeVVzZWRNQjogTWF0aC5yb3VuZChtZW1vcnlVc2VkTUIpLFxyXG4gICAgICAgIG1lbW9yeUxpbWl0TUIsXHJcbiAgICAgICAgbWVtb3J5VXRpbGl6YXRpb246IE1hdGgucm91bmQobWVtb3J5VXRpbGl6YXRpb24pLFxyXG4gICAgICAgIG5vZGVWZXJzaW9uOiBwcm9jZXNzLnZlcnNpb24sXHJcbiAgICAgICAgcGxhdGZvcm06IHByb2Nlc3MucGxhdGZvcm0sXHJcbiAgICAgICAgYXJjaDogcHJvY2Vzcy5hcmNoLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZXJ2aWNlOiAnbGFtYmRhJyxcclxuICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7IGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBlbnZpcm9ubWVudCBjb25maWd1cmF0aW9uIGhlYWx0aFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY2hlY2tFbnZpcm9ubWVudEhlYWx0aCgpOiBQcm9taXNlPEhlYWx0aENoZWNrUmVzdWx0PiB7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBcclxuICB0cnkge1xyXG4gICAgY29uc3QgcmVxdWlyZWRFbnZWYXJzID0gW1xyXG4gICAgICAnRU5WSVJPTk1FTlQnLFxyXG4gICAgICAnRklMRVNfQlVDS0VUX05BTUUnLFxyXG4gICAgICAnVVNFUlNfVEFCTEVfTkFNRScsXHJcbiAgICAgICdGSUxFX01FVEFEQVRBX1RBQkxFX05BTUUnLFxyXG4gICAgICAnQU5BTFlTSVNfUkVTVUxUU19UQUJMRV9OQU1FJyxcclxuICAgICAgJ1NBTVBMRV9GSUxFU19UQUJMRV9OQU1FJyxcclxuICAgICAgJ1BST0dSRVNTX1RBQkxFX05BTUUnLFxyXG4gICAgICAnVVNFUl9QT09MX0lEJyxcclxuICAgICAgJ1VTRVJfUE9PTF9DTElFTlRfSUQnLFxyXG4gICAgICAnQVdTX1JFR0lPTicsXHJcbiAgICBdO1xyXG5cclxuICAgIGNvbnN0IG1pc3NpbmdWYXJzID0gcmVxdWlyZWRFbnZWYXJzLmZpbHRlcih2YXJOYW1lID0+ICFwcm9jZXNzLmVudlt2YXJOYW1lXSk7XHJcbiAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHNlcnZpY2U6ICdlbnZpcm9ubWVudCcsXHJcbiAgICAgIHN0YXR1czogbWlzc2luZ1ZhcnMubGVuZ3RoID09PSAwID8gJ2hlYWx0aHknIDogJ3VuaGVhbHRoeScsXHJcbiAgICAgIHJlc3BvbnNlVGltZSxcclxuICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgIHJlcXVpcmVkVmFyaWFibGVzOiByZXF1aXJlZEVudlZhcnMubGVuZ3RoLFxyXG4gICAgICAgIGNvbmZpZ3VyZWRWYXJpYWJsZXM6IHJlcXVpcmVkRW52VmFycy5sZW5ndGggLSBtaXNzaW5nVmFycy5sZW5ndGgsXHJcbiAgICAgICAgbWlzc2luZ1ZhcmlhYmxlczogbWlzc2luZ1ZhcnMsXHJcbiAgICAgICAgZW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52LkVOVklST05NRU5ULFxyXG4gICAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTixcclxuICAgICAgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ2Vudmlyb25tZW50JyxcclxuICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7IGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBEeW5hbW9EQiBoZWFsdGggLSBjaGVja3MgYWxsIGNyaXRpY2FsIHRhYmxlc1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY2hlY2tEeW5hbW9EQkhlYWx0aCgpOiBQcm9taXNlPEhlYWx0aENoZWNrUmVzdWx0PiB7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBcclxuICB0cnkge1xyXG4gICAgY29uc3QgdGFibGVOYW1lcyA9IFtcclxuICAgICAgcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEVfTkFNRSxcclxuICAgICAgcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FLFxyXG4gICAgICBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFX05BTUUsXHJcbiAgICAgIHByb2Nlc3MuZW52LlNBTVBMRV9GSUxFU19UQUJMRV9OQU1FLFxyXG4gICAgICBwcm9jZXNzLmVudi5QUk9HUkVTU19UQUJMRV9OQU1FLFxyXG4gICAgXS5maWx0ZXIoQm9vbGVhbikgYXMgc3RyaW5nW107XHJcblxyXG4gICAgaWYgKHRhYmxlTmFtZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gRHluYW1vREIgdGFibGUgbmFtZXMgY29uZmlndXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGFsbCB0YWJsZXMgaW4gcGFyYWxsZWxcclxuICAgIGNvbnN0IHRhYmxlQ2hlY2tzID0gYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKFxyXG4gICAgICB0YWJsZU5hbWVzLm1hcChhc3luYyAodGFibGVOYW1lKSA9PiB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vZGIuc2Nhbih7XHJcbiAgICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcclxuICAgICAgICAgIExpbWl0OiAxLFxyXG4gICAgICAgICAgU2VsZWN0OiAnQ09VTlQnLFxyXG4gICAgICAgIH0pLnByb21pc2UoKTtcclxuICAgICAgICByZXR1cm4geyB0YWJsZU5hbWUsIGNvdW50OiByZXN1bHQuU2Nhbm5lZENvdW50IHx8IDAgfTtcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgY29uc3Qgc3VjY2Vzc2Z1bENoZWNrcyA9IHRhYmxlQ2hlY2tzLmZpbHRlcihyID0+IHIuc3RhdHVzID09PSAnZnVsZmlsbGVkJykubGVuZ3RoO1xyXG4gICAgY29uc3QgZmFpbGVkQ2hlY2tzID0gdGFibGVDaGVja3MuZmlsdGVyKHIgPT4gci5zdGF0dXMgPT09ICdyZWplY3RlZCcpO1xyXG4gICAgY29uc3QgcmVzcG9uc2VUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuXHJcbiAgICBjb25zdCB0YWJsZURldGFpbHM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuICAgIHRhYmxlQ2hlY2tzLmZvckVhY2goKHJlc3VsdCwgaW5kZXgpID0+IHtcclxuICAgICAgY29uc3QgdGFibGVOYW1lID0gdGFibGVOYW1lc1tpbmRleF07XHJcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJykge1xyXG4gICAgICAgIHRhYmxlRGV0YWlsc1t0YWJsZU5hbWVdID0ge1xyXG4gICAgICAgICAgc3RhdHVzOiAnaGVhbHRoeScsXHJcbiAgICAgICAgICBjb3VudDogcmVzdWx0LnZhbHVlLmNvdW50LFxyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGFibGVEZXRhaWxzW3RhYmxlTmFtZV0gPSB7XHJcbiAgICAgICAgICBzdGF0dXM6ICd1bmhlYWx0aHknLFxyXG4gICAgICAgICAgZXJyb3I6IHJlc3VsdC5yZWFzb24/Lm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHN0YXR1cyA9IGZhaWxlZENoZWNrcy5sZW5ndGggPT09IDAgPyAnaGVhbHRoeScgOlxyXG4gICAgICAgICAgICAgICAgICBmYWlsZWRDaGVja3MubGVuZ3RoIDwgdGFibGVOYW1lcy5sZW5ndGggPyAnZGVncmFkZWQnIDogJ3VuaGVhbHRoeSc7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ2R5bmFtb2RiJyxcclxuICAgICAgc3RhdHVzLFxyXG4gICAgICByZXNwb25zZVRpbWUsXHJcbiAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICB0b3RhbFRhYmxlczogdGFibGVOYW1lcy5sZW5ndGgsXHJcbiAgICAgICAgaGVhbHRoeVRhYmxlczogc3VjY2Vzc2Z1bENoZWNrcyxcclxuICAgICAgICB1bmhlYWx0aHlUYWJsZXM6IGZhaWxlZENoZWNrcy5sZW5ndGgsXHJcbiAgICAgICAgcmVzcG9uc2VUaW1lTXM6IHJlc3BvbnNlVGltZSxcclxuICAgICAgICB0YWJsZXM6IHRhYmxlRGV0YWlscyxcclxuICAgICAgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ2R5bmFtb2RiJyxcclxuICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7IGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBTMyBoZWFsdGhcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrUzNIZWFsdGgoKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGJ1Y2tldE5hbWUgPSBwcm9jZXNzLmVudi5GSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU7XHJcbiAgICBpZiAoIWJ1Y2tldE5hbWUpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUUgbm90IGNvbmZpZ3VyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQZXJmb3JtIGEgc2ltcGxlIGhlYWQgYnVja2V0IG9wZXJhdGlvblxyXG4gICAgYXdhaXQgczMuaGVhZEJ1Y2tldCh7IEJ1Y2tldDogYnVja2V0TmFtZSB9KS5wcm9taXNlKCk7XHJcbiAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHNlcnZpY2U6ICdzMycsXHJcbiAgICAgIHN0YXR1czogcmVzcG9uc2VUaW1lIDwgMTAwMCA/ICdoZWFsdGh5JyA6ICdkZWdyYWRlZCcsXHJcbiAgICAgIHJlc3BvbnNlVGltZSxcclxuICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgcmVzcG9uc2VUaW1lTXM6IHJlc3BvbnNlVGltZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ3MzJyxcclxuICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7IGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBTZWNyZXRzIE1hbmFnZXIgaGVhbHRoXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjaGVja1NlY3JldHNNYW5hZ2VySGVhbHRoKCk6IFByb21pc2U8SGVhbHRoQ2hlY2tSZXN1bHQ+IHtcclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBzZWNyZXROYW1lcyA9IFtcclxuICAgICAgcHJvY2Vzcy5lbnYuSldUX1NFQ1JFVF9OQU1FLFxyXG4gICAgICBwcm9jZXNzLmVudi5PVFBfU0VDUkVUX05BTUUsXHJcbiAgICAgIHByb2Nlc3MuZW52LkFQSV9LRVlTX1NFQ1JFVF9OQU1FLFxyXG4gICAgICBwcm9jZXNzLmVudi5EQVRBQkFTRV9TRUNSRVRfTkFNRSxcclxuICAgIF0uZmlsdGVyKEJvb2xlYW4pIGFzIHN0cmluZ1tdO1xyXG5cclxuICAgIGlmIChzZWNyZXROYW1lcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgLy8gSWYgbm8gc2VjcmV0cyBjb25maWd1cmVkLCByZXR1cm4gaGVhbHRoeSBidXQgd2l0aCBub3RlXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc2VydmljZTogJ3NlY3JldHNtYW5hZ2VyJyxcclxuICAgICAgICBzdGF0dXM6ICdoZWFsdGh5JyxcclxuICAgICAgICByZXNwb25zZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXHJcbiAgICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgICAgbm90ZTogJ05vIHNlY3JldHMgY29uZmlndXJlZCBmb3IgaGVhbHRoIGNoZWNrJyxcclxuICAgICAgICAgIHJlc3BvbnNlVGltZU1zOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGFsbCBzZWNyZXRzIGluIHBhcmFsbGVsIChqdXN0IGRlc2NyaWJlLCBkb24ndCByZXRyaWV2ZSB2YWx1ZXMpXHJcbiAgICBjb25zdCBzZWNyZXRDaGVja3MgPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoXHJcbiAgICAgIHNlY3JldE5hbWVzLm1hcChhc3luYyAoc2VjcmV0TmFtZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlY3JldHNNYW5hZ2VyLmRlc2NyaWJlU2VjcmV0KHtcclxuICAgICAgICAgIFNlY3JldElkOiBzZWNyZXROYW1lLFxyXG4gICAgICAgIH0pLnByb21pc2UoKTtcclxuICAgICAgICByZXR1cm4geyBzZWNyZXROYW1lLCBhcm46IHJlc3VsdC5BUk4gfTtcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgY29uc3Qgc3VjY2Vzc2Z1bENoZWNrcyA9IHNlY3JldENoZWNrcy5maWx0ZXIociA9PiByLnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcpLmxlbmd0aDtcclxuICAgIGNvbnN0IGZhaWxlZENoZWNrcyA9IHNlY3JldENoZWNrcy5maWx0ZXIociA9PiByLnN0YXR1cyA9PT0gJ3JlamVjdGVkJyk7XHJcbiAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgIGNvbnN0IHNlY3JldERldGFpbHM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuICAgIHNlY3JldENoZWNrcy5mb3JFYWNoKChyZXN1bHQsIGluZGV4KSA9PiB7XHJcbiAgICAgIGNvbnN0IHNlY3JldE5hbWUgPSBzZWNyZXROYW1lc1tpbmRleF07XHJcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJykge1xyXG4gICAgICAgIHNlY3JldERldGFpbHNbc2VjcmV0TmFtZV0gPSB7XHJcbiAgICAgICAgICBzdGF0dXM6ICdoZWFsdGh5JyxcclxuICAgICAgICAgIGV4aXN0czogdHJ1ZSxcclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHNlY3JldERldGFpbHNbc2VjcmV0TmFtZV0gPSB7XHJcbiAgICAgICAgICBzdGF0dXM6ICd1bmhlYWx0aHknLFxyXG4gICAgICAgICAgZXJyb3I6IHJlc3VsdC5yZWFzb24/Lm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHN0YXR1cyA9IGZhaWxlZENoZWNrcy5sZW5ndGggPT09IDAgPyAnaGVhbHRoeScgOlxyXG4gICAgICAgICAgICAgICAgICBmYWlsZWRDaGVja3MubGVuZ3RoIDwgc2VjcmV0TmFtZXMubGVuZ3RoID8gJ2RlZ3JhZGVkJyA6ICd1bmhlYWx0aHknO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHNlcnZpY2U6ICdzZWNyZXRzbWFuYWdlcicsXHJcbiAgICAgIHN0YXR1cyxcclxuICAgICAgcmVzcG9uc2VUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgdG90YWxTZWNyZXRzOiBzZWNyZXROYW1lcy5sZW5ndGgsXHJcbiAgICAgICAgaGVhbHRoeVNlY3JldHM6IHN1Y2Nlc3NmdWxDaGVja3MsXHJcbiAgICAgICAgdW5oZWFsdGh5U2VjcmV0czogZmFpbGVkQ2hlY2tzLmxlbmd0aCxcclxuICAgICAgICByZXNwb25zZVRpbWVNczogcmVzcG9uc2VUaW1lLFxyXG4gICAgICAgIHNlY3JldHM6IHNlY3JldERldGFpbHMsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHNlcnZpY2U6ICdzZWNyZXRzbWFuYWdlcicsXHJcbiAgICAgIHN0YXR1czogJ3VuaGVhbHRoeScsXHJcbiAgICAgIHJlc3BvbnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgZGV0YWlsczogeyBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0sXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgQ29nbml0byBVc2VyIFBvb2wgaGVhbHRoXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjaGVja0NvZ25pdG9IZWFsdGgoKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHVzZXJQb29sSWQgPSBwcm9jZXNzLmVudi5VU0VSX1BPT0xfSUQ7XHJcbiAgICBpZiAoIXVzZXJQb29sSWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVU0VSX1BPT0xfSUQgbm90IGNvbmZpZ3VyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBEZXNjcmliZSB0aGUgdXNlciBwb29sIHRvIGNoZWNrIGlmIGl0J3MgYWNjZXNzaWJsZVxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29nbml0by5kZXNjcmliZVVzZXJQb29sKHtcclxuICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgIH0pLnByb21pc2UoKTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHNlcnZpY2U6ICdjb2duaXRvJyxcclxuICAgICAgc3RhdHVzOiByZXNwb25zZVRpbWUgPCAxMDAwID8gJ2hlYWx0aHknIDogJ2RlZ3JhZGVkJyxcclxuICAgICAgcmVzcG9uc2VUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgdXNlclBvb2xJZCxcclxuICAgICAgICB1c2VyUG9vbE5hbWU6IHJlc3VsdC5Vc2VyUG9vbD8uTmFtZSxcclxuICAgICAgICBzdGF0dXM6IHJlc3VsdC5Vc2VyUG9vbD8uU3RhdHVzLFxyXG4gICAgICAgIG1mYUNvbmZpZ3VyYXRpb246IHJlc3VsdC5Vc2VyUG9vbD8uTWZhQ29uZmlndXJhdGlvbixcclxuICAgICAgICByZXNwb25zZVRpbWVNczogcmVzcG9uc2VUaW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZXJ2aWNlOiAnY29nbml0bycsXHJcbiAgICAgIHN0YXR1czogJ3VuaGVhbHRoeScsXHJcbiAgICAgIHJlc3BvbnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgZGV0YWlsczogeyBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0sXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgQ2xvdWRXYXRjaCBoZWFsdGhcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrQ2xvdWRXYXRjaEhlYWx0aCgpOiBQcm9taXNlPEhlYWx0aENoZWNrUmVzdWx0PiB7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBcclxuICB0cnkge1xyXG4gICAgLy8gTGlzdCBtZXRyaWNzIHRvIHZlcmlmeSBDbG91ZFdhdGNoIEFQSSBpcyBhY2Nlc3NpYmxlXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbG91ZHdhdGNoLmxpc3RNZXRyaWNzKHtcclxuICAgICAgTmFtZXNwYWNlOiBwcm9jZXNzLmVudi5DTE9VRFdBVENIX05BTUVTUEFDRSB8fCAnTUlTUkEvUGxhdGZvcm0nLFxyXG4gICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ2Nsb3Vkd2F0Y2gnLFxyXG4gICAgICBzdGF0dXM6IHJlc3BvbnNlVGltZSA8IDEwMDAgPyAnaGVhbHRoeScgOiAnZGVncmFkZWQnLFxyXG4gICAgICByZXNwb25zZVRpbWUsXHJcbiAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICBuYW1lc3BhY2U6IHByb2Nlc3MuZW52LkNMT1VEV0FUQ0hfTkFNRVNQQUNFIHx8ICdNSVNSQS9QbGF0Zm9ybScsXHJcbiAgICAgICAgYWNjZXNzaWJsZTogdHJ1ZSxcclxuICAgICAgICBtZXRyaWNzQ291bnQ6IHJlc3VsdC5NZXRyaWNzPy5sZW5ndGggfHwgMCxcclxuICAgICAgICByZXNwb25zZVRpbWVNczogcmVzcG9uc2VUaW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZXJ2aWNlOiAnY2xvdWR3YXRjaCcsXHJcbiAgICAgIHN0YXR1czogJ3VuaGVhbHRoeScsXHJcbiAgICAgIHJlc3BvbnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgZGV0YWlsczogeyBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0sXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG4vLyBFeHBvcnQgdGhlIGhhbmRsZXIgd2l0aCBjb3JyZWxhdGlvbiBJRCBtaWRkbGV3YXJlXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gd2l0aENvcnJlbGF0aW9uSWQoaGVhbHRoQ2hlY2tIYW5kbGVyKTsiXX0=
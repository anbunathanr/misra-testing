"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aws_sdk_1 = require("aws-sdk");
const centralized_logger_1 = require("../../utils/centralized-logger");
const monitoring_service_1 = require("../../services/monitoring-service");
const dynamodb = new aws_sdk_1.DynamoDB.DocumentClient();
const s3 = new aws_sdk_1.S3();
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
        checkSecretsManagerHealth(),
        checkCloudWatchHealth(),
    ]);
    // Process results
    const serviceNames = ['lambda', 'environment', 'dynamodb', 's3', 'secretsmanager', 'cloudwatch'];
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
    // Record health check metrics
    await monitoring_service_1.monitoringService.recordBusinessMetric('HealthCheckCompleted', 1, {
        type: 'detailed',
        status: overallStatus,
    });
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
 * Check DynamoDB health
 */
async function checkDynamoDBHealth() {
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
 * Check CloudWatch health
 */
async function checkCloudWatchHealth() {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhbHRoLWNoZWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGVhbHRoLWNoZWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFDQUF1QztBQUN2Qyx1RUFBc0Y7QUFDdEYsMEVBQXlGO0FBRXpGLE1BQU0sUUFBUSxHQUFHLElBQUksa0JBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUMvQyxNQUFNLEVBQUUsR0FBRyxJQUFJLFlBQUUsRUFBRSxDQUFDO0FBc0JwQjs7Ozs7Ozs7OztHQVVHO0FBQ0gsS0FBSyxVQUFVLGtCQUFrQixDQUFDLEtBQTJCLEVBQUUsT0FBZ0I7SUFDN0UsTUFBTSxNQUFNLEdBQUcsc0NBQWlCLENBQUMsV0FBVyxDQUFDO1FBQzNDLGFBQWEsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1FBQ2hELFNBQVMsRUFBRSxPQUFPLENBQUMsWUFBWTtRQUMvQixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7S0FDbkMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQywrQkFBK0IsRUFBRTtZQUMzQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQzVCLGVBQWUsRUFBRSxLQUFLLENBQUMscUJBQXFCO1NBQzdDLENBQUMsQ0FBQztRQUVILE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDeEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMscUJBQXFCLEVBQUUsUUFBUSxLQUFLLE1BQU0sQ0FBQztRQUNsRyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztRQUV0RCxJQUFJLGNBQW1DLENBQUM7UUFFeEMsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNoQixrQ0FBa0M7WUFDbEMsY0FBYyxH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LENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQztBQUVEOztHQUVHO0FBQ0gsS0FBSyxVQUFVLHFCQUFxQjtJQUNsQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFFN0IsSUFBSSxDQUFDO1FBQ0gsb0VBQW9FO1FBQ3BFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7UUFFNUMsT0FBTztZQUNMLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFlBQVk7WUFDWixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLFlBQVk7Z0JBQzVCLElBQUksRUFBRSxrQ0FBa0M7YUFDekM7WUFDRCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7U0FDdEIsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTztZQUNMLE9BQU8sRUFBRSxZQUFZO1lBQ3JCLE1BQU0sRUFBRSxXQUFXO1lBQ25CLFlBQVksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUztZQUNwQyxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUcsS0FBZSxDQUFDLE9BQU8sRUFBRTtZQUM1QyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7U0FDdEIsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDO0FBRUQsb0RBQW9EO0FBQ3ZDLFFBQUEsT0FBTyxHQUFHLElBQUEsc0NBQWlCLEVBQUMsa0JBQWtCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREIsIFMzIH0gZnJvbSAnYXdzLXNkayc7XHJcbmltcG9ydCB7IENlbnRyYWxpemVkTG9nZ2VyLCB3aXRoQ29ycmVsYXRpb25JZCB9IGZyb20gJy4uLy4uL3V0aWxzL2NlbnRyYWxpemVkLWxvZ2dlcic7XHJcbmltcG9ydCB7IG1vbml0b3JpbmdTZXJ2aWNlLCBIZWFsdGhDaGVja1Jlc3VsdCB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21vbml0b3Jpbmctc2VydmljZSc7XHJcblxyXG5jb25zdCBkeW5hbW9kYiA9IG5ldyBEeW5hbW9EQi5Eb2N1bWVudENsaWVudCgpO1xyXG5jb25zdCBzMyA9IG5ldyBTMygpO1xyXG5cclxuaW50ZXJmYWNlIEhlYWx0aENoZWNrUmVzcG9uc2Uge1xyXG4gIHN0YXR1czogJ2hlYWx0aHknIHwgJ2RlZ3JhZGVkJyB8ICd1bmhlYWx0aHknO1xyXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xyXG4gIHZlcnNpb246IHN0cmluZztcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIHNlcnZpY2VzOiB7XHJcbiAgICBbc2VydmljZU5hbWU6IHN0cmluZ106IHtcclxuICAgICAgc3RhdHVzOiAnaGVhbHRoeScgfCAndW5oZWFsdGh5JyB8ICdkZWdyYWRlZCc7XHJcbiAgICAgIHJlc3BvbnNlVGltZTogbnVtYmVyO1xyXG4gICAgICBkZXRhaWxzPzogYW55O1xyXG4gICAgfTtcclxuICB9O1xyXG4gIHN1bW1hcnk6IHtcclxuICAgIHRvdGFsOiBudW1iZXI7XHJcbiAgICBoZWFsdGh5OiBudW1iZXI7XHJcbiAgICB1bmhlYWx0aHk6IG51bWJlcjtcclxuICAgIGRlZ3JhZGVkOiBudW1iZXI7XHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEhlYWx0aCBDaGVjayBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIFByb3ZpZGVzIGNvbXByZWhlbnNpdmUgaGVhbHRoIG1vbml0b3JpbmcgZm9yIGFsbCBNSVNSQSBQbGF0Zm9ybSBzZXJ2aWNlcy5cclxuICogVXNlZCBieSBsb2FkIGJhbGFuY2VycywgbW9uaXRvcmluZyBzeXN0ZW1zLCBhbmQgb3BlcmF0aW9uYWwgZGFzaGJvYXJkcy5cclxuICogXHJcbiAqIEVuZHBvaW50czpcclxuICogLSBHRVQgL2hlYWx0aCAtIEJhc2ljIGhlYWx0aCBjaGVja1xyXG4gKiAtIEdFVCAvaGVhbHRoL2RldGFpbGVkIC0gRGV0YWlsZWQgaGVhbHRoIHJlcG9ydCB3aXRoIGFsbCBzZXJ2aWNlc1xyXG4gKiAtIEdFVCAvaGVhbHRoL3NlcnZpY2Uve3NlcnZpY2VOYW1lfSAtIEluZGl2aWR1YWwgc2VydmljZSBoZWFsdGggY2hlY2tcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGhlYWx0aENoZWNrSGFuZGxlcihldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQsIGNvbnRleHQ6IENvbnRleHQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIGNvbnN0IGxvZ2dlciA9IENlbnRyYWxpemVkTG9nZ2VyLmdldEluc3RhbmNlKHtcclxuICAgIGNvcnJlbGF0aW9uSWQ6IGV2ZW50LmhlYWRlcnNbJ3gtY29ycmVsYXRpb24taWQnXSxcclxuICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICBmdW5jdGlvbk5hbWU6IGNvbnRleHQuZnVuY3Rpb25OYW1lLFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ0hlYWx0aCBjaGVjayByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgICBodHRwTWV0aG9kOiBldmVudC5odHRwTWV0aG9kLFxyXG4gICAgICBxdWVyeVBhcmFtZXRlcnM6IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHBhdGggPSBldmVudC5wYXRoO1xyXG4gICAgY29uc3QgaXNEZXRhaWxlZCA9IHBhdGguaW5jbHVkZXMoJy9kZXRhaWxlZCcpIHx8IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8uZGV0YWlsZWQgPT09ICd0cnVlJztcclxuICAgIGNvbnN0IHNlcnZpY2VOYW1lID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnNlcnZpY2VOYW1lO1xyXG5cclxuICAgIGxldCBoZWFsdGhSZXNwb25zZTogSGVhbHRoQ2hlY2tSZXNwb25zZTtcclxuXHJcbiAgICBpZiAoc2VydmljZU5hbWUpIHtcclxuICAgICAgLy8gSW5kaXZpZHVhbCBzZXJ2aWNlIGhlYWx0aCBjaGVja1xyXG4gICAgICBoZWFsdGhSZXNwb25zZSA9IGF3YWl0IGNoZWNrSW5kaXZpZHVhbFNlcnZpY2Uoc2VydmljZU5hbWUsIGxvZ2dlcik7XHJcbiAgICB9IGVsc2UgaWYgKGlzRGV0YWlsZWQpIHtcclxuICAgICAgLy8gRGV0YWlsZWQgaGVhbHRoIGNoZWNrIGZvciBhbGwgc2VydmljZXNcclxuICAgICAgaGVhbHRoUmVzcG9uc2UgPSBhd2FpdCBwZXJmb3JtRGV0YWlsZWRIZWFsdGhDaGVjayhsb2dnZXIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gQmFzaWMgaGVhbHRoIGNoZWNrXHJcbiAgICAgIGhlYWx0aFJlc3BvbnNlID0gYXdhaXQgcGVyZm9ybUJhc2ljSGVhbHRoQ2hlY2sobG9nZ2VyKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzdGF0dXNDb2RlID0gaGVhbHRoUmVzcG9uc2Uuc3RhdHVzID09PSAnaGVhbHRoeScgPyAyMDAgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgaGVhbHRoUmVzcG9uc2Uuc3RhdHVzID09PSAnZGVncmFkZWQnID8gMjAwIDogNTAzO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdIZWFsdGggY2hlY2sgY29tcGxldGVkJywge1xyXG4gICAgICBzdGF0dXM6IGhlYWx0aFJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgc3RhdHVzQ29kZSxcclxuICAgICAgc2VydmljZUNvdW50OiBPYmplY3Qua2V5cyhoZWFsdGhSZXNwb25zZS5zZXJ2aWNlcykubGVuZ3RoLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZSxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0NhY2hlLUNvbnRyb2wnOiAnbm8tY2FjaGUsIG5vLXN0b3JlLCBtdXN0LXJldmFsaWRhdGUnLFxyXG4gICAgICAgICdYLUNvcnJlbGF0aW9uLUlEJzogbG9nZ2VyLmdldENvcnJlbGF0aW9uSWQoKSxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoaGVhbHRoUmVzcG9uc2UsIG51bGwsIDIpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdIZWFsdGggY2hlY2sgZmFpbGVkJywgZXJyb3IgYXMgRXJyb3IpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ1gtQ29ycmVsYXRpb24tSUQnOiBsb2dnZXIuZ2V0Q29ycmVsYXRpb25JZCgpLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgICBlcnJvcjogJ0hlYWx0aCBjaGVjayBzeXN0ZW0gZmFpbHVyZScsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQZXJmb3JtIGJhc2ljIGhlYWx0aCBjaGVjayAobWluaW1hbCBkZXBlbmRlbmNpZXMpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtQmFzaWNIZWFsdGhDaGVjayhsb2dnZXI6IENlbnRyYWxpemVkTG9nZ2VyKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3BvbnNlPiB7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBcclxuICAvLyBCYXNpYyBzeXN0ZW0gY2hlY2tzXHJcbiAgY29uc3Qgc2VydmljZXM6IEhlYWx0aENoZWNrUmVzcG9uc2VbJ3NlcnZpY2VzJ10gPSB7fTtcclxuICBcclxuICAvLyBDaGVjayBMYW1iZGEgcnVudGltZVxyXG4gIHNlcnZpY2VzLmxhbWJkYSA9IGF3YWl0IGNoZWNrTGFtYmRhSGVhbHRoKCk7XHJcbiAgXHJcbiAgLy8gQ2hlY2sgZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbiAgc2VydmljZXMuZW52aXJvbm1lbnQgPSBhd2FpdCBjaGVja0Vudmlyb25tZW50SGVhbHRoKCk7XHJcblxyXG4gIGNvbnN0IGhlYWx0aHlDb3VudCA9IE9iamVjdC52YWx1ZXMoc2VydmljZXMpLmZpbHRlcihzID0+IHMuc3RhdHVzID09PSAnaGVhbHRoeScpLmxlbmd0aDtcclxuICBjb25zdCB1bmhlYWx0aHlDb3VudCA9IE9iamVjdC52YWx1ZXMoc2VydmljZXMpLmZpbHRlcihzID0+IHMuc3RhdHVzID09PSAndW5oZWFsdGh5JykubGVuZ3RoO1xyXG4gIGNvbnN0IGRlZ3JhZGVkQ291bnQgPSBPYmplY3QudmFsdWVzKHNlcnZpY2VzKS5maWx0ZXIocyA9PiBzLnN0YXR1cyA9PT0gJ2RlZ3JhZGVkJykubGVuZ3RoO1xyXG4gIFxyXG4gIGNvbnN0IG92ZXJhbGxTdGF0dXMgPSB1bmhlYWx0aHlDb3VudCA+IDAgPyAndW5oZWFsdGh5JyA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgZGVncmFkZWRDb3VudCA+IDAgPyAnZGVncmFkZWQnIDogJ2hlYWx0aHknO1xyXG5cclxuICBjb25zdCByZXNwb25zZTogSGVhbHRoQ2hlY2tSZXNwb25zZSA9IHtcclxuICAgIHN0YXR1czogb3ZlcmFsbFN0YXR1cyxcclxuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgdmVyc2lvbjogcHJvY2Vzcy5lbnYuVkVSU0lPTiB8fCAnMS4wLjAnLFxyXG4gICAgZW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICd1bmtub3duJyxcclxuICAgIHNlcnZpY2VzLFxyXG4gICAgc3VtbWFyeToge1xyXG4gICAgICB0b3RhbDogT2JqZWN0LmtleXMoc2VydmljZXMpLmxlbmd0aCxcclxuICAgICAgaGVhbHRoeTogaGVhbHRoeUNvdW50LFxyXG4gICAgICB1bmhlYWx0aHk6IHVuaGVhbHRoeUNvdW50LFxyXG4gICAgICBkZWdyYWRlZDogZGVncmFkZWRDb3VudCxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gIGxvZ2dlci5sb2dQZXJmb3JtYW5jZU1ldHJpYygnaGVhbHRoX2NoZWNrX2Jhc2ljJywgZHVyYXRpb24pO1xyXG5cclxuICByZXR1cm4gcmVzcG9uc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQZXJmb3JtIGRldGFpbGVkIGhlYWx0aCBjaGVjayAoYWxsIHNlcnZpY2VzKVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcGVyZm9ybURldGFpbGVkSGVhbHRoQ2hlY2sobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8SGVhbHRoQ2hlY2tSZXNwb25zZT4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgY29uc3Qgc2VydmljZXM6IEhlYWx0aENoZWNrUmVzcG9uc2VbJ3NlcnZpY2VzJ10gPSB7fTtcclxuICBcclxuICAvLyBDaGVjayBhbGwgc2VydmljZXMgaW4gcGFyYWxsZWxcclxuICBjb25zdCBoZWFsdGhDaGVja3MgPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoW1xyXG4gICAgY2hlY2tMYW1iZGFIZWFsdGgoKSxcclxuICAgIGNoZWNrRW52aXJvbm1lbnRIZWFsdGgoKSxcclxuICAgIGNoZWNrRHluYW1vREJIZWFsdGgoKSxcclxuICAgIGNoZWNrUzNIZWFsdGgoKSxcclxuICAgIGNoZWNrU2VjcmV0c01hbmFnZXJIZWFsdGgoKSxcclxuICAgIGNoZWNrQ2xvdWRXYXRjaEhlYWx0aCgpLFxyXG4gIF0pO1xyXG5cclxuICAvLyBQcm9jZXNzIHJlc3VsdHNcclxuICBjb25zdCBzZXJ2aWNlTmFtZXMgPSBbJ2xhbWJkYScsICdlbnZpcm9ubWVudCcsICdkeW5hbW9kYicsICdzMycsICdzZWNyZXRzbWFuYWdlcicsICdjbG91ZHdhdGNoJ107XHJcbiAgXHJcbiAgaGVhbHRoQ2hlY2tzLmZvckVhY2goKHJlc3VsdCwgaW5kZXgpID0+IHtcclxuICAgIGNvbnN0IHNlcnZpY2VOYW1lID0gc2VydmljZU5hbWVzW2luZGV4XTtcclxuICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJykge1xyXG4gICAgICBzZXJ2aWNlc1tzZXJ2aWNlTmFtZV0gPSByZXN1bHQudmFsdWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzZXJ2aWNlc1tzZXJ2aWNlTmFtZV0gPSB7XHJcbiAgICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgICByZXNwb25zZVRpbWU6IDAsXHJcbiAgICAgICAgZGV0YWlsczogeyBlcnJvcjogcmVzdWx0LnJlYXNvbj8ubWVzc2FnZSB8fCAnVW5rbm93biBlcnJvcicgfSxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgY29uc3QgaGVhbHRoeUNvdW50ID0gT2JqZWN0LnZhbHVlcyhzZXJ2aWNlcykuZmlsdGVyKHMgPT4gcy5zdGF0dXMgPT09ICdoZWFsdGh5JykubGVuZ3RoO1xyXG4gIGNvbnN0IHVuaGVhbHRoeUNvdW50ID0gT2JqZWN0LnZhbHVlcyhzZXJ2aWNlcykuZmlsdGVyKHMgPT4gcy5zdGF0dXMgPT09ICd1bmhlYWx0aHknKS5sZW5ndGg7XHJcbiAgY29uc3QgZGVncmFkZWRDb3VudCA9IE9iamVjdC52YWx1ZXMoc2VydmljZXMpLmZpbHRlcihzID0+IHMuc3RhdHVzID09PSAnZGVncmFkZWQnKS5sZW5ndGg7XHJcbiAgXHJcbiAgY29uc3Qgb3ZlcmFsbFN0YXR1cyA9IHVuaGVhbHRoeUNvdW50ID4gMCA/ICd1bmhlYWx0aHknIDpcclxuICAgICAgICAgICAgICAgICAgICAgICBkZWdyYWRlZENvdW50ID4gMCA/ICdkZWdyYWRlZCcgOiAnaGVhbHRoeSc7XHJcblxyXG4gIGNvbnN0IHJlc3BvbnNlOiBIZWFsdGhDaGVja1Jlc3BvbnNlID0ge1xyXG4gICAgc3RhdHVzOiBvdmVyYWxsU3RhdHVzLFxyXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICB2ZXJzaW9uOiBwcm9jZXNzLmVudi5WRVJTSU9OIHx8ICcxLjAuMCcsXHJcbiAgICBlbnZpcm9ubWVudDogcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ3Vua25vd24nLFxyXG4gICAgc2VydmljZXMsXHJcbiAgICBzdW1tYXJ5OiB7XHJcbiAgICAgIHRvdGFsOiBPYmplY3Qua2V5cyhzZXJ2aWNlcykubGVuZ3RoLFxyXG4gICAgICBoZWFsdGh5OiBoZWFsdGh5Q291bnQsXHJcbiAgICAgIHVuaGVhbHRoeTogdW5oZWFsdGh5Q291bnQsXHJcbiAgICAgIGRlZ3JhZGVkOiBkZWdyYWRlZENvdW50LFxyXG4gICAgfSxcclxuICB9O1xyXG5cclxuICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgbG9nZ2VyLmxvZ1BlcmZvcm1hbmNlTWV0cmljKCdoZWFsdGhfY2hlY2tfZGV0YWlsZWQnLCBkdXJhdGlvbik7XHJcblxyXG4gIC8vIFJlY29yZCBoZWFsdGggY2hlY2sgbWV0cmljc1xyXG4gIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEJ1c2luZXNzTWV0cmljKCdIZWFsdGhDaGVja0NvbXBsZXRlZCcsIDEsIHtcclxuICAgIHR5cGU6ICdkZXRhaWxlZCcsXHJcbiAgICBzdGF0dXM6IG92ZXJhbGxTdGF0dXMsXHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiByZXNwb25zZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGluZGl2aWR1YWwgc2VydmljZSBoZWFsdGhcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrSW5kaXZpZHVhbFNlcnZpY2Uoc2VydmljZU5hbWU6IHN0cmluZywgbG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8SGVhbHRoQ2hlY2tSZXNwb25zZT4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgbGV0IHNlcnZpY2VSZXN1bHQ6IGFueTtcclxuXHJcbiAgc3dpdGNoIChzZXJ2aWNlTmFtZS50b0xvd2VyQ2FzZSgpKSB7XHJcbiAgICBjYXNlICdsYW1iZGEnOlxyXG4gICAgICBzZXJ2aWNlUmVzdWx0ID0gYXdhaXQgY2hlY2tMYW1iZGFIZWFsdGgoKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdkeW5hbW9kYic6XHJcbiAgICAgIHNlcnZpY2VSZXN1bHQgPSBhd2FpdCBjaGVja0R5bmFtb0RCSGVhbHRoKCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnczMnOlxyXG4gICAgICBzZXJ2aWNlUmVzdWx0ID0gYXdhaXQgY2hlY2tTM0hlYWx0aCgpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ3NlY3JldHNtYW5hZ2VyJzpcclxuICAgICAgc2VydmljZVJlc3VsdCA9IGF3YWl0IGNoZWNrU2VjcmV0c01hbmFnZXJIZWFsdGgoKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdjbG91ZHdhdGNoJzpcclxuICAgICAgc2VydmljZVJlc3VsdCA9IGF3YWl0IGNoZWNrQ2xvdWRXYXRjaEhlYWx0aCgpO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ2Vudmlyb25tZW50JzpcclxuICAgICAgc2VydmljZVJlc3VsdCA9IGF3YWl0IGNoZWNrRW52aXJvbm1lbnRIZWFsdGgoKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gc2VydmljZTogJHtzZXJ2aWNlTmFtZX1gKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHJlc3BvbnNlOiBIZWFsdGhDaGVja1Jlc3BvbnNlID0ge1xyXG4gICAgc3RhdHVzOiBzZXJ2aWNlUmVzdWx0LnN0YXR1cyxcclxuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgdmVyc2lvbjogcHJvY2Vzcy5lbnYuVkVSU0lPTiB8fCAnMS4wLjAnLFxyXG4gICAgZW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICd1bmtub3duJyxcclxuICAgIHNlcnZpY2VzOiB7XHJcbiAgICAgIFtzZXJ2aWNlTmFtZV06IHNlcnZpY2VSZXN1bHQsXHJcbiAgICB9LFxyXG4gICAgc3VtbWFyeToge1xyXG4gICAgICB0b3RhbDogMSxcclxuICAgICAgaGVhbHRoeTogc2VydmljZVJlc3VsdC5zdGF0dXMgPT09ICdoZWFsdGh5JyA/IDEgOiAwLFxyXG4gICAgICB1bmhlYWx0aHk6IHNlcnZpY2VSZXN1bHQuc3RhdHVzID09PSAndW5oZWFsdGh5JyA/IDEgOiAwLFxyXG4gICAgICBkZWdyYWRlZDogc2VydmljZVJlc3VsdC5zdGF0dXMgPT09ICdkZWdyYWRlZCcgPyAxIDogMCxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gIGxvZ2dlci5sb2dQZXJmb3JtYW5jZU1ldHJpYyhgaGVhbHRoX2NoZWNrXyR7c2VydmljZU5hbWV9YCwgZHVyYXRpb24pO1xyXG5cclxuICByZXR1cm4gcmVzcG9uc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBMYW1iZGEgcnVudGltZSBoZWFsdGhcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrTGFtYmRhSGVhbHRoKCk6IFByb21pc2U8SGVhbHRoQ2hlY2tSZXN1bHQ+IHtcclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICAvLyBDaGVjayBtZW1vcnkgdXNhZ2VcclxuICAgIGNvbnN0IG1lbW9yeVVzYWdlID0gcHJvY2Vzcy5tZW1vcnlVc2FnZSgpO1xyXG4gICAgY29uc3QgbWVtb3J5VXNlZE1CID0gbWVtb3J5VXNhZ2UuaGVhcFVzZWQgLyAxMDI0IC8gMTAyNDtcclxuICAgIGNvbnN0IG1lbW9yeUxpbWl0TUIgPSBwYXJzZUludChwcm9jZXNzLmVudi5BV1NfTEFNQkRBX0ZVTkNUSU9OX01FTU9SWV9TSVpFIHx8ICc1MTInKTtcclxuICAgIGNvbnN0IG1lbW9yeVV0aWxpemF0aW9uID0gKG1lbW9yeVVzZWRNQiAvIG1lbW9yeUxpbWl0TUIpICogMTAwO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHNlcnZpY2U6ICdsYW1iZGEnLFxyXG4gICAgICBzdGF0dXM6IG1lbW9yeVV0aWxpemF0aW9uID4gOTAgPyAnZGVncmFkZWQnIDogJ2hlYWx0aHknLFxyXG4gICAgICByZXNwb25zZVRpbWUsXHJcbiAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICBtZW1vcnlVc2VkTUI6IE1hdGgucm91bmQobWVtb3J5VXNlZE1CKSxcclxuICAgICAgICBtZW1vcnlMaW1pdE1CLFxyXG4gICAgICAgIG1lbW9yeVV0aWxpemF0aW9uOiBNYXRoLnJvdW5kKG1lbW9yeVV0aWxpemF0aW9uKSxcclxuICAgICAgICBub2RlVmVyc2lvbjogcHJvY2Vzcy52ZXJzaW9uLFxyXG4gICAgICAgIHBsYXRmb3JtOiBwcm9jZXNzLnBsYXRmb3JtLFxyXG4gICAgICAgIGFyY2g6IHByb2Nlc3MuYXJjaCxcclxuICAgICAgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ2xhbWJkYScsXHJcbiAgICAgIHN0YXR1czogJ3VuaGVhbHRoeScsXHJcbiAgICAgIHJlc3BvbnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgZGV0YWlsczogeyBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0sXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgZW52aXJvbm1lbnQgY29uZmlndXJhdGlvbiBoZWFsdGhcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrRW52aXJvbm1lbnRIZWFsdGgoKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlcXVpcmVkRW52VmFycyA9IFtcclxuICAgICAgJ0VOVklST05NRU5UJyxcclxuICAgICAgJ0ZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRScsXHJcbiAgICAgICdVU0VSU19UQUJMRV9OQU1FJyxcclxuICAgICAgJ1BST0pFQ1RTX1RBQkxFX05BTUUnLFxyXG4gICAgICAnRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FJyxcclxuICAgICAgJ0FOQUxZU0lTX1JFU1VMVFNfVEFCTEVfTkFNRScsXHJcbiAgICBdO1xyXG5cclxuICAgIGNvbnN0IG1pc3NpbmdWYXJzID0gcmVxdWlyZWRFbnZWYXJzLmZpbHRlcih2YXJOYW1lID0+ICFwcm9jZXNzLmVudlt2YXJOYW1lXSk7XHJcbiAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHNlcnZpY2U6ICdlbnZpcm9ubWVudCcsXHJcbiAgICAgIHN0YXR1czogbWlzc2luZ1ZhcnMubGVuZ3RoID09PSAwID8gJ2hlYWx0aHknIDogJ3VuaGVhbHRoeScsXHJcbiAgICAgIHJlc3BvbnNlVGltZSxcclxuICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgIHJlcXVpcmVkVmFyaWFibGVzOiByZXF1aXJlZEVudlZhcnMubGVuZ3RoLFxyXG4gICAgICAgIG1pc3NpbmdWYXJpYWJsZXM6IG1pc3NpbmdWYXJzLFxyXG4gICAgICAgIGVudmlyb25tZW50OiBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCxcclxuICAgICAgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ2Vudmlyb25tZW50JyxcclxuICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7IGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBEeW5hbW9EQiBoZWFsdGhcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrRHluYW1vREJIZWFsdGgoKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFX05BTUU7XHJcbiAgICBpZiAoIXRhYmxlTmFtZSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VTRVJTX1RBQkxFX05BTUUgbm90IGNvbmZpZ3VyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQZXJmb3JtIGEgc2ltcGxlIGRlc2NyaWJlIHRhYmxlIG9wZXJhdGlvblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vZGIuc2Nhbih7XHJcbiAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxyXG4gICAgICBMaW1pdDogMSxcclxuICAgICAgU2VsZWN0OiAnQ09VTlQnLFxyXG4gICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ2R5bmFtb2RiJyxcclxuICAgICAgc3RhdHVzOiByZXNwb25zZVRpbWUgPCAxMDAwID8gJ2hlYWx0aHknIDogJ2RlZ3JhZGVkJyxcclxuICAgICAgcmVzcG9uc2VUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgdGFibGVOYW1lLFxyXG4gICAgICAgIHJlc3BvbnNlVGltZU1zOiByZXNwb25zZVRpbWUsXHJcbiAgICAgICAgc2Nhbm5lZENvdW50OiByZXN1bHQuU2Nhbm5lZENvdW50LFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZXJ2aWNlOiAnZHluYW1vZGInLFxyXG4gICAgICBzdGF0dXM6ICd1bmhlYWx0aHknLFxyXG4gICAgICByZXNwb25zZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXHJcbiAgICAgIGRldGFpbHM6IHsgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9LFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIFMzIGhlYWx0aFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY2hlY2tTM0hlYWx0aCgpOiBQcm9taXNlPEhlYWx0aENoZWNrUmVzdWx0PiB7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBcclxuICB0cnkge1xyXG4gICAgY29uc3QgYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTtcclxuICAgIGlmICghYnVja2V0TmFtZSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSBub3QgY29uZmlndXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFBlcmZvcm0gYSBzaW1wbGUgaGVhZCBidWNrZXQgb3BlcmF0aW9uXHJcbiAgICBhd2FpdCBzMy5oZWFkQnVja2V0KHsgQnVja2V0OiBidWNrZXROYW1lIH0pLnByb21pc2UoKTtcclxuICAgIGNvbnN0IHJlc3BvbnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ3MzJyxcclxuICAgICAgc3RhdHVzOiByZXNwb25zZVRpbWUgPCAxMDAwID8gJ2hlYWx0aHknIDogJ2RlZ3JhZGVkJyxcclxuICAgICAgcmVzcG9uc2VUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgYnVja2V0TmFtZSxcclxuICAgICAgICByZXNwb25zZVRpbWVNczogcmVzcG9uc2VUaW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZXJ2aWNlOiAnczMnLFxyXG4gICAgICBzdGF0dXM6ICd1bmhlYWx0aHknLFxyXG4gICAgICByZXNwb25zZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXHJcbiAgICAgIGRldGFpbHM6IHsgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9LFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIFNlY3JldHMgTWFuYWdlciBoZWFsdGhcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrU2VjcmV0c01hbmFnZXJIZWFsdGgoKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIC8vIFRoaXMgaXMgYSBwbGFjZWhvbGRlciAtIGluIHByb2R1Y3Rpb24sIHlvdSdkIGNoZWNrIGFjdHVhbCBzZWNyZXRzXHJcbiAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHNlcnZpY2U6ICdzZWNyZXRzbWFuYWdlcicsXHJcbiAgICAgIHN0YXR1czogJ2hlYWx0aHknLFxyXG4gICAgICByZXNwb25zZVRpbWUsXHJcbiAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICByZXNwb25zZVRpbWVNczogcmVzcG9uc2VUaW1lLFxyXG4gICAgICAgIG5vdGU6ICdTZWNyZXRzIE1hbmFnZXIgY2hlY2sgbm90IGltcGxlbWVudGVkJyxcclxuICAgICAgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VydmljZTogJ3NlY3JldHNtYW5hZ2VyJyxcclxuICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7IGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBDbG91ZFdhdGNoIGhlYWx0aFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY2hlY2tDbG91ZFdhdGNoSGVhbHRoKCk6IFByb21pc2U8SGVhbHRoQ2hlY2tSZXN1bHQ+IHtcclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICAvLyBUaGlzIGlzIGEgcGxhY2Vob2xkZXIgLSBpbiBwcm9kdWN0aW9uLCB5b3UnZCBjaGVjayBDbG91ZFdhdGNoIEFQSVxyXG4gICAgY29uc3QgcmVzcG9uc2VUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZXJ2aWNlOiAnY2xvdWR3YXRjaCcsXHJcbiAgICAgIHN0YXR1czogJ2hlYWx0aHknLFxyXG4gICAgICByZXNwb25zZVRpbWUsXHJcbiAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICByZXNwb25zZVRpbWVNczogcmVzcG9uc2VUaW1lLFxyXG4gICAgICAgIG5vdGU6ICdDbG91ZFdhdGNoIGNoZWNrIG5vdCBpbXBsZW1lbnRlZCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHNlcnZpY2U6ICdjbG91ZHdhdGNoJyxcclxuICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICBkZXRhaWxzOiB7IGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCB0aGUgaGFuZGxlciB3aXRoIGNvcnJlbGF0aW9uIElEIG1pZGRsZXdhcmVcclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSB3aXRoQ29ycmVsYXRpb25JZChoZWFsdGhDaGVja0hhbmRsZXIpOyJdfQ==
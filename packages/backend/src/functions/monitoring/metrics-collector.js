"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const aws_sdk_1 = require("aws-sdk");
const centralized_logger_1 = require("../../utils/centralized-logger");
const monitoring_service_1 = require("../../services/monitoring-service");
const cloudWatch = new aws_sdk_1.CloudWatch();
const dynamodb = new aws_sdk_1.DynamoDB.DocumentClient();
const s3 = new aws_sdk_1.S3();
/**
 * Metrics Collector Lambda Function
 *
 * Collects and aggregates custom metrics from various sources:
 * - DynamoDB table statistics
 * - S3 bucket usage metrics
 * - Application-specific business metrics
 * - Performance and capacity planning metrics
 *
 * Can be triggered by:
 * - CloudWatch Events (scheduled)
 * - API Gateway (manual trigger)
 * - SNS notifications
 */
async function metricsCollectorHandler(event, context) {
    const logger = centralized_logger_1.CentralizedLogger.getInstance({
        correlationId: 'headers' in event ? event.headers?.['x-correlation-id'] : undefined,
        requestId: context.awsRequestId,
        functionName: context.functionName,
    });
    const startTime = Date.now();
    const errors = [];
    let metricsCollected = 0;
    try {
        logger.info('Metrics collection started', {
            eventType: 'source' in event ? 'scheduled' : 'api',
            functionName: context.functionName,
        });
        // Collect DynamoDB metrics
        try {
            const dynamoMetrics = await collectDynamoDBMetrics(logger);
            metricsCollected += dynamoMetrics;
            logger.info(`Collected ${dynamoMetrics} DynamoDB metrics`);
        }
        catch (error) {
            const errorMsg = `DynamoDB metrics collection failed: ${error.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
        }
        // Collect S3 metrics
        try {
            const s3Metrics = await collectS3Metrics(logger);
            metricsCollected += s3Metrics;
            logger.info(`Collected ${s3Metrics} S3 metrics`);
        }
        catch (error) {
            const errorMsg = `S3 metrics collection failed: ${error.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
        }
        // Collect business metrics
        try {
            const businessMetrics = await collectBusinessMetrics(logger);
            metricsCollected += businessMetrics;
            logger.info(`Collected ${businessMetrics} business metrics`);
        }
        catch (error) {
            const errorMsg = `Business metrics collection failed: ${error.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
        }
        // Collect capacity planning metrics
        try {
            const capacityMetrics = await collectCapacityPlanningMetrics(logger);
            metricsCollected += capacityMetrics;
            logger.info(`Collected ${capacityMetrics} capacity planning metrics`);
        }
        catch (error) {
            const errorMsg = `Capacity planning metrics collection failed: ${error.message}`;
            errors.push(errorMsg);
            logger.error(errorMsg, error);
        }
        const duration = Date.now() - startTime;
        const result = {
            timestamp: new Date().toISOString(),
            metricsCollected,
            errors,
            duration,
        };
        logger.info('Metrics collection completed', result);
        // Record collection metrics
        await monitoring_service_1.monitoringService.recordPerformanceMetric({
            operation: 'metrics_collection',
            duration,
            success: errors.length === 0,
            metadata: {
                metricsCollected,
                errorCount: errors.length,
            },
        });
        // If called via API Gateway, return response
        if ('httpMethod' in event) {
            return {
                statusCode: errors.length === 0 ? 200 : 207, // 207 = Multi-Status (partial success)
                headers: {
                    'Content-Type': 'application/json',
                    'X-Correlation-ID': logger.getCorrelationId(),
                },
                body: JSON.stringify(result, null, 2),
            };
        }
        // For scheduled events, no return value needed
        return;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Metrics collection failed', error, { duration });
        await monitoring_service_1.monitoringService.recordPerformanceMetric({
            operation: 'metrics_collection',
            duration,
            success: false,
            errorType: error.name,
        });
        if ('httpMethod' in event) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Correlation-ID': logger.getCorrelationId(),
                },
                body: JSON.stringify({
                    error: 'Metrics collection failed',
                    message: error.message,
                    timestamp: new Date().toISOString(),
                }),
            };
        }
        throw error;
    }
}
/**
 * Collect DynamoDB table metrics
 */
async function collectDynamoDBMetrics(logger) {
    const tables = [
        process.env.USERS_TABLE_NAME,
        process.env.PROJECTS_TABLE_NAME,
        process.env.FILE_METADATA_TABLE_NAME,
        process.env.ANALYSIS_RESULTS_TABLE_NAME,
        process.env.SAMPLE_FILES_TABLE_NAME,
    ].filter(Boolean);
    let metricsCount = 0;
    for (const tableName of tables) {
        try {
            // Get table item count
            const scanResult = await dynamodb.scan({
                TableName: tableName,
                Select: 'COUNT',
            }).promise();
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'TableItemCount',
                Value: scanResult.Count || 0,
                Unit: 'Count',
                Dimensions: [
                    { Name: 'TableName', Value: tableName },
                ],
            });
            metricsCount++;
            // Get table size (approximate)
            const describeResult = await dynamodb.describe({
                TableName: tableName,
            }).promise();
            if (describeResult.Table?.TableSizeBytes) {
                await monitoring_service_1.monitoringService.publishMetric({
                    MetricName: 'TableSizeBytes',
                    Value: describeResult.Table.TableSizeBytes,
                    Unit: 'Bytes',
                    Dimensions: [
                        { Name: 'TableName', Value: tableName },
                    ],
                });
                metricsCount++;
            }
            logger.debug(`Collected metrics for table: ${tableName}`, {
                itemCount: scanResult.Count,
                sizeBytes: describeResult.Table?.TableSizeBytes,
            });
        }
        catch (error) {
            logger.error(`Failed to collect metrics for table: ${tableName}`, error);
        }
    }
    return metricsCount;
}
/**
 * Collect S3 bucket metrics
 */
async function collectS3Metrics(logger) {
    const bucketName = process.env.FILE_STORAGE_BUCKET_NAME;
    if (!bucketName) {
        logger.warn('FILE_STORAGE_BUCKET_NAME not configured, skipping S3 metrics');
        return 0;
    }
    let metricsCount = 0;
    try {
        // Get bucket object count and total size
        const listResult = await s3.listObjectsV2({
            Bucket: bucketName,
        }).promise();
        const objectCount = listResult.KeyCount || 0;
        const totalSize = listResult.Contents?.reduce((sum, obj) => sum + (obj.Size || 0), 0) || 0;
        await monitoring_service_1.monitoringService.publishMetrics([
            {
                MetricName: 'BucketObjectCount',
                Value: objectCount,
                Unit: 'Count',
                Dimensions: [
                    { Name: 'BucketName', Value: bucketName },
                ],
            },
            {
                MetricName: 'BucketTotalSize',
                Value: totalSize,
                Unit: 'Bytes',
                Dimensions: [
                    { Name: 'BucketName', Value: bucketName },
                ],
            },
        ]);
        metricsCount += 2;
        // Collect file type distribution
        const fileTypes = {};
        listResult.Contents?.forEach(obj => {
            const extension = obj.Key?.split('.').pop()?.toLowerCase() || 'unknown';
            fileTypes[extension] = (fileTypes[extension] || 0) + 1;
        });
        for (const [fileType, count] of Object.entries(fileTypes)) {
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'FileTypeCount',
                Value: count,
                Unit: 'Count',
                Dimensions: [
                    { Name: 'BucketName', Value: bucketName },
                    { Name: 'FileType', Value: fileType },
                ],
            });
            metricsCount++;
        }
        logger.debug('Collected S3 metrics', {
            bucketName,
            objectCount,
            totalSize,
            fileTypes,
        });
    }
    catch (error) {
        logger.error(`Failed to collect S3 metrics for bucket: ${bucketName}`, error);
    }
    return metricsCount;
}
/**
 * Collect business metrics from database
 */
async function collectBusinessMetrics(logger) {
    let metricsCount = 0;
    try {
        // Collect user metrics
        if (process.env.USERS_TABLE_NAME) {
            const usersResult = await dynamodb.scan({
                TableName: process.env.USERS_TABLE_NAME,
                Select: 'COUNT',
            }).promise();
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'TotalUsers',
                Value: usersResult.Count || 0,
                Unit: 'Count',
            });
            metricsCount++;
        }
        // Collect project metrics
        if (process.env.PROJECTS_TABLE_NAME) {
            const projectsResult = await dynamodb.scan({
                TableName: process.env.PROJECTS_TABLE_NAME,
                Select: 'COUNT',
            }).promise();
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'TotalProjects',
                Value: projectsResult.Count || 0,
                Unit: 'Count',
            });
            metricsCount++;
        }
        // Collect analysis metrics
        if (process.env.ANALYSIS_RESULTS_TABLE_NAME) {
            const analysisResult = await dynamodb.scan({
                TableName: process.env.ANALYSIS_RESULTS_TABLE_NAME,
                Select: 'COUNT',
            }).promise();
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'TotalAnalyses',
                Value: analysisResult.Count || 0,
                Unit: 'Count',
            });
            metricsCount++;
            // Get recent analysis success rate (last 24 hours)
            const yesterday = Date.now() - (24 * 60 * 60 * 1000);
            const recentAnalyses = await dynamodb.scan({
                TableName: process.env.ANALYSIS_RESULTS_TABLE_NAME,
                FilterExpression: '#timestamp > :yesterday',
                ExpressionAttributeNames: {
                    '#timestamp': 'timestamp',
                },
                ExpressionAttributeValues: {
                    ':yesterday': yesterday,
                },
            }).promise();
            const totalRecent = recentAnalyses.Count || 0;
            const successfulRecent = recentAnalyses.Items?.filter(item => item.status === 'COMPLETED').length || 0;
            const successRate = totalRecent > 0 ? (successfulRecent / totalRecent) * 100 : 100;
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'AnalysisSuccessRate24h',
                Value: successRate,
                Unit: 'Percent',
            });
            metricsCount++;
        }
        // Collect file upload metrics
        if (process.env.FILE_METADATA_TABLE_NAME) {
            const filesResult = await dynamodb.scan({
                TableName: process.env.FILE_METADATA_TABLE_NAME,
                Select: 'COUNT',
            }).promise();
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'TotalFiles',
                Value: filesResult.Count || 0,
                Unit: 'Count',
            });
            metricsCount++;
        }
        logger.debug('Collected business metrics', { metricsCount });
    }
    catch (error) {
        logger.error('Failed to collect business metrics', error);
    }
    return metricsCount;
}
/**
 * Collect capacity planning metrics
 */
async function collectCapacityPlanningMetrics(logger) {
    let metricsCount = 0;
    try {
        // Lambda function metrics
        const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
        if (functionName) {
            const memoryUsage = process.memoryUsage();
            const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
            const memoryLimitMB = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '512');
            const memoryUtilization = (memoryUsedMB / memoryLimitMB) * 100;
            await monitoring_service_1.monitoringService.publishMetrics([
                {
                    MetricName: 'LambdaMemoryUtilization',
                    Value: memoryUtilization,
                    Unit: 'Percent',
                    Dimensions: [
                        { Name: 'FunctionName', Value: functionName },
                    ],
                },
                {
                    MetricName: 'LambdaMemoryUsed',
                    Value: memoryUsedMB,
                    Unit: 'Megabytes',
                    Dimensions: [
                        { Name: 'FunctionName', Value: functionName },
                    ],
                },
            ]);
            metricsCount += 2;
        }
        // System resource metrics
        const cpuUsage = process.cpuUsage();
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        await monitoring_service_1.monitoringService.publishMetric({
            MetricName: 'SystemCPUUsage',
            Value: cpuPercent,
            Unit: 'Seconds',
        });
        metricsCount++;
        logger.debug('Collected capacity planning metrics', { metricsCount });
    }
    catch (error) {
        logger.error('Failed to collect capacity planning metrics', error);
    }
    return metricsCount;
}
// Export the handler with correlation ID middleware
exports.handler = (0, centralized_logger_1.withCorrelationId)(metricsCollectorHandler);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljcy1jb2xsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtZXRyaWNzLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxxQ0FBbUQ7QUFDbkQsdUVBQXNGO0FBQ3RGLDBFQUFzRTtBQUV0RSxNQUFNLFVBQVUsR0FBRyxJQUFJLG9CQUFVLEVBQUUsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGtCQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDL0MsTUFBTSxFQUFFLEdBQUcsSUFBSSxZQUFFLEVBQUUsQ0FBQztBQVNwQjs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsS0FBSyxVQUFVLHVCQUF1QixDQUNwQyxLQUE0QyxFQUM1QyxPQUFnQjtJQUVoQixNQUFNLE1BQU0sR0FBRyxzQ0FBaUIsQ0FBQyxXQUFXLENBQUM7UUFDM0MsYUFBYSxFQUFFLFNBQVMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1FBQ25GLFNBQVMsRUFBRSxPQUFPLENBQUMsWUFBWTtRQUMvQixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7S0FDbkMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzdCLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUM1QixJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQztJQUV6QixJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFO1lBQ3hDLFNBQVMsRUFBRSxRQUFRLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUs7WUFDbEQsWUFBWSxFQUFFLE9BQU8sQ0FBQyxZQUFZO1NBQ25DLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixJQUFJLENBQUM7WUFDSCxN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QSxPQUFPLEdBQUcsSUFBQSxzQ0FBaUIsRUFBQyx1QkFBdUIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCwgQ29udGV4dCwgU2NoZWR1bGVkRXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ2xvdWRXYXRjaCwgRHluYW1vREIsIFMzIH0gZnJvbSAnYXdzLXNkayc7XHJcbmltcG9ydCB7IENlbnRyYWxpemVkTG9nZ2VyLCB3aXRoQ29ycmVsYXRpb25JZCB9IGZyb20gJy4uLy4uL3V0aWxzL2NlbnRyYWxpemVkLWxvZ2dlcic7XHJcbmltcG9ydCB7IG1vbml0b3JpbmdTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbW9uaXRvcmluZy1zZXJ2aWNlJztcclxuXHJcbmNvbnN0IGNsb3VkV2F0Y2ggPSBuZXcgQ2xvdWRXYXRjaCgpO1xyXG5jb25zdCBkeW5hbW9kYiA9IG5ldyBEeW5hbW9EQi5Eb2N1bWVudENsaWVudCgpO1xyXG5jb25zdCBzMyA9IG5ldyBTMygpO1xyXG5cclxuaW50ZXJmYWNlIE1ldHJpY3NDb2xsZWN0aW9uUmVzdWx0IHtcclxuICB0aW1lc3RhbXA6IHN0cmluZztcclxuICBtZXRyaWNzQ29sbGVjdGVkOiBudW1iZXI7XHJcbiAgZXJyb3JzOiBzdHJpbmdbXTtcclxuICBkdXJhdGlvbjogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogTWV0cmljcyBDb2xsZWN0b3IgTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIFxyXG4gKiBDb2xsZWN0cyBhbmQgYWdncmVnYXRlcyBjdXN0b20gbWV0cmljcyBmcm9tIHZhcmlvdXMgc291cmNlczpcclxuICogLSBEeW5hbW9EQiB0YWJsZSBzdGF0aXN0aWNzXHJcbiAqIC0gUzMgYnVja2V0IHVzYWdlIG1ldHJpY3NcclxuICogLSBBcHBsaWNhdGlvbi1zcGVjaWZpYyBidXNpbmVzcyBtZXRyaWNzXHJcbiAqIC0gUGVyZm9ybWFuY2UgYW5kIGNhcGFjaXR5IHBsYW5uaW5nIG1ldHJpY3NcclxuICogXHJcbiAqIENhbiBiZSB0cmlnZ2VyZWQgYnk6XHJcbiAqIC0gQ2xvdWRXYXRjaCBFdmVudHMgKHNjaGVkdWxlZClcclxuICogLSBBUEkgR2F0ZXdheSAobWFudWFsIHRyaWdnZXIpXHJcbiAqIC0gU05TIG5vdGlmaWNhdGlvbnNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIG1ldHJpY3NDb2xsZWN0b3JIYW5kbGVyKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCB8IFNjaGVkdWxlZEV2ZW50LFxyXG4gIGNvbnRleHQ6IENvbnRleHRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQgfCB2b2lkPiB7XHJcbiAgY29uc3QgbG9nZ2VyID0gQ2VudHJhbGl6ZWRMb2dnZXIuZ2V0SW5zdGFuY2Uoe1xyXG4gICAgY29ycmVsYXRpb25JZDogJ2hlYWRlcnMnIGluIGV2ZW50ID8gZXZlbnQuaGVhZGVycz8uWyd4LWNvcnJlbGF0aW9uLWlkJ10gOiB1bmRlZmluZWQsXHJcbiAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICB9KTtcclxuXHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcbiAgbGV0IG1ldHJpY3NDb2xsZWN0ZWQgPSAwO1xyXG5cclxuICB0cnkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ01ldHJpY3MgY29sbGVjdGlvbiBzdGFydGVkJywge1xyXG4gICAgICBldmVudFR5cGU6ICdzb3VyY2UnIGluIGV2ZW50ID8gJ3NjaGVkdWxlZCcgOiAnYXBpJyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENvbGxlY3QgRHluYW1vREIgbWV0cmljc1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZHluYW1vTWV0cmljcyA9IGF3YWl0IGNvbGxlY3REeW5hbW9EQk1ldHJpY3MobG9nZ2VyKTtcclxuICAgICAgbWV0cmljc0NvbGxlY3RlZCArPSBkeW5hbW9NZXRyaWNzO1xyXG4gICAgICBsb2dnZXIuaW5mbyhgQ29sbGVjdGVkICR7ZHluYW1vTWV0cmljc30gRHluYW1vREIgbWV0cmljc2ApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZXJyb3JNc2cgPSBgRHluYW1vREIgbWV0cmljcyBjb2xsZWN0aW9uIGZhaWxlZDogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YDtcclxuICAgICAgZXJyb3JzLnB1c2goZXJyb3JNc2cpO1xyXG4gICAgICBsb2dnZXIuZXJyb3IoZXJyb3JNc2csIGVycm9yIGFzIEVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb2xsZWN0IFMzIG1ldHJpY3NcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHMzTWV0cmljcyA9IGF3YWl0IGNvbGxlY3RTM01ldHJpY3MobG9nZ2VyKTtcclxuICAgICAgbWV0cmljc0NvbGxlY3RlZCArPSBzM01ldHJpY3M7XHJcbiAgICAgIGxvZ2dlci5pbmZvKGBDb2xsZWN0ZWQgJHtzM01ldHJpY3N9IFMzIG1ldHJpY3NgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gYFMzIG1ldHJpY3MgY29sbGVjdGlvbiBmYWlsZWQ6ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWA7XHJcbiAgICAgIGVycm9ycy5wdXNoKGVycm9yTXNnKTtcclxuICAgICAgbG9nZ2VyLmVycm9yKGVycm9yTXNnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29sbGVjdCBidXNpbmVzcyBtZXRyaWNzXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBidXNpbmVzc01ldHJpY3MgPSBhd2FpdCBjb2xsZWN0QnVzaW5lc3NNZXRyaWNzKGxvZ2dlcik7XHJcbiAgICAgIG1ldHJpY3NDb2xsZWN0ZWQgKz0gYnVzaW5lc3NNZXRyaWNzO1xyXG4gICAgICBsb2dnZXIuaW5mbyhgQ29sbGVjdGVkICR7YnVzaW5lc3NNZXRyaWNzfSBidXNpbmVzcyBtZXRyaWNzYCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBlcnJvck1zZyA9IGBCdXNpbmVzcyBtZXRyaWNzIGNvbGxlY3Rpb24gZmFpbGVkOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gO1xyXG4gICAgICBlcnJvcnMucHVzaChlcnJvck1zZyk7XHJcbiAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1zZywgZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbGxlY3QgY2FwYWNpdHkgcGxhbm5pbmcgbWV0cmljc1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY2FwYWNpdHlNZXRyaWNzID0gYXdhaXQgY29sbGVjdENhcGFjaXR5UGxhbm5pbmdNZXRyaWNzKGxvZ2dlcik7XHJcbiAgICAgIG1ldHJpY3NDb2xsZWN0ZWQgKz0gY2FwYWNpdHlNZXRyaWNzO1xyXG4gICAgICBsb2dnZXIuaW5mbyhgQ29sbGVjdGVkICR7Y2FwYWNpdHlNZXRyaWNzfSBjYXBhY2l0eSBwbGFubmluZyBtZXRyaWNzYCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBlcnJvck1zZyA9IGBDYXBhY2l0eSBwbGFubmluZyBtZXRyaWNzIGNvbGxlY3Rpb24gZmFpbGVkOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gO1xyXG4gICAgICBlcnJvcnMucHVzaChlcnJvck1zZyk7XHJcbiAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1zZywgZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgIGNvbnN0IHJlc3VsdDogTWV0cmljc0NvbGxlY3Rpb25SZXN1bHQgPSB7XHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBtZXRyaWNzQ29sbGVjdGVkLFxyXG4gICAgICBlcnJvcnMsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgfTtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnTWV0cmljcyBjb2xsZWN0aW9uIGNvbXBsZXRlZCcsIHJlc3VsdCk7XHJcblxyXG4gICAgLy8gUmVjb3JkIGNvbGxlY3Rpb24gbWV0cmljc1xyXG4gICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkUGVyZm9ybWFuY2VNZXRyaWMoe1xyXG4gICAgICBvcGVyYXRpb246ICdtZXRyaWNzX2NvbGxlY3Rpb24nLFxyXG4gICAgICBkdXJhdGlvbixcclxuICAgICAgc3VjY2VzczogZXJyb3JzLmxlbmd0aCA9PT0gMCxcclxuICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICBtZXRyaWNzQ29sbGVjdGVkLFxyXG4gICAgICAgIGVycm9yQ291bnQ6IGVycm9ycy5sZW5ndGgsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJZiBjYWxsZWQgdmlhIEFQSSBHYXRld2F5LCByZXR1cm4gcmVzcG9uc2VcclxuICAgIGlmICgnaHR0cE1ldGhvZCcgaW4gZXZlbnQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiBlcnJvcnMubGVuZ3RoID09PSAwID8gMjAwIDogMjA3LCAvLyAyMDcgPSBNdWx0aS1TdGF0dXMgKHBhcnRpYWwgc3VjY2VzcylcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ1gtQ29ycmVsYXRpb24tSUQnOiBsb2dnZXIuZ2V0Q29ycmVsYXRpb25JZCgpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGb3Igc2NoZWR1bGVkIGV2ZW50cywgbm8gcmV0dXJuIHZhbHVlIG5lZWRlZFxyXG4gICAgcmV0dXJuO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ01ldHJpY3MgY29sbGVjdGlvbiBmYWlsZWQnLCBlcnJvciBhcyBFcnJvciwgeyBkdXJhdGlvbiB9KTtcclxuXHJcbiAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5yZWNvcmRQZXJmb3JtYW5jZU1ldHJpYyh7XHJcbiAgICAgIG9wZXJhdGlvbjogJ21ldHJpY3NfY29sbGVjdGlvbicsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgZXJyb3JUeXBlOiAoZXJyb3IgYXMgRXJyb3IpLm5hbWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoJ2h0dHBNZXRob2QnIGluIGV2ZW50KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnWC1Db3JyZWxhdGlvbi1JRCc6IGxvZ2dlci5nZXRDb3JyZWxhdGlvbklkKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ01ldHJpY3MgY29sbGVjdGlvbiBmYWlsZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ29sbGVjdCBEeW5hbW9EQiB0YWJsZSBtZXRyaWNzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjb2xsZWN0RHluYW1vREJNZXRyaWNzKGxvZ2dlcjogQ2VudHJhbGl6ZWRMb2dnZXIpOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gIGNvbnN0IHRhYmxlcyA9IFtcclxuICAgIHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFX05BTUUsXHJcbiAgICBwcm9jZXNzLmVudi5QUk9KRUNUU19UQUJMRV9OQU1FLFxyXG4gICAgcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FLFxyXG4gICAgcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRV9OQU1FLFxyXG4gICAgcHJvY2Vzcy5lbnYuU0FNUExFX0ZJTEVTX1RBQkxFX05BTUUsXHJcbiAgXS5maWx0ZXIoQm9vbGVhbikgYXMgc3RyaW5nW107XHJcblxyXG4gIGxldCBtZXRyaWNzQ291bnQgPSAwO1xyXG5cclxuICBmb3IgKGNvbnN0IHRhYmxlTmFtZSBvZiB0YWJsZXMpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdldCB0YWJsZSBpdGVtIGNvdW50XHJcbiAgICAgIGNvbnN0IHNjYW5SZXN1bHQgPSBhd2FpdCBkeW5hbW9kYi5zY2FuKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcclxuICAgICAgICBTZWxlY3Q6ICdDT1VOVCcsXHJcbiAgICAgIH0pLnByb21pc2UoKTtcclxuXHJcbiAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWMoe1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdUYWJsZUl0ZW1Db3VudCcsXHJcbiAgICAgICAgVmFsdWU6IHNjYW5SZXN1bHQuQ291bnQgfHwgMCxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ1RhYmxlTmFtZScsIFZhbHVlOiB0YWJsZU5hbWUgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG1ldHJpY3NDb3VudCsrO1xyXG5cclxuICAgICAgLy8gR2V0IHRhYmxlIHNpemUgKGFwcHJveGltYXRlKVxyXG4gICAgICBjb25zdCBkZXNjcmliZVJlc3VsdCA9IGF3YWl0IGR5bmFtb2RiLmRlc2NyaWJlKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcclxuICAgICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgICAgaWYgKGRlc2NyaWJlUmVzdWx0LlRhYmxlPy5UYWJsZVNpemVCeXRlcykge1xyXG4gICAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWMoe1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogJ1RhYmxlU2l6ZUJ5dGVzJyxcclxuICAgICAgICAgIFZhbHVlOiBkZXNjcmliZVJlc3VsdC5UYWJsZS5UYWJsZVNpemVCeXRlcyxcclxuICAgICAgICAgIFVuaXQ6ICdCeXRlcycsXHJcbiAgICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICAgIHsgTmFtZTogJ1RhYmxlTmFtZScsIFZhbHVlOiB0YWJsZU5hbWUgfSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG1ldHJpY3NDb3VudCsrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsb2dnZXIuZGVidWcoYENvbGxlY3RlZCBtZXRyaWNzIGZvciB0YWJsZTogJHt0YWJsZU5hbWV9YCwge1xyXG4gICAgICAgIGl0ZW1Db3VudDogc2NhblJlc3VsdC5Db3VudCxcclxuICAgICAgICBzaXplQnl0ZXM6IGRlc2NyaWJlUmVzdWx0LlRhYmxlPy5UYWJsZVNpemVCeXRlcyxcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBjb2xsZWN0IG1ldHJpY3MgZm9yIHRhYmxlOiAke3RhYmxlTmFtZX1gLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWV0cmljc0NvdW50O1xyXG59XHJcblxyXG4vKipcclxuICogQ29sbGVjdCBTMyBidWNrZXQgbWV0cmljc1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY29sbGVjdFMzTWV0cmljcyhsb2dnZXI6IENlbnRyYWxpemVkTG9nZ2VyKTogUHJvbWlzZTxudW1iZXI+IHtcclxuICBjb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FO1xyXG4gIGlmICghYnVja2V0TmFtZSkge1xyXG4gICAgbG9nZ2VyLndhcm4oJ0ZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSBub3QgY29uZmlndXJlZCwgc2tpcHBpbmcgUzMgbWV0cmljcycpO1xyXG4gICAgcmV0dXJuIDA7XHJcbiAgfVxyXG5cclxuICBsZXQgbWV0cmljc0NvdW50ID0gMDtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEdldCBidWNrZXQgb2JqZWN0IGNvdW50IGFuZCB0b3RhbCBzaXplXHJcbiAgICBjb25zdCBsaXN0UmVzdWx0ID0gYXdhaXQgczMubGlzdE9iamVjdHNWMih7XHJcbiAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcclxuICAgIH0pLnByb21pc2UoKTtcclxuXHJcbiAgICBjb25zdCBvYmplY3RDb3VudCA9IGxpc3RSZXN1bHQuS2V5Q291bnQgfHwgMDtcclxuICAgIGNvbnN0IHRvdGFsU2l6ZSA9IGxpc3RSZXN1bHQuQ29udGVudHM/LnJlZHVjZSgoc3VtLCBvYmopID0+IHN1bSArIChvYmouU2l6ZSB8fCAwKSwgMCkgfHwgMDtcclxuXHJcbiAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljcyhbXHJcbiAgICAgIHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnQnVja2V0T2JqZWN0Q291bnQnLFxyXG4gICAgICAgIFZhbHVlOiBvYmplY3RDb3VudCxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ0J1Y2tldE5hbWUnLCBWYWx1ZTogYnVja2V0TmFtZSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnQnVja2V0VG90YWxTaXplJyxcclxuICAgICAgICBWYWx1ZTogdG90YWxTaXplLFxyXG4gICAgICAgIFVuaXQ6ICdCeXRlcycsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnQnVja2V0TmFtZScsIFZhbHVlOiBidWNrZXROYW1lIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgIF0pO1xyXG5cclxuICAgIG1ldHJpY3NDb3VudCArPSAyO1xyXG5cclxuICAgIC8vIENvbGxlY3QgZmlsZSB0eXBlIGRpc3RyaWJ1dGlvblxyXG4gICAgY29uc3QgZmlsZVR5cGVzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XHJcbiAgICBsaXN0UmVzdWx0LkNvbnRlbnRzPy5mb3JFYWNoKG9iaiA9PiB7XHJcbiAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IG9iai5LZXk/LnNwbGl0KCcuJykucG9wKCk/LnRvTG93ZXJDYXNlKCkgfHwgJ3Vua25vd24nO1xyXG4gICAgICBmaWxlVHlwZXNbZXh0ZW5zaW9uXSA9IChmaWxlVHlwZXNbZXh0ZW5zaW9uXSB8fCAwKSArIDE7XHJcbiAgICB9KTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IFtmaWxlVHlwZSwgY291bnRdIG9mIE9iamVjdC5lbnRyaWVzKGZpbGVUeXBlcykpIHtcclxuICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucHVibGlzaE1ldHJpYyh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ0ZpbGVUeXBlQ291bnQnLFxyXG4gICAgICAgIFZhbHVlOiBjb3VudCxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgIHsgTmFtZTogJ0J1Y2tldE5hbWUnLCBWYWx1ZTogYnVja2V0TmFtZSB9LFxyXG4gICAgICAgICAgeyBOYW1lOiAnRmlsZVR5cGUnLCBWYWx1ZTogZmlsZVR5cGUgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuICAgICAgbWV0cmljc0NvdW50Kys7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmRlYnVnKCdDb2xsZWN0ZWQgUzMgbWV0cmljcycsIHtcclxuICAgICAgYnVja2V0TmFtZSxcclxuICAgICAgb2JqZWN0Q291bnQsXHJcbiAgICAgIHRvdGFsU2l6ZSxcclxuICAgICAgZmlsZVR5cGVzLFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGNvbGxlY3QgUzMgbWV0cmljcyBmb3IgYnVja2V0OiAke2J1Y2tldE5hbWV9YCwgZXJyb3IgYXMgRXJyb3IpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG1ldHJpY3NDb3VudDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbGxlY3QgYnVzaW5lc3MgbWV0cmljcyBmcm9tIGRhdGFiYXNlXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjb2xsZWN0QnVzaW5lc3NNZXRyaWNzKGxvZ2dlcjogQ2VudHJhbGl6ZWRMb2dnZXIpOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gIGxldCBtZXRyaWNzQ291bnQgPSAwO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gQ29sbGVjdCB1c2VyIG1ldHJpY3NcclxuICAgIGlmIChwcm9jZXNzLmVudi5VU0VSU19UQUJMRV9OQU1FKSB7XHJcbiAgICAgIGNvbnN0IHVzZXJzUmVzdWx0ID0gYXdhaXQgZHluYW1vZGIuc2Nhbih7XHJcbiAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5VU0VSU19UQUJMRV9OQU1FLFxyXG4gICAgICAgIFNlbGVjdDogJ0NPVU5UJyxcclxuICAgICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucHVibGlzaE1ldHJpYyh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1RvdGFsVXNlcnMnLFxyXG4gICAgICAgIFZhbHVlOiB1c2Vyc1Jlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbWV0cmljc0NvdW50Kys7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29sbGVjdCBwcm9qZWN0IG1ldHJpY3NcclxuICAgIGlmIChwcm9jZXNzLmVudi5QUk9KRUNUU19UQUJMRV9OQU1FKSB7XHJcbiAgICAgIGNvbnN0IHByb2plY3RzUmVzdWx0ID0gYXdhaXQgZHluYW1vZGIuc2Nhbih7XHJcbiAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5QUk9KRUNUU19UQUJMRV9OQU1FLFxyXG4gICAgICAgIFNlbGVjdDogJ0NPVU5UJyxcclxuICAgICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucHVibGlzaE1ldHJpYyh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1RvdGFsUHJvamVjdHMnLFxyXG4gICAgICAgIFZhbHVlOiBwcm9qZWN0c1Jlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbWV0cmljc0NvdW50Kys7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29sbGVjdCBhbmFseXNpcyBtZXRyaWNzXHJcbiAgICBpZiAocHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRV9OQU1FKSB7XHJcbiAgICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0ID0gYXdhaXQgZHluYW1vZGIuc2Nhbih7XHJcbiAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFX05BTUUsXHJcbiAgICAgICAgU2VsZWN0OiAnQ09VTlQnLFxyXG4gICAgICB9KS5wcm9taXNlKCk7XHJcblxyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljKHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnVG90YWxBbmFseXNlcycsXHJcbiAgICAgICAgVmFsdWU6IGFuYWx5c2lzUmVzdWx0LkNvdW50IHx8IDAsXHJcbiAgICAgICAgVW5pdDogJ0NvdW50JyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBtZXRyaWNzQ291bnQrKztcclxuXHJcbiAgICAgIC8vIEdldCByZWNlbnQgYW5hbHlzaXMgc3VjY2VzcyByYXRlIChsYXN0IDI0IGhvdXJzKVxyXG4gICAgICBjb25zdCB5ZXN0ZXJkYXkgPSBEYXRlLm5vdygpIC0gKDI0ICogNjAgKiA2MCAqIDEwMDApO1xyXG4gICAgICBjb25zdCByZWNlbnRBbmFseXNlcyA9IGF3YWl0IGR5bmFtb2RiLnNjYW4oe1xyXG4gICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRV9OQU1FLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICcjdGltZXN0YW1wID4gOnllc3RlcmRheScsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAnI3RpbWVzdGFtcCc6ICd0aW1lc3RhbXAnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzp5ZXN0ZXJkYXknOiB5ZXN0ZXJkYXksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgICAgY29uc3QgdG90YWxSZWNlbnQgPSByZWNlbnRBbmFseXNlcy5Db3VudCB8fCAwO1xyXG4gICAgICBjb25zdCBzdWNjZXNzZnVsUmVjZW50ID0gcmVjZW50QW5hbHlzZXMuSXRlbXM/LmZpbHRlcihpdGVtID0+IGl0ZW0uc3RhdHVzID09PSAnQ09NUExFVEVEJykubGVuZ3RoIHx8IDA7XHJcbiAgICAgIGNvbnN0IHN1Y2Nlc3NSYXRlID0gdG90YWxSZWNlbnQgPiAwID8gKHN1Y2Nlc3NmdWxSZWNlbnQgLyB0b3RhbFJlY2VudCkgKiAxMDAgOiAxMDA7XHJcblxyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljKHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnQW5hbHlzaXNTdWNjZXNzUmF0ZTI0aCcsXHJcbiAgICAgICAgVmFsdWU6IHN1Y2Nlc3NSYXRlLFxyXG4gICAgICAgIFVuaXQ6ICdQZXJjZW50JyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBtZXRyaWNzQ291bnQrKztcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb2xsZWN0IGZpbGUgdXBsb2FkIG1ldHJpY3NcclxuICAgIGlmIChwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFX05BTUUpIHtcclxuICAgICAgY29uc3QgZmlsZXNSZXN1bHQgPSBhd2FpdCBkeW5hbW9kYi5zY2FuKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEVfTkFNRSxcclxuICAgICAgICBTZWxlY3Q6ICdDT1VOVCcsXHJcbiAgICAgIH0pLnByb21pc2UoKTtcclxuXHJcbiAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWMoe1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdUb3RhbEZpbGVzJyxcclxuICAgICAgICBWYWx1ZTogZmlsZXNSZXN1bHQuQ291bnQgfHwgMCxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG1ldHJpY3NDb3VudCsrO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5kZWJ1ZygnQ29sbGVjdGVkIGJ1c2luZXNzIG1ldHJpY3MnLCB7IG1ldHJpY3NDb3VudCB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gY29sbGVjdCBidXNpbmVzcyBtZXRyaWNzJywgZXJyb3IgYXMgRXJyb3IpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG1ldHJpY3NDb3VudDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbGxlY3QgY2FwYWNpdHkgcGxhbm5pbmcgbWV0cmljc1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY29sbGVjdENhcGFjaXR5UGxhbm5pbmdNZXRyaWNzKGxvZ2dlcjogQ2VudHJhbGl6ZWRMb2dnZXIpOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gIGxldCBtZXRyaWNzQ291bnQgPSAwO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIG1ldHJpY3NcclxuICAgIGNvbnN0IGZ1bmN0aW9uTmFtZSA9IHByb2Nlc3MuZW52LkFXU19MQU1CREFfRlVOQ1RJT05fTkFNRTtcclxuICAgIGlmIChmdW5jdGlvbk5hbWUpIHtcclxuICAgICAgY29uc3QgbWVtb3J5VXNhZ2UgPSBwcm9jZXNzLm1lbW9yeVVzYWdlKCk7XHJcbiAgICAgIGNvbnN0IG1lbW9yeVVzZWRNQiA9IG1lbW9yeVVzYWdlLmhlYXBVc2VkIC8gMTAyNCAvIDEwMjQ7XHJcbiAgICAgIGNvbnN0IG1lbW9yeUxpbWl0TUIgPSBwYXJzZUludChwcm9jZXNzLmVudi5BV1NfTEFNQkRBX0ZVTkNUSU9OX01FTU9SWV9TSVpFIHx8ICc1MTInKTtcclxuICAgICAgY29uc3QgbWVtb3J5VXRpbGl6YXRpb24gPSAobWVtb3J5VXNlZE1CIC8gbWVtb3J5TGltaXRNQikgKiAxMDA7XHJcblxyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljcyhbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogJ0xhbWJkYU1lbW9yeVV0aWxpemF0aW9uJyxcclxuICAgICAgICAgIFZhbHVlOiBtZW1vcnlVdGlsaXphdGlvbixcclxuICAgICAgICAgIFVuaXQ6ICdQZXJjZW50JyxcclxuICAgICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgICAgeyBOYW1lOiAnRnVuY3Rpb25OYW1lJywgVmFsdWU6IGZ1bmN0aW9uTmFtZSB9LFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE1ldHJpY05hbWU6ICdMYW1iZGFNZW1vcnlVc2VkJyxcclxuICAgICAgICAgIFZhbHVlOiBtZW1vcnlVc2VkTUIsXHJcbiAgICAgICAgICBVbml0OiAnTWVnYWJ5dGVzJyxcclxuICAgICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgICAgeyBOYW1lOiAnRnVuY3Rpb25OYW1lJywgVmFsdWU6IGZ1bmN0aW9uTmFtZSB9LFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICBdKTtcclxuXHJcbiAgICAgIG1ldHJpY3NDb3VudCArPSAyO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN5c3RlbSByZXNvdXJjZSBtZXRyaWNzXHJcbiAgICBjb25zdCBjcHVVc2FnZSA9IHByb2Nlc3MuY3B1VXNhZ2UoKTtcclxuICAgIGNvbnN0IGNwdVBlcmNlbnQgPSAoY3B1VXNhZ2UudXNlciArIGNwdVVzYWdlLnN5c3RlbSkgLyAxMDAwMDAwOyAvLyBDb252ZXJ0IHRvIHNlY29uZHNcclxuXHJcbiAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljKHtcclxuICAgICAgTWV0cmljTmFtZTogJ1N5c3RlbUNQVVVzYWdlJyxcclxuICAgICAgVmFsdWU6IGNwdVBlcmNlbnQsXHJcbiAgICAgIFVuaXQ6ICdTZWNvbmRzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG1ldHJpY3NDb3VudCsrO1xyXG5cclxuICAgIGxvZ2dlci5kZWJ1ZygnQ29sbGVjdGVkIGNhcGFjaXR5IHBsYW5uaW5nIG1ldHJpY3MnLCB7IG1ldHJpY3NDb3VudCB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gY29sbGVjdCBjYXBhY2l0eSBwbGFubmluZyBtZXRyaWNzJywgZXJyb3IgYXMgRXJyb3IpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG1ldHJpY3NDb3VudDtcclxufVxyXG5cclxuLy8gRXhwb3J0IHRoZSBoYW5kbGVyIHdpdGggY29ycmVsYXRpb24gSUQgbWlkZGxld2FyZVxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IHdpdGhDb3JyZWxhdGlvbklkKG1ldHJpY3NDb2xsZWN0b3JIYW5kbGVyKTsiXX0=
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const centralized_logger_1 = require("../../utils/centralized-logger");
const monitoring_service_1 = require("../../services/monitoring-service");
const cloudWatch = new client_cloudwatch_1.CloudWatchClient({});
const dynamodb = new client_dynamodb_1.DynamoDBClient({});
const s3 = new client_s3_1.S3Client({});
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
            const describeResult = await dynamodb.send(new client_dynamodb_1.DescribeTableCommand({
                TableName: tableName,
            }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljcy1jb2xsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtZXRyaWNzLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxrRUFBOEQ7QUFDOUQsOERBQWdGO0FBQ2hGLGtEQUE4QztBQUM5Qyx1RUFBc0Y7QUFDdEYsMEVBQXNFO0FBRXRFLE1BQU0sVUFBVSxHQUFHLElBQUksb0NBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sRUFBRSxHQUFHLElBQUksb0JBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQVM1Qjs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsS0FBSyxVQUFVLHVCQUF1QixDQUNwQyxLQUE0QyxFQUM1QyxPQUFnQjtJQUVoQixNQUFNLE1BQU0sR0FBRyxzQ0FBaUIsQ0FBQyxXQUFXLENBQUM7UUFDM0MsYUFBYSxFQUFFLFNBQVMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1FBQ25GLFNBQVMsRUFBRSxPQUFPLENBQUMsWUFBWTtRQUMvQixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7S0FDbkMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzdCLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUM1QixJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQztJQUV6QixJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFO1lBQ3hDLFNBQVMsRUFBRSxRQUFRLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUs7WUFDbEQsWUFBWSxFQUFFLE9BQU8sQ0FBQyxZQUFZO1NB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QUM7SUFFRCxPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDO0FBRUQsb0RBQW9EO0FBQ3ZDLFFBQUEsT0FBTyxHQUFHLElBQUEsc0NBQWlCLEVBQUMsdUJBQXVCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQsIENvbnRleHQsIFNjaGVkdWxlZEV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IENsb3VkV2F0Y2hDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtY2xvdWR3YXRjaCc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBEZXNjcmliZVRhYmxlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IFMzQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcclxuaW1wb3J0IHsgQ2VudHJhbGl6ZWRMb2dnZXIsIHdpdGhDb3JyZWxhdGlvbklkIH0gZnJvbSAnLi4vLi4vdXRpbHMvY2VudHJhbGl6ZWQtbG9nZ2VyJztcclxuaW1wb3J0IHsgbW9uaXRvcmluZ1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9tb25pdG9yaW5nLXNlcnZpY2UnO1xyXG5cclxuY29uc3QgY2xvdWRXYXRjaCA9IG5ldyBDbG91ZFdhdGNoQ2xpZW50KHt9KTtcclxuY29uc3QgZHluYW1vZGIgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xyXG5jb25zdCBzMyA9IG5ldyBTM0NsaWVudCh7fSk7XHJcblxyXG5pbnRlcmZhY2UgTWV0cmljc0NvbGxlY3Rpb25SZXN1bHQge1xyXG4gIHRpbWVzdGFtcDogc3RyaW5nO1xyXG4gIG1ldHJpY3NDb2xsZWN0ZWQ6IG51bWJlcjtcclxuICBlcnJvcnM6IHN0cmluZ1tdO1xyXG4gIGR1cmF0aW9uOiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNZXRyaWNzIENvbGxlY3RvciBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIENvbGxlY3RzIGFuZCBhZ2dyZWdhdGVzIGN1c3RvbSBtZXRyaWNzIGZyb20gdmFyaW91cyBzb3VyY2VzOlxyXG4gKiAtIER5bmFtb0RCIHRhYmxlIHN0YXRpc3RpY3NcclxuICogLSBTMyBidWNrZXQgdXNhZ2UgbWV0cmljc1xyXG4gKiAtIEFwcGxpY2F0aW9uLXNwZWNpZmljIGJ1c2luZXNzIG1ldHJpY3NcclxuICogLSBQZXJmb3JtYW5jZSBhbmQgY2FwYWNpdHkgcGxhbm5pbmcgbWV0cmljc1xyXG4gKiBcclxuICogQ2FuIGJlIHRyaWdnZXJlZCBieTpcclxuICogLSBDbG91ZFdhdGNoIEV2ZW50cyAoc2NoZWR1bGVkKVxyXG4gKiAtIEFQSSBHYXRld2F5IChtYW51YWwgdHJpZ2dlcilcclxuICogLSBTTlMgbm90aWZpY2F0aW9uc1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gbWV0cmljc0NvbGxlY3RvckhhbmRsZXIoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50IHwgU2NoZWR1bGVkRXZlbnQsXHJcbiAgY29udGV4dDogQ29udGV4dFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdCB8IHZvaWQ+IHtcclxuICBjb25zdCBsb2dnZXIgPSBDZW50cmFsaXplZExvZ2dlci5nZXRJbnN0YW5jZSh7XHJcbiAgICBjb3JyZWxhdGlvbklkOiAnaGVhZGVycycgaW4gZXZlbnQgPyBldmVudC5oZWFkZXJzPy5bJ3gtY29ycmVsYXRpb24taWQnXSA6IHVuZGVmaW5lZCxcclxuICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgICBmdW5jdGlvbk5hbWU6IGNvbnRleHQuZnVuY3Rpb25OYW1lLFxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcclxuICBsZXQgbWV0cmljc0NvbGxlY3RlZCA9IDA7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBsb2dnZXIuaW5mbygnTWV0cmljcyBjb2xsZWN0aW9uIHN0YXJ0ZWQnLCB7XHJcbiAgICAgIGV2ZW50VHlwZTogJ3NvdXJjZScgaW4gZXZlbnQgPyAnc2NoZWR1bGVkJyA6ICdhcGknLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6IGNvbnRleHQuZnVuY3Rpb25OYW1lLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29sbGVjdCBEeW5hbW9EQiBtZXRyaWNzXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBkeW5hbW9NZXRyaWNzID0gYXdhaXQgY29sbGVjdER5bmFtb0RCTWV0cmljcyhsb2dnZXIpO1xyXG4gICAgICBtZXRyaWNzQ29sbGVjdGVkICs9IGR5bmFtb01ldHJpY3M7XHJcbiAgICAgIGxvZ2dlci5pbmZvKGBDb2xsZWN0ZWQgJHtkeW5hbW9NZXRyaWNzfSBEeW5hbW9EQiBtZXRyaWNzYCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBlcnJvck1zZyA9IGBEeW5hbW9EQiBtZXRyaWNzIGNvbGxlY3Rpb24gZmFpbGVkOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gO1xyXG4gICAgICBlcnJvcnMucHVzaChlcnJvck1zZyk7XHJcbiAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1zZywgZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbGxlY3QgUzMgbWV0cmljc1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgczNNZXRyaWNzID0gYXdhaXQgY29sbGVjdFMzTWV0cmljcyhsb2dnZXIpO1xyXG4gICAgICBtZXRyaWNzQ29sbGVjdGVkICs9IHMzTWV0cmljcztcclxuICAgICAgbG9nZ2VyLmluZm8oYENvbGxlY3RlZCAke3MzTWV0cmljc30gUzMgbWV0cmljc2ApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZXJyb3JNc2cgPSBgUzMgbWV0cmljcyBjb2xsZWN0aW9uIGZhaWxlZDogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YDtcclxuICAgICAgZXJyb3JzLnB1c2goZXJyb3JNc2cpO1xyXG4gICAgICBsb2dnZXIuZXJyb3IoZXJyb3JNc2csIGVycm9yIGFzIEVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb2xsZWN0IGJ1c2luZXNzIG1ldHJpY3NcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGJ1c2luZXNzTWV0cmljcyA9IGF3YWl0IGNvbGxlY3RCdXNpbmVzc01ldHJpY3MobG9nZ2VyKTtcclxuICAgICAgbWV0cmljc0NvbGxlY3RlZCArPSBidXNpbmVzc01ldHJpY3M7XHJcbiAgICAgIGxvZ2dlci5pbmZvKGBDb2xsZWN0ZWQgJHtidXNpbmVzc01ldHJpY3N9IGJ1c2luZXNzIG1ldHJpY3NgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gYEJ1c2luZXNzIG1ldHJpY3MgY29sbGVjdGlvbiBmYWlsZWQ6ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWA7XHJcbiAgICAgIGVycm9ycy5wdXNoKGVycm9yTXNnKTtcclxuICAgICAgbG9nZ2VyLmVycm9yKGVycm9yTXNnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29sbGVjdCBjYXBhY2l0eSBwbGFubmluZyBtZXRyaWNzXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjYXBhY2l0eU1ldHJpY3MgPSBhd2FpdCBjb2xsZWN0Q2FwYWNpdHlQbGFubmluZ01ldHJpY3MobG9nZ2VyKTtcclxuICAgICAgbWV0cmljc0NvbGxlY3RlZCArPSBjYXBhY2l0eU1ldHJpY3M7XHJcbiAgICAgIGxvZ2dlci5pbmZvKGBDb2xsZWN0ZWQgJHtjYXBhY2l0eU1ldHJpY3N9IGNhcGFjaXR5IHBsYW5uaW5nIG1ldHJpY3NgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gYENhcGFjaXR5IHBsYW5uaW5nIG1ldHJpY3MgY29sbGVjdGlvbiBmYWlsZWQ6ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWA7XHJcbiAgICAgIGVycm9ycy5wdXNoKGVycm9yTXNnKTtcclxuICAgICAgbG9nZ2VyLmVycm9yKGVycm9yTXNnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgY29uc3QgcmVzdWx0OiBNZXRyaWNzQ29sbGVjdGlvblJlc3VsdCA9IHtcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIG1ldHJpY3NDb2xsZWN0ZWQsXHJcbiAgICAgIGVycm9ycyxcclxuICAgICAgZHVyYXRpb24sXHJcbiAgICB9O1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdNZXRyaWNzIGNvbGxlY3Rpb24gY29tcGxldGVkJywgcmVzdWx0KTtcclxuXHJcbiAgICAvLyBSZWNvcmQgY29sbGVjdGlvbiBtZXRyaWNzXHJcbiAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5yZWNvcmRQZXJmb3JtYW5jZU1ldHJpYyh7XHJcbiAgICAgIG9wZXJhdGlvbjogJ21ldHJpY3NfY29sbGVjdGlvbicsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICBzdWNjZXNzOiBlcnJvcnMubGVuZ3RoID09PSAwLFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIG1ldHJpY3NDb2xsZWN0ZWQsXHJcbiAgICAgICAgZXJyb3JDb3VudDogZXJyb3JzLmxlbmd0aCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIElmIGNhbGxlZCB2aWEgQVBJIEdhdGV3YXksIHJldHVybiByZXNwb25zZVxyXG4gICAgaWYgKCdodHRwTWV0aG9kJyBpbiBldmVudCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IGVycm9ycy5sZW5ndGggPT09IDAgPyAyMDAgOiAyMDcsIC8vIDIwNyA9IE11bHRpLVN0YXR1cyAocGFydGlhbCBzdWNjZXNzKVxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnWC1Db3JyZWxhdGlvbi1JRCc6IGxvZ2dlci5nZXRDb3JyZWxhdGlvbklkKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXN1bHQsIG51bGwsIDIpLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZvciBzY2hlZHVsZWQgZXZlbnRzLCBubyByZXR1cm4gdmFsdWUgbmVlZGVkXHJcbiAgICByZXR1cm47XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgIGxvZ2dlci5lcnJvcignTWV0cmljcyBjb2xsZWN0aW9uIGZhaWxlZCcsIGVycm9yIGFzIEVycm9yLCB7IGR1cmF0aW9uIH0pO1xyXG5cclxuICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZFBlcmZvcm1hbmNlTWV0cmljKHtcclxuICAgICAgb3BlcmF0aW9uOiAnbWV0cmljc19jb2xsZWN0aW9uJyxcclxuICAgICAgZHVyYXRpb24sXHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICBlcnJvclR5cGU6IChlcnJvciBhcyBFcnJvcikubmFtZSxcclxuICAgIH0pO1xyXG5cclxuICAgIGlmICgnaHR0cE1ldGhvZCcgaW4gZXZlbnQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdYLUNvcnJlbGF0aW9uLUlEJzogbG9nZ2VyLmdldENvcnJlbGF0aW9uSWQoKSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnTWV0cmljcyBjb2xsZWN0aW9uIGZhaWxlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb2xsZWN0IER5bmFtb0RCIHRhYmxlIG1ldHJpY3NcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNvbGxlY3REeW5hbW9EQk1ldHJpY3MobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgY29uc3QgdGFibGVzID0gW1xyXG4gICAgcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEVfTkFNRSxcclxuICAgIHByb2Nlc3MuZW52LlBST0pFQ1RTX1RBQkxFX05BTUUsXHJcbiAgICBwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFX05BTUUsXHJcbiAgICBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFX05BTUUsXHJcbiAgICBwcm9jZXNzLmVudi5TQU1QTEVfRklMRVNfVEFCTEVfTkFNRSxcclxuICBdLmZpbHRlcihCb29sZWFuKSBhcyBzdHJpbmdbXTtcclxuXHJcbiAgbGV0IG1ldHJpY3NDb3VudCA9IDA7XHJcblxyXG4gIGZvciAoY29uc3QgdGFibGVOYW1lIG9mIHRhYmxlcykge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gR2V0IHRhYmxlIGl0ZW0gY291bnRcclxuICAgICAgY29uc3Qgc2NhblJlc3VsdCA9IGF3YWl0IGR5bmFtb2RiLnNjYW4oe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxyXG4gICAgICAgIFNlbGVjdDogJ0NPVU5UJyxcclxuICAgICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucHVibGlzaE1ldHJpYyh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1RhYmxlSXRlbUNvdW50JyxcclxuICAgICAgICBWYWx1ZTogc2NhblJlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnVGFibGVOYW1lJywgVmFsdWU6IHRhYmxlTmFtZSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbWV0cmljc0NvdW50Kys7XHJcblxyXG4gICAgICAvLyBHZXQgdGFibGUgc2l6ZSAoYXBwcm94aW1hdGUpXHJcbiAgICAgIGNvbnN0IGRlc2NyaWJlUmVzdWx0ID0gYXdhaXQgZHluYW1vZGIuc2VuZChuZXcgRGVzY3JpYmVUYWJsZUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoZGVzY3JpYmVSZXN1bHQuVGFibGU/LlRhYmxlU2l6ZUJ5dGVzKSB7XHJcbiAgICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucHVibGlzaE1ldHJpYyh7XHJcbiAgICAgICAgICBNZXRyaWNOYW1lOiAnVGFibGVTaXplQnl0ZXMnLFxyXG4gICAgICAgICAgVmFsdWU6IGRlc2NyaWJlUmVzdWx0LlRhYmxlLlRhYmxlU2l6ZUJ5dGVzLFxyXG4gICAgICAgICAgVW5pdDogJ0J5dGVzJyxcclxuICAgICAgICAgIERpbWVuc2lvbnM6IFtcclxuICAgICAgICAgICAgeyBOYW1lOiAnVGFibGVOYW1lJywgVmFsdWU6IHRhYmxlTmFtZSB9LFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbWV0cmljc0NvdW50Kys7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxvZ2dlci5kZWJ1ZyhgQ29sbGVjdGVkIG1ldHJpY3MgZm9yIHRhYmxlOiAke3RhYmxlTmFtZX1gLCB7XHJcbiAgICAgICAgaXRlbUNvdW50OiBzY2FuUmVzdWx0LkNvdW50LFxyXG4gICAgICAgIHNpemVCeXRlczogZGVzY3JpYmVSZXN1bHQuVGFibGU/LlRhYmxlU2l6ZUJ5dGVzLFxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGNvbGxlY3QgbWV0cmljcyBmb3IgdGFibGU6ICR7dGFibGVOYW1lfWAsIGVycm9yIGFzIEVycm9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBtZXRyaWNzQ291bnQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb2xsZWN0IFMzIGJ1Y2tldCBtZXRyaWNzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjb2xsZWN0UzNNZXRyaWNzKGxvZ2dlcjogQ2VudHJhbGl6ZWRMb2dnZXIpOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gIGNvbnN0IGJ1Y2tldE5hbWUgPSBwcm9jZXNzLmVudi5GSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU7XHJcbiAgaWYgKCFidWNrZXROYW1lKSB7XHJcbiAgICBsb2dnZXIud2FybignRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIG5vdCBjb25maWd1cmVkLCBza2lwcGluZyBTMyBtZXRyaWNzJyk7XHJcbiAgICByZXR1cm4gMDtcclxuICB9XHJcblxyXG4gIGxldCBtZXRyaWNzQ291bnQgPSAwO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR2V0IGJ1Y2tldCBvYmplY3QgY291bnQgYW5kIHRvdGFsIHNpemVcclxuICAgIGNvbnN0IGxpc3RSZXN1bHQgPSBhd2FpdCBzMy5saXN0T2JqZWN0c1YyKHtcclxuICAgICAgQnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgIGNvbnN0IG9iamVjdENvdW50ID0gbGlzdFJlc3VsdC5LZXlDb3VudCB8fCAwO1xyXG4gICAgY29uc3QgdG90YWxTaXplID0gbGlzdFJlc3VsdC5Db250ZW50cz8ucmVkdWNlKChzdW0sIG9iaikgPT4gc3VtICsgKG9iai5TaXplIHx8IDApLCAwKSB8fCAwO1xyXG5cclxuICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWNzKFtcclxuICAgICAge1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdCdWNrZXRPYmplY3RDb3VudCcsXHJcbiAgICAgICAgVmFsdWU6IG9iamVjdENvdW50LFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnQnVja2V0TmFtZScsIFZhbHVlOiBidWNrZXROYW1lIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdCdWNrZXRUb3RhbFNpemUnLFxyXG4gICAgICAgIFZhbHVlOiB0b3RhbFNpemUsXHJcbiAgICAgICAgVW5pdDogJ0J5dGVzJyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdCdWNrZXROYW1lJywgVmFsdWU6IGJ1Y2tldE5hbWUgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgXSk7XHJcblxyXG4gICAgbWV0cmljc0NvdW50ICs9IDI7XHJcblxyXG4gICAgLy8gQ29sbGVjdCBmaWxlIHR5cGUgZGlzdHJpYnV0aW9uXHJcbiAgICBjb25zdCBmaWxlVHlwZXM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICAgIGxpc3RSZXN1bHQuQ29udGVudHM/LmZvckVhY2gob2JqID0+IHtcclxuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gb2JqLktleT8uc3BsaXQoJy4nKS5wb3AoKT8udG9Mb3dlckNhc2UoKSB8fCAndW5rbm93bic7XHJcbiAgICAgIGZpbGVUeXBlc1tleHRlbnNpb25dID0gKGZpbGVUeXBlc1tleHRlbnNpb25dIHx8IDApICsgMTtcclxuICAgIH0pO1xyXG5cclxuICAgIGZvciAoY29uc3QgW2ZpbGVUeXBlLCBjb3VudF0gb2YgT2JqZWN0LmVudHJpZXMoZmlsZVR5cGVzKSkge1xyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljKHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnRmlsZVR5cGVDb3VudCcsXHJcbiAgICAgICAgVmFsdWU6IGNvdW50LFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnQnVja2V0TmFtZScsIFZhbHVlOiBidWNrZXROYW1lIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdGaWxlVHlwZScsIFZhbHVlOiBmaWxlVHlwZSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pO1xyXG4gICAgICBtZXRyaWNzQ291bnQrKztcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuZGVidWcoJ0NvbGxlY3RlZCBTMyBtZXRyaWNzJywge1xyXG4gICAgICBidWNrZXROYW1lLFxyXG4gICAgICBvYmplY3RDb3VudCxcclxuICAgICAgdG90YWxTaXplLFxyXG4gICAgICBmaWxlVHlwZXMsXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gY29sbGVjdCBTMyBtZXRyaWNzIGZvciBidWNrZXQ6ICR7YnVja2V0TmFtZX1gLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWV0cmljc0NvdW50O1xyXG59XHJcblxyXG4vKipcclxuICogQ29sbGVjdCBidXNpbmVzcyBtZXRyaWNzIGZyb20gZGF0YWJhc2VcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RCdXNpbmVzc01ldHJpY3MobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgbGV0IG1ldHJpY3NDb3VudCA9IDA7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBDb2xsZWN0IHVzZXIgbWV0cmljc1xyXG4gICAgaWYgKHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFX05BTUUpIHtcclxuICAgICAgY29uc3QgdXNlcnNSZXN1bHQgPSBhd2FpdCBkeW5hbW9kYi5zY2FuKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFX05BTUUsXHJcbiAgICAgICAgU2VsZWN0OiAnQ09VTlQnLFxyXG4gICAgICB9KS5wcm9taXNlKCk7XHJcblxyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljKHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnVG90YWxVc2VycycsXHJcbiAgICAgICAgVmFsdWU6IHVzZXJzUmVzdWx0LkNvdW50IHx8IDAsXHJcbiAgICAgICAgVW5pdDogJ0NvdW50JyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBtZXRyaWNzQ291bnQrKztcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb2xsZWN0IHByb2plY3QgbWV0cmljc1xyXG4gICAgaWYgKHByb2Nlc3MuZW52LlBST0pFQ1RTX1RBQkxFX05BTUUpIHtcclxuICAgICAgY29uc3QgcHJvamVjdHNSZXN1bHQgPSBhd2FpdCBkeW5hbW9kYi5zY2FuKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LlBST0pFQ1RTX1RBQkxFX05BTUUsXHJcbiAgICAgICAgU2VsZWN0OiAnQ09VTlQnLFxyXG4gICAgICB9KS5wcm9taXNlKCk7XHJcblxyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljKHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnVG90YWxQcm9qZWN0cycsXHJcbiAgICAgICAgVmFsdWU6IHByb2plY3RzUmVzdWx0LkNvdW50IHx8IDAsXHJcbiAgICAgICAgVW5pdDogJ0NvdW50JyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBtZXRyaWNzQ291bnQrKztcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb2xsZWN0IGFuYWx5c2lzIG1ldHJpY3NcclxuICAgIGlmIChwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFX05BTUUpIHtcclxuICAgICAgY29uc3QgYW5hbHlzaXNSZXN1bHQgPSBhd2FpdCBkeW5hbW9kYi5zY2FuKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEVfTkFNRSxcclxuICAgICAgICBTZWxlY3Q6ICdDT1VOVCcsXHJcbiAgICAgIH0pLnByb21pc2UoKTtcclxuXHJcbiAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWMoe1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdUb3RhbEFuYWx5c2VzJyxcclxuICAgICAgICBWYWx1ZTogYW5hbHlzaXNSZXN1bHQuQ291bnQgfHwgMCxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG1ldHJpY3NDb3VudCsrO1xyXG5cclxuICAgICAgLy8gR2V0IHJlY2VudCBhbmFseXNpcyBzdWNjZXNzIHJhdGUgKGxhc3QgMjQgaG91cnMpXHJcbiAgICAgIGNvbnN0IHllc3RlcmRheSA9IERhdGUubm93KCkgLSAoMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcbiAgICAgIGNvbnN0IHJlY2VudEFuYWx5c2VzID0gYXdhaXQgZHluYW1vZGIuc2Nhbih7XHJcbiAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFX05BTUUsXHJcbiAgICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJyN0aW1lc3RhbXAgPiA6eWVzdGVyZGF5JyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICcjdGltZXN0YW1wJzogJ3RpbWVzdGFtcCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOnllc3RlcmRheSc6IHllc3RlcmRheSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KS5wcm9taXNlKCk7XHJcblxyXG4gICAgICBjb25zdCB0b3RhbFJlY2VudCA9IHJlY2VudEFuYWx5c2VzLkNvdW50IHx8IDA7XHJcbiAgICAgIGNvbnN0IHN1Y2Nlc3NmdWxSZWNlbnQgPSByZWNlbnRBbmFseXNlcy5JdGVtcz8uZmlsdGVyKGl0ZW0gPT4gaXRlbS5zdGF0dXMgPT09ICdDT01QTEVURUQnKS5sZW5ndGggfHwgMDtcclxuICAgICAgY29uc3Qgc3VjY2Vzc1JhdGUgPSB0b3RhbFJlY2VudCA+IDAgPyAoc3VjY2Vzc2Z1bFJlY2VudCAvIHRvdGFsUmVjZW50KSAqIDEwMCA6IDEwMDtcclxuXHJcbiAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWMoe1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdBbmFseXNpc1N1Y2Nlc3NSYXRlMjRoJyxcclxuICAgICAgICBWYWx1ZTogc3VjY2Vzc1JhdGUsXHJcbiAgICAgICAgVW5pdDogJ1BlcmNlbnQnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG1ldHJpY3NDb3VudCsrO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbGxlY3QgZmlsZSB1cGxvYWQgbWV0cmljc1xyXG4gICAgaWYgKHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEVfTkFNRSkge1xyXG4gICAgICBjb25zdCBmaWxlc1Jlc3VsdCA9IGF3YWl0IGR5bmFtb2RiLnNjYW4oe1xyXG4gICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FLFxyXG4gICAgICAgIFNlbGVjdDogJ0NPVU5UJyxcclxuICAgICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucHVibGlzaE1ldHJpYyh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1RvdGFsRmlsZXMnLFxyXG4gICAgICAgIFZhbHVlOiBmaWxlc1Jlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbWV0cmljc0NvdW50Kys7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmRlYnVnKCdDb2xsZWN0ZWQgYnVzaW5lc3MgbWV0cmljcycsIHsgbWV0cmljc0NvdW50IH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjb2xsZWN0IGJ1c2luZXNzIG1ldHJpY3MnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWV0cmljc0NvdW50O1xyXG59XHJcblxyXG4vKipcclxuICogQ29sbGVjdCBjYXBhY2l0eSBwbGFubmluZyBtZXRyaWNzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjb2xsZWN0Q2FwYWNpdHlQbGFubmluZ01ldHJpY3MobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgbGV0IG1ldHJpY3NDb3VudCA9IDA7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gbWV0cmljc1xyXG4gICAgY29uc3QgZnVuY3Rpb25OYW1lID0gcHJvY2Vzcy5lbnYuQVdTX0xBTUJEQV9GVU5DVElPTl9OQU1FO1xyXG4gICAgaWYgKGZ1bmN0aW9uTmFtZSkge1xyXG4gICAgICBjb25zdCBtZW1vcnlVc2FnZSA9IHByb2Nlc3MubWVtb3J5VXNhZ2UoKTtcclxuICAgICAgY29uc3QgbWVtb3J5VXNlZE1CID0gbWVtb3J5VXNhZ2UuaGVhcFVzZWQgLyAxMDI0IC8gMTAyNDtcclxuICAgICAgY29uc3QgbWVtb3J5TGltaXRNQiA9IHBhcnNlSW50KHByb2Nlc3MuZW52LkFXU19MQU1CREFfRlVOQ1RJT05fTUVNT1JZX1NJWkUgfHwgJzUxMicpO1xyXG4gICAgICBjb25zdCBtZW1vcnlVdGlsaXphdGlvbiA9IChtZW1vcnlVc2VkTUIgLyBtZW1vcnlMaW1pdE1CKSAqIDEwMDtcclxuXHJcbiAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWNzKFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBNZXRyaWNOYW1lOiAnTGFtYmRhTWVtb3J5VXRpbGl6YXRpb24nLFxyXG4gICAgICAgICAgVmFsdWU6IG1lbW9yeVV0aWxpemF0aW9uLFxyXG4gICAgICAgICAgVW5pdDogJ1BlcmNlbnQnLFxyXG4gICAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgICB7IE5hbWU6ICdGdW5jdGlvbk5hbWUnLCBWYWx1ZTogZnVuY3Rpb25OYW1lIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogJ0xhbWJkYU1lbW9yeVVzZWQnLFxyXG4gICAgICAgICAgVmFsdWU6IG1lbW9yeVVzZWRNQixcclxuICAgICAgICAgIFVuaXQ6ICdNZWdhYnl0ZXMnLFxyXG4gICAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgICB7IE5hbWU6ICdGdW5jdGlvbk5hbWUnLCBWYWx1ZTogZnVuY3Rpb25OYW1lIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0pO1xyXG5cclxuICAgICAgbWV0cmljc0NvdW50ICs9IDI7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3lzdGVtIHJlc291cmNlIG1ldHJpY3NcclxuICAgIGNvbnN0IGNwdVVzYWdlID0gcHJvY2Vzcy5jcHVVc2FnZSgpO1xyXG4gICAgY29uc3QgY3B1UGVyY2VudCA9IChjcHVVc2FnZS51c2VyICsgY3B1VXNhZ2Uuc3lzdGVtKSAvIDEwMDAwMDA7IC8vIENvbnZlcnQgdG8gc2Vjb25kc1xyXG5cclxuICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWMoe1xyXG4gICAgICBNZXRyaWNOYW1lOiAnU3lzdGVtQ1BVVXNhZ2UnLFxyXG4gICAgICBWYWx1ZTogY3B1UGVyY2VudCxcclxuICAgICAgVW5pdDogJ1NlY29uZHMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbWV0cmljc0NvdW50Kys7XHJcblxyXG4gICAgbG9nZ2VyLmRlYnVnKCdDb2xsZWN0ZWQgY2FwYWNpdHkgcGxhbm5pbmcgbWV0cmljcycsIHsgbWV0cmljc0NvdW50IH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjb2xsZWN0IGNhcGFjaXR5IHBsYW5uaW5nIG1ldHJpY3MnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWV0cmljc0NvdW50O1xyXG59XHJcblxyXG4vLyBFeHBvcnQgdGhlIGhhbmRsZXIgd2l0aCBjb3JyZWxhdGlvbiBJRCBtaWRkbGV3YXJlXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gd2l0aENvcnJlbGF0aW9uSWQobWV0cmljc0NvbGxlY3RvckhhbmRsZXIpOyJdfQ==
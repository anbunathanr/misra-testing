"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const centralized_logger_1 = require("../../utils/centralized-logger");
const monitoring_service_1 = require("../../services/monitoring-service");
const cloudWatch = new client_cloudwatch_1.CloudWatchClient({});
const dynamodbClient = new client_dynamodb_1.DynamoDBClient({});
const dynamodb = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamodbClient);
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
            const scanResult = await dynamodb.send(new lib_dynamodb_1.ScanCommand({
                TableName: tableName,
                Select: 'COUNT',
            }));
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
            const describeResult = await dynamodbClient.send(new client_dynamodb_1.DescribeTableCommand({
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
        const listResult = await s3.send(new client_s3_1.ListObjectsV2Command({
            Bucket: bucketName,
        }));
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
            const usersResult = await dynamodb.send(new lib_dynamodb_1.ScanCommand({
                TableName: process.env.USERS_TABLE_NAME,
                Select: 'COUNT',
            }));
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'TotalUsers',
                Value: usersResult.Count || 0,
                Unit: 'Count',
            });
            metricsCount++;
        }
        // Collect project metrics
        if (process.env.PROJECTS_TABLE_NAME) {
            const projectsResult = await dynamodb.send(new lib_dynamodb_1.ScanCommand({
                TableName: process.env.PROJECTS_TABLE_NAME,
                Select: 'COUNT',
            }));
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'TotalProjects',
                Value: projectsResult.Count || 0,
                Unit: 'Count',
            });
            metricsCount++;
        }
        // Collect analysis metrics
        if (process.env.ANALYSIS_RESULTS_TABLE_NAME) {
            const analysisResult = await dynamodb.send(new lib_dynamodb_1.ScanCommand({
                TableName: process.env.ANALYSIS_RESULTS_TABLE_NAME,
                Select: 'COUNT',
            }));
            await monitoring_service_1.monitoringService.publishMetric({
                MetricName: 'TotalAnalyses',
                Value: analysisResult.Count || 0,
                Unit: 'Count',
            });
            metricsCount++;
            // Get recent analysis success rate (last 24 hours)
            const yesterday = Date.now() - (24 * 60 * 60 * 1000);
            const recentAnalyses = await dynamodb.send(new lib_dynamodb_1.ScanCommand({
                TableName: process.env.ANALYSIS_RESULTS_TABLE_NAME,
                FilterExpression: '#timestamp > :yesterday',
                ExpressionAttributeNames: {
                    '#timestamp': 'timestamp',
                },
                ExpressionAttributeValues: {
                    ':yesterday': yesterday,
                },
            }));
            const totalRecent = recentAnalyses.Count || 0;
            const successfulRecent = recentAnalyses.Items?.filter((item) => item.status === 'COMPLETED').length || 0;
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
            const filesResult = await dynamodb.send(new lib_dynamodb_1.ScanCommand({
                TableName: process.env.FILE_METADATA_TABLE_NAME,
                Select: 'COUNT',
            }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0cmljcy1jb2xsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtZXRyaWNzLWNvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxrRUFBOEQ7QUFDOUQsOERBQWdGO0FBQ2hGLHdEQUE0RTtBQUM1RSxrREFBb0U7QUFDcEUsdUVBQXNGO0FBQ3RGLDBFQUFzRTtBQUV0RSxNQUFNLFVBQVUsR0FBRyxJQUFJLG9DQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sY0FBYyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM5QyxNQUFNLFFBQVEsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0QsTUFBTSxFQUFFLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBUzVCOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxLQUFLLFVBQVUsdUJBQXVCLENBQ3BDLEtBQTRDLEVBQzVDLE9BQWdCO0lBRWhCLE1BQU0sTUFBTSxHQUFHLHNDQUFpQixDQUFDLFdBQVcsQ0FBQztRQUMzQyxhQUFhLEVBQUUsU0FBUyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7UUFDbkYsU0FBUyxFQUFFLE9BQU8sQ0FBQyxZQUFZO1FBQy9CLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtLQUNuQyxDQUFDLENBQUM7SUFFSCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDN0IsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO0lBQzVCLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO0lBRXpCLElBQUksQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUU7WUFDeEMsU0FBUyxFQUFFLFFBQVEsSUFBSSxLQUFLLENB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QUUsWUFBWSxFQUFFLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsS0FBYyxDQUFDLENBQUM7SUFDOUUsQ0FBQztJQUVELE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUM7QUFFRCxvREFBb0Q7QUFDdkMsUUFBQSxPQUFPLEdBQUcsSUFBQSxzQ0FBaUIsRUFBQyx1QkFBdUIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCwgQ29udGV4dCwgU2NoZWR1bGVkRXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ2xvdWRXYXRjaENsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jbG91ZHdhdGNoJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIERlc2NyaWJlVGFibGVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgU2NhbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBTM0NsaWVudCwgTGlzdE9iamVjdHNWMkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyBDZW50cmFsaXplZExvZ2dlciwgd2l0aENvcnJlbGF0aW9uSWQgfSBmcm9tICcuLi8uLi91dGlscy9jZW50cmFsaXplZC1sb2dnZXInO1xyXG5pbXBvcnQgeyBtb25pdG9yaW5nU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21vbml0b3Jpbmctc2VydmljZSc7XHJcblxyXG5jb25zdCBjbG91ZFdhdGNoID0gbmV3IENsb3VkV2F0Y2hDbGllbnQoe30pO1xyXG5jb25zdCBkeW5hbW9kYkNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XHJcbmNvbnN0IGR5bmFtb2RiID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGR5bmFtb2RiQ2xpZW50KTtcclxuY29uc3QgczMgPSBuZXcgUzNDbGllbnQoe30pO1xyXG5cclxuaW50ZXJmYWNlIE1ldHJpY3NDb2xsZWN0aW9uUmVzdWx0IHtcclxuICB0aW1lc3RhbXA6IHN0cmluZztcclxuICBtZXRyaWNzQ29sbGVjdGVkOiBudW1iZXI7XHJcbiAgZXJyb3JzOiBzdHJpbmdbXTtcclxuICBkdXJhdGlvbjogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogTWV0cmljcyBDb2xsZWN0b3IgTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIFxyXG4gKiBDb2xsZWN0cyBhbmQgYWdncmVnYXRlcyBjdXN0b20gbWV0cmljcyBmcm9tIHZhcmlvdXMgc291cmNlczpcclxuICogLSBEeW5hbW9EQiB0YWJsZSBzdGF0aXN0aWNzXHJcbiAqIC0gUzMgYnVja2V0IHVzYWdlIG1ldHJpY3NcclxuICogLSBBcHBsaWNhdGlvbi1zcGVjaWZpYyBidXNpbmVzcyBtZXRyaWNzXHJcbiAqIC0gUGVyZm9ybWFuY2UgYW5kIGNhcGFjaXR5IHBsYW5uaW5nIG1ldHJpY3NcclxuICogXHJcbiAqIENhbiBiZSB0cmlnZ2VyZWQgYnk6XHJcbiAqIC0gQ2xvdWRXYXRjaCBFdmVudHMgKHNjaGVkdWxlZClcclxuICogLSBBUEkgR2F0ZXdheSAobWFudWFsIHRyaWdnZXIpXHJcbiAqIC0gU05TIG5vdGlmaWNhdGlvbnNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIG1ldHJpY3NDb2xsZWN0b3JIYW5kbGVyKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCB8IFNjaGVkdWxlZEV2ZW50LFxyXG4gIGNvbnRleHQ6IENvbnRleHRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQgfCB2b2lkPiB7XHJcbiAgY29uc3QgbG9nZ2VyID0gQ2VudHJhbGl6ZWRMb2dnZXIuZ2V0SW5zdGFuY2Uoe1xyXG4gICAgY29ycmVsYXRpb25JZDogJ2hlYWRlcnMnIGluIGV2ZW50ID8gZXZlbnQuaGVhZGVycz8uWyd4LWNvcnJlbGF0aW9uLWlkJ10gOiB1bmRlZmluZWQsXHJcbiAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICB9KTtcclxuXHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcbiAgbGV0IG1ldHJpY3NDb2xsZWN0ZWQgPSAwO1xyXG5cclxuICB0cnkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ01ldHJpY3MgY29sbGVjdGlvbiBzdGFydGVkJywge1xyXG4gICAgICBldmVudFR5cGU6ICdzb3VyY2UnIGluIGV2ZW50ID8gJ3NjaGVkdWxlZCcgOiAnYXBpJyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENvbGxlY3QgRHluYW1vREIgbWV0cmljc1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZHluYW1vTWV0cmljcyA9IGF3YWl0IGNvbGxlY3REeW5hbW9EQk1ldHJpY3MobG9nZ2VyKTtcclxuICAgICAgbWV0cmljc0NvbGxlY3RlZCArPSBkeW5hbW9NZXRyaWNzO1xyXG4gICAgICBsb2dnZXIuaW5mbyhgQ29sbGVjdGVkICR7ZHluYW1vTWV0cmljc30gRHluYW1vREIgbWV0cmljc2ApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZXJyb3JNc2cgPSBgRHluYW1vREIgbWV0cmljcyBjb2xsZWN0aW9uIGZhaWxlZDogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YDtcclxuICAgICAgZXJyb3JzLnB1c2goZXJyb3JNc2cpO1xyXG4gICAgICBsb2dnZXIuZXJyb3IoZXJyb3JNc2csIGVycm9yIGFzIEVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb2xsZWN0IFMzIG1ldHJpY3NcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHMzTWV0cmljcyA9IGF3YWl0IGNvbGxlY3RTM01ldHJpY3MobG9nZ2VyKTtcclxuICAgICAgbWV0cmljc0NvbGxlY3RlZCArPSBzM01ldHJpY3M7XHJcbiAgICAgIGxvZ2dlci5pbmZvKGBDb2xsZWN0ZWQgJHtzM01ldHJpY3N9IFMzIG1ldHJpY3NgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gYFMzIG1ldHJpY3MgY29sbGVjdGlvbiBmYWlsZWQ6ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWA7XHJcbiAgICAgIGVycm9ycy5wdXNoKGVycm9yTXNnKTtcclxuICAgICAgbG9nZ2VyLmVycm9yKGVycm9yTXNnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29sbGVjdCBidXNpbmVzcyBtZXRyaWNzXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBidXNpbmVzc01ldHJpY3MgPSBhd2FpdCBjb2xsZWN0QnVzaW5lc3NNZXRyaWNzKGxvZ2dlcik7XHJcbiAgICAgIG1ldHJpY3NDb2xsZWN0ZWQgKz0gYnVzaW5lc3NNZXRyaWNzO1xyXG4gICAgICBsb2dnZXIuaW5mbyhgQ29sbGVjdGVkICR7YnVzaW5lc3NNZXRyaWNzfSBidXNpbmVzcyBtZXRyaWNzYCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBlcnJvck1zZyA9IGBCdXNpbmVzcyBtZXRyaWNzIGNvbGxlY3Rpb24gZmFpbGVkOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gO1xyXG4gICAgICBlcnJvcnMucHVzaChlcnJvck1zZyk7XHJcbiAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1zZywgZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbGxlY3QgY2FwYWNpdHkgcGxhbm5pbmcgbWV0cmljc1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY2FwYWNpdHlNZXRyaWNzID0gYXdhaXQgY29sbGVjdENhcGFjaXR5UGxhbm5pbmdNZXRyaWNzKGxvZ2dlcik7XHJcbiAgICAgIG1ldHJpY3NDb2xsZWN0ZWQgKz0gY2FwYWNpdHlNZXRyaWNzO1xyXG4gICAgICBsb2dnZXIuaW5mbyhgQ29sbGVjdGVkICR7Y2FwYWNpdHlNZXRyaWNzfSBjYXBhY2l0eSBwbGFubmluZyBtZXRyaWNzYCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBlcnJvck1zZyA9IGBDYXBhY2l0eSBwbGFubmluZyBtZXRyaWNzIGNvbGxlY3Rpb24gZmFpbGVkOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gO1xyXG4gICAgICBlcnJvcnMucHVzaChlcnJvck1zZyk7XHJcbiAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1zZywgZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgIGNvbnN0IHJlc3VsdDogTWV0cmljc0NvbGxlY3Rpb25SZXN1bHQgPSB7XHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBtZXRyaWNzQ29sbGVjdGVkLFxyXG4gICAgICBlcnJvcnMsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgfTtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnTWV0cmljcyBjb2xsZWN0aW9uIGNvbXBsZXRlZCcsIHJlc3VsdCk7XHJcblxyXG4gICAgLy8gUmVjb3JkIGNvbGxlY3Rpb24gbWV0cmljc1xyXG4gICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkUGVyZm9ybWFuY2VNZXRyaWMoe1xyXG4gICAgICBvcGVyYXRpb246ICdtZXRyaWNzX2NvbGxlY3Rpb24nLFxyXG4gICAgICBkdXJhdGlvbixcclxuICAgICAgc3VjY2VzczogZXJyb3JzLmxlbmd0aCA9PT0gMCxcclxuICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICBtZXRyaWNzQ29sbGVjdGVkLFxyXG4gICAgICAgIGVycm9yQ291bnQ6IGVycm9ycy5sZW5ndGgsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJZiBjYWxsZWQgdmlhIEFQSSBHYXRld2F5LCByZXR1cm4gcmVzcG9uc2VcclxuICAgIGlmICgnaHR0cE1ldGhvZCcgaW4gZXZlbnQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiBlcnJvcnMubGVuZ3RoID09PSAwID8gMjAwIDogMjA3LCAvLyAyMDcgPSBNdWx0aS1TdGF0dXMgKHBhcnRpYWwgc3VjY2VzcylcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ1gtQ29ycmVsYXRpb24tSUQnOiBsb2dnZXIuZ2V0Q29ycmVsYXRpb25JZCgpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGb3Igc2NoZWR1bGVkIGV2ZW50cywgbm8gcmV0dXJuIHZhbHVlIG5lZWRlZFxyXG4gICAgcmV0dXJuO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ01ldHJpY3MgY29sbGVjdGlvbiBmYWlsZWQnLCBlcnJvciBhcyBFcnJvciwgeyBkdXJhdGlvbiB9KTtcclxuXHJcbiAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5yZWNvcmRQZXJmb3JtYW5jZU1ldHJpYyh7XHJcbiAgICAgIG9wZXJhdGlvbjogJ21ldHJpY3NfY29sbGVjdGlvbicsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgZXJyb3JUeXBlOiAoZXJyb3IgYXMgRXJyb3IpLm5hbWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoJ2h0dHBNZXRob2QnIGluIGV2ZW50KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnWC1Db3JyZWxhdGlvbi1JRCc6IGxvZ2dlci5nZXRDb3JyZWxhdGlvbklkKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ01ldHJpY3MgY29sbGVjdGlvbiBmYWlsZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ29sbGVjdCBEeW5hbW9EQiB0YWJsZSBtZXRyaWNzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjb2xsZWN0RHluYW1vREJNZXRyaWNzKGxvZ2dlcjogQ2VudHJhbGl6ZWRMb2dnZXIpOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gIGNvbnN0IHRhYmxlcyA9IFtcclxuICAgIHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFX05BTUUsXHJcbiAgICBwcm9jZXNzLmVudi5QUk9KRUNUU19UQUJMRV9OQU1FLFxyXG4gICAgcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FLFxyXG4gICAgcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRV9OQU1FLFxyXG4gICAgcHJvY2Vzcy5lbnYuU0FNUExFX0ZJTEVTX1RBQkxFX05BTUUsXHJcbiAgXS5maWx0ZXIoQm9vbGVhbikgYXMgc3RyaW5nW107XHJcblxyXG4gIGxldCBtZXRyaWNzQ291bnQgPSAwO1xyXG5cclxuICBmb3IgKGNvbnN0IHRhYmxlTmFtZSBvZiB0YWJsZXMpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdldCB0YWJsZSBpdGVtIGNvdW50XHJcbiAgICAgIGNvbnN0IHNjYW5SZXN1bHQgPSBhd2FpdCBkeW5hbW9kYi5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWUsXHJcbiAgICAgICAgU2VsZWN0OiAnQ09VTlQnLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljKHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnVGFibGVJdGVtQ291bnQnLFxyXG4gICAgICAgIFZhbHVlOiBzY2FuUmVzdWx0LkNvdW50IHx8IDAsXHJcbiAgICAgICAgVW5pdDogJ0NvdW50JyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdUYWJsZU5hbWUnLCBWYWx1ZTogdGFibGVOYW1lIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBtZXRyaWNzQ291bnQrKztcclxuXHJcbiAgICAgIC8vIEdldCB0YWJsZSBzaXplIChhcHByb3hpbWF0ZSlcclxuICAgICAgY29uc3QgZGVzY3JpYmVSZXN1bHQgPSBhd2FpdCBkeW5hbW9kYkNsaWVudC5zZW5kKG5ldyBEZXNjcmliZVRhYmxlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWUsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmIChkZXNjcmliZVJlc3VsdC5UYWJsZT8uVGFibGVTaXplQnl0ZXMpIHtcclxuICAgICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljKHtcclxuICAgICAgICAgIE1ldHJpY05hbWU6ICdUYWJsZVNpemVCeXRlcycsXHJcbiAgICAgICAgICBWYWx1ZTogZGVzY3JpYmVSZXN1bHQuVGFibGUuVGFibGVTaXplQnl0ZXMsXHJcbiAgICAgICAgICBVbml0OiAnQnl0ZXMnLFxyXG4gICAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgICB7IE5hbWU6ICdUYWJsZU5hbWUnLCBWYWx1ZTogdGFibGVOYW1lIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBtZXRyaWNzQ291bnQrKztcclxuICAgICAgfVxyXG5cclxuICAgICAgbG9nZ2VyLmRlYnVnKGBDb2xsZWN0ZWQgbWV0cmljcyBmb3IgdGFibGU6ICR7dGFibGVOYW1lfWAsIHtcclxuICAgICAgICBpdGVtQ291bnQ6IHNjYW5SZXN1bHQuQ291bnQsXHJcbiAgICAgICAgc2l6ZUJ5dGVzOiBkZXNjcmliZVJlc3VsdC5UYWJsZT8uVGFibGVTaXplQnl0ZXMsXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gY29sbGVjdCBtZXRyaWNzIGZvciB0YWJsZTogJHt0YWJsZU5hbWV9YCwgZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG1ldHJpY3NDb3VudDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbGxlY3QgUzMgYnVja2V0IG1ldHJpY3NcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RTM01ldHJpY3MobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgY29uc3QgYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTtcclxuICBpZiAoIWJ1Y2tldE5hbWUpIHtcclxuICAgIGxvZ2dlci53YXJuKCdGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUUgbm90IGNvbmZpZ3VyZWQsIHNraXBwaW5nIFMzIG1ldHJpY3MnKTtcclxuICAgIHJldHVybiAwO1xyXG4gIH1cclxuXHJcbiAgbGV0IG1ldHJpY3NDb3VudCA9IDA7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBHZXQgYnVja2V0IG9iamVjdCBjb3VudCBhbmQgdG90YWwgc2l6ZVxyXG4gICAgY29uc3QgbGlzdFJlc3VsdCA9IGF3YWl0IHMzLnNlbmQobmV3IExpc3RPYmplY3RzVjJDb21tYW5kKHtcclxuICAgICAgQnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGNvbnN0IG9iamVjdENvdW50ID0gbGlzdFJlc3VsdC5LZXlDb3VudCB8fCAwO1xyXG4gICAgY29uc3QgdG90YWxTaXplID0gbGlzdFJlc3VsdC5Db250ZW50cz8ucmVkdWNlKChzdW0sIG9iaikgPT4gc3VtICsgKG9iai5TaXplIHx8IDApLCAwKSB8fCAwO1xyXG5cclxuICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWNzKFtcclxuICAgICAge1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdCdWNrZXRPYmplY3RDb3VudCcsXHJcbiAgICAgICAgVmFsdWU6IG9iamVjdENvdW50LFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnQnVja2V0TmFtZScsIFZhbHVlOiBidWNrZXROYW1lIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdCdWNrZXRUb3RhbFNpemUnLFxyXG4gICAgICAgIFZhbHVlOiB0b3RhbFNpemUsXHJcbiAgICAgICAgVW5pdDogJ0J5dGVzJyxcclxuICAgICAgICBEaW1lbnNpb25zOiBbXHJcbiAgICAgICAgICB7IE5hbWU6ICdCdWNrZXROYW1lJywgVmFsdWU6IGJ1Y2tldE5hbWUgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgXSk7XHJcblxyXG4gICAgbWV0cmljc0NvdW50ICs9IDI7XHJcblxyXG4gICAgLy8gQ29sbGVjdCBmaWxlIHR5cGUgZGlzdHJpYnV0aW9uXHJcbiAgICBjb25zdCBmaWxlVHlwZXM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICAgIGxpc3RSZXN1bHQuQ29udGVudHM/LmZvckVhY2gob2JqID0+IHtcclxuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gb2JqLktleT8uc3BsaXQoJy4nKS5wb3AoKT8udG9Mb3dlckNhc2UoKSB8fCAndW5rbm93bic7XHJcbiAgICAgIGZpbGVUeXBlc1tleHRlbnNpb25dID0gKGZpbGVUeXBlc1tleHRlbnNpb25dIHx8IDApICsgMTtcclxuICAgIH0pO1xyXG5cclxuICAgIGZvciAoY29uc3QgW2ZpbGVUeXBlLCBjb3VudF0gb2YgT2JqZWN0LmVudHJpZXMoZmlsZVR5cGVzKSkge1xyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5wdWJsaXNoTWV0cmljKHtcclxuICAgICAgICBNZXRyaWNOYW1lOiAnRmlsZVR5cGVDb3VudCcsXHJcbiAgICAgICAgVmFsdWU6IGNvdW50LFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgeyBOYW1lOiAnQnVja2V0TmFtZScsIFZhbHVlOiBidWNrZXROYW1lIH0sXHJcbiAgICAgICAgICB7IE5hbWU6ICdGaWxlVHlwZScsIFZhbHVlOiBmaWxlVHlwZSB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pO1xyXG4gICAgICBtZXRyaWNzQ291bnQrKztcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuZGVidWcoJ0NvbGxlY3RlZCBTMyBtZXRyaWNzJywge1xyXG4gICAgICBidWNrZXROYW1lLFxyXG4gICAgICBvYmplY3RDb3VudCxcclxuICAgICAgdG90YWxTaXplLFxyXG4gICAgICBmaWxlVHlwZXMsXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gY29sbGVjdCBTMyBtZXRyaWNzIGZvciBidWNrZXQ6ICR7YnVja2V0TmFtZX1gLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWV0cmljc0NvdW50O1xyXG59XHJcblxyXG4vKipcclxuICogQ29sbGVjdCBidXNpbmVzcyBtZXRyaWNzIGZyb20gZGF0YWJhc2VcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNvbGxlY3RCdXNpbmVzc01ldHJpY3MobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgbGV0IG1ldHJpY3NDb3VudCA9IDA7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBDb2xsZWN0IHVzZXIgbWV0cmljc1xyXG4gICAgaWYgKHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFX05BTUUpIHtcclxuICAgICAgY29uc3QgdXNlcnNSZXN1bHQgPSBhd2FpdCBkeW5hbW9kYi5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5VU0VSU19UQUJMRV9OQU1FLFxyXG4gICAgICAgIFNlbGVjdDogJ0NPVU5UJyxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucHVibGlzaE1ldHJpYyh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1RvdGFsVXNlcnMnLFxyXG4gICAgICAgIFZhbHVlOiB1c2Vyc1Jlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbWV0cmljc0NvdW50Kys7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29sbGVjdCBwcm9qZWN0IG1ldHJpY3NcclxuICAgIGlmIChwcm9jZXNzLmVudi5QUk9KRUNUU19UQUJMRV9OQU1FKSB7XHJcbiAgICAgIGNvbnN0IHByb2plY3RzUmVzdWx0ID0gYXdhaXQgZHluYW1vZGIuc2VuZChuZXcgU2NhbkNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuUFJPSkVDVFNfVEFCTEVfTkFNRSxcclxuICAgICAgICBTZWxlY3Q6ICdDT1VOVCcsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWMoe1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdUb3RhbFByb2plY3RzJyxcclxuICAgICAgICBWYWx1ZTogcHJvamVjdHNSZXN1bHQuQ291bnQgfHwgMCxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG1ldHJpY3NDb3VudCsrO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbGxlY3QgYW5hbHlzaXMgbWV0cmljc1xyXG4gICAgaWYgKHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEVfTkFNRSkge1xyXG4gICAgICBjb25zdCBhbmFseXNpc1Jlc3VsdCA9IGF3YWl0IGR5bmFtb2RiLnNlbmQobmV3IFNjYW5Db21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEVfTkFNRSxcclxuICAgICAgICBTZWxlY3Q6ICdDT1VOVCcsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWMoe1xyXG4gICAgICAgIE1ldHJpY05hbWU6ICdUb3RhbEFuYWx5c2VzJyxcclxuICAgICAgICBWYWx1ZTogYW5hbHlzaXNSZXN1bHQuQ291bnQgfHwgMCxcclxuICAgICAgICBVbml0OiAnQ291bnQnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG1ldHJpY3NDb3VudCsrO1xyXG5cclxuICAgICAgLy8gR2V0IHJlY2VudCBhbmFseXNpcyBzdWNjZXNzIHJhdGUgKGxhc3QgMjQgaG91cnMpXHJcbiAgICAgIGNvbnN0IHllc3RlcmRheSA9IERhdGUubm93KCkgLSAoMjQgKiA2MCAqIDYwICogMTAwMCk7XHJcbiAgICAgIGNvbnN0IHJlY2VudEFuYWx5c2VzID0gYXdhaXQgZHluYW1vZGIuc2VuZChuZXcgU2NhbkNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRV9OQU1FLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICcjdGltZXN0YW1wID4gOnllc3RlcmRheScsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAnI3RpbWVzdGFtcCc6ICd0aW1lc3RhbXAnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzp5ZXN0ZXJkYXknOiB5ZXN0ZXJkYXksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3QgdG90YWxSZWNlbnQgPSByZWNlbnRBbmFseXNlcy5Db3VudCB8fCAwO1xyXG4gICAgICBjb25zdCBzdWNjZXNzZnVsUmVjZW50ID0gcmVjZW50QW5hbHlzZXMuSXRlbXM/LmZpbHRlcigoaXRlbTogYW55KSA9PiBpdGVtLnN0YXR1cyA9PT0gJ0NPTVBMRVRFRCcpLmxlbmd0aCB8fCAwO1xyXG4gICAgICBjb25zdCBzdWNjZXNzUmF0ZSA9IHRvdGFsUmVjZW50ID4gMCA/IChzdWNjZXNzZnVsUmVjZW50IC8gdG90YWxSZWNlbnQpICogMTAwIDogMTAwO1xyXG5cclxuICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucHVibGlzaE1ldHJpYyh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ0FuYWx5c2lzU3VjY2Vzc1JhdGUyNGgnLFxyXG4gICAgICAgIFZhbHVlOiBzdWNjZXNzUmF0ZSxcclxuICAgICAgICBVbml0OiAnUGVyY2VudCcsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbWV0cmljc0NvdW50Kys7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29sbGVjdCBmaWxlIHVwbG9hZCBtZXRyaWNzXHJcbiAgICBpZiAocHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FKSB7XHJcbiAgICAgIGNvbnN0IGZpbGVzUmVzdWx0ID0gYXdhaXQgZHluYW1vZGIuc2VuZChuZXcgU2NhbkNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FLFxyXG4gICAgICAgIFNlbGVjdDogJ0NPVU5UJyxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucHVibGlzaE1ldHJpYyh7XHJcbiAgICAgICAgTWV0cmljTmFtZTogJ1RvdGFsRmlsZXMnLFxyXG4gICAgICAgIFZhbHVlOiBmaWxlc1Jlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICAgIFVuaXQ6ICdDb3VudCcsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbWV0cmljc0NvdW50Kys7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmRlYnVnKCdDb2xsZWN0ZWQgYnVzaW5lc3MgbWV0cmljcycsIHsgbWV0cmljc0NvdW50IH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjb2xsZWN0IGJ1c2luZXNzIG1ldHJpY3MnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWV0cmljc0NvdW50O1xyXG59XHJcblxyXG4vKipcclxuICogQ29sbGVjdCBjYXBhY2l0eSBwbGFubmluZyBtZXRyaWNzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjb2xsZWN0Q2FwYWNpdHlQbGFubmluZ01ldHJpY3MobG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlcik6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgbGV0IG1ldHJpY3NDb3VudCA9IDA7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gbWV0cmljc1xyXG4gICAgY29uc3QgZnVuY3Rpb25OYW1lID0gcHJvY2Vzcy5lbnYuQVdTX0xBTUJEQV9GVU5DVElPTl9OQU1FO1xyXG4gICAgaWYgKGZ1bmN0aW9uTmFtZSkge1xyXG4gICAgICBjb25zdCBtZW1vcnlVc2FnZSA9IHByb2Nlc3MubWVtb3J5VXNhZ2UoKTtcclxuICAgICAgY29uc3QgbWVtb3J5VXNlZE1CID0gbWVtb3J5VXNhZ2UuaGVhcFVzZWQgLyAxMDI0IC8gMTAyNDtcclxuICAgICAgY29uc3QgbWVtb3J5TGltaXRNQiA9IHBhcnNlSW50KHByb2Nlc3MuZW52LkFXU19MQU1CREFfRlVOQ1RJT05fTUVNT1JZX1NJWkUgfHwgJzUxMicpO1xyXG4gICAgICBjb25zdCBtZW1vcnlVdGlsaXphdGlvbiA9IChtZW1vcnlVc2VkTUIgLyBtZW1vcnlMaW1pdE1CKSAqIDEwMDtcclxuXHJcbiAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWNzKFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBNZXRyaWNOYW1lOiAnTGFtYmRhTWVtb3J5VXRpbGl6YXRpb24nLFxyXG4gICAgICAgICAgVmFsdWU6IG1lbW9yeVV0aWxpemF0aW9uLFxyXG4gICAgICAgICAgVW5pdDogJ1BlcmNlbnQnLFxyXG4gICAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgICB7IE5hbWU6ICdGdW5jdGlvbk5hbWUnLCBWYWx1ZTogZnVuY3Rpb25OYW1lIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTWV0cmljTmFtZTogJ0xhbWJkYU1lbW9yeVVzZWQnLFxyXG4gICAgICAgICAgVmFsdWU6IG1lbW9yeVVzZWRNQixcclxuICAgICAgICAgIFVuaXQ6ICdNZWdhYnl0ZXMnLFxyXG4gICAgICAgICAgRGltZW5zaW9uczogW1xyXG4gICAgICAgICAgICB7IE5hbWU6ICdGdW5jdGlvbk5hbWUnLCBWYWx1ZTogZnVuY3Rpb25OYW1lIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0pO1xyXG5cclxuICAgICAgbWV0cmljc0NvdW50ICs9IDI7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3lzdGVtIHJlc291cmNlIG1ldHJpY3NcclxuICAgIGNvbnN0IGNwdVVzYWdlID0gcHJvY2Vzcy5jcHVVc2FnZSgpO1xyXG4gICAgY29uc3QgY3B1UGVyY2VudCA9IChjcHVVc2FnZS51c2VyICsgY3B1VXNhZ2Uuc3lzdGVtKSAvIDEwMDAwMDA7IC8vIENvbnZlcnQgdG8gc2Vjb25kc1xyXG5cclxuICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnB1Ymxpc2hNZXRyaWMoe1xyXG4gICAgICBNZXRyaWNOYW1lOiAnU3lzdGVtQ1BVVXNhZ2UnLFxyXG4gICAgICBWYWx1ZTogY3B1UGVyY2VudCxcclxuICAgICAgVW5pdDogJ1NlY29uZHMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbWV0cmljc0NvdW50Kys7XHJcblxyXG4gICAgbG9nZ2VyLmRlYnVnKCdDb2xsZWN0ZWQgY2FwYWNpdHkgcGxhbm5pbmcgbWV0cmljcycsIHsgbWV0cmljc0NvdW50IH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjb2xsZWN0IGNhcGFjaXR5IHBsYW5uaW5nIG1ldHJpY3MnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWV0cmljc0NvdW50O1xyXG59XHJcblxyXG4vLyBFeHBvcnQgdGhlIGhhbmRsZXIgd2l0aCBjb3JyZWxhdGlvbiBJRCBtaWRkbGV3YXJlXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gd2l0aENvcnJlbGF0aW9uSWQobWV0cmljc0NvbGxlY3RvckhhbmRsZXIpOyJdfQ==
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context, ScheduledEvent } from 'aws-lambda';
import { CloudWatch, DynamoDB, S3 } from 'aws-sdk';
import { CentralizedLogger, withCorrelationId } from '../../utils/centralized-logger';
import { monitoringService } from '../../services/monitoring-service';

const cloudWatch = new CloudWatch();
const dynamodb = new DynamoDB.DocumentClient();
const s3 = new S3();

interface MetricsCollectionResult {
  timestamp: string;
  metricsCollected: number;
  errors: string[];
  duration: number;
}

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
async function metricsCollectorHandler(
  event: APIGatewayProxyEvent | ScheduledEvent,
  context: Context
): Promise<APIGatewayProxyResult | void> {
  const logger = CentralizedLogger.getInstance({
    correlationId: 'headers' in event ? event.headers?.['x-correlation-id'] : undefined,
    requestId: context.awsRequestId,
    functionName: context.functionName,
  });

  const startTime = Date.now();
  const errors: string[] = [];
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
    } catch (error) {
      const errorMsg = `DynamoDB metrics collection failed: ${(error as Error).message}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
    }

    // Collect S3 metrics
    try {
      const s3Metrics = await collectS3Metrics(logger);
      metricsCollected += s3Metrics;
      logger.info(`Collected ${s3Metrics} S3 metrics`);
    } catch (error) {
      const errorMsg = `S3 metrics collection failed: ${(error as Error).message}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
    }

    // Collect business metrics
    try {
      const businessMetrics = await collectBusinessMetrics(logger);
      metricsCollected += businessMetrics;
      logger.info(`Collected ${businessMetrics} business metrics`);
    } catch (error) {
      const errorMsg = `Business metrics collection failed: ${(error as Error).message}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
    }

    // Collect capacity planning metrics
    try {
      const capacityMetrics = await collectCapacityPlanningMetrics(logger);
      metricsCollected += capacityMetrics;
      logger.info(`Collected ${capacityMetrics} capacity planning metrics`);
    } catch (error) {
      const errorMsg = `Capacity planning metrics collection failed: ${(error as Error).message}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error as Error);
    }

    const duration = Date.now() - startTime;
    const result: MetricsCollectionResult = {
      timestamp: new Date().toISOString(),
      metricsCollected,
      errors,
      duration,
    };

    logger.info('Metrics collection completed', result);

    // Record collection metrics
    await monitoringService.recordPerformanceMetric({
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
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Metrics collection failed', error as Error, { duration });

    await monitoringService.recordPerformanceMetric({
      operation: 'metrics_collection',
      duration,
      success: false,
      errorType: (error as Error).name,
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
          message: (error as Error).message,
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
async function collectDynamoDBMetrics(logger: CentralizedLogger): Promise<number> {
  const tables = [
    process.env.USERS_TABLE_NAME,
    process.env.PROJECTS_TABLE_NAME,
    process.env.FILE_METADATA_TABLE_NAME,
    process.env.ANALYSIS_RESULTS_TABLE_NAME,
    process.env.SAMPLE_FILES_TABLE_NAME,
  ].filter(Boolean) as string[];

  let metricsCount = 0;

  for (const tableName of tables) {
    try {
      // Get table item count
      const scanResult = await dynamodb.scan({
        TableName: tableName,
        Select: 'COUNT',
      }).promise();

      await monitoringService.publishMetric({
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
        await monitoringService.publishMetric({
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
    } catch (error) {
      logger.error(`Failed to collect metrics for table: ${tableName}`, error as Error);
    }
  }

  return metricsCount;
}

/**
 * Collect S3 bucket metrics
 */
async function collectS3Metrics(logger: CentralizedLogger): Promise<number> {
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

    await monitoringService.publishMetrics([
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
    const fileTypes: Record<string, number> = {};
    listResult.Contents?.forEach(obj => {
      const extension = obj.Key?.split('.').pop()?.toLowerCase() || 'unknown';
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;
    });

    for (const [fileType, count] of Object.entries(fileTypes)) {
      await monitoringService.publishMetric({
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
  } catch (error) {
    logger.error(`Failed to collect S3 metrics for bucket: ${bucketName}`, error as Error);
  }

  return metricsCount;
}

/**
 * Collect business metrics from database
 */
async function collectBusinessMetrics(logger: CentralizedLogger): Promise<number> {
  let metricsCount = 0;

  try {
    // Collect user metrics
    if (process.env.USERS_TABLE_NAME) {
      const usersResult = await dynamodb.scan({
        TableName: process.env.USERS_TABLE_NAME,
        Select: 'COUNT',
      }).promise();

      await monitoringService.publishMetric({
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

      await monitoringService.publishMetric({
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

      await monitoringService.publishMetric({
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

      await monitoringService.publishMetric({
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

      await monitoringService.publishMetric({
        MetricName: 'TotalFiles',
        Value: filesResult.Count || 0,
        Unit: 'Count',
      });

      metricsCount++;
    }

    logger.debug('Collected business metrics', { metricsCount });
  } catch (error) {
    logger.error('Failed to collect business metrics', error as Error);
  }

  return metricsCount;
}

/**
 * Collect capacity planning metrics
 */
async function collectCapacityPlanningMetrics(logger: CentralizedLogger): Promise<number> {
  let metricsCount = 0;

  try {
    // Lambda function metrics
    const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (functionName) {
      const memoryUsage = process.memoryUsage();
      const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const memoryLimitMB = parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || '512');
      const memoryUtilization = (memoryUsedMB / memoryLimitMB) * 100;

      await monitoringService.publishMetrics([
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

    await monitoringService.publishMetric({
      MetricName: 'SystemCPUUsage',
      Value: cpuPercent,
      Unit: 'Seconds',
    });

    metricsCount++;

    logger.debug('Collected capacity planning metrics', { metricsCount });
  } catch (error) {
    logger.error('Failed to collect capacity planning metrics', error as Error);
  }

  return metricsCount;
}

// Export the handler with correlation ID middleware
export const handler = withCorrelationId(metricsCollectorHandler);
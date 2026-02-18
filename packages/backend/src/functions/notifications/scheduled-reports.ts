/**
 * Scheduled Reports Lambda
 * 
 * Generates and sends scheduled summary reports (daily, weekly, monthly).
 * Triggered by EventBridge cron rules.
 */

import { Handler, ScheduledEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { TestExecution } from '../../types/test-execution';

interface SummaryReportData {
  reportType: 'daily' | 'weekly' | 'monthly';
  period: {
    startDate: string;
    endDate: string;
  };
  stats: {
    totalExecutions: number;
    passRate: number;
    failRate: number;
    errorRate: number;
    averageDuration: number;
  };
  topFailingTests: Array<{
    testCaseId: string;
    testName: string;
    failureCount: number;
    lastFailure: string;
  }>;
  trends: {
    executionChange: number; // Percentage change from previous period
    passRateChange: number;
  };
}

interface ReportResult {
  success: boolean;
  reportType: string;
  period: {
    startDate: string;
    endDate: string;
  };
  executionsProcessed: number;
  errorMessage?: string;
}

/**
 * Lambda handler for generating scheduled reports
 */
export const handler: Handler<ScheduledEvent, ReportResult> = async (event): Promise<ReportResult> => {
  console.log('Starting scheduled report generation', { event });

  const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  }));

  const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const testExecutionsTable = process.env.TEST_EXECUTIONS_TABLE || 'TestExecutions';
  const notificationQueueUrl = process.env.NOTIFICATION_QUEUE_URL;

  if (!notificationQueueUrl) {
    throw new Error('NOTIFICATION_QUEUE_URL environment variable is required');
  }

  // Determine report type from event rule name
  const reportType = determineReportType(event);
  const { startDate, endDate } = calculateReportPeriod(reportType);
  const { startDate: prevStartDate, endDate: prevEndDate } = calculatePreviousPeriod(reportType, startDate);

  console.log('Report period', { reportType, startDate, endDate, prevStartDate, prevEndDate });

  try {
    // Query test executions for current period
    const currentExecutions = await queryExecutions(docClient, testExecutionsTable, startDate, endDate);
    
    // Query test executions for previous period (for trend comparison)
    const previousExecutions = await queryExecutions(docClient, testExecutionsTable, prevStartDate, prevEndDate);

    console.log('Executions retrieved', {
      currentCount: currentExecutions.length,
      previousCount: previousExecutions.length,
    });

    // Calculate statistics
    const stats = calculateStatistics(currentExecutions);
    const previousStats = calculateStatistics(previousExecutions);

    // Calculate trends
    const trends = calculateTrends(stats, previousStats);

    // Identify top failing tests
    const topFailingTests = identifyTopFailingTests(currentExecutions);

    // Build report data
    const reportData: SummaryReportData = {
      reportType,
      period: {
        startDate,
        endDate,
      },
      stats,
      topFailingTests,
      trends,
    };

    // Publish report event to notification queue
    await publishReportEvent(sqsClient, notificationQueueUrl, reportData);

    console.log('Report generated successfully', { reportType, executionsProcessed: currentExecutions.length });

    return {
      success: true,
      reportType,
      period: {
        startDate,
        endDate,
      },
      executionsProcessed: currentExecutions.length,
    };
  } catch (error) {
    console.error('Error generating report', { error });
    return {
      success: false,
      reportType,
      period: {
        startDate,
        endDate,
      },
      executionsProcessed: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Determine report type from EventBridge rule name
 */
function determineReportType(event: ScheduledEvent): 'daily' | 'weekly' | 'monthly' {
  const ruleName = event.resources?.[0]?.split('/')?.pop() || '';
  
  if (ruleName.includes('daily')) {
    return 'daily';
  } else if (ruleName.includes('weekly')) {
    return 'weekly';
  } else if (ruleName.includes('monthly')) {
    return 'monthly';
  }
  
  // Default to daily
  return 'daily';
}

/**
 * Calculate report period based on report type
 */
function calculateReportPeriod(reportType: 'daily' | 'weekly' | 'monthly'): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString();
  let startDate: Date;

  switch (reportType) {
    case 'daily':
      // Previous 24 hours
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      // Previous 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      // Previous 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  return {
    startDate: startDate.toISOString(),
    endDate,
  };
}

/**
 * Calculate previous period for trend comparison
 */
function calculatePreviousPeriod(
  reportType: 'daily' | 'weekly' | 'monthly',
  currentStartDate: string
): { startDate: string; endDate: string } {
  const currentStart = new Date(currentStartDate);
  let duration: number;

  switch (reportType) {
    case 'daily':
      duration = 24 * 60 * 60 * 1000;
      break;
    case 'weekly':
      duration = 7 * 24 * 60 * 60 * 1000;
      break;
    case 'monthly':
      duration = 30 * 24 * 60 * 60 * 1000;
      break;
  }

  const prevEndDate = new Date(currentStart.getTime());
  const prevStartDate = new Date(currentStart.getTime() - duration);

  return {
    startDate: prevStartDate.toISOString(),
    endDate: prevEndDate.toISOString(),
  };
}

/**
 * Query test executions for a time period
 */
async function queryExecutions(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  startDate: string,
  endDate: string
): Promise<TestExecution[]> {
  const executions: TestExecution[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'StatusTimeIndex',
      KeyConditionExpression: '#status = :status AND #createdAt BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#createdAt': 'createdAt',
      },
      ExpressionAttributeValues: {
        ':status': 'completed',
        ':startDate': startDate,
        ':endDate': endDate,
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await docClient.send(command);

    if (response.Items) {
      executions.push(...(response.Items as TestExecution[]));
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return executions;
}

/**
 * Calculate summary statistics
 */
function calculateStatistics(executions: TestExecution[]): {
  totalExecutions: number;
  passRate: number;
  failRate: number;
  errorRate: number;
  averageDuration: number;
} {
  if (executions.length === 0) {
    return {
      totalExecutions: 0,
      passRate: 0,
      failRate: 0,
      errorRate: 0,
      averageDuration: 0,
    };
  }

  const totalExecutions = executions.length;
  const passed = executions.filter(e => e.result === 'pass').length;
  const failed = executions.filter(e => e.result === 'fail').length;
  const errors = executions.filter(e => e.result === 'error').length;

  const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0);
  const averageDuration = totalDuration / totalExecutions;

  return {
    totalExecutions,
    passRate: (passed / totalExecutions) * 100,
    failRate: (failed / totalExecutions) * 100,
    errorRate: (errors / totalExecutions) * 100,
    averageDuration: Math.round(averageDuration),
  };
}

/**
 * Calculate trends compared to previous period
 */
function calculateTrends(
  currentStats: { totalExecutions: number; passRate: number },
  previousStats: { totalExecutions: number; passRate: number }
): {
  executionChange: number;
  passRateChange: number;
} {
  let executionChange = 0;
  let passRateChange = 0;

  if (previousStats.totalExecutions > 0) {
    executionChange = ((currentStats.totalExecutions - previousStats.totalExecutions) / previousStats.totalExecutions) * 100;
  }

  if (previousStats.passRate > 0) {
    passRateChange = currentStats.passRate - previousStats.passRate;
  }

  return {
    executionChange: Math.round(executionChange * 100) / 100,
    passRateChange: Math.round(passRateChange * 100) / 100,
  };
}

/**
 * Identify top failing tests
 */
function identifyTopFailingTests(executions: TestExecution[]): Array<{
  testCaseId: string;
  testName: string;
  failureCount: number;
  lastFailure: string;
}> {
  // Group failures by test case
  const failureMap = new Map<string, { count: number; lastFailure: string }>();

  executions
    .filter(e => e.result === 'fail' || e.result === 'error')
    .forEach(e => {
      if (e.testCaseId) {
        const existing = failureMap.get(e.testCaseId);
        if (existing) {
          existing.count++;
          if (e.endTime && e.endTime > existing.lastFailure) {
            existing.lastFailure = e.endTime;
          }
        } else {
          failureMap.set(e.testCaseId, {
            count: 1,
            lastFailure: e.endTime || e.createdAt,
          });
        }
      }
    });

  // Convert to array and sort by failure count
  const topFailing = Array.from(failureMap.entries())
    .map(([testCaseId, data]) => ({
      testCaseId,
      testName: `Test ${testCaseId.substring(0, 8)}`, // Placeholder - would need to fetch actual test name
      failureCount: data.count,
      lastFailure: data.lastFailure,
    }))
    .sort((a, b) => b.failureCount - a.failureCount)
    .slice(0, 10); // Top 10 failing tests

  return topFailing;
}

/**
 * Publish report event to notification queue
 */
async function publishReportEvent(
  sqsClient: SQSClient,
  queueUrl: string,
  reportData: SummaryReportData
): Promise<void> {
  const message = {
    eventType: 'summary_report',
    eventId: `report-${Date.now()}`,
    timestamp: new Date().toISOString(),
    payload: {
      projectId: 'all', // Summary across all projects
      reportData,
      triggeredBy: 'system',
    },
  };

  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
  });

  await sqsClient.send(command);
  console.log('Report event published to notification queue', { eventId: message.eventId });
}

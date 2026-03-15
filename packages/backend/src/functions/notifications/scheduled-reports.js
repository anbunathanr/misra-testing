"use strict";
/**
 * Scheduled Reports Lambda
 *
 * Generates and sends scheduled summary reports (daily, weekly, monthly).
 * Triggered by EventBridge cron rules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_sqs_1 = require("@aws-sdk/client-sqs");
/**
 * Lambda handler for generating scheduled reports
 */
const handler = async (event) => {
    console.log('Starting scheduled report generation', { event });
    const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({
        region: process.env.AWS_REGION || 'us-east-1',
    }));
    const sqsClient = new client_sqs_1.SQSClient({
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
        // Identify top failing tests with batch optimization
        const topFailingTests = await identifyTopFailingTests(docClient, currentExecutions);
        // Build report data
        const reportData = {
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
    }
    catch (error) {
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
exports.handler = handler;
/**
 * Determine report type from EventBridge rule name
 */
function determineReportType(event) {
    const ruleName = event.resources?.[0]?.split('/')?.pop() || '';
    if (ruleName.includes('daily')) {
        return 'daily';
    }
    else if (ruleName.includes('weekly')) {
        return 'weekly';
    }
    else if (ruleName.includes('monthly')) {
        return 'monthly';
    }
    // Default to daily
    return 'daily';
}
/**
 * Calculate report period based on report type
 */
function calculateReportPeriod(reportType) {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate;
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
function calculatePreviousPeriod(reportType, currentStartDate) {
    const currentStart = new Date(currentStartDate);
    let duration;
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
 * Query test executions for a time period with batch optimization
 */
async function queryExecutions(docClient, tableName, startDate, endDate) {
    const executions = [];
    let lastEvaluatedKey;
    // Use batch size of 100 for optimal performance
    const BATCH_SIZE = 100;
    do {
        const command = new lib_dynamodb_1.QueryCommand({
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
            Limit: BATCH_SIZE, // Batch size optimization
            ExclusiveStartKey: lastEvaluatedKey,
        });
        const response = await docClient.send(command);
        if (response.Items) {
            executions.push(...response.Items);
        }
        lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return executions;
}
/**
 * Batch get test case details for multiple test cases
 * Uses DynamoDB BatchGetItem for efficient retrieval
 */
async function batchGetTestCaseDetails(docClient, testCaseIds) {
    const testCaseMap = new Map();
    if (testCaseIds.length === 0) {
        return testCaseMap;
    }
    // DynamoDB BatchGetItem supports up to 100 items per request
    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < testCaseIds.length; i += BATCH_SIZE) {
        batches.push(testCaseIds.slice(i, i + BATCH_SIZE));
    }
    // Process batches in parallel for better performance
    await Promise.all(batches.map(async (batch) => {
        const command = new lib_dynamodb_1.BatchGetCommand({
            RequestItems: {
                TestCases: {
                    Keys: batch.map(id => ({ testCaseId: id })),
                    ProjectionExpression: 'testCaseId, #name',
                    ExpressionAttributeNames: {
                        '#name': 'name',
                    },
                },
            },
        });
        try {
            const response = await docClient.send(command);
            if (response.Responses?.TestCases) {
                response.Responses.TestCases.forEach((item) => {
                    testCaseMap.set(item.testCaseId, {
                        testName: item.name || `Test ${item.testCaseId.substring(0, 8)}`,
                    });
                });
            }
        }
        catch (error) {
            console.error('Error batch getting test case details:', error);
            // Continue with other batches even if one fails
        }
    }));
    return testCaseMap;
}
/**
 * Calculate summary statistics
 */
function calculateStatistics(executions) {
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
function calculateTrends(currentStats, previousStats) {
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
 * Identify top failing tests with batch optimization
 */
async function identifyTopFailingTests(docClient, executions) {
    // Group failures by test case
    const failureMap = new Map();
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
            }
            else {
                failureMap.set(e.testCaseId, {
                    count: 1,
                    lastFailure: e.endTime || e.createdAt,
                });
            }
        }
    });
    // Get test case IDs for batch retrieval
    const testCaseIds = Array.from(failureMap.keys());
    // Batch get test case details for better performance
    const testCaseDetails = await batchGetTestCaseDetails(docClient, testCaseIds);
    // Convert to array and sort by failure count
    const topFailing = Array.from(failureMap.entries())
        .map(([testCaseId, data]) => ({
        testCaseId,
        testName: testCaseDetails.get(testCaseId)?.testName || `Test ${testCaseId.substring(0, 8)}`,
        failureCount: data.count,
        lastFailure: data.lastFailure,
    }))
        .sort((a, b) => b.failureCount - a.failureCount)
        .slice(0, 10); // Top 10 failing tests
    return topFailing;
}
/**
 * Publish report event to notification queue with frequency filtering
 */
async function publishReportEvent(sqsClient, queueUrl, reportData) {
    const message = {
        eventType: 'summary_report',
        eventId: `report-${Date.now()}`,
        timestamp: new Date().toISOString(),
        payload: {
            projectId: 'all', // Summary across all projects
            reportData,
            reportType: reportData.reportType, // Include report type for frequency filtering
            triggeredBy: 'system',
        },
    };
    const command = new client_sqs_1.SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
    });
    await sqsClient.send(command);
    console.log('Report event published to notification queue', {
        eventId: message.eventId,
        reportType: reportData.reportType,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZWR1bGVkLXJlcG9ydHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzY2hlZHVsZWQtcmVwb3J0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUdILDhEQUEwRDtBQUMxRCx3REFBOEY7QUFDOUYsb0RBQW9FO0FBdUNwRTs7R0FFRztBQUNJLE1BQU0sT0FBTyxHQUEwQyxLQUFLLEVBQUUsS0FBSyxFQUF5QixFQUFFO0lBQ25HLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBRS9ELE1BQU0sU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLGdDQUFjLENBQUM7UUFDL0QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7S0FDOUMsQ0FBQyxDQUFDLENBQUM7SUFFSixNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUM7UUFDOUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7S0FDOUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixJQUFJLGdCQUFnQixDQUFDO0lBQ2xGLE1BQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQztJQUVoRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELDZDQUE2QztJQUM3QyxNQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QyxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxHQUFHLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFF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TztRQUN4QixVQUFVLEVBQUUsVUFBVSxDQUFDLFVBQVU7S0FDbEMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBTY2hlZHVsZWQgUmVwb3J0cyBMYW1iZGFcclxuICogXHJcbiAqIEdlbmVyYXRlcyBhbmQgc2VuZHMgc2NoZWR1bGVkIHN1bW1hcnkgcmVwb3J0cyAoZGFpbHksIHdlZWtseSwgbW9udGhseSkuXHJcbiAqIFRyaWdnZXJlZCBieSBFdmVudEJyaWRnZSBjcm9uIHJ1bGVzLlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEhhbmRsZXIsIFNjaGVkdWxlZEV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUXVlcnlDb21tYW5kLCBCYXRjaEdldENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBTUVNDbGllbnQsIFNlbmRNZXNzYWdlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zcXMnO1xyXG5pbXBvcnQgeyBUZXN0RXhlY3V0aW9uIH0gZnJvbSAnLi4vLi4vdHlwZXMvdGVzdC1leGVjdXRpb24nO1xyXG5cclxuaW50ZXJmYWNlIFN1bW1hcnlSZXBvcnREYXRhIHtcclxuICByZXBvcnRUeXBlOiAnZGFpbHknIHwgJ3dlZWtseScgfCAnbW9udGhseSc7XHJcbiAgcGVyaW9kOiB7XHJcbiAgICBzdGFydERhdGU6IHN0cmluZztcclxuICAgIGVuZERhdGU6IHN0cmluZztcclxuICB9O1xyXG4gIHN0YXRzOiB7XHJcbiAgICB0b3RhbEV4ZWN1dGlvbnM6IG51bWJlcjtcclxuICAgIHBhc3NSYXRlOiBudW1iZXI7XHJcbiAgICBmYWlsUmF0ZTogbnVtYmVyO1xyXG4gICAgZXJyb3JSYXRlOiBudW1iZXI7XHJcbiAgICBhdmVyYWdlRHVyYXRpb246IG51bWJlcjtcclxuICB9O1xyXG4gIHRvcEZhaWxpbmdUZXN0czogQXJyYXk8e1xyXG4gICAgdGVzdENhc2VJZDogc3RyaW5nO1xyXG4gICAgdGVzdE5hbWU6IHN0cmluZztcclxuICAgIGZhaWx1cmVDb3VudDogbnVtYmVyO1xyXG4gICAgbGFzdEZhaWx1cmU6IHN0cmluZztcclxuICB9PjtcclxuICB0cmVuZHM6IHtcclxuICAgIGV4ZWN1dGlvbkNoYW5nZTogbnVtYmVyOyAvLyBQZXJjZW50YWdlIGNoYW5nZSBmcm9tIHByZXZpb3VzIHBlcmlvZFxyXG4gICAgcGFzc1JhdGVDaGFuZ2U6IG51bWJlcjtcclxuICB9O1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVwb3J0UmVzdWx0IHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIHJlcG9ydFR5cGU6IHN0cmluZztcclxuICBwZXJpb2Q6IHtcclxuICAgIHN0YXJ0RGF0ZTogc3RyaW5nO1xyXG4gICAgZW5kRGF0ZTogc3RyaW5nO1xyXG4gIH07XHJcbiAgZXhlY3V0aW9uc1Byb2Nlc3NlZDogbnVtYmVyO1xyXG4gIGVycm9yTWVzc2FnZT86IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciBnZW5lcmF0aW5nIHNjaGVkdWxlZCByZXBvcnRzXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlcjogSGFuZGxlcjxTY2hlZHVsZWRFdmVudCwgUmVwb3J0UmVzdWx0PiA9IGFzeW5jIChldmVudCk6IFByb21pc2U8UmVwb3J0UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1N0YXJ0aW5nIHNjaGVkdWxlZCByZXBvcnQgZ2VuZXJhdGlvbicsIHsgZXZlbnQgfSk7XHJcblxyXG4gIGNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShuZXcgRHluYW1vREJDbGllbnQoe1xyXG4gICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gIH0pKTtcclxuXHJcbiAgY29uc3Qgc3FzQ2xpZW50ID0gbmV3IFNRU0NsaWVudCh7XHJcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IHRlc3RFeGVjdXRpb25zVGFibGUgPSBwcm9jZXNzLmVudi5URVNUX0VYRUNVVElPTlNfVEFCTEUgfHwgJ1Rlc3RFeGVjdXRpb25zJztcclxuICBjb25zdCBub3RpZmljYXRpb25RdWV1ZVVybCA9IHByb2Nlc3MuZW52Lk5PVElGSUNBVElPTl9RVUVVRV9VUkw7XHJcblxyXG4gIGlmICghbm90aWZpY2F0aW9uUXVldWVVcmwpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignTk9USUZJQ0FUSU9OX1FVRVVFX1VSTCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyByZXF1aXJlZCcpO1xyXG4gIH1cclxuXHJcbiAgLy8gRGV0ZXJtaW5lIHJlcG9ydCB0eXBlIGZyb20gZXZlbnQgcnVsZSBuYW1lXHJcbiAgY29uc3QgcmVwb3J0VHlwZSA9IGRldGVybWluZVJlcG9ydFR5cGUoZXZlbnQpO1xyXG4gIGNvbnN0IHsgc3RhcnREYXRlLCBlbmREYXRlIH0gPSBjYWxjdWxhdGVSZXBvcnRQZXJpb2QocmVwb3J0VHlwZSk7XHJcbiAgY29uc3QgeyBzdGFydERhdGU6IHByZXZTdGFydERhdGUsIGVuZERhdGU6IHByZXZFbmREYXRlIH0gPSBjYWxjdWxhdGVQcmV2aW91c1BlcmlvZChyZXBvcnRUeXBlLCBzdGFydERhdGUpO1xyXG5cclxuICBjb25zb2xlLmxvZygnUmVwb3J0IHBlcmlvZCcsIHsgcmVwb3J0VHlwZSwgc3RhcnREYXRlLCBlbmREYXRlLCBwcmV2U3RhcnREYXRlLCBwcmV2RW5kRGF0ZSB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFF1ZXJ5IHRlc3QgZXhlY3V0aW9ucyBmb3IgY3VycmVudCBwZXJpb2RcclxuICAgIGNvbnN0IGN1cnJlbnRFeGVjdXRpb25zID0gYXdhaXQgcXVlcnlFeGVjdXRpb25zKGRvY0NsaWVudCwgdGVzdEV4ZWN1dGlvbnNUYWJsZSwgc3RhcnREYXRlLCBlbmREYXRlKTtcclxuICAgIFxyXG4gICAgLy8gUXVlcnkgdGVzdCBleGVjdXRpb25zIGZvciBwcmV2aW91cyBwZXJpb2QgKGZvciB0cmVuZCBjb21wYXJpc29uKVxyXG4gICAgY29uc3QgcHJldmlvdXNFeGVjdXRpb25zID0gYXdhaXQgcXVlcnlFeGVjdXRpb25zKGRvY0NsaWVudCwgdGVzdEV4ZWN1dGlvbnNUYWJsZSwgcHJldlN0YXJ0RGF0ZSwgcHJldkVuZERhdGUpO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCdFeGVjdXRpb25zIHJldHJpZXZlZCcsIHtcclxuICAgICAgY3VycmVudENvdW50OiBjdXJyZW50RXhlY3V0aW9ucy5sZW5ndGgsXHJcbiAgICAgIHByZXZpb3VzQ291bnQ6IHByZXZpb3VzRXhlY3V0aW9ucy5sZW5ndGgsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDYWxjdWxhdGUgc3RhdGlzdGljc1xyXG4gICAgY29uc3Qgc3RhdHMgPSBjYWxjdWxhdGVTdGF0aXN0aWNzKGN1cnJlbnRFeGVjdXRpb25zKTtcclxuICAgIGNvbnN0IHByZXZpb3VzU3RhdHMgPSBjYWxjdWxhdGVTdGF0aXN0aWNzKHByZXZpb3VzRXhlY3V0aW9ucyk7XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIHRyZW5kc1xyXG4gICAgY29uc3QgdHJlbmRzID0gY2FsY3VsYXRlVHJlbmRzKHN0YXRzLCBwcmV2aW91c1N0YXRzKTtcclxuXHJcbiAgICAvLyBJZGVudGlmeSB0b3AgZmFpbGluZyB0ZXN0cyB3aXRoIGJhdGNoIG9wdGltaXphdGlvblxyXG4gICAgY29uc3QgdG9wRmFpbGluZ1Rlc3RzID0gYXdhaXQgaWRlbnRpZnlUb3BGYWlsaW5nVGVzdHMoZG9jQ2xpZW50LCBjdXJyZW50RXhlY3V0aW9ucyk7XHJcblxyXG4gICAgLy8gQnVpbGQgcmVwb3J0IGRhdGFcclxuICAgIGNvbnN0IHJlcG9ydERhdGE6IFN1bW1hcnlSZXBvcnREYXRhID0ge1xyXG4gICAgICByZXBvcnRUeXBlLFxyXG4gICAgICBwZXJpb2Q6IHtcclxuICAgICAgICBzdGFydERhdGUsXHJcbiAgICAgICAgZW5kRGF0ZSxcclxuICAgICAgfSxcclxuICAgICAgc3RhdHMsXHJcbiAgICAgIHRvcEZhaWxpbmdUZXN0cyxcclxuICAgICAgdHJlbmRzLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBQdWJsaXNoIHJlcG9ydCBldmVudCB0byBub3RpZmljYXRpb24gcXVldWVcclxuICAgIGF3YWl0IHB1Ymxpc2hSZXBvcnRFdmVudChzcXNDbGllbnQsIG5vdGlmaWNhdGlvblF1ZXVlVXJsLCByZXBvcnREYXRhKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZygnUmVwb3J0IGdlbmVyYXRlZCBzdWNjZXNzZnVsbHknLCB7IHJlcG9ydFR5cGUsIGV4ZWN1dGlvbnNQcm9jZXNzZWQ6IGN1cnJlbnRFeGVjdXRpb25zLmxlbmd0aCB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICByZXBvcnRUeXBlLFxyXG4gICAgICBwZXJpb2Q6IHtcclxuICAgICAgICBzdGFydERhdGUsXHJcbiAgICAgICAgZW5kRGF0ZSxcclxuICAgICAgfSxcclxuICAgICAgZXhlY3V0aW9uc1Byb2Nlc3NlZDogY3VycmVudEV4ZWN1dGlvbnMubGVuZ3RoLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2VuZXJhdGluZyByZXBvcnQnLCB7IGVycm9yIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIHJlcG9ydFR5cGUsXHJcbiAgICAgIHBlcmlvZDoge1xyXG4gICAgICAgIHN0YXJ0RGF0ZSxcclxuICAgICAgICBlbmREYXRlLFxyXG4gICAgICB9LFxyXG4gICAgICBleGVjdXRpb25zUHJvY2Vzc2VkOiAwLFxyXG4gICAgICBlcnJvck1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIHJlcG9ydCB0eXBlIGZyb20gRXZlbnRCcmlkZ2UgcnVsZSBuYW1lXHJcbiAqL1xyXG5mdW5jdGlvbiBkZXRlcm1pbmVSZXBvcnRUeXBlKGV2ZW50OiBTY2hlZHVsZWRFdmVudCk6ICdkYWlseScgfCAnd2Vla2x5JyB8ICdtb250aGx5JyB7XHJcbiAgY29uc3QgcnVsZU5hbWUgPSBldmVudC5yZXNvdXJjZXM/LlswXT8uc3BsaXQoJy8nKT8ucG9wKCkgfHwgJyc7XHJcbiAgXHJcbiAgaWYgKHJ1bGVOYW1lLmluY2x1ZGVzKCdkYWlseScpKSB7XHJcbiAgICByZXR1cm4gJ2RhaWx5JztcclxuICB9IGVsc2UgaWYgKHJ1bGVOYW1lLmluY2x1ZGVzKCd3ZWVrbHknKSkge1xyXG4gICAgcmV0dXJuICd3ZWVrbHknO1xyXG4gIH0gZWxzZSBpZiAocnVsZU5hbWUuaW5jbHVkZXMoJ21vbnRobHknKSkge1xyXG4gICAgcmV0dXJuICdtb250aGx5JztcclxuICB9XHJcbiAgXHJcbiAgLy8gRGVmYXVsdCB0byBkYWlseVxyXG4gIHJldHVybiAnZGFpbHknO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlIHJlcG9ydCBwZXJpb2QgYmFzZWQgb24gcmVwb3J0IHR5cGVcclxuICovXHJcbmZ1bmN0aW9uIGNhbGN1bGF0ZVJlcG9ydFBlcmlvZChyZXBvcnRUeXBlOiAnZGFpbHknIHwgJ3dlZWtseScgfCAnbW9udGhseScpOiB7IHN0YXJ0RGF0ZTogc3RyaW5nOyBlbmREYXRlOiBzdHJpbmcgfSB7XHJcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuICBjb25zdCBlbmREYXRlID0gbm93LnRvSVNPU3RyaW5nKCk7XHJcbiAgbGV0IHN0YXJ0RGF0ZTogRGF0ZTtcclxuXHJcbiAgc3dpdGNoIChyZXBvcnRUeXBlKSB7XHJcbiAgICBjYXNlICdkYWlseSc6XHJcbiAgICAgIC8vIFByZXZpb3VzIDI0IGhvdXJzXHJcbiAgICAgIHN0YXJ0RGF0ZSA9IG5ldyBEYXRlKG5vdy5nZXRUaW1lKCkgLSAyNCAqIDYwICogNjAgKiAxMDAwKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICd3ZWVrbHknOlxyXG4gICAgICAvLyBQcmV2aW91cyA3IGRheXNcclxuICAgICAgc3RhcnREYXRlID0gbmV3IERhdGUobm93LmdldFRpbWUoKSAtIDcgKiAyNCAqIDYwICogNjAgKiAxMDAwKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBjYXNlICdtb250aGx5JzpcclxuICAgICAgLy8gUHJldmlvdXMgMzAgZGF5c1xyXG4gICAgICBzdGFydERhdGUgPSBuZXcgRGF0ZShub3cuZ2V0VGltZSgpIC0gMzAgKiAyNCAqIDYwICogNjAgKiAxMDAwKTtcclxuICAgICAgYnJlYWs7XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc3RhcnREYXRlOiBzdGFydERhdGUudG9JU09TdHJpbmcoKSxcclxuICAgIGVuZERhdGUsXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBwcmV2aW91cyBwZXJpb2QgZm9yIHRyZW5kIGNvbXBhcmlzb25cclxuICovXHJcbmZ1bmN0aW9uIGNhbGN1bGF0ZVByZXZpb3VzUGVyaW9kKFxyXG4gIHJlcG9ydFR5cGU6ICdkYWlseScgfCAnd2Vla2x5JyB8ICdtb250aGx5JyxcclxuICBjdXJyZW50U3RhcnREYXRlOiBzdHJpbmdcclxuKTogeyBzdGFydERhdGU6IHN0cmluZzsgZW5kRGF0ZTogc3RyaW5nIH0ge1xyXG4gIGNvbnN0IGN1cnJlbnRTdGFydCA9IG5ldyBEYXRlKGN1cnJlbnRTdGFydERhdGUpO1xyXG4gIGxldCBkdXJhdGlvbjogbnVtYmVyO1xyXG5cclxuICBzd2l0Y2ggKHJlcG9ydFR5cGUpIHtcclxuICAgIGNhc2UgJ2RhaWx5JzpcclxuICAgICAgZHVyYXRpb24gPSAyNCAqIDYwICogNjAgKiAxMDAwO1xyXG4gICAgICBicmVhaztcclxuICAgIGNhc2UgJ3dlZWtseSc6XHJcbiAgICAgIGR1cmF0aW9uID0gNyAqIDI0ICogNjAgKiA2MCAqIDEwMDA7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgY2FzZSAnbW9udGhseSc6XHJcbiAgICAgIGR1cmF0aW9uID0gMzAgKiAyNCAqIDYwICogNjAgKiAxMDAwO1xyXG4gICAgICBicmVhaztcclxuICB9XHJcblxyXG4gIGNvbnN0IHByZXZFbmREYXRlID0gbmV3IERhdGUoY3VycmVudFN0YXJ0LmdldFRpbWUoKSk7XHJcbiAgY29uc3QgcHJldlN0YXJ0RGF0ZSA9IG5ldyBEYXRlKGN1cnJlbnRTdGFydC5nZXRUaW1lKCkgLSBkdXJhdGlvbik7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBzdGFydERhdGU6IHByZXZTdGFydERhdGUudG9JU09TdHJpbmcoKSxcclxuICAgIGVuZERhdGU6IHByZXZFbmREYXRlLnRvSVNPU3RyaW5nKCksXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFF1ZXJ5IHRlc3QgZXhlY3V0aW9ucyBmb3IgYSB0aW1lIHBlcmlvZCB3aXRoIGJhdGNoIG9wdGltaXphdGlvblxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcXVlcnlFeGVjdXRpb25zKFxyXG4gIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudCxcclxuICB0YWJsZU5hbWU6IHN0cmluZyxcclxuICBzdGFydERhdGU6IHN0cmluZyxcclxuICBlbmREYXRlOiBzdHJpbmdcclxuKTogUHJvbWlzZTxUZXN0RXhlY3V0aW9uW10+IHtcclxuICBjb25zdCBleGVjdXRpb25zOiBUZXN0RXhlY3V0aW9uW10gPSBbXTtcclxuICBsZXQgbGFzdEV2YWx1YXRlZEtleTogUmVjb3JkPHN0cmluZywgYW55PiB8IHVuZGVmaW5lZDtcclxuXHJcbiAgLy8gVXNlIGJhdGNoIHNpemUgb2YgMTAwIGZvciBvcHRpbWFsIHBlcmZvcm1hbmNlXHJcbiAgY29uc3QgQkFUQ0hfU0laRSA9IDEwMDtcclxuXHJcbiAgZG8ge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcclxuICAgICAgSW5kZXhOYW1lOiAnU3RhdHVzVGltZUluZGV4JyxcclxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJyNzdGF0dXMgPSA6c3RhdHVzIEFORCAjY3JlYXRlZEF0IEJFVFdFRU4gOnN0YXJ0RGF0ZSBBTkQgOmVuZERhdGUnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnLFxyXG4gICAgICAgICcjY3JlYXRlZEF0JzogJ2NyZWF0ZWRBdCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnN0YXR1cyc6ICdjb21wbGV0ZWQnLFxyXG4gICAgICAgICc6c3RhcnREYXRlJzogc3RhcnREYXRlLFxyXG4gICAgICAgICc6ZW5kRGF0ZSc6IGVuZERhdGUsXHJcbiAgICAgIH0sXHJcbiAgICAgIExpbWl0OiBCQVRDSF9TSVpFLCAvLyBCYXRjaCBzaXplIG9wdGltaXphdGlvblxyXG4gICAgICBFeGNsdXNpdmVTdGFydEtleTogbGFzdEV2YWx1YXRlZEtleSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgaWYgKHJlc3BvbnNlLkl0ZW1zKSB7XHJcbiAgICAgIGV4ZWN1dGlvbnMucHVzaCguLi4ocmVzcG9uc2UuSXRlbXMgYXMgVGVzdEV4ZWN1dGlvbltdKSk7XHJcbiAgICB9XHJcblxyXG4gICAgbGFzdEV2YWx1YXRlZEtleSA9IHJlc3BvbnNlLkxhc3RFdmFsdWF0ZWRLZXk7XHJcbiAgfSB3aGlsZSAobGFzdEV2YWx1YXRlZEtleSk7XHJcblxyXG4gIHJldHVybiBleGVjdXRpb25zO1xyXG59XHJcblxyXG4vKipcclxuICogQmF0Y2ggZ2V0IHRlc3QgY2FzZSBkZXRhaWxzIGZvciBtdWx0aXBsZSB0ZXN0IGNhc2VzXHJcbiAqIFVzZXMgRHluYW1vREIgQmF0Y2hHZXRJdGVtIGZvciBlZmZpY2llbnQgcmV0cmlldmFsXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBiYXRjaEdldFRlc3RDYXNlRGV0YWlscyhcclxuICBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsXHJcbiAgdGVzdENhc2VJZHM6IHN0cmluZ1tdXHJcbik6IFByb21pc2U8TWFwPHN0cmluZywgeyB0ZXN0TmFtZTogc3RyaW5nIH0+PiB7XHJcbiAgY29uc3QgdGVzdENhc2VNYXAgPSBuZXcgTWFwPHN0cmluZywgeyB0ZXN0TmFtZTogc3RyaW5nIH0+KCk7XHJcbiAgXHJcbiAgaWYgKHRlc3RDYXNlSWRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgcmV0dXJuIHRlc3RDYXNlTWFwO1xyXG4gIH1cclxuXHJcbiAgLy8gRHluYW1vREIgQmF0Y2hHZXRJdGVtIHN1cHBvcnRzIHVwIHRvIDEwMCBpdGVtcyBwZXIgcmVxdWVzdFxyXG4gIGNvbnN0IEJBVENIX1NJWkUgPSAxMDA7XHJcbiAgY29uc3QgYmF0Y2hlczogc3RyaW5nW11bXSA9IFtdO1xyXG4gIFxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGVzdENhc2VJZHMubGVuZ3RoOyBpICs9IEJBVENIX1NJWkUpIHtcclxuICAgIGJhdGNoZXMucHVzaCh0ZXN0Q2FzZUlkcy5zbGljZShpLCBpICsgQkFUQ0hfU0laRSkpO1xyXG4gIH1cclxuXHJcbiAgLy8gUHJvY2VzcyBiYXRjaGVzIGluIHBhcmFsbGVsIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcclxuICBhd2FpdCBQcm9taXNlLmFsbChcclxuICAgIGJhdGNoZXMubWFwKGFzeW5jIChiYXRjaCkgPT4ge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEJhdGNoR2V0Q29tbWFuZCh7XHJcbiAgICAgICAgUmVxdWVzdEl0ZW1zOiB7XHJcbiAgICAgICAgICBUZXN0Q2FzZXM6IHtcclxuICAgICAgICAgICAgS2V5czogYmF0Y2gubWFwKGlkID0+ICh7IHRlc3RDYXNlSWQ6IGlkIH0pKSxcclxuICAgICAgICAgICAgUHJvamVjdGlvbkV4cHJlc3Npb246ICd0ZXN0Q2FzZUlkLCAjbmFtZScsXHJcbiAgICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICAgICAgICcjbmFtZSc6ICduYW1lJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHJlc3BvbnNlLlJlc3BvbnNlcz8uVGVzdENhc2VzKSB7XHJcbiAgICAgICAgICByZXNwb25zZS5SZXNwb25zZXMuVGVzdENhc2VzLmZvckVhY2goKGl0ZW06IGFueSkgPT4ge1xyXG4gICAgICAgICAgICB0ZXN0Q2FzZU1hcC5zZXQoaXRlbS50ZXN0Q2FzZUlkLCB7XHJcbiAgICAgICAgICAgICAgdGVzdE5hbWU6IGl0ZW0ubmFtZSB8fCBgVGVzdCAke2l0ZW0udGVzdENhc2VJZC5zdWJzdHJpbmcoMCwgOCl9YCxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYmF0Y2ggZ2V0dGluZyB0ZXN0IGNhc2UgZGV0YWlsczonLCBlcnJvcik7XHJcbiAgICAgICAgLy8gQ29udGludWUgd2l0aCBvdGhlciBiYXRjaGVzIGV2ZW4gaWYgb25lIGZhaWxzXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgKTtcclxuXHJcbiAgcmV0dXJuIHRlc3RDYXNlTWFwO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlIHN1bW1hcnkgc3RhdGlzdGljc1xyXG4gKi9cclxuZnVuY3Rpb24gY2FsY3VsYXRlU3RhdGlzdGljcyhleGVjdXRpb25zOiBUZXN0RXhlY3V0aW9uW10pOiB7XHJcbiAgdG90YWxFeGVjdXRpb25zOiBudW1iZXI7XHJcbiAgcGFzc1JhdGU6IG51bWJlcjtcclxuICBmYWlsUmF0ZTogbnVtYmVyO1xyXG4gIGVycm9yUmF0ZTogbnVtYmVyO1xyXG4gIGF2ZXJhZ2VEdXJhdGlvbjogbnVtYmVyO1xyXG59IHtcclxuICBpZiAoZXhlY3V0aW9ucy5sZW5ndGggPT09IDApIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRvdGFsRXhlY3V0aW9uczogMCxcclxuICAgICAgcGFzc1JhdGU6IDAsXHJcbiAgICAgIGZhaWxSYXRlOiAwLFxyXG4gICAgICBlcnJvclJhdGU6IDAsXHJcbiAgICAgIGF2ZXJhZ2VEdXJhdGlvbjogMCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCB0b3RhbEV4ZWN1dGlvbnMgPSBleGVjdXRpb25zLmxlbmd0aDtcclxuICBjb25zdCBwYXNzZWQgPSBleGVjdXRpb25zLmZpbHRlcihlID0+IGUucmVzdWx0ID09PSAncGFzcycpLmxlbmd0aDtcclxuICBjb25zdCBmYWlsZWQgPSBleGVjdXRpb25zLmZpbHRlcihlID0+IGUucmVzdWx0ID09PSAnZmFpbCcpLmxlbmd0aDtcclxuICBjb25zdCBlcnJvcnMgPSBleGVjdXRpb25zLmZpbHRlcihlID0+IGUucmVzdWx0ID09PSAnZXJyb3InKS5sZW5ndGg7XHJcblxyXG4gIGNvbnN0IHRvdGFsRHVyYXRpb24gPSBleGVjdXRpb25zLnJlZHVjZSgoc3VtLCBlKSA9PiBzdW0gKyAoZS5kdXJhdGlvbiB8fCAwKSwgMCk7XHJcbiAgY29uc3QgYXZlcmFnZUR1cmF0aW9uID0gdG90YWxEdXJhdGlvbiAvIHRvdGFsRXhlY3V0aW9ucztcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHRvdGFsRXhlY3V0aW9ucyxcclxuICAgIHBhc3NSYXRlOiAocGFzc2VkIC8gdG90YWxFeGVjdXRpb25zKSAqIDEwMCxcclxuICAgIGZhaWxSYXRlOiAoZmFpbGVkIC8gdG90YWxFeGVjdXRpb25zKSAqIDEwMCxcclxuICAgIGVycm9yUmF0ZTogKGVycm9ycyAvIHRvdGFsRXhlY3V0aW9ucykgKiAxMDAsXHJcbiAgICBhdmVyYWdlRHVyYXRpb246IE1hdGgucm91bmQoYXZlcmFnZUR1cmF0aW9uKSxcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlIHRyZW5kcyBjb21wYXJlZCB0byBwcmV2aW91cyBwZXJpb2RcclxuICovXHJcbmZ1bmN0aW9uIGNhbGN1bGF0ZVRyZW5kcyhcclxuICBjdXJyZW50U3RhdHM6IHsgdG90YWxFeGVjdXRpb25zOiBudW1iZXI7IHBhc3NSYXRlOiBudW1iZXIgfSxcclxuICBwcmV2aW91c1N0YXRzOiB7IHRvdGFsRXhlY3V0aW9uczogbnVtYmVyOyBwYXNzUmF0ZTogbnVtYmVyIH1cclxuKToge1xyXG4gIGV4ZWN1dGlvbkNoYW5nZTogbnVtYmVyO1xyXG4gIHBhc3NSYXRlQ2hhbmdlOiBudW1iZXI7XHJcbn0ge1xyXG4gIGxldCBleGVjdXRpb25DaGFuZ2UgPSAwO1xyXG4gIGxldCBwYXNzUmF0ZUNoYW5nZSA9IDA7XHJcblxyXG4gIGlmIChwcmV2aW91c1N0YXRzLnRvdGFsRXhlY3V0aW9ucyA+IDApIHtcclxuICAgIGV4ZWN1dGlvbkNoYW5nZSA9ICgoY3VycmVudFN0YXRzLnRvdGFsRXhlY3V0aW9ucyAtIHByZXZpb3VzU3RhdHMudG90YWxFeGVjdXRpb25zKSAvIHByZXZpb3VzU3RhdHMudG90YWxFeGVjdXRpb25zKSAqIDEwMDtcclxuICB9XHJcblxyXG4gIGlmIChwcmV2aW91c1N0YXRzLnBhc3NSYXRlID4gMCkge1xyXG4gICAgcGFzc1JhdGVDaGFuZ2UgPSBjdXJyZW50U3RhdHMucGFzc1JhdGUgLSBwcmV2aW91c1N0YXRzLnBhc3NSYXRlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGV4ZWN1dGlvbkNoYW5nZTogTWF0aC5yb3VuZChleGVjdXRpb25DaGFuZ2UgKiAxMDApIC8gMTAwLFxyXG4gICAgcGFzc1JhdGVDaGFuZ2U6IE1hdGgucm91bmQocGFzc1JhdGVDaGFuZ2UgKiAxMDApIC8gMTAwLFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJZGVudGlmeSB0b3AgZmFpbGluZyB0ZXN0cyB3aXRoIGJhdGNoIG9wdGltaXphdGlvblxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gaWRlbnRpZnlUb3BGYWlsaW5nVGVzdHMoXHJcbiAgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LFxyXG4gIGV4ZWN1dGlvbnM6IFRlc3RFeGVjdXRpb25bXVxyXG4pOiBQcm9taXNlPEFycmF5PHtcclxuICB0ZXN0Q2FzZUlkOiBzdHJpbmc7XHJcbiAgdGVzdE5hbWU6IHN0cmluZztcclxuICBmYWlsdXJlQ291bnQ6IG51bWJlcjtcclxuICBsYXN0RmFpbHVyZTogc3RyaW5nO1xyXG59Pj4ge1xyXG4gIC8vIEdyb3VwIGZhaWx1cmVzIGJ5IHRlc3QgY2FzZVxyXG4gIGNvbnN0IGZhaWx1cmVNYXAgPSBuZXcgTWFwPHN0cmluZywgeyBjb3VudDogbnVtYmVyOyBsYXN0RmFpbHVyZTogc3RyaW5nIH0+KCk7XHJcblxyXG4gIGV4ZWN1dGlvbnNcclxuICAgIC5maWx0ZXIoZSA9PiBlLnJlc3VsdCA9PT0gJ2ZhaWwnIHx8IGUucmVzdWx0ID09PSAnZXJyb3InKVxyXG4gICAgLmZvckVhY2goZSA9PiB7XHJcbiAgICAgIGlmIChlLnRlc3RDYXNlSWQpIHtcclxuICAgICAgICBjb25zdCBleGlzdGluZyA9IGZhaWx1cmVNYXAuZ2V0KGUudGVzdENhc2VJZCk7XHJcbiAgICAgICAgaWYgKGV4aXN0aW5nKSB7XHJcbiAgICAgICAgICBleGlzdGluZy5jb3VudCsrO1xyXG4gICAgICAgICAgaWYgKGUuZW5kVGltZSAmJiBlLmVuZFRpbWUgPiBleGlzdGluZy5sYXN0RmFpbHVyZSkge1xyXG4gICAgICAgICAgICBleGlzdGluZy5sYXN0RmFpbHVyZSA9IGUuZW5kVGltZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZmFpbHVyZU1hcC5zZXQoZS50ZXN0Q2FzZUlkLCB7XHJcbiAgICAgICAgICAgIGNvdW50OiAxLFxyXG4gICAgICAgICAgICBsYXN0RmFpbHVyZTogZS5lbmRUaW1lIHx8IGUuY3JlYXRlZEF0LFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgLy8gR2V0IHRlc3QgY2FzZSBJRHMgZm9yIGJhdGNoIHJldHJpZXZhbFxyXG4gIGNvbnN0IHRlc3RDYXNlSWRzID0gQXJyYXkuZnJvbShmYWlsdXJlTWFwLmtleXMoKSk7XHJcbiAgXHJcbiAgLy8gQmF0Y2ggZ2V0IHRlc3QgY2FzZSBkZXRhaWxzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcclxuICBjb25zdCB0ZXN0Q2FzZURldGFpbHMgPSBhd2FpdCBiYXRjaEdldFRlc3RDYXNlRGV0YWlscyhkb2NDbGllbnQsIHRlc3RDYXNlSWRzKTtcclxuXHJcbiAgLy8gQ29udmVydCB0byBhcnJheSBhbmQgc29ydCBieSBmYWlsdXJlIGNvdW50XHJcbiAgY29uc3QgdG9wRmFpbGluZyA9IEFycmF5LmZyb20oZmFpbHVyZU1hcC5lbnRyaWVzKCkpXHJcbiAgICAubWFwKChbdGVzdENhc2VJZCwgZGF0YV0pID0+ICh7XHJcbiAgICAgIHRlc3RDYXNlSWQsXHJcbiAgICAgIHRlc3ROYW1lOiB0ZXN0Q2FzZURldGFpbHMuZ2V0KHRlc3RDYXNlSWQpPy50ZXN0TmFtZSB8fCBgVGVzdCAke3Rlc3RDYXNlSWQuc3Vic3RyaW5nKDAsIDgpfWAsXHJcbiAgICAgIGZhaWx1cmVDb3VudDogZGF0YS5jb3VudCxcclxuICAgICAgbGFzdEZhaWx1cmU6IGRhdGEubGFzdEZhaWx1cmUsXHJcbiAgICB9KSlcclxuICAgIC5zb3J0KChhLCBiKSA9PiBiLmZhaWx1cmVDb3VudCAtIGEuZmFpbHVyZUNvdW50KVxyXG4gICAgLnNsaWNlKDAsIDEwKTsgLy8gVG9wIDEwIGZhaWxpbmcgdGVzdHNcclxuXHJcbiAgcmV0dXJuIHRvcEZhaWxpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQdWJsaXNoIHJlcG9ydCBldmVudCB0byBub3RpZmljYXRpb24gcXVldWUgd2l0aCBmcmVxdWVuY3kgZmlsdGVyaW5nXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwdWJsaXNoUmVwb3J0RXZlbnQoXHJcbiAgc3FzQ2xpZW50OiBTUVNDbGllbnQsXHJcbiAgcXVldWVVcmw6IHN0cmluZyxcclxuICByZXBvcnREYXRhOiBTdW1tYXJ5UmVwb3J0RGF0YVxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBtZXNzYWdlID0ge1xyXG4gICAgZXZlbnRUeXBlOiAnc3VtbWFyeV9yZXBvcnQnLFxyXG4gICAgZXZlbnRJZDogYHJlcG9ydC0ke0RhdGUubm93KCl9YCxcclxuICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgcGF5bG9hZDoge1xyXG4gICAgICBwcm9qZWN0SWQ6ICdhbGwnLCAvLyBTdW1tYXJ5IGFjcm9zcyBhbGwgcHJvamVjdHNcclxuICAgICAgcmVwb3J0RGF0YSxcclxuICAgICAgcmVwb3J0VHlwZTogcmVwb3J0RGF0YS5yZXBvcnRUeXBlLCAvLyBJbmNsdWRlIHJlcG9ydCB0eXBlIGZvciBmcmVxdWVuY3kgZmlsdGVyaW5nXHJcbiAgICAgIHRyaWdnZXJlZEJ5OiAnc3lzdGVtJyxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBTZW5kTWVzc2FnZUNvbW1hbmQoe1xyXG4gICAgUXVldWVVcmw6IHF1ZXVlVXJsLFxyXG4gICAgTWVzc2FnZUJvZHk6IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLFxyXG4gIH0pO1xyXG5cclxuICBhd2FpdCBzcXNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICBjb25zb2xlLmxvZygnUmVwb3J0IGV2ZW50IHB1Ymxpc2hlZCB0byBub3RpZmljYXRpb24gcXVldWUnLCB7IFxyXG4gICAgZXZlbnRJZDogbWVzc2FnZS5ldmVudElkLFxyXG4gICAgcmVwb3J0VHlwZTogcmVwb3J0RGF0YS5yZXBvcnRUeXBlLFxyXG4gIH0pO1xyXG59XHJcbiJdfQ==
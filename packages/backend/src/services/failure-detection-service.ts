/**
 * Failure Detection Service
 * 
 * Detects critical failure patterns and generates alerts:
 * - Suite failure rate > 50%
 * - 3 consecutive failures for a test case
 * - Generates critical alert notifications
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { TestExecution } from '../types/test-execution';

export interface CriticalAlert {
  alertType: 'suite_failure_threshold' | 'consecutive_failures';
  testCaseId?: string;
  testSuiteId?: string;
  suiteExecutionId?: string;
  severity: 'critical';
  reason: string;
  details: {
    failureRate?: number;
    consecutiveFailures?: number;
    affectedTests?: string[];
    lastFailure?: string;
    errorMessage?: string;
  };
  timestamp: string;
}

export class FailureDetectionService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.TEST_EXECUTIONS_TABLE || 'TestExecutions';
  }

  /**
   * Detect suite failure rate exceeding 50%
   * 
   * @param suiteExecutionId - Suite execution ID to check
   * @returns Critical alert if failure rate > 50%, null otherwise
   */
  async detectSuiteFailureRate(suiteExecutionId: string): Promise<CriticalAlert | null> {
    try {
      // Query all test case executions for this suite execution
      const executions = await this.querySuiteExecutions(suiteExecutionId);

      if (executions.length === 0) {
        console.log('No executions found for suite', { suiteExecutionId });
        return null;
      }

      // Calculate failure rate
      const totalTests = executions.length;
      const failedTests = executions.filter(
        e => e.result === 'fail' || e.result === 'error'
      ).length;
      const failureRate = (failedTests / totalTests) * 100;

      console.log('Suite failure rate calculated', {
        suiteExecutionId,
        totalTests,
        failedTests,
        failureRate,
      });

      // Check if failure rate exceeds 50%
      if (failureRate > 50) {
        const affectedTests = executions
          .filter(e => e.result === 'fail' || e.result === 'error')
          .map(e => e.testCaseId || 'unknown')
          .filter(id => id !== 'unknown');

        return {
          alertType: 'suite_failure_threshold',
          testSuiteId: executions[0]?.testSuiteId,
          suiteExecutionId,
          severity: 'critical',
          reason: `Test suite failure rate (${failureRate.toFixed(1)}%) exceeds 50% threshold`,
          details: {
            failureRate: Math.round(failureRate * 100) / 100,
            affectedTests,
            lastFailure: executions[executions.length - 1]?.endTime || executions[executions.length - 1]?.createdAt,
          },
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting suite failure rate', { suiteExecutionId, error });
      throw error;
    }
  }

  /**
   * Detect 3 consecutive failures for a test case
   * 
   * @param testCaseId - Test case ID to check
   * @param limit - Number of recent executions to check (default: 3)
   * @returns Critical alert if 3 consecutive failures detected, null otherwise
   */
  async detectConsecutiveFailures(testCaseId: string, limit: number = 3): Promise<CriticalAlert | null> {
    try {
      // Query recent executions for this test case
      const executions = await this.queryTestCaseExecutions(testCaseId, limit);

      if (executions.length < 3) {
        console.log('Not enough executions to detect consecutive failures', {
          testCaseId,
          executionCount: executions.length,
        });
        return null;
      }

      // Check if last 3 executions are all failures
      const recentThree = executions.slice(0, 3);
      const allFailed = recentThree.every(e => e.result === 'fail' || e.result === 'error');

      console.log('Consecutive failure check', {
        testCaseId,
        recentThree: recentThree.map(e => ({ executionId: e.executionId, result: e.result })),
        allFailed,
      });

      if (allFailed) {
        const lastExecution = recentThree[0];

        return {
          alertType: 'consecutive_failures',
          testCaseId,
          severity: 'critical',
          reason: `Test case has failed 3 consecutive times`,
          details: {
            consecutiveFailures: 3,
            lastFailure: lastExecution.endTime || lastExecution.createdAt,
            errorMessage: lastExecution.errorMessage,
          },
          timestamp: new Date().toISOString(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting consecutive failures', { testCaseId, error });
      throw error;
    }
  }

  /**
   * Generate critical alert notification event
   * 
   * @param alert - Critical alert data
   * @param projectId - Project ID for the alert
   * @param triggeredBy - User ID who triggered the test
   * @returns Notification event ready to be published
   */
  generateCriticalAlert(
    alert: CriticalAlert,
    projectId: string,
    triggeredBy: string
  ): {
    eventType: 'critical_alert';
    eventId: string;
    timestamp: string;
    payload: any;
  } {
    const event = {
      eventType: 'critical_alert' as const,
      eventId: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: alert.timestamp,
      payload: {
        projectId,
        testCaseId: alert.testCaseId,
        testSuiteId: alert.testSuiteId,
        suiteExecutionId: alert.suiteExecutionId,
        status: 'error',
        result: 'error',
        errorMessage: alert.reason,
        alertType: alert.alertType,
        severity: alert.severity,
        details: alert.details,
        triggeredBy,
      },
    };

    console.log('Critical alert generated', {
      eventId: event.eventId,
      alertType: alert.alertType,
      testCaseId: alert.testCaseId,
      testSuiteId: alert.testSuiteId,
    });

    return event;
  }

  /**
   * Query suite executions from DynamoDB
   */
  private async querySuiteExecutions(suiteExecutionId: string): Promise<TestExecution[]> {
    const executions: TestExecution[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'SuiteExecutionIndex',
        KeyConditionExpression: 'suiteExecutionId = :suiteExecutionId',
        ExpressionAttributeValues: {
          ':suiteExecutionId': suiteExecutionId,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const response = await this.docClient.send(command);

      if (response.Items) {
        executions.push(...(response.Items as TestExecution[]));
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return executions;
  }

  /**
   * Query recent test case executions from DynamoDB
   */
  private async queryTestCaseExecutions(testCaseId: string, limit: number): Promise<TestExecution[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'TestCaseTimeIndex',
      KeyConditionExpression: 'testCaseId = :testCaseId',
      ExpressionAttributeValues: {
        ':testCaseId': testCaseId,
      },
      ScanIndexForward: false, // Sort descending (most recent first)
      Limit: limit,
    });

    const response = await this.docClient.send(command);

    return (response.Items as TestExecution[]) || [];
  }
}

// Export singleton instance
export const failureDetectionService = new FailureDetectionService();

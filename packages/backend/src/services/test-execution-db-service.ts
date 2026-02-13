/**
 * Test Execution Database Service
 * Handles DynamoDB operations for test executions
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand,
  QueryCommand 
} from '@aws-sdk/lib-dynamodb';
import { TestExecution, ExecutionStatus, ExecutionResult } from '../types/test-execution';

export interface QueryExecutionHistoryOptions {
  projectId?: string;
  testCaseId?: string;
  testSuiteId?: string;
  suiteExecutionId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
}

export interface ExecutionHistoryResult {
  executions: TestExecution[];
  lastEvaluatedKey?: Record<string, any>;
  count: number;
}

export class TestExecutionDBService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });

    this.tableName = process.env.TEST_EXECUTIONS_TABLE_NAME || 'TestExecutions';
  }

  /**
   * Create a new execution record with status "queued"
   */
  async createExecution(execution: TestExecution): Promise<void> {
    try {
      console.log(`Creating execution record: ${execution.executionId}`);

      const command = new PutCommand({
        TableName: this.tableName,
        Item: execution,
        ConditionExpression: 'attribute_not_exists(executionId)',
      });

      await this.docClient.send(command);
      console.log(`Execution record created successfully`);
    } catch (error) {
      console.error('Failed to create execution record:', error);
      throw new Error(`Failed to create execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<TestExecution | null> {
    try {
      console.log(`Getting execution: ${executionId}`);

      const command = new GetCommand({
        TableName: this.tableName,
        Key: { executionId },
      });

      const result = await this.docClient.send(command);
      
      if (!result.Item) {
        console.log(`Execution not found: ${executionId}`);
        return null;
      }

      return result.Item as TestExecution;
    } catch (error) {
      console.error('Failed to get execution:', error);
      throw new Error(`Failed to get execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update execution status
   */
  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus
  ): Promise<void> {
    try {
      console.log(`Updating execution ${executionId} status to: ${status}`);

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { executionId },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString(),
        },
      });

      await this.docClient.send(command);
      console.log(`Execution status updated successfully`);
    } catch (error) {
      console.error('Failed to update execution status:', error);
      throw new Error(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update execution with final results
   */
  async updateExecutionResults(execution: TestExecution): Promise<void> {
    try {
      console.log(`Updating execution ${execution.executionId} with final results`);

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { executionId: execution.executionId },
        UpdateExpression: `
          SET #status = :status,
              #result = :result,
              #endTime = :endTime,
              #duration = :duration,
              #steps = :steps,
              #screenshots = :screenshots,
              #errorMessage = :errorMessage,
              #updatedAt = :updatedAt
        `,
        ExpressionAttributeNames: {
          '#status': 'status',
          '#result': 'result',
          '#endTime': 'endTime',
          '#duration': 'duration',
          '#steps': 'steps',
          '#screenshots': 'screenshots',
          '#errorMessage': 'errorMessage',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':status': execution.status,
          ':result': execution.result,
          ':endTime': execution.endTime,
          ':duration': execution.duration,
          ':steps': execution.steps,
          ':screenshots': execution.screenshots,
          ':errorMessage': execution.errorMessage || null,
          ':updatedAt': execution.updatedAt,
        },
      });

      await this.docClient.send(command);
      console.log(`Execution results updated successfully`);
    } catch (error) {
      console.error('Failed to update execution results:', error);
      throw new Error(`Failed to update results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query execution history with filters
   */
  async queryExecutionHistory(
    options: QueryExecutionHistoryOptions
  ): Promise<ExecutionHistoryResult> {
    try {
      console.log('Querying execution history with options:', options);

      // Determine which index to use based on provided filters
      let indexName: string | undefined;
      let keyConditionExpression: string;
      let expressionAttributeNames: Record<string, string> = {};
      let expressionAttributeValues: Record<string, any> = {};
      let filterExpression: string | undefined;

      if (options.suiteExecutionId) {
        // Query by suite execution ID using GSI4
        indexName = 'SuiteExecutionIndex';
        keyConditionExpression = '#suiteExecutionId = :suiteExecutionId';
        expressionAttributeNames['#suiteExecutionId'] = 'suiteExecutionId';
        expressionAttributeValues[':suiteExecutionId'] = options.suiteExecutionId;
      } else if (options.testSuiteId) {
        // Query by test suite ID using GSI3
        indexName = 'TestSuiteIndex';
        keyConditionExpression = '#testSuiteId = :testSuiteId';
        expressionAttributeNames['#testSuiteId'] = 'testSuiteId';
        expressionAttributeValues[':testSuiteId'] = options.testSuiteId;
      } else if (options.testCaseId) {
        // Query by test case ID using GSI2
        indexName = 'TestCaseIndex';
        keyConditionExpression = '#testCaseId = :testCaseId';
        expressionAttributeNames['#testCaseId'] = 'testCaseId';
        expressionAttributeValues[':testCaseId'] = options.testCaseId;
      } else if (options.projectId) {
        // Query by project ID using GSI1
        indexName = 'ProjectIndex';
        keyConditionExpression = '#projectId = :projectId';
        expressionAttributeNames['#projectId'] = 'projectId';
        expressionAttributeValues[':projectId'] = options.projectId;
      } else {
        throw new Error('At least one filter (projectId, testCaseId, testSuiteId, or suiteExecutionId) is required');
      }

      // Add date range filter if provided
      if (options.startDate || options.endDate) {
        const filterParts: string[] = [];
        
        if (options.startDate) {
          filterParts.push('#createdAt >= :startDate');
          expressionAttributeNames['#createdAt'] = 'createdAt';
          expressionAttributeValues[':startDate'] = options.startDate;
        }
        
        if (options.endDate) {
          filterParts.push('#createdAt <= :endDate');
          expressionAttributeNames['#createdAt'] = 'createdAt';
          expressionAttributeValues[':endDate'] = options.endDate;
        }
        
        filterExpression = filterParts.join(' AND ');
      }

      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 
          ? expressionAttributeNames 
          : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: false, // Most recent first
        Limit: options.limit || 50,
        ExclusiveStartKey: options.exclusiveStartKey,
      });

      const result = await this.docClient.send(command);

      console.log(`Found ${result.Count} executions`);

      return {
        executions: (result.Items || []) as TestExecution[],
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count || 0,
      };
    } catch (error) {
      console.error('Failed to query execution history:', error);
      throw new Error(`Failed to query history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all executions for a suite execution
   */
  async getSuiteExecutions(suiteExecutionId: string): Promise<TestExecution[]> {
    try {
      console.log(`Getting all executions for suite: ${suiteExecutionId}`);

      const result = await this.queryExecutionHistory({
        suiteExecutionId,
        limit: 100, // Reasonable limit for suite size
      });

      return result.executions;
    } catch (error) {
      console.error('Failed to get suite executions:', error);
      throw new Error(`Failed to get suite executions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate suite aggregate results from test case results
   * Returns total, passed, failed, and error counts
   */
  calculateSuiteAggregateResults(testCaseExecutions: TestExecution[]): {
    total: number;
    passed: number;
    failed: number;
    errors: number;
  } {
    const aggregate = {
      total: testCaseExecutions.length,
      passed: 0,
      failed: 0,
      errors: 0,
    };

    for (const execution of testCaseExecutions) {
      if (execution.result === 'pass') {
        aggregate.passed++;
      } else if (execution.result === 'fail') {
        aggregate.failed++;
      } else if (execution.result === 'error') {
        aggregate.errors++;
      }
    }

    return aggregate;
  }

  /**
   * Determine suite status based on test case statuses
   * Suite is "running" if any test case is queued or running
   * Suite is "completed" if all test cases are completed or error
   * Suite is "error" if all test cases are error
   */
  determineSuiteStatus(testCaseExecutions: TestExecution[]): ExecutionStatus {
    if (testCaseExecutions.length === 0) {
      return 'queued';
    }

    const hasQueued = testCaseExecutions.some(e => e.status === 'queued');
    const hasRunning = testCaseExecutions.some(e => e.status === 'running');
    
    // If any test case is still queued or running, suite is running
    if (hasQueued || hasRunning) {
      return 'running';
    }

    // All test cases are in terminal state (completed or error)
    const allError = testCaseExecutions.every(e => e.status === 'error');
    
    if (allError) {
      return 'error';
    }

    return 'completed';
  }

  /**
   * Update suite execution with aggregate results and status
   */
  async updateSuiteExecution(suiteExecutionId: string): Promise<void> {
    try {
      console.log(`Updating suite execution: ${suiteExecutionId}`);

      // Get all test case executions for this suite
      const testCaseExecutions = await this.getSuiteExecutions(suiteExecutionId);

      if (testCaseExecutions.length === 0) {
        console.log(`No test case executions found for suite ${suiteExecutionId}`);
        return;
      }

      // Calculate aggregate results
      const aggregate = this.calculateSuiteAggregateResults(testCaseExecutions);
      
      // Determine suite status
      const suiteStatus = this.determineSuiteStatus(testCaseExecutions);

      // Determine suite result based on aggregate
      let suiteResult: ExecutionResult | undefined;
      if (suiteStatus === 'completed') {
        if (aggregate.failed > 0 || aggregate.errors > 0) {
          suiteResult = 'fail';
        } else {
          suiteResult = 'pass';
        }
      } else if (suiteStatus === 'error') {
        suiteResult = 'error';
      }

      console.log(`Suite ${suiteExecutionId} status: ${suiteStatus}, result: ${suiteResult}`);
      console.log(`Aggregate: ${aggregate.passed}/${aggregate.total} passed, ${aggregate.failed} failed, ${aggregate.errors} errors`);

      // Get the suite execution record
      const suiteExecution = await this.getExecution(suiteExecutionId);
      
      if (!suiteExecution) {
        console.error(`Suite execution ${suiteExecutionId} not found`);
        return;
      }

      // Calculate suite duration and end time if completed
      let endTime = suiteExecution.endTime;
      let duration = suiteExecution.duration;

      if (suiteStatus === 'completed' || suiteStatus === 'error') {
        // Find the latest end time from test case executions
        const completedExecutions = testCaseExecutions.filter(e => e.endTime);
        if (completedExecutions.length > 0) {
          const latestEndTime = completedExecutions
            .map(e => new Date(e.endTime!).getTime())
            .reduce((max, time) => Math.max(max, time), 0);
          
          endTime = new Date(latestEndTime).toISOString();
          
          // Calculate duration from suite start time to latest end time
          if (suiteExecution.startTime) {
            duration = latestEndTime - new Date(suiteExecution.startTime).getTime();
          }
        }
      }

      // Update suite execution record
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { executionId: suiteExecutionId },
        UpdateExpression: `
          SET #status = :status,
              #result = :result,
              #endTime = :endTime,
              #duration = :duration,
              #updatedAt = :updatedAt,
              #metadata = :metadata
        `,
        ExpressionAttributeNames: {
          '#status': 'status',
          '#result': 'result',
          '#endTime': 'endTime',
          '#duration': 'duration',
          '#updatedAt': 'updatedAt',
          '#metadata': 'metadata',
        },
        ExpressionAttributeValues: {
          ':status': suiteStatus,
          ':result': suiteResult || null,
          ':endTime': endTime || null,
          ':duration': duration || null,
          ':updatedAt': new Date().toISOString(),
          ':metadata': {
            ...suiteExecution.metadata,
            aggregate,
          },
        },
      });

      await this.docClient.send(command);
      console.log(`Suite execution ${suiteExecutionId} updated successfully`);
    } catch (error) {
      console.error('Failed to update suite execution:', error);
      throw new Error(`Failed to update suite execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const testExecutionDBService = new TestExecutionDBService();

"use strict";
/**
 * Test Execution Database Service
 * Handles DynamoDB operations for test executions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testExecutionDBService = exports.TestExecutionDBService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class TestExecutionDBService {
    docClient;
    tableName;
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
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
    async createExecution(execution) {
        try {
            console.log(`Creating execution record: ${execution.executionId}`);
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: execution,
                ConditionExpression: 'attribute_not_exists(executionId)',
            });
            await this.docClient.send(command);
            console.log(`Execution record created successfully`);
        }
        catch (error) {
            console.error('Failed to create execution record:', error);
            throw new Error(`Failed to create execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get execution by ID
     */
    async getExecution(executionId) {
        try {
            console.log(`Getting execution: ${executionId}`);
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { executionId },
            });
            const result = await this.docClient.send(command);
            if (!result.Item) {
                console.log(`Execution not found: ${executionId}`);
                return null;
            }
            return result.Item;
        }
        catch (error) {
            console.error('Failed to get execution:', error);
            throw new Error(`Failed to get execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update execution status
     */
    async updateExecutionStatus(executionId, status) {
        try {
            console.log(`Updating execution ${executionId} status to: ${status}`);
            const command = new lib_dynamodb_1.UpdateCommand({
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
        }
        catch (error) {
            console.error('Failed to update execution status:', error);
            throw new Error(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Update execution with final results
     */
    async updateExecutionResults(execution) {
        try {
            console.log(`Updating execution ${execution.executionId} with final results`);
            const command = new lib_dynamodb_1.UpdateCommand({
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
        }
        catch (error) {
            console.error('Failed to update execution results:', error);
            throw new Error(`Failed to update results: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Query execution history with filters
     */
    async queryExecutionHistory(options) {
        try {
            console.log('Querying execution history with options:', options);
            // Determine which index to use based on provided filters
            let indexName;
            let keyConditionExpression;
            let expressionAttributeNames = {};
            let expressionAttributeValues = {};
            let filterExpression;
            if (options.suiteExecutionId) {
                // Query by suite execution ID using GSI4
                indexName = 'SuiteExecutionIndex';
                keyConditionExpression = '#suiteExecutionId = :suiteExecutionId';
                expressionAttributeNames['#suiteExecutionId'] = 'suiteExecutionId';
                expressionAttributeValues[':suiteExecutionId'] = options.suiteExecutionId;
            }
            else if (options.testSuiteId) {
                // Query by test suite ID using GSI3
                indexName = 'TestSuiteIndex';
                keyConditionExpression = '#testSuiteId = :testSuiteId';
                expressionAttributeNames['#testSuiteId'] = 'testSuiteId';
                expressionAttributeValues[':testSuiteId'] = options.testSuiteId;
            }
            else if (options.testCaseId) {
                // Query by test case ID using GSI2
                indexName = 'TestCaseIndex';
                keyConditionExpression = '#testCaseId = :testCaseId';
                expressionAttributeNames['#testCaseId'] = 'testCaseId';
                expressionAttributeValues[':testCaseId'] = options.testCaseId;
            }
            else if (options.projectId) {
                // Query by project ID using GSI1
                indexName = 'ProjectIndex';
                keyConditionExpression = '#projectId = :projectId';
                expressionAttributeNames['#projectId'] = 'projectId';
                expressionAttributeValues[':projectId'] = options.projectId;
            }
            else {
                throw new Error('At least one filter (projectId, testCaseId, testSuiteId, or suiteExecutionId) is required');
            }
            // Add date range filter if provided
            if (options.startDate || options.endDate) {
                const filterParts = [];
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
            const command = new lib_dynamodb_1.QueryCommand({
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
                executions: (result.Items || []),
                lastEvaluatedKey: result.LastEvaluatedKey,
                count: result.Count || 0,
            };
        }
        catch (error) {
            console.error('Failed to query execution history:', error);
            throw new Error(`Failed to query history: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get all executions for a suite execution
     */
    async getSuiteExecutions(suiteExecutionId) {
        try {
            console.log(`Getting all executions for suite: ${suiteExecutionId}`);
            const result = await this.queryExecutionHistory({
                suiteExecutionId,
                limit: 100, // Reasonable limit for suite size
            });
            return result.executions;
        }
        catch (error) {
            console.error('Failed to get suite executions:', error);
            throw new Error(`Failed to get suite executions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Alias for getSuiteExecutions - Get all executions by suite execution ID
     */
    async getExecutionsBySuiteExecutionId(suiteExecutionId) {
        return this.getSuiteExecutions(suiteExecutionId);
    }
    /**
     * Calculate suite aggregate results from test case results
     * Returns total, passed, failed, and error counts
     */
    calculateSuiteAggregateResults(testCaseExecutions) {
        const aggregate = {
            total: testCaseExecutions.length,
            passed: 0,
            failed: 0,
            errors: 0,
        };
        for (const execution of testCaseExecutions) {
            if (execution.result === 'pass') {
                aggregate.passed++;
            }
            else if (execution.result === 'fail') {
                aggregate.failed++;
            }
            else if (execution.result === 'error') {
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
    determineSuiteStatus(testCaseExecutions) {
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
    async updateSuiteExecution(suiteExecutionId) {
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
            let suiteResult;
            if (suiteStatus === 'completed') {
                if (aggregate.failed > 0 || aggregate.errors > 0) {
                    suiteResult = 'fail';
                }
                else {
                    suiteResult = 'pass';
                }
            }
            else if (suiteStatus === 'error') {
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
                        .map(e => new Date(e.endTime).getTime())
                        .reduce((max, time) => Math.max(max, time), 0);
                    endTime = new Date(latestEndTime).toISOString();
                    // Calculate duration from suite start time to latest end time
                    if (suiteExecution.startTime) {
                        duration = latestEndTime - new Date(suiteExecution.startTime).getTime();
                    }
                }
            }
            // Update suite execution record
            const command = new lib_dynamodb_1.UpdateCommand({
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
        }
        catch (error) {
            console.error('Failed to update suite execution:', error);
            throw new Error(`Failed to update suite execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.TestExecutionDBService = TestExecutionDBService;
// Export singleton instance
exports.testExecutionDBService = new TestExecutionDBService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1leGVjdXRpb24tZGItc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QtZXhlY3V0aW9uLWRiLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBRUgsOERBQTBEO0FBQzFELHdEQU0rQjtBQW9CL0IsTUFBYSxzQkFBc0I7SUFDekIsU0FBUyxDQUF5QjtJQUNsQyxTQUFTLENBQVM7SUFFMUI7UUFDRSxNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUM7WUFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7U0FDOUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ25ELGVBQWUsRUFBRTtnQkFDZixrQkFBa0IsRUFBRSxLQUFLO2dCQUN6QixxQkFBcUIsRUFBRSxJQUFJO2FBQzVCO1lBQ0QsaUJBQWlCLEVBQUU7Z0JBQ2pCLFdBQVcsRUFBRSxLQUFLO2FBQ25CO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixJQUFJLGdCQUFnQixDQUFDO0lBQzlFLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxlQUFlLENBQUMsU0FBd0I7UUFDNUMsSUFBSSxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFFbkUsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBVSxDQUFDO2dCQUM3QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLElBQUksRUFBRSxTQUFTO2dCQUNmLG1CQUFtQixFQUFFLG1DQUFtQzthQUN6RCxDQUFDLENBQUM7WUFFSCxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FB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QUssQ0FBQyxxQ0FBcUMsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUNuSCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBamJELHdEQWliQztBQUVELDRCQUE0QjtBQUNmLFFBQUEsc0JBQXNCLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRlc3QgRXhlY3V0aW9uIERhdGFiYXNlIFNlcnZpY2VcclxuICogSGFuZGxlcyBEeW5hbW9EQiBvcGVyYXRpb25zIGZvciB0ZXN0IGV4ZWN1dGlvbnNcclxuICovXHJcblxyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IFxyXG4gIER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFxyXG4gIFB1dENvbW1hbmQsIFxyXG4gIEdldENvbW1hbmQsIFxyXG4gIFVwZGF0ZUNvbW1hbmQsXHJcbiAgUXVlcnlDb21tYW5kIFxyXG59IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFRlc3RFeGVjdXRpb24sIEV4ZWN1dGlvblN0YXR1cywgRXhlY3V0aW9uUmVzdWx0IH0gZnJvbSAnLi4vdHlwZXMvdGVzdC1leGVjdXRpb24nO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBRdWVyeUV4ZWN1dGlvbkhpc3RvcnlPcHRpb25zIHtcclxuICBwcm9qZWN0SWQ/OiBzdHJpbmc7XHJcbiAgdGVzdENhc2VJZD86IHN0cmluZztcclxuICB0ZXN0U3VpdGVJZD86IHN0cmluZztcclxuICBzdWl0ZUV4ZWN1dGlvbklkPzogc3RyaW5nO1xyXG4gIHN0YXJ0RGF0ZT86IHN0cmluZztcclxuICBlbmREYXRlPzogc3RyaW5nO1xyXG4gIGxpbWl0PzogbnVtYmVyO1xyXG4gIGV4Y2x1c2l2ZVN0YXJ0S2V5PzogUmVjb3JkPHN0cmluZywgYW55PjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFeGVjdXRpb25IaXN0b3J5UmVzdWx0IHtcclxuICBleGVjdXRpb25zOiBUZXN0RXhlY3V0aW9uW107XHJcbiAgbGFzdEV2YWx1YXRlZEtleT86IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbiAgY291bnQ6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFRlc3RFeGVjdXRpb25EQlNlcnZpY2Uge1xyXG4gIHByaXZhdGUgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG4gIHByaXZhdGUgdGFibGVOYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5kb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50LCB7XHJcbiAgICAgIG1hcnNoYWxsT3B0aW9uczoge1xyXG4gICAgICAgIGNvbnZlcnRFbXB0eVZhbHVlczogZmFsc2UsXHJcbiAgICAgICAgcmVtb3ZlVW5kZWZpbmVkVmFsdWVzOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICB1bm1hcnNoYWxsT3B0aW9uczoge1xyXG4gICAgICAgIHdyYXBOdW1iZXJzOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMudGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuVEVTVF9FWEVDVVRJT05TX1RBQkxFX05BTUUgfHwgJ1Rlc3RFeGVjdXRpb25zJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIG5ldyBleGVjdXRpb24gcmVjb3JkIHdpdGggc3RhdHVzIFwicXVldWVkXCJcclxuICAgKi9cclxuICBhc3luYyBjcmVhdGVFeGVjdXRpb24oZXhlY3V0aW9uOiBUZXN0RXhlY3V0aW9uKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgQ3JlYXRpbmcgZXhlY3V0aW9uIHJlY29yZDogJHtleGVjdXRpb24uZXhlY3V0aW9uSWR9YCk7XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSXRlbTogZXhlY3V0aW9uLFxyXG4gICAgICAgIENvbmRpdGlvbkV4cHJlc3Npb246ICdhdHRyaWJ1dGVfbm90X2V4aXN0cyhleGVjdXRpb25JZCknLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBFeGVjdXRpb24gcmVjb3JkIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5YCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIGV4ZWN1dGlvbiByZWNvcmQ6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgZXhlY3V0aW9uOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGV4ZWN1dGlvbiBieSBJRFxyXG4gICAqL1xyXG4gIGFzeW5jIGdldEV4ZWN1dGlvbihleGVjdXRpb25JZDogc3RyaW5nKTogUHJvbWlzZTxUZXN0RXhlY3V0aW9uIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coYEdldHRpbmcgZXhlY3V0aW9uOiAke2V4ZWN1dGlvbklkfWApO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBleGVjdXRpb25JZCB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3VsdC5JdGVtKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEV4ZWN1dGlvbiBub3QgZm91bmQ6ICR7ZXhlY3V0aW9uSWR9YCk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQuSXRlbSBhcyBUZXN0RXhlY3V0aW9uO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCBleGVjdXRpb246JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBnZXQgZXhlY3V0aW9uOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIGV4ZWN1dGlvbiBzdGF0dXNcclxuICAgKi9cclxuICBhc3luYyB1cGRhdGVFeGVjdXRpb25TdGF0dXMoXHJcbiAgICBleGVjdXRpb25JZDogc3RyaW5nLFxyXG4gICAgc3RhdHVzOiBFeGVjdXRpb25TdGF0dXNcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGluZyBleGVjdXRpb24gJHtleGVjdXRpb25JZH0gc3RhdHVzIHRvOiAke3N0YXR1c31gKTtcclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHsgZXhlY3V0aW9uSWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUICNzdGF0dXMgPSA6c3RhdHVzLCAjdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnLFxyXG4gICAgICAgICAgJyN1cGRhdGVkQXQnOiAndXBkYXRlZEF0JyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6c3RhdHVzJzogc3RhdHVzLFxyXG4gICAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgRXhlY3V0aW9uIHN0YXR1cyB1cGRhdGVkIHN1Y2Nlc3NmdWxseWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBleGVjdXRpb24gc3RhdHVzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHN0YXR1czogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSBleGVjdXRpb24gd2l0aCBmaW5hbCByZXN1bHRzXHJcbiAgICovXHJcbiAgYXN5bmMgdXBkYXRlRXhlY3V0aW9uUmVzdWx0cyhleGVjdXRpb246IFRlc3RFeGVjdXRpb24pOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGluZyBleGVjdXRpb24gJHtleGVjdXRpb24uZXhlY3V0aW9uSWR9IHdpdGggZmluYWwgcmVzdWx0c2ApO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBleGVjdXRpb25JZDogZXhlY3V0aW9uLmV4ZWN1dGlvbklkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogYFxyXG4gICAgICAgICAgU0VUICNzdGF0dXMgPSA6c3RhdHVzLFxyXG4gICAgICAgICAgICAgICNyZXN1bHQgPSA6cmVzdWx0LFxyXG4gICAgICAgICAgICAgICNlbmRUaW1lID0gOmVuZFRpbWUsXHJcbiAgICAgICAgICAgICAgI2R1cmF0aW9uID0gOmR1cmF0aW9uLFxyXG4gICAgICAgICAgICAgICNzdGVwcyA9IDpzdGVwcyxcclxuICAgICAgICAgICAgICAjc2NyZWVuc2hvdHMgPSA6c2NyZWVuc2hvdHMsXHJcbiAgICAgICAgICAgICAgI2Vycm9yTWVzc2FnZSA9IDplcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgI3VwZGF0ZWRBdCA9IDp1cGRhdGVkQXRcclxuICAgICAgICBgLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICAgJyNzdGF0dXMnOiAnc3RhdHVzJyxcclxuICAgICAgICAgICcjcmVzdWx0JzogJ3Jlc3VsdCcsXHJcbiAgICAgICAgICAnI2VuZFRpbWUnOiAnZW5kVGltZScsXHJcbiAgICAgICAgICAnI2R1cmF0aW9uJzogJ2R1cmF0aW9uJyxcclxuICAgICAgICAgICcjc3RlcHMnOiAnc3RlcHMnLFxyXG4gICAgICAgICAgJyNzY3JlZW5zaG90cyc6ICdzY3JlZW5zaG90cycsXHJcbiAgICAgICAgICAnI2Vycm9yTWVzc2FnZSc6ICdlcnJvck1lc3NhZ2UnLFxyXG4gICAgICAgICAgJyN1cGRhdGVkQXQnOiAndXBkYXRlZEF0JyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6c3RhdHVzJzogZXhlY3V0aW9uLnN0YXR1cyxcclxuICAgICAgICAgICc6cmVzdWx0JzogZXhlY3V0aW9uLnJlc3VsdCxcclxuICAgICAgICAgICc6ZW5kVGltZSc6IGV4ZWN1dGlvbi5lbmRUaW1lLFxyXG4gICAgICAgICAgJzpkdXJhdGlvbic6IGV4ZWN1dGlvbi5kdXJhdGlvbixcclxuICAgICAgICAgICc6c3RlcHMnOiBleGVjdXRpb24uc3RlcHMsXHJcbiAgICAgICAgICAnOnNjcmVlbnNob3RzJzogZXhlY3V0aW9uLnNjcmVlbnNob3RzLFxyXG4gICAgICAgICAgJzplcnJvck1lc3NhZ2UnOiBleGVjdXRpb24uZXJyb3JNZXNzYWdlIHx8IG51bGwsXHJcbiAgICAgICAgICAnOnVwZGF0ZWRBdCc6IGV4ZWN1dGlvbi51cGRhdGVkQXQsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgRXhlY3V0aW9uIHJlc3VsdHMgdXBkYXRlZCBzdWNjZXNzZnVsbHlgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB1cGRhdGUgZXhlY3V0aW9uIHJlc3VsdHM6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgcmVzdWx0czogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFF1ZXJ5IGV4ZWN1dGlvbiBoaXN0b3J5IHdpdGggZmlsdGVyc1xyXG4gICAqL1xyXG4gIGFzeW5jIHF1ZXJ5RXhlY3V0aW9uSGlzdG9yeShcclxuICAgIG9wdGlvbnM6IFF1ZXJ5RXhlY3V0aW9uSGlzdG9yeU9wdGlvbnNcclxuICApOiBQcm9taXNlPEV4ZWN1dGlvbkhpc3RvcnlSZXN1bHQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdRdWVyeWluZyBleGVjdXRpb24gaGlzdG9yeSB3aXRoIG9wdGlvbnM6Jywgb3B0aW9ucyk7XHJcblxyXG4gICAgICAvLyBEZXRlcm1pbmUgd2hpY2ggaW5kZXggdG8gdXNlIGJhc2VkIG9uIHByb3ZpZGVkIGZpbHRlcnNcclxuICAgICAgbGV0IGluZGV4TmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgICBsZXQga2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogc3RyaW5nO1xyXG4gICAgICBsZXQgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XHJcbiAgICAgIGxldCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcbiAgICAgIGxldCBmaWx0ZXJFeHByZXNzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblxyXG4gICAgICBpZiAob3B0aW9ucy5zdWl0ZUV4ZWN1dGlvbklkKSB7XHJcbiAgICAgICAgLy8gUXVlcnkgYnkgc3VpdGUgZXhlY3V0aW9uIElEIHVzaW5nIEdTSTRcclxuICAgICAgICBpbmRleE5hbWUgPSAnU3VpdGVFeGVjdXRpb25JbmRleCc7XHJcbiAgICAgICAga2V5Q29uZGl0aW9uRXhwcmVzc2lvbiA9ICcjc3VpdGVFeGVjdXRpb25JZCA9IDpzdWl0ZUV4ZWN1dGlvbklkJztcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNzdWl0ZUV4ZWN1dGlvbklkJ10gPSAnc3VpdGVFeGVjdXRpb25JZCc7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN1aXRlRXhlY3V0aW9uSWQnXSA9IG9wdGlvbnMuc3VpdGVFeGVjdXRpb25JZDtcclxuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLnRlc3RTdWl0ZUlkKSB7XHJcbiAgICAgICAgLy8gUXVlcnkgYnkgdGVzdCBzdWl0ZSBJRCB1c2luZyBHU0kzXHJcbiAgICAgICAgaW5kZXhOYW1lID0gJ1Rlc3RTdWl0ZUluZGV4JztcclxuICAgICAgICBrZXlDb25kaXRpb25FeHByZXNzaW9uID0gJyN0ZXN0U3VpdGVJZCA9IDp0ZXN0U3VpdGVJZCc7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdGVzdFN1aXRlSWQnXSA9ICd0ZXN0U3VpdGVJZCc7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnRlc3RTdWl0ZUlkJ10gPSBvcHRpb25zLnRlc3RTdWl0ZUlkO1xyXG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMudGVzdENhc2VJZCkge1xyXG4gICAgICAgIC8vIFF1ZXJ5IGJ5IHRlc3QgY2FzZSBJRCB1c2luZyBHU0kyXHJcbiAgICAgICAgaW5kZXhOYW1lID0gJ1Rlc3RDYXNlSW5kZXgnO1xyXG4gICAgICAgIGtleUNvbmRpdGlvbkV4cHJlc3Npb24gPSAnI3Rlc3RDYXNlSWQgPSA6dGVzdENhc2VJZCc7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdGVzdENhc2VJZCddID0gJ3Rlc3RDYXNlSWQnO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp0ZXN0Q2FzZUlkJ10gPSBvcHRpb25zLnRlc3RDYXNlSWQ7XHJcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5wcm9qZWN0SWQpIHtcclxuICAgICAgICAvLyBRdWVyeSBieSBwcm9qZWN0IElEIHVzaW5nIEdTSTFcclxuICAgICAgICBpbmRleE5hbWUgPSAnUHJvamVjdEluZGV4JztcclxuICAgICAgICBrZXlDb25kaXRpb25FeHByZXNzaW9uID0gJyNwcm9qZWN0SWQgPSA6cHJvamVjdElkJztcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNwcm9qZWN0SWQnXSA9ICdwcm9qZWN0SWQnO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpwcm9qZWN0SWQnXSA9IG9wdGlvbnMucHJvamVjdElkO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQXQgbGVhc3Qgb25lIGZpbHRlciAocHJvamVjdElkLCB0ZXN0Q2FzZUlkLCB0ZXN0U3VpdGVJZCwgb3Igc3VpdGVFeGVjdXRpb25JZCkgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQWRkIGRhdGUgcmFuZ2UgZmlsdGVyIGlmIHByb3ZpZGVkXHJcbiAgICAgIGlmIChvcHRpb25zLnN0YXJ0RGF0ZSB8fCBvcHRpb25zLmVuZERhdGUpIHtcclxuICAgICAgICBjb25zdCBmaWx0ZXJQYXJ0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAob3B0aW9ucy5zdGFydERhdGUpIHtcclxuICAgICAgICAgIGZpbHRlclBhcnRzLnB1c2goJyNjcmVhdGVkQXQgPj0gOnN0YXJ0RGF0ZScpO1xyXG4gICAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjY3JlYXRlZEF0J10gPSAnY3JlYXRlZEF0JztcclxuICAgICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpzdGFydERhdGUnXSA9IG9wdGlvbnMuc3RhcnREYXRlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAob3B0aW9ucy5lbmREYXRlKSB7XHJcbiAgICAgICAgICBmaWx0ZXJQYXJ0cy5wdXNoKCcjY3JlYXRlZEF0IDw9IDplbmREYXRlJyk7XHJcbiAgICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNjcmVhdGVkQXQnXSA9ICdjcmVhdGVkQXQnO1xyXG4gICAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVuZERhdGUnXSA9IG9wdGlvbnMuZW5kRGF0ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgZmlsdGVyRXhwcmVzc2lvbiA9IGZpbHRlclBhcnRzLmpvaW4oJyBBTkQgJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEluZGV4TmFtZTogaW5kZXhOYW1lLFxyXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246IGtleUNvbmRpdGlvbkV4cHJlc3Npb24sXHJcbiAgICAgICAgRmlsdGVyRXhwcmVzc2lvbjogZmlsdGVyRXhwcmVzc2lvbixcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IE9iamVjdC5rZXlzKGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcykubGVuZ3RoID4gMCBcclxuICAgICAgICAgID8gZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzIFxyXG4gICAgICAgICAgOiB1bmRlZmluZWQsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSwgLy8gTW9zdCByZWNlbnQgZmlyc3RcclxuICAgICAgICBMaW1pdDogb3B0aW9ucy5saW1pdCB8fCA1MCxcclxuICAgICAgICBFeGNsdXNpdmVTdGFydEtleTogb3B0aW9ucy5leGNsdXNpdmVTdGFydEtleSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYEZvdW5kICR7cmVzdWx0LkNvdW50fSBleGVjdXRpb25zYCk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGV4ZWN1dGlvbnM6IChyZXN1bHQuSXRlbXMgfHwgW10pIGFzIFRlc3RFeGVjdXRpb25bXSxcclxuICAgICAgICBsYXN0RXZhbHVhdGVkS2V5OiByZXN1bHQuTGFzdEV2YWx1YXRlZEtleSxcclxuICAgICAgICBjb3VudDogcmVzdWx0LkNvdW50IHx8IDAsXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcXVlcnkgZXhlY3V0aW9uIGhpc3Rvcnk6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBxdWVyeSBoaXN0b3J5OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFsbCBleGVjdXRpb25zIGZvciBhIHN1aXRlIGV4ZWN1dGlvblxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFN1aXRlRXhlY3V0aW9ucyhzdWl0ZUV4ZWN1dGlvbklkOiBzdHJpbmcpOiBQcm9taXNlPFRlc3RFeGVjdXRpb25bXT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coYEdldHRpbmcgYWxsIGV4ZWN1dGlvbnMgZm9yIHN1aXRlOiAke3N1aXRlRXhlY3V0aW9uSWR9YCk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnF1ZXJ5RXhlY3V0aW9uSGlzdG9yeSh7XHJcbiAgICAgICAgc3VpdGVFeGVjdXRpb25JZCxcclxuICAgICAgICBsaW1pdDogMTAwLCAvLyBSZWFzb25hYmxlIGxpbWl0IGZvciBzdWl0ZSBzaXplXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdC5leGVjdXRpb25zO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdldCBzdWl0ZSBleGVjdXRpb25zOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZ2V0IHN1aXRlIGV4ZWN1dGlvbnM6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBbGlhcyBmb3IgZ2V0U3VpdGVFeGVjdXRpb25zIC0gR2V0IGFsbCBleGVjdXRpb25zIGJ5IHN1aXRlIGV4ZWN1dGlvbiBJRFxyXG4gICAqL1xyXG4gIGFzeW5jIGdldEV4ZWN1dGlvbnNCeVN1aXRlRXhlY3V0aW9uSWQoc3VpdGVFeGVjdXRpb25JZDogc3RyaW5nKTogUHJvbWlzZTxUZXN0RXhlY3V0aW9uW10+IHtcclxuICAgIHJldHVybiB0aGlzLmdldFN1aXRlRXhlY3V0aW9ucyhzdWl0ZUV4ZWN1dGlvbklkKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBzdWl0ZSBhZ2dyZWdhdGUgcmVzdWx0cyBmcm9tIHRlc3QgY2FzZSByZXN1bHRzXHJcbiAgICogUmV0dXJucyB0b3RhbCwgcGFzc2VkLCBmYWlsZWQsIGFuZCBlcnJvciBjb3VudHNcclxuICAgKi9cclxuICBjYWxjdWxhdGVTdWl0ZUFnZ3JlZ2F0ZVJlc3VsdHModGVzdENhc2VFeGVjdXRpb25zOiBUZXN0RXhlY3V0aW9uW10pOiB7XHJcbiAgICB0b3RhbDogbnVtYmVyO1xyXG4gICAgcGFzc2VkOiBudW1iZXI7XHJcbiAgICBmYWlsZWQ6IG51bWJlcjtcclxuICAgIGVycm9yczogbnVtYmVyO1xyXG4gIH0ge1xyXG4gICAgY29uc3QgYWdncmVnYXRlID0ge1xyXG4gICAgICB0b3RhbDogdGVzdENhc2VFeGVjdXRpb25zLmxlbmd0aCxcclxuICAgICAgcGFzc2VkOiAwLFxyXG4gICAgICBmYWlsZWQ6IDAsXHJcbiAgICAgIGVycm9yczogMCxcclxuICAgIH07XHJcblxyXG4gICAgZm9yIChjb25zdCBleGVjdXRpb24gb2YgdGVzdENhc2VFeGVjdXRpb25zKSB7XHJcbiAgICAgIGlmIChleGVjdXRpb24ucmVzdWx0ID09PSAncGFzcycpIHtcclxuICAgICAgICBhZ2dyZWdhdGUucGFzc2VkKys7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXhlY3V0aW9uLnJlc3VsdCA9PT0gJ2ZhaWwnKSB7XHJcbiAgICAgICAgYWdncmVnYXRlLmZhaWxlZCsrO1xyXG4gICAgICB9IGVsc2UgaWYgKGV4ZWN1dGlvbi5yZXN1bHQgPT09ICdlcnJvcicpIHtcclxuICAgICAgICBhZ2dyZWdhdGUuZXJyb3JzKys7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYWdncmVnYXRlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0ZXJtaW5lIHN1aXRlIHN0YXR1cyBiYXNlZCBvbiB0ZXN0IGNhc2Ugc3RhdHVzZXNcclxuICAgKiBTdWl0ZSBpcyBcInJ1bm5pbmdcIiBpZiBhbnkgdGVzdCBjYXNlIGlzIHF1ZXVlZCBvciBydW5uaW5nXHJcbiAgICogU3VpdGUgaXMgXCJjb21wbGV0ZWRcIiBpZiBhbGwgdGVzdCBjYXNlcyBhcmUgY29tcGxldGVkIG9yIGVycm9yXHJcbiAgICogU3VpdGUgaXMgXCJlcnJvclwiIGlmIGFsbCB0ZXN0IGNhc2VzIGFyZSBlcnJvclxyXG4gICAqL1xyXG4gIGRldGVybWluZVN1aXRlU3RhdHVzKHRlc3RDYXNlRXhlY3V0aW9uczogVGVzdEV4ZWN1dGlvbltdKTogRXhlY3V0aW9uU3RhdHVzIHtcclxuICAgIGlmICh0ZXN0Q2FzZUV4ZWN1dGlvbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiAncXVldWVkJztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBoYXNRdWV1ZWQgPSB0ZXN0Q2FzZUV4ZWN1dGlvbnMuc29tZShlID0+IGUuc3RhdHVzID09PSAncXVldWVkJyk7XHJcbiAgICBjb25zdCBoYXNSdW5uaW5nID0gdGVzdENhc2VFeGVjdXRpb25zLnNvbWUoZSA9PiBlLnN0YXR1cyA9PT0gJ3J1bm5pbmcnKTtcclxuICAgIFxyXG4gICAgLy8gSWYgYW55IHRlc3QgY2FzZSBpcyBzdGlsbCBxdWV1ZWQgb3IgcnVubmluZywgc3VpdGUgaXMgcnVubmluZ1xyXG4gICAgaWYgKGhhc1F1ZXVlZCB8fCBoYXNSdW5uaW5nKSB7XHJcbiAgICAgIHJldHVybiAncnVubmluZyc7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWxsIHRlc3QgY2FzZXMgYXJlIGluIHRlcm1pbmFsIHN0YXRlIChjb21wbGV0ZWQgb3IgZXJyb3IpXHJcbiAgICBjb25zdCBhbGxFcnJvciA9IHRlc3RDYXNlRXhlY3V0aW9ucy5ldmVyeShlID0+IGUuc3RhdHVzID09PSAnZXJyb3InKTtcclxuICAgIFxyXG4gICAgaWYgKGFsbEVycm9yKSB7XHJcbiAgICAgIHJldHVybiAnZXJyb3InO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAnY29tcGxldGVkJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSBzdWl0ZSBleGVjdXRpb24gd2l0aCBhZ2dyZWdhdGUgcmVzdWx0cyBhbmQgc3RhdHVzXHJcbiAgICovXHJcbiAgYXN5bmMgdXBkYXRlU3VpdGVFeGVjdXRpb24oc3VpdGVFeGVjdXRpb25JZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgc3VpdGUgZXhlY3V0aW9uOiAke3N1aXRlRXhlY3V0aW9uSWR9YCk7XHJcblxyXG4gICAgICAvLyBHZXQgYWxsIHRlc3QgY2FzZSBleGVjdXRpb25zIGZvciB0aGlzIHN1aXRlXHJcbiAgICAgIGNvbnN0IHRlc3RDYXNlRXhlY3V0aW9ucyA9IGF3YWl0IHRoaXMuZ2V0U3VpdGVFeGVjdXRpb25zKHN1aXRlRXhlY3V0aW9uSWQpO1xyXG5cclxuICAgICAgaWYgKHRlc3RDYXNlRXhlY3V0aW9ucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgTm8gdGVzdCBjYXNlIGV4ZWN1dGlvbnMgZm91bmQgZm9yIHN1aXRlICR7c3VpdGVFeGVjdXRpb25JZH1gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENhbGN1bGF0ZSBhZ2dyZWdhdGUgcmVzdWx0c1xyXG4gICAgICBjb25zdCBhZ2dyZWdhdGUgPSB0aGlzLmNhbGN1bGF0ZVN1aXRlQWdncmVnYXRlUmVzdWx0cyh0ZXN0Q2FzZUV4ZWN1dGlvbnMpO1xyXG4gICAgICBcclxuICAgICAgLy8gRGV0ZXJtaW5lIHN1aXRlIHN0YXR1c1xyXG4gICAgICBjb25zdCBzdWl0ZVN0YXR1cyA9IHRoaXMuZGV0ZXJtaW5lU3VpdGVTdGF0dXModGVzdENhc2VFeGVjdXRpb25zKTtcclxuXHJcbiAgICAgIC8vIERldGVybWluZSBzdWl0ZSByZXN1bHQgYmFzZWQgb24gYWdncmVnYXRlXHJcbiAgICAgIGxldCBzdWl0ZVJlc3VsdDogRXhlY3V0aW9uUmVzdWx0IHwgdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoc3VpdGVTdGF0dXMgPT09ICdjb21wbGV0ZWQnKSB7XHJcbiAgICAgICAgaWYgKGFnZ3JlZ2F0ZS5mYWlsZWQgPiAwIHx8IGFnZ3JlZ2F0ZS5lcnJvcnMgPiAwKSB7XHJcbiAgICAgICAgICBzdWl0ZVJlc3VsdCA9ICdmYWlsJztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgc3VpdGVSZXN1bHQgPSAncGFzcyc7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYgKHN1aXRlU3RhdHVzID09PSAnZXJyb3InKSB7XHJcbiAgICAgICAgc3VpdGVSZXN1bHQgPSAnZXJyb3InO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgU3VpdGUgJHtzdWl0ZUV4ZWN1dGlvbklkfSBzdGF0dXM6ICR7c3VpdGVTdGF0dXN9LCByZXN1bHQ6ICR7c3VpdGVSZXN1bHR9YCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBBZ2dyZWdhdGU6ICR7YWdncmVnYXRlLnBhc3NlZH0vJHthZ2dyZWdhdGUudG90YWx9IHBhc3NlZCwgJHthZ2dyZWdhdGUuZmFpbGVkfSBmYWlsZWQsICR7YWdncmVnYXRlLmVycm9yc30gZXJyb3JzYCk7XHJcblxyXG4gICAgICAvLyBHZXQgdGhlIHN1aXRlIGV4ZWN1dGlvbiByZWNvcmRcclxuICAgICAgY29uc3Qgc3VpdGVFeGVjdXRpb24gPSBhd2FpdCB0aGlzLmdldEV4ZWN1dGlvbihzdWl0ZUV4ZWN1dGlvbklkKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghc3VpdGVFeGVjdXRpb24pIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBTdWl0ZSBleGVjdXRpb24gJHtzdWl0ZUV4ZWN1dGlvbklkfSBub3QgZm91bmRgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENhbGN1bGF0ZSBzdWl0ZSBkdXJhdGlvbiBhbmQgZW5kIHRpbWUgaWYgY29tcGxldGVkXHJcbiAgICAgIGxldCBlbmRUaW1lID0gc3VpdGVFeGVjdXRpb24uZW5kVGltZTtcclxuICAgICAgbGV0IGR1cmF0aW9uID0gc3VpdGVFeGVjdXRpb24uZHVyYXRpb247XHJcblxyXG4gICAgICBpZiAoc3VpdGVTdGF0dXMgPT09ICdjb21wbGV0ZWQnIHx8IHN1aXRlU3RhdHVzID09PSAnZXJyb3InKSB7XHJcbiAgICAgICAgLy8gRmluZCB0aGUgbGF0ZXN0IGVuZCB0aW1lIGZyb20gdGVzdCBjYXNlIGV4ZWN1dGlvbnNcclxuICAgICAgICBjb25zdCBjb21wbGV0ZWRFeGVjdXRpb25zID0gdGVzdENhc2VFeGVjdXRpb25zLmZpbHRlcihlID0+IGUuZW5kVGltZSk7XHJcbiAgICAgICAgaWYgKGNvbXBsZXRlZEV4ZWN1dGlvbnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgY29uc3QgbGF0ZXN0RW5kVGltZSA9IGNvbXBsZXRlZEV4ZWN1dGlvbnNcclxuICAgICAgICAgICAgLm1hcChlID0+IG5ldyBEYXRlKGUuZW5kVGltZSEpLmdldFRpbWUoKSlcclxuICAgICAgICAgICAgLnJlZHVjZSgobWF4LCB0aW1lKSA9PiBNYXRoLm1heChtYXgsIHRpbWUpLCAwKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgZW5kVGltZSA9IG5ldyBEYXRlKGxhdGVzdEVuZFRpbWUpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIENhbGN1bGF0ZSBkdXJhdGlvbiBmcm9tIHN1aXRlIHN0YXJ0IHRpbWUgdG8gbGF0ZXN0IGVuZCB0aW1lXHJcbiAgICAgICAgICBpZiAoc3VpdGVFeGVjdXRpb24uc3RhcnRUaW1lKSB7XHJcbiAgICAgICAgICAgIGR1cmF0aW9uID0gbGF0ZXN0RW5kVGltZSAtIG5ldyBEYXRlKHN1aXRlRXhlY3V0aW9uLnN0YXJ0VGltZSkuZ2V0VGltZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVXBkYXRlIHN1aXRlIGV4ZWN1dGlvbiByZWNvcmRcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBleGVjdXRpb25JZDogc3VpdGVFeGVjdXRpb25JZCB9LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGBcclxuICAgICAgICAgIFNFVCAjc3RhdHVzID0gOnN0YXR1cyxcclxuICAgICAgICAgICAgICAjcmVzdWx0ID0gOnJlc3VsdCxcclxuICAgICAgICAgICAgICAjZW5kVGltZSA9IDplbmRUaW1lLFxyXG4gICAgICAgICAgICAgICNkdXJhdGlvbiA9IDpkdXJhdGlvbixcclxuICAgICAgICAgICAgICAjdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCxcclxuICAgICAgICAgICAgICAjbWV0YWRhdGEgPSA6bWV0YWRhdGFcclxuICAgICAgICBgLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICAgJyNzdGF0dXMnOiAnc3RhdHVzJyxcclxuICAgICAgICAgICcjcmVzdWx0JzogJ3Jlc3VsdCcsXHJcbiAgICAgICAgICAnI2VuZFRpbWUnOiAnZW5kVGltZScsXHJcbiAgICAgICAgICAnI2R1cmF0aW9uJzogJ2R1cmF0aW9uJyxcclxuICAgICAgICAgICcjdXBkYXRlZEF0JzogJ3VwZGF0ZWRBdCcsXHJcbiAgICAgICAgICAnI21ldGFkYXRhJzogJ21ldGFkYXRhJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6c3RhdHVzJzogc3VpdGVTdGF0dXMsXHJcbiAgICAgICAgICAnOnJlc3VsdCc6IHN1aXRlUmVzdWx0IHx8IG51bGwsXHJcbiAgICAgICAgICAnOmVuZFRpbWUnOiBlbmRUaW1lIHx8IG51bGwsXHJcbiAgICAgICAgICAnOmR1cmF0aW9uJzogZHVyYXRpb24gfHwgbnVsbCxcclxuICAgICAgICAgICc6dXBkYXRlZEF0JzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgJzptZXRhZGF0YSc6IHtcclxuICAgICAgICAgICAgLi4uc3VpdGVFeGVjdXRpb24ubWV0YWRhdGEsXHJcbiAgICAgICAgICAgIGFnZ3JlZ2F0ZSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgU3VpdGUgZXhlY3V0aW9uICR7c3VpdGVFeGVjdXRpb25JZH0gdXBkYXRlZCBzdWNjZXNzZnVsbHlgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB1cGRhdGUgc3VpdGUgZXhlY3V0aW9uOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHN1aXRlIGV4ZWN1dGlvbjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UgPSBuZXcgVGVzdEV4ZWN1dGlvbkRCU2VydmljZSgpO1xyXG4iXX0=
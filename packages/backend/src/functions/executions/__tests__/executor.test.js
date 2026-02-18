"use strict";
/**
 * Unit tests for Test Executor Lambda function
 * Tests timeout handling and error scenarios
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("@jest/globals");
const executor_1 = require("../executor");
const test_execution_db_service_1 = require("../../../services/test-execution-db-service");
const test_executor_service_1 = require("../../../services/test-executor-service");
const globals_1 = require("@jest/globals");
// Mock the services
globals_1.jest.mock('../../../services/test-execution-db-service');
globals_1.jest.mock('../../../services/test-executor-service');
(0, globals_1.describe)('Test Executor Lambda', () => {
    let mockContext;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Create mock Lambda context
        mockContext = {
            getRemainingTimeInMillis: globals_1.jest.fn().mockReturnValue(900000), // 15 minutes
            functionName: 'test-executor',
            functionVersion: '1',
            invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-executor',
            memoryLimitInMB: '2048',
            awsRequestId: 'test-request-id',
            logGroupName: '/aws/lambda/test-executor',
            logStreamName: '2024/01/01/[$LATEST]test',
            callbackWaitsForEmptyEventLoop: true,
            done: globals_1.jest.fn(),
            fail: globals_1.jest.fn(),
            succeed: globals_1.jest.fn(),
        };
    });
    (0, globals_1.describe)('Timeout Handling', () => {
        (0, globals_1.test)('should handle insufficient time remaining', async () => {
            // Mock context with very little time remaining
            mockContext.getRemainingTimeInMillis = globals_1.jest.fn().mockReturnValue(60000); // Only 1 minute
            const event = {
                Records: [
                    {
                        messageId: 'test-message-id',
                        receiptHandle: 'test-receipt-handle',
                        body: JSON.stringify({
                            executionId: 'exec-123',
                            testCaseId: 'test-case-123',
                            projectId: 'project-123',
                            testCase: {
                                testCaseId: 'test-case-123',
                                projectId: 'project-123',
                                name: 'Test Case',
                                description: 'Test',
                                steps: [],
                                createdAt: '2024-01-01T00:00:00.000Z',
                                updatedAt: '2024-01-01T00:00:00.000Z',
                            },
                            metadata: {
                                triggeredBy: 'user-123',
                            },
                        }),
                        attributes: {},
                        messageAttributes: {},
                        md5OfBody: 'test-md5',
                        eventSource: 'aws:sqs',
                        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
                        awsRegion: 'us-east-1',
                    },
                ],
            };
            // Mock updateExecutionStatus
            test_execution_db_service_1.testExecutionDBService.updateExecutionStatus.mockResolvedValue(undefined);
            // Mock getExecution to return an execution
            test_execution_db_service_1.testExecutionDBService.getExecution.mockResolvedValue({
                executionId: 'exec-123',
                projectId: 'project-123',
                status: 'running',
                startTime: '2024-01-01T00:00:00.000Z',
                steps: [],
                screenshots: [],
                metadata: {
                    triggeredBy: 'user-123',
                },
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            });
            // Mock updateExecutionResults
            test_execution_db_service_1.testExecutionDBService.updateExecutionResults.mockResolvedValue(undefined);
            // Should throw due to insufficient time
            await (0, globals_1.expect)((0, executor_1.handler)(event, mockContext)).rejects.toThrow('Insufficient time remaining');
            // Verify execution was marked as error
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                executionId: 'exec-123',
                status: 'error',
                result: 'error',
                errorMessage: globals_1.expect.stringContaining('Lambda timeout'),
            }));
        });
        (0, globals_1.test)('should record timeout error when execution times out', async () => {
            const event = {
                Records: [
                    {
                        messageId: 'test-message-id',
                        receiptHandle: 'test-receipt-handle',
                        body: JSON.stringify({
                            executionId: 'exec-123',
                            testCaseId: 'test-case-123',
                            projectId: 'project-123',
                            testCase: {
                                testCaseId: 'test-case-123',
                                projectId: 'project-123',
                                name: 'Test Case',
                                description: 'Test',
                                steps: [],
                                createdAt: '2024-01-01T00:00:00.000Z',
                                updatedAt: '2024-01-01T00:00:00.000Z',
                            },
                            metadata: {
                                triggeredBy: 'user-123',
                            },
                        }),
                        attributes: {},
                        messageAttributes: {},
                        md5OfBody: 'test-md5',
                        eventSource: 'aws:sqs',
                        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
                        awsRegion: 'us-east-1',
                    },
                ],
            };
            // Mock updateExecutionStatus
            test_execution_db_service_1.testExecutionDBService.updateExecutionStatus.mockResolvedValue(undefined);
            // Mock executeTestCase to throw timeout error
            test_executor_service_1.testExecutorService.executeTestCase.mockRejectedValue(new Error('Execution timed out after 15 minutes'));
            // Mock getExecution to return an execution
            test_execution_db_service_1.testExecutionDBService.getExecution.mockResolvedValue({
                executionId: 'exec-123',
                projectId: 'project-123',
                status: 'running',
                startTime: '2024-01-01T00:00:00.000Z',
                steps: [],
                screenshots: [],
                metadata: {
                    triggeredBy: 'user-123',
                },
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            });
            // Mock updateExecutionResults
            test_execution_db_service_1.testExecutionDBService.updateExecutionResults.mockResolvedValue(undefined);
            // Should throw the timeout error
            await (0, globals_1.expect)((0, executor_1.handler)(event, mockContext)).rejects.toThrow('Execution timed out');
            // Verify execution was marked as error with timeout message
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                executionId: 'exec-123',
                status: 'error',
                result: 'error',
                errorMessage: globals_1.expect.stringContaining('timeout'),
            }));
        });
        (0, globals_1.test)('should detect timeout from remaining time', async () => {
            const event = {
                Records: [
                    {
                        messageId: 'test-message-id',
                        receiptHandle: 'test-receipt-handle',
                        body: JSON.stringify({
                            executionId: 'exec-123',
                            testCaseId: 'test-case-123',
                            projectId: 'project-123',
                            testCase: {
                                testCaseId: 'test-case-123',
                                projectId: 'project-123',
                                name: 'Test Case',
                                description: 'Test',
                                steps: [],
                                createdAt: '2024-01-01T00:00:00.000Z',
                                updatedAt: '2024-01-01T00:00:00.000Z',
                            },
                            metadata: {
                                triggeredBy: 'user-123',
                            },
                        }),
                        attributes: {},
                        messageAttributes: {},
                        md5OfBody: 'test-md5',
                        eventSource: 'aws:sqs',
                        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
                        awsRegion: 'us-east-1',
                    },
                ],
            };
            // Mock context with very little time remaining (simulating near-timeout)
            mockContext.getRemainingTimeInMillis = globals_1.jest.fn().mockReturnValue(3000); // Only 3 seconds
            // Mock updateExecutionStatus
            test_execution_db_service_1.testExecutionDBService.updateExecutionStatus.mockResolvedValue(undefined);
            // Mock executeTestCase to throw generic error
            test_executor_service_1.testExecutorService.executeTestCase.mockRejectedValue(new Error('Some error occurred'));
            // Mock getExecution to return an execution
            test_execution_db_service_1.testExecutionDBService.getExecution.mockResolvedValue({
                executionId: 'exec-123',
                projectId: 'project-123',
                status: 'running',
                startTime: '2024-01-01T00:00:00.000Z',
                steps: [],
                screenshots: [],
                metadata: {
                    triggeredBy: 'user-123',
                },
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            });
            // Mock updateExecutionResults
            test_execution_db_service_1.testExecutionDBService.updateExecutionResults.mockResolvedValue(undefined);
            // Should throw the error
            await (0, globals_1.expect)((0, executor_1.handler)(event, mockContext)).rejects.toThrow();
            // Verify execution was marked as error with timeout detection
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                executionId: 'exec-123',
                status: 'error',
                result: 'error',
                errorMessage: globals_1.expect.stringContaining('Lambda timeout'),
            }));
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.test)('should handle execution errors gracefully', async () => {
            const event = {
                Records: [
                    {
                        messageId: 'test-message-id',
                        receiptHandle: 'test-receipt-handle',
                        body: JSON.stringify({
                            executionId: 'exec-123',
                            testCaseId: 'test-case-123',
                            projectId: 'project-123',
                            testCase: {
                                testCaseId: 'test-case-123',
                                projectId: 'project-123',
                                name: 'Test Case',
                                description: 'Test',
                                steps: [],
                                createdAt: '2024-01-01T00:00:00.000Z',
                                updatedAt: '2024-01-01T00:00:00.000Z',
                            },
                            metadata: {
                                triggeredBy: 'user-123',
                            },
                        }),
                        attributes: {},
                        messageAttributes: {},
                        md5OfBody: 'test-md5',
                        eventSource: 'aws:sqs',
                        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
                        awsRegion: 'us-east-1',
                    },
                ],
            };
            // Mock updateExecutionStatus
            test_execution_db_service_1.testExecutionDBService.updateExecutionStatus.mockResolvedValue(undefined);
            // Mock executeTestCase to throw error
            test_executor_service_1.testExecutorService.executeTestCase.mockRejectedValue(new Error('Browser initialization failed'));
            // Mock getExecution to return an execution
            test_execution_db_service_1.testExecutionDBService.getExecution.mockResolvedValue({
                executionId: 'exec-123',
                projectId: 'project-123',
                status: 'running',
                startTime: '2024-01-01T00:00:00.000Z',
                steps: [],
                screenshots: [],
                metadata: {
                    triggeredBy: 'user-123',
                },
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            });
            // Mock updateExecutionResults
            test_execution_db_service_1.testExecutionDBService.updateExecutionResults.mockResolvedValue(undefined);
            // Should throw the error
            await (0, globals_1.expect)((0, executor_1.handler)(event, mockContext)).rejects.toThrow('Browser initialization failed');
            // Verify execution was marked as error
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                executionId: 'exec-123',
                status: 'error',
                result: 'error',
                errorMessage: 'Browser initialization failed',
            }));
        });
        (0, globals_1.test)('should handle invalid SQS message format', async () => {
            const event = {
                Records: [
                    {
                        messageId: 'test-message-id',
                        receiptHandle: 'test-receipt-handle',
                        body: 'invalid json',
                        attributes: {},
                        messageAttributes: {},
                        md5OfBody: 'test-md5',
                        eventSource: 'aws:sqs',
                        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
                        awsRegion: 'us-east-1',
                    },
                ],
            };
            // Should throw parsing error
            await (0, globals_1.expect)((0, executor_1.handler)(event, mockContext)).rejects.toThrow('Invalid SQS message format');
        });
        (0, globals_1.test)('should continue processing even if error update fails', async () => {
            const event = {
                Records: [
                    {
                        messageId: 'test-message-id',
                        receiptHandle: 'test-receipt-handle',
                        body: JSON.stringify({
                            executionId: 'exec-123',
                            testCaseId: 'test-case-123',
                            projectId: 'project-123',
                            testCase: {
                                testCaseId: 'test-case-123',
                                projectId: 'project-123',
                                name: 'Test Case',
                                description: 'Test',
                                steps: [],
                                createdAt: '2024-01-01T00:00:00.000Z',
                                updatedAt: '2024-01-01T00:00:00.000Z',
                            },
                            metadata: {
                                triggeredBy: 'user-123',
                            },
                        }),
                        attributes: {},
                        messageAttributes: {},
                        md5OfBody: 'test-md5',
                        eventSource: 'aws:sqs',
                        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
                        awsRegion: 'us-east-1',
                    },
                ],
            };
            // Mock updateExecutionStatus
            test_execution_db_service_1.testExecutionDBService.updateExecutionStatus.mockResolvedValue(undefined);
            // Mock executeTestCase to throw error
            test_executor_service_1.testExecutorService.executeTestCase.mockRejectedValue(new Error('Test execution failed'));
            // Mock getExecution to return an execution
            test_execution_db_service_1.testExecutionDBService.getExecution.mockResolvedValue({
                executionId: 'exec-123',
                projectId: 'project-123',
                status: 'running',
                startTime: '2024-01-01T00:00:00.000Z',
                steps: [],
                screenshots: [],
                metadata: {
                    triggeredBy: 'user-123',
                },
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            });
            // Mock updateExecutionResults to fail
            test_execution_db_service_1.testExecutionDBService.updateExecutionResults.mockRejectedValue(new Error('DynamoDB update failed'));
            // Should still throw the original error
            await (0, globals_1.expect)((0, executor_1.handler)(event, mockContext)).rejects.toThrow('Test execution failed');
            // Verify we attempted to update
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.updateExecutionResults).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Successful Execution', () => {
        (0, globals_1.test)('should process successful execution', async () => {
            const event = {
                Records: [
                    {
                        messageId: 'test-message-id',
                        receiptHandle: 'test-receipt-handle',
                        body: JSON.stringify({
                            executionId: 'exec-123',
                            testCaseId: 'test-case-123',
                            projectId: 'project-123',
                            testCase: {
                                testCaseId: 'test-case-123',
                                projectId: 'project-123',
                                name: 'Test Case',
                                description: 'Test',
                                steps: [],
                                createdAt: '2024-01-01T00:00:00.000Z',
                                updatedAt: '2024-01-01T00:00:00.000Z',
                            },
                            metadata: {
                                triggeredBy: 'user-123',
                            },
                        }),
                        attributes: {},
                        messageAttributes: {},
                        md5OfBody: 'test-md5',
                        eventSource: 'aws:sqs',
                        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
                        awsRegion: 'us-east-1',
                    },
                ],
            };
            // Mock updateExecutionStatus
            test_execution_db_service_1.testExecutionDBService.updateExecutionStatus.mockResolvedValue(undefined);
            // Mock executeTestCase to return success
            test_executor_service_1.testExecutorService.executeTestCase.mockResolvedValue({
                execution: {
                    executionId: 'exec-123',
                    projectId: 'project-123',
                    testCaseId: 'test-case-123',
                    status: 'completed',
                    result: 'pass',
                    startTime: '2024-01-01T00:00:00.000Z',
                    endTime: '2024-01-01T00:01:00.000Z',
                    duration: 60000,
                    steps: [],
                    screenshots: [],
                    metadata: {
                        triggeredBy: 'user-123',
                    },
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:01:00.000Z',
                },
                success: true,
            });
            // Mock updateExecutionResults
            test_execution_db_service_1.testExecutionDBService.updateExecutionResults.mockResolvedValue(undefined);
            // Should complete successfully
            await (0, globals_1.expect)((0, executor_1.handler)(event, mockContext)).resolves.not.toThrow();
            // Verify status was updated to running
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.updateExecutionStatus).toHaveBeenCalledWith('exec-123', 'running');
            // Verify execution was performed
            (0, globals_1.expect)(test_executor_service_1.testExecutorService.executeTestCase).toHaveBeenCalledWith({
                executionId: 'exec-123',
                testCase: globals_1.expect.any(Object),
                projectId: 'project-123',
                triggeredBy: 'user-123',
                environment: undefined,
            });
            // Verify results were saved
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                executionId: 'exec-123',
                status: 'completed',
                result: 'pass',
            }));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImV4ZWN1dG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFFSCx5QkFBdUI7QUFFdkIsMENBQXNDO0FBQ3RDLDJGQUFxRjtBQUNyRixtRkFBOEU7QUFDOUUsMkNBQXlFO0FBRXpFLG9CQUFvQjtBQUNwQixjQUFJLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7QUFDekQsY0FBSSxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0FBRXJELElBQUEsa0JBQVEsRUFBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsSUFBSSxXQUFvQixDQUFDO0lBRXpCLElBQUEsb0JBQVUsRUFBQyxHQUFHLEVBQUU7UUFDZCxjQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFckIsNkJBQTZCO1FBQzdCLFdBQVcsR0FBRztZQUNaLHdCQUF3QixFQUFFLGNBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFRLEVBQUUsYUFBYTtZQUNqRixZQUFZLEVBQUUsZUFBZTtZQUM3QixlQUFlLEVBQUUsR0FBRztZQUNwQixrQkFBa0IsRUFBRSw4REFBOEQ7WUFDbEYsZUFBZSxFQUFFLE1BQU07WUFDdkIsWUFBWSxFQUFFLGlCQUFpQjtZQUMvQixZQUFZLEVBQUUsMkJBQTJCO1lBQ3pDLGFBQWEsRUFBRSwwQkFBMEI7WUFDekMsOEJBQThCLEVBQUUsSUFBSTtZQUNwQyxJQUFJLEVBQUUsY0FBSSxDQUFDLEVBQUUsRUFBUztZQUN0QixJQUFJLEVBQUUsY0FBSSxDQUFDLEVBQUUsRUFBUztZQUN0QixPQUFPLEVBQUUsY0FBSSxDQUFDLEVBQUUsRUFBUztTQUNKLENBQUM7SUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLGtCQUFRLEVBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLElBQUEsY0FBSSxFQUFDLDJD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LENBQUMsb0JBQW9CLENBQ3hFLGdCQUFNLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ3RCLFdBQVcsRUFBRSxVQUFVO2dCQUN2QixNQUFNLEVBQUUsV0FBVztnQkFDbkIsTUFBTSxFQUFFLE1BQU07YUFDZixDQUFDLENBQ0gsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBVbml0IHRlc3RzIGZvciBUZXN0IEV4ZWN1dG9yIExhbWJkYSBmdW5jdGlvblxyXG4gKiBUZXN0cyB0aW1lb3V0IGhhbmRsaW5nIGFuZCBlcnJvciBzY2VuYXJpb3NcclxuICovXHJcblxyXG5pbXBvcnQgJ0BqZXN0L2dsb2JhbHMnO1xyXG5pbXBvcnQgeyBTUVNFdmVudCwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBoYW5kbGVyIH0gZnJvbSAnLi4vZXhlY3V0b3InO1xyXG5pbXBvcnQgeyB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vLi4vc2VydmljZXMvdGVzdC1leGVjdXRpb24tZGItc2VydmljZSc7XHJcbmltcG9ydCB7IHRlc3RFeGVjdXRvclNlcnZpY2UgfSBmcm9tICcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dG9yLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBiZWZvcmVFYWNoLCBkZXNjcmliZSwgZXhwZWN0LCBqZXN0LCB0ZXN0IH0gZnJvbSAnQGplc3QvZ2xvYmFscyc7XHJcblxyXG4vLyBNb2NrIHRoZSBzZXJ2aWNlc1xyXG5qZXN0Lm1vY2soJy4uLy4uLy4uL3NlcnZpY2VzL3Rlc3QtZXhlY3V0aW9uLWRiLXNlcnZpY2UnKTtcclxuamVzdC5tb2NrKCcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dG9yLXNlcnZpY2UnKTtcclxuXHJcbmRlc2NyaWJlKCdUZXN0IEV4ZWN1dG9yIExhbWJkYScsICgpID0+IHtcclxuICBsZXQgbW9ja0NvbnRleHQ6IENvbnRleHQ7XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIG1vY2sgTGFtYmRhIGNvbnRleHRcclxuICAgIG1vY2tDb250ZXh0ID0ge1xyXG4gICAgICBnZXRSZW1haW5pbmdUaW1lSW5NaWxsaXM6IGplc3QuZm4oKS5tb2NrUmV0dXJuVmFsdWUoOTAwMDAwKSBhcyBhbnksIC8vIDE1IG1pbnV0ZXNcclxuICAgICAgZnVuY3Rpb25OYW1lOiAndGVzdC1leGVjdXRvcicsXHJcbiAgICAgIGZ1bmN0aW9uVmVyc2lvbjogJzEnLFxyXG4gICAgICBpbnZva2VkRnVuY3Rpb25Bcm46ICdhcm46YXdzOmxhbWJkYTp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOmZ1bmN0aW9uOnRlc3QtZXhlY3V0b3InLFxyXG4gICAgICBtZW1vcnlMaW1pdEluTUI6ICcyMDQ4JyxcclxuICAgICAgYXdzUmVxdWVzdElkOiAndGVzdC1yZXF1ZXN0LWlkJyxcclxuICAgICAgbG9nR3JvdXBOYW1lOiAnL2F3cy9sYW1iZGEvdGVzdC1leGVjdXRvcicsXHJcbiAgICAgIGxvZ1N0cmVhbU5hbWU6ICcyMDI0LzAxLzAxL1skTEFURVNUXXRlc3QnLFxyXG4gICAgICBjYWxsYmFja1dhaXRzRm9yRW1wdHlFdmVudExvb3A6IHRydWUsXHJcbiAgICAgIGRvbmU6IGplc3QuZm4oKSBhcyBhbnksXHJcbiAgICAgIGZhaWw6IGplc3QuZm4oKSBhcyBhbnksXHJcbiAgICAgIHN1Y2NlZWQ6IGplc3QuZm4oKSBhcyBhbnksXHJcbiAgICB9IGFzIHVua25vd24gYXMgQ29udGV4dDtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1RpbWVvdXQgSGFuZGxpbmcnLCAoKSA9PiB7XHJcbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIGluc3VmZmljaWVudCB0aW1lIHJlbWFpbmluZycsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gTW9jayBjb250ZXh0IHdpdGggdmVyeSBsaXR0bGUgdGltZSByZW1haW5pbmdcclxuICAgICAgbW9ja0NvbnRleHQuZ2V0UmVtYWluaW5nVGltZUluTWlsbGlzID0gamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZSg2MDAwMCkgYXMgYW55OyAvLyBPbmx5IDEgbWludXRlXHJcblxyXG4gICAgICBjb25zdCBldmVudDogU1FTRXZlbnQgPSB7XHJcbiAgICAgICAgUmVjb3JkczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBtZXNzYWdlSWQ6ICd0ZXN0LW1lc3NhZ2UtaWQnLFxyXG4gICAgICAgICAgICByZWNlaXB0SGFuZGxlOiAndGVzdC1yZWNlaXB0LWhhbmRsZScsXHJcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgICAgICAgICB0ZXN0Q2FzZUlkOiAndGVzdC1jYXNlLTEyMycsXHJcbiAgICAgICAgICAgICAgcHJvamVjdElkOiAncHJvamVjdC0xMjMnLFxyXG4gICAgICAgICAgICAgIHRlc3RDYXNlOiB7XHJcbiAgICAgICAgICAgICAgICB0ZXN0Q2FzZUlkOiAndGVzdC1jYXNlLTEyMycsXHJcbiAgICAgICAgICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnVGVzdCBDYXNlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGVzdCcsXHJcbiAgICAgICAgICAgICAgICBzdGVwczogW10sXHJcbiAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgICAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICB0cmlnZ2VyZWRCeTogJ3VzZXItMTIzJyxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgYXR0cmlidXRlczoge30gYXMgYW55LFxyXG4gICAgICAgICAgICBtZXNzYWdlQXR0cmlidXRlczoge30sXHJcbiAgICAgICAgICAgIG1kNU9mQm9keTogJ3Rlc3QtbWQ1JyxcclxuICAgICAgICAgICAgZXZlbnRTb3VyY2U6ICdhd3M6c3FzJyxcclxuICAgICAgICAgICAgZXZlbnRTb3VyY2VBUk46ICdhcm46YXdzOnNxczp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOnRlc3QtcXVldWUnLFxyXG4gICAgICAgICAgICBhd3NSZWdpb246ICd1cy1lYXN0LTEnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gTW9jayB1cGRhdGVFeGVjdXRpb25TdGF0dXNcclxuICAgICAgKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uU3RhdHVzIGFzIGFueSkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcbiAgICAgIC8vIE1vY2sgZ2V0RXhlY3V0aW9uIHRvIHJldHVybiBhbiBleGVjdXRpb25cclxuICAgICAgKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuZ2V0RXhlY3V0aW9uIGFzIGFueSkubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICBzdGF0dXM6ICdydW5uaW5nJyxcclxuICAgICAgICBzdGFydFRpbWU6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgIHN0ZXBzOiBbXSxcclxuICAgICAgICBzY3JlZW5zaG90czogW10sXHJcbiAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIHRyaWdnZXJlZEJ5OiAndXNlci0xMjMnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgdXBkYXRlRXhlY3V0aW9uUmVzdWx0c1xyXG4gICAgICAodGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25SZXN1bHRzIGFzIGFueSkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCB0aHJvdyBkdWUgdG8gaW5zdWZmaWNpZW50IHRpbWVcclxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KSkucmVqZWN0cy50b1Rocm93KCdJbnN1ZmZpY2llbnQgdGltZSByZW1haW5pbmcnKTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSBleGVjdXRpb24gd2FzIG1hcmtlZCBhcyBlcnJvclxyXG4gICAgICBleHBlY3QodGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25SZXN1bHRzKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgICAgIHN0YXR1czogJ2Vycm9yJyxcclxuICAgICAgICAgIHJlc3VsdDogJ2Vycm9yJyxcclxuICAgICAgICAgIGVycm9yTWVzc2FnZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ0xhbWJkYSB0aW1lb3V0JyksXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRlc3QoJ3Nob3VsZCByZWNvcmQgdGltZW91dCBlcnJvciB3aGVuIGV4ZWN1dGlvbiB0aW1lcyBvdXQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBTUVNFdmVudCA9IHtcclxuICAgICAgICBSZWNvcmRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2VJZDogJ3Rlc3QtbWVzc2FnZS1pZCcsXHJcbiAgICAgICAgICAgIHJlY2VpcHRIYW5kbGU6ICd0ZXN0LXJlY2VpcHQtaGFuZGxlJyxcclxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgICAgICAgdGVzdENhc2U6IHtcclxuICAgICAgICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICAgICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdUZXN0IENhc2UnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUZXN0JyxcclxuICAgICAgICAgICAgICAgIHN0ZXBzOiBbXSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgIHRyaWdnZXJlZEJ5OiAndXNlci0xMjMnLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7fSBhcyBhbnksXHJcbiAgICAgICAgICAgIG1lc3NhZ2VBdHRyaWJ1dGVzOiB7fSxcclxuICAgICAgICAgICAgbWQ1T2ZCb2R5OiAndGVzdC1tZDUnLFxyXG4gICAgICAgICAgICBldmVudFNvdXJjZTogJ2F3czpzcXMnLFxyXG4gICAgICAgICAgICBldmVudFNvdXJjZUFSTjogJ2Fybjphd3M6c3FzOnVzLWVhc3QtMToxMjM0NTY3ODkwMTI6dGVzdC1xdWV1ZScsXHJcbiAgICAgICAgICAgIGF3c1JlZ2lvbjogJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBNb2NrIHVwZGF0ZUV4ZWN1dGlvblN0YXR1c1xyXG4gICAgICAodGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25TdGF0dXMgYXMgYW55KS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuICAgICAgLy8gTW9jayBleGVjdXRlVGVzdENhc2UgdG8gdGhyb3cgdGltZW91dCBlcnJvclxyXG4gICAgICAodGVzdEV4ZWN1dG9yU2VydmljZS5leGVjdXRlVGVzdENhc2UgYXMgYW55KS5tb2NrUmVqZWN0ZWRWYWx1ZShcclxuICAgICAgICBuZXcgRXJyb3IoJ0V4ZWN1dGlvbiB0aW1lZCBvdXQgYWZ0ZXIgMTUgbWludXRlcycpXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBNb2NrIGdldEV4ZWN1dGlvbiB0byByZXR1cm4gYW4gZXhlY3V0aW9uXHJcbiAgICAgICh0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmdldEV4ZWN1dGlvbiBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgc3RhdHVzOiAncnVubmluZycsXHJcbiAgICAgICAgc3RhcnRUaW1lOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgICBzdGVwczogW10sXHJcbiAgICAgICAgc2NyZWVuc2hvdHM6IFtdLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICB0cmlnZ2VyZWRCeTogJ3VzZXItMTIzJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIHVwZGF0ZUV4ZWN1dGlvblJlc3VsdHNcclxuICAgICAgKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uUmVzdWx0cyBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICAvLyBTaG91bGQgdGhyb3cgdGhlIHRpbWVvdXQgZXJyb3JcclxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KSkucmVqZWN0cy50b1Rocm93KCdFeGVjdXRpb24gdGltZWQgb3V0Jyk7XHJcblxyXG4gICAgICAvLyBWZXJpZnkgZXhlY3V0aW9uIHdhcyBtYXJrZWQgYXMgZXJyb3Igd2l0aCB0aW1lb3V0IG1lc3NhZ2VcclxuICAgICAgZXhwZWN0KHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uUmVzdWx0cykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgZXhlY3V0aW9uSWQ6ICdleGVjLTEyMycsXHJcbiAgICAgICAgICBzdGF0dXM6ICdlcnJvcicsXHJcbiAgICAgICAgICByZXN1bHQ6ICdlcnJvcicsXHJcbiAgICAgICAgICBlcnJvck1lc3NhZ2U6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCd0aW1lb3V0JyksXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRlc3QoJ3Nob3VsZCBkZXRlY3QgdGltZW91dCBmcm9tIHJlbWFpbmluZyB0aW1lJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBldmVudDogU1FTRXZlbnQgPSB7XHJcbiAgICAgICAgUmVjb3JkczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBtZXNzYWdlSWQ6ICd0ZXN0LW1lc3NhZ2UtaWQnLFxyXG4gICAgICAgICAgICByZWNlaXB0SGFuZGxlOiAndGVzdC1yZWNlaXB0LWhhbmRsZScsXHJcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgICAgICAgICB0ZXN0Q2FzZUlkOiAndGVzdC1jYXNlLTEyMycsXHJcbiAgICAgICAgICAgICAgcHJvamVjdElkOiAncHJvamVjdC0xMjMnLFxyXG4gICAgICAgICAgICAgIHRlc3RDYXNlOiB7XHJcbiAgICAgICAgICAgICAgICB0ZXN0Q2FzZUlkOiAndGVzdC1jYXNlLTEyMycsXHJcbiAgICAgICAgICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnVGVzdCBDYXNlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGVzdCcsXHJcbiAgICAgICAgICAgICAgICBzdGVwczogW10sXHJcbiAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgICAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICB0cmlnZ2VyZWRCeTogJ3VzZXItMTIzJyxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgYXR0cmlidXRlczoge30gYXMgYW55LFxyXG4gICAgICAgICAgICBtZXNzYWdlQXR0cmlidXRlczoge30sXHJcbiAgICAgICAgICAgIG1kNU9mQm9keTogJ3Rlc3QtbWQ1JyxcclxuICAgICAgICAgICAgZXZlbnRTb3VyY2U6ICdhd3M6c3FzJyxcclxuICAgICAgICAgICAgZXZlbnRTb3VyY2VBUk46ICdhcm46YXdzOnNxczp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOnRlc3QtcXVldWUnLFxyXG4gICAgICAgICAgICBhd3NSZWdpb246ICd1cy1lYXN0LTEnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gTW9jayBjb250ZXh0IHdpdGggdmVyeSBsaXR0bGUgdGltZSByZW1haW5pbmcgKHNpbXVsYXRpbmcgbmVhci10aW1lb3V0KVxyXG4gICAgICBtb2NrQ29udGV4dC5nZXRSZW1haW5pbmdUaW1lSW5NaWxsaXMgPSBqZXN0LmZuKCkubW9ja1JldHVyblZhbHVlKDMwMDApIGFzIGFueTsgLy8gT25seSAzIHNlY29uZHNcclxuXHJcbiAgICAgIC8vIE1vY2sgdXBkYXRlRXhlY3V0aW9uU3RhdHVzXHJcbiAgICAgICh0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLnVwZGF0ZUV4ZWN1dGlvblN0YXR1cyBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICAvLyBNb2NrIGV4ZWN1dGVUZXN0Q2FzZSB0byB0aHJvdyBnZW5lcmljIGVycm9yXHJcbiAgICAgICh0ZXN0RXhlY3V0b3JTZXJ2aWNlLmV4ZWN1dGVUZXN0Q2FzZSBhcyBhbnkpLm1vY2tSZWplY3RlZFZhbHVlKFxyXG4gICAgICAgIG5ldyBFcnJvcignU29tZSBlcnJvciBvY2N1cnJlZCcpXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBNb2NrIGdldEV4ZWN1dGlvbiB0byByZXR1cm4gYW4gZXhlY3V0aW9uXHJcbiAgICAgICh0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmdldEV4ZWN1dGlvbiBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgc3RhdHVzOiAncnVubmluZycsXHJcbiAgICAgICAgc3RhcnRUaW1lOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgICBzdGVwczogW10sXHJcbiAgICAgICAgc2NyZWVuc2hvdHM6IFtdLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICB0cmlnZ2VyZWRCeTogJ3VzZXItMTIzJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIHVwZGF0ZUV4ZWN1dGlvblJlc3VsdHNcclxuICAgICAgKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uUmVzdWx0cyBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICAvLyBTaG91bGQgdGhyb3cgdGhlIGVycm9yXHJcbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCkpLnJlamVjdHMudG9UaHJvdygpO1xyXG5cclxuICAgICAgLy8gVmVyaWZ5IGV4ZWN1dGlvbiB3YXMgbWFya2VkIGFzIGVycm9yIHdpdGggdGltZW91dCBkZXRlY3Rpb25cclxuICAgICAgZXhwZWN0KHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uUmVzdWx0cykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgZXhlY3V0aW9uSWQ6ICdleGVjLTEyMycsXHJcbiAgICAgICAgICBzdGF0dXM6ICdlcnJvcicsXHJcbiAgICAgICAgICByZXN1bHQ6ICdlcnJvcicsXHJcbiAgICAgICAgICBlcnJvck1lc3NhZ2U6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCdMYW1iZGEgdGltZW91dCcpLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0Vycm9yIEhhbmRsaW5nJywgKCkgPT4ge1xyXG4gICAgdGVzdCgnc2hvdWxkIGhhbmRsZSBleGVjdXRpb24gZXJyb3JzIGdyYWNlZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBTUVNFdmVudCA9IHtcclxuICAgICAgICBSZWNvcmRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2VJZDogJ3Rlc3QtbWVzc2FnZS1pZCcsXHJcbiAgICAgICAgICAgIHJlY2VpcHRIYW5kbGU6ICd0ZXN0LXJlY2VpcHQtaGFuZGxlJyxcclxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgICAgICAgdGVzdENhc2U6IHtcclxuICAgICAgICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICAgICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdUZXN0IENhc2UnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUZXN0JyxcclxuICAgICAgICAgICAgICAgIHN0ZXBzOiBbXSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgIHRyaWdnZXJlZEJ5OiAndXNlci0xMjMnLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7fSBhcyBhbnksXHJcbiAgICAgICAgICAgIG1lc3NhZ2VBdHRyaWJ1dGVzOiB7fSxcclxuICAgICAgICAgICAgbWQ1T2ZCb2R5OiAndGVzdC1tZDUnLFxyXG4gICAgICAgICAgICBldmVudFNvdXJjZTogJ2F3czpzcXMnLFxyXG4gICAgICAgICAgICBldmVudFNvdXJjZUFSTjogJ2Fybjphd3M6c3FzOnVzLWVhc3QtMToxMjM0NTY3ODkwMTI6dGVzdC1xdWV1ZScsXHJcbiAgICAgICAgICAgIGF3c1JlZ2lvbjogJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBNb2NrIHVwZGF0ZUV4ZWN1dGlvblN0YXR1c1xyXG4gICAgICAodGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25TdGF0dXMgYXMgYW55KS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuICAgICAgLy8gTW9jayBleGVjdXRlVGVzdENhc2UgdG8gdGhyb3cgZXJyb3JcclxuICAgICAgKHRlc3RFeGVjdXRvclNlcnZpY2UuZXhlY3V0ZVRlc3RDYXNlIGFzIGFueSkubW9ja1JlamVjdGVkVmFsdWUoXHJcbiAgICAgICAgbmV3IEVycm9yKCdCcm93c2VyIGluaXRpYWxpemF0aW9uIGZhaWxlZCcpXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBNb2NrIGdldEV4ZWN1dGlvbiB0byByZXR1cm4gYW4gZXhlY3V0aW9uXHJcbiAgICAgICh0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmdldEV4ZWN1dGlvbiBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgc3RhdHVzOiAncnVubmluZycsXHJcbiAgICAgICAgc3RhcnRUaW1lOiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgICBzdGVwczogW10sXHJcbiAgICAgICAgc2NyZWVuc2hvdHM6IFtdLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICB0cmlnZ2VyZWRCeTogJ3VzZXItMTIzJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaJyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIHVwZGF0ZUV4ZWN1dGlvblJlc3VsdHNcclxuICAgICAgKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uUmVzdWx0cyBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICAvLyBTaG91bGQgdGhyb3cgdGhlIGVycm9yXHJcbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCkpLnJlamVjdHMudG9UaHJvdygnQnJvd3NlciBpbml0aWFsaXphdGlvbiBmYWlsZWQnKTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSBleGVjdXRpb24gd2FzIG1hcmtlZCBhcyBlcnJvclxyXG4gICAgICBleHBlY3QodGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25SZXN1bHRzKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgICAgIHN0YXR1czogJ2Vycm9yJyxcclxuICAgICAgICAgIHJlc3VsdDogJ2Vycm9yJyxcclxuICAgICAgICAgIGVycm9yTWVzc2FnZTogJ0Jyb3dzZXIgaW5pdGlhbGl6YXRpb24gZmFpbGVkJyxcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGVzdCgnc2hvdWxkIGhhbmRsZSBpbnZhbGlkIFNRUyBtZXNzYWdlIGZvcm1hdCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IFNRU0V2ZW50ID0ge1xyXG4gICAgICAgIFJlY29yZHM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbWVzc2FnZUlkOiAndGVzdC1tZXNzYWdlLWlkJyxcclxuICAgICAgICAgICAgcmVjZWlwdEhhbmRsZTogJ3Rlc3QtcmVjZWlwdC1oYW5kbGUnLFxyXG4gICAgICAgICAgICBib2R5OiAnaW52YWxpZCBqc29uJyxcclxuICAgICAgICAgICAgYXR0cmlidXRlczoge30gYXMgYW55LFxyXG4gICAgICAgICAgICBtZXNzYWdlQXR0cmlidXRlczoge30sXHJcbiAgICAgICAgICAgIG1kNU9mQm9keTogJ3Rlc3QtbWQ1JyxcclxuICAgICAgICAgICAgZXZlbnRTb3VyY2U6ICdhd3M6c3FzJyxcclxuICAgICAgICAgICAgZXZlbnRTb3VyY2VBUk46ICdhcm46YXdzOnNxczp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOnRlc3QtcXVldWUnLFxyXG4gICAgICAgICAgICBhd3NSZWdpb246ICd1cy1lYXN0LTEnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gU2hvdWxkIHRocm93IHBhcnNpbmcgZXJyb3JcclxuICAgICAgYXdhaXQgZXhwZWN0KGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KSkucmVqZWN0cy50b1Rocm93KCdJbnZhbGlkIFNRUyBtZXNzYWdlIGZvcm1hdCcpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGVzdCgnc2hvdWxkIGNvbnRpbnVlIHByb2Nlc3NpbmcgZXZlbiBpZiBlcnJvciB1cGRhdGUgZmFpbHMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBTUVNFdmVudCA9IHtcclxuICAgICAgICBSZWNvcmRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2VJZDogJ3Rlc3QtbWVzc2FnZS1pZCcsXHJcbiAgICAgICAgICAgIHJlY2VpcHRIYW5kbGU6ICd0ZXN0LXJlY2VpcHQtaGFuZGxlJyxcclxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgICAgICAgdGVzdENhc2U6IHtcclxuICAgICAgICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICAgICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdUZXN0IENhc2UnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUZXN0JyxcclxuICAgICAgICAgICAgICAgIHN0ZXBzOiBbXSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgIHRyaWdnZXJlZEJ5OiAndXNlci0xMjMnLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7fSBhcyBhbnksXHJcbiAgICAgICAgICAgIG1lc3NhZ2VBdHRyaWJ1dGVzOiB7fSxcclxuICAgICAgICAgICAgbWQ1T2ZCb2R5OiAndGVzdC1tZDUnLFxyXG4gICAgICAgICAgICBldmVudFNvdXJjZTogJ2F3czpzcXMnLFxyXG4gICAgICAgICAgICBldmVudFNvdXJjZUFSTjogJ2Fybjphd3M6c3FzOnVzLWVhc3QtMToxMjM0NTY3ODkwMTI6dGVzdC1xdWV1ZScsXHJcbiAgICAgICAgICAgIGF3c1JlZ2lvbjogJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBNb2NrIHVwZGF0ZUV4ZWN1dGlvblN0YXR1c1xyXG4gICAgICAodGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25TdGF0dXMgYXMgYW55KS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuICAgICAgLy8gTW9jayBleGVjdXRlVGVzdENhc2UgdG8gdGhyb3cgZXJyb3JcclxuICAgICAgKHRlc3RFeGVjdXRvclNlcnZpY2UuZXhlY3V0ZVRlc3RDYXNlIGFzIGFueSkubW9ja1JlamVjdGVkVmFsdWUoXHJcbiAgICAgICAgbmV3IEVycm9yKCdUZXN0IGV4ZWN1dGlvbiBmYWlsZWQnKVxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gTW9jayBnZXRFeGVjdXRpb24gdG8gcmV0dXJuIGFuIGV4ZWN1dGlvblxyXG4gICAgICAodGVzdEV4ZWN1dGlvbkRCU2VydmljZS5nZXRFeGVjdXRpb24gYXMgYW55KS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgZXhlY3V0aW9uSWQ6ICdleGVjLTEyMycsXHJcbiAgICAgICAgcHJvamVjdElkOiAncHJvamVjdC0xMjMnLFxyXG4gICAgICAgIHN0YXR1czogJ3J1bm5pbmcnLFxyXG4gICAgICAgIHN0YXJ0VGltZTogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgICAgc3RlcHM6IFtdLFxyXG4gICAgICAgIHNjcmVlbnNob3RzOiBbXSxcclxuICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgdHJpZ2dlcmVkQnk6ICd1c2VyLTEyMycsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgIHVwZGF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTW9jayB1cGRhdGVFeGVjdXRpb25SZXN1bHRzIHRvIGZhaWxcclxuICAgICAgKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uUmVzdWx0cyBhcyBhbnkpLm1vY2tSZWplY3RlZFZhbHVlKFxyXG4gICAgICAgIG5ldyBFcnJvcignRHluYW1vREIgdXBkYXRlIGZhaWxlZCcpXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBTaG91bGQgc3RpbGwgdGhyb3cgdGhlIG9yaWdpbmFsIGVycm9yXHJcbiAgICAgIGF3YWl0IGV4cGVjdChoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCkpLnJlamVjdHMudG9UaHJvdygnVGVzdCBleGVjdXRpb24gZmFpbGVkJyk7XHJcblxyXG4gICAgICAvLyBWZXJpZnkgd2UgYXR0ZW1wdGVkIHRvIHVwZGF0ZVxyXG4gICAgICBleHBlY3QodGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25SZXN1bHRzKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1N1Y2Nlc3NmdWwgRXhlY3V0aW9uJywgKCkgPT4ge1xyXG4gICAgdGVzdCgnc2hvdWxkIHByb2Nlc3Mgc3VjY2Vzc2Z1bCBleGVjdXRpb24nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBTUVNFdmVudCA9IHtcclxuICAgICAgICBSZWNvcmRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2VJZDogJ3Rlc3QtbWVzc2FnZS1pZCcsXHJcbiAgICAgICAgICAgIHJlY2VpcHRIYW5kbGU6ICd0ZXN0LXJlY2VpcHQtaGFuZGxlJyxcclxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgIGV4ZWN1dGlvbklkOiAnZXhlYy0xMjMnLFxyXG4gICAgICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgICAgICAgdGVzdENhc2U6IHtcclxuICAgICAgICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICAgICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdUZXN0IENhc2UnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUZXN0JyxcclxuICAgICAgICAgICAgICAgIHN0ZXBzOiBbXSxcclxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDAuMDAwWicsXHJcbiAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgIHRyaWdnZXJlZEJ5OiAndXNlci0xMjMnLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiB7fSBhcyBhbnksXHJcbiAgICAgICAgICAgIG1lc3NhZ2VBdHRyaWJ1dGVzOiB7fSxcclxuICAgICAgICAgICAgbWQ1T2ZCb2R5OiAndGVzdC1tZDUnLFxyXG4gICAgICAgICAgICBldmVudFNvdXJjZTogJ2F3czpzcXMnLFxyXG4gICAgICAgICAgICBldmVudFNvdXJjZUFSTjogJ2Fybjphd3M6c3FzOnVzLWVhc3QtMToxMjM0NTY3ODkwMTI6dGVzdC1xdWV1ZScsXHJcbiAgICAgICAgICAgIGF3c1JlZ2lvbjogJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBNb2NrIHVwZGF0ZUV4ZWN1dGlvblN0YXR1c1xyXG4gICAgICAodGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25TdGF0dXMgYXMgYW55KS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuICAgICAgLy8gTW9jayBleGVjdXRlVGVzdENhc2UgdG8gcmV0dXJuIHN1Y2Nlc3NcclxuICAgICAgKHRlc3RFeGVjdXRvclNlcnZpY2UuZXhlY3V0ZVRlc3RDYXNlIGFzIGFueSkubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIGV4ZWN1dGlvbjoge1xyXG4gICAgICAgICAgZXhlY3V0aW9uSWQ6ICdleGVjLTEyMycsXHJcbiAgICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgICB0ZXN0Q2FzZUlkOiAndGVzdC1jYXNlLTEyMycsXHJcbiAgICAgICAgICBzdGF0dXM6ICdjb21wbGV0ZWQnLFxyXG4gICAgICAgICAgcmVzdWx0OiAncGFzcycsXHJcbiAgICAgICAgICBzdGFydFRpbWU6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgICAgZW5kVGltZTogJzIwMjQtMDEtMDFUMDA6MDE6MDAuMDAwWicsXHJcbiAgICAgICAgICBkdXJhdGlvbjogNjAwMDAsXHJcbiAgICAgICAgICBzdGVwczogW10sXHJcbiAgICAgICAgICBzY3JlZW5zaG90czogW10sXHJcbiAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICB0cmlnZ2VyZWRCeTogJ3VzZXItMTIzJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFonLFxyXG4gICAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQwMDowMTowMC4wMDBaJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTW9jayB1cGRhdGVFeGVjdXRpb25SZXN1bHRzXHJcbiAgICAgICh0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLnVwZGF0ZUV4ZWN1dGlvblJlc3VsdHMgYXMgYW55KS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIGNvbXBsZXRlIHN1Y2Nlc3NmdWxseVxyXG4gICAgICBhd2FpdCBleHBlY3QoaGFuZGxlcihldmVudCwgbW9ja0NvbnRleHQpKS5yZXNvbHZlcy5ub3QudG9UaHJvdygpO1xyXG5cclxuICAgICAgLy8gVmVyaWZ5IHN0YXR1cyB3YXMgdXBkYXRlZCB0byBydW5uaW5nXHJcbiAgICAgIGV4cGVjdCh0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLnVwZGF0ZUV4ZWN1dGlvblN0YXR1cykudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ2V4ZWMtMTIzJywgJ3J1bm5pbmcnKTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSBleGVjdXRpb24gd2FzIHBlcmZvcm1lZFxyXG4gICAgICBleHBlY3QodGVzdEV4ZWN1dG9yU2VydmljZS5leGVjdXRlVGVzdENhc2UpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKHtcclxuICAgICAgICBleGVjdXRpb25JZDogJ2V4ZWMtMTIzJyxcclxuICAgICAgICB0ZXN0Q2FzZTogZXhwZWN0LmFueShPYmplY3QpLFxyXG4gICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICB0cmlnZ2VyZWRCeTogJ3VzZXItMTIzJyxcclxuICAgICAgICBlbnZpcm9ubWVudDogdW5kZWZpbmVkLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSByZXN1bHRzIHdlcmUgc2F2ZWRcclxuICAgICAgZXhwZWN0KHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uUmVzdWx0cykudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgZXhlY3V0aW9uSWQ6ICdleGVjLTEyMycsXHJcbiAgICAgICAgICBzdGF0dXM6ICdjb21wbGV0ZWQnLFxyXG4gICAgICAgICAgcmVzdWx0OiAncGFzcycsXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTtcclxuIl19
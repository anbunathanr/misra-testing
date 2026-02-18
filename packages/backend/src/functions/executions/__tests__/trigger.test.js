"use strict";
/**
 * Unit tests for Trigger Lambda function
 * Tests endpoint validation and execution triggering
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const test_execution_db_service_1 = require("../../../services/test-execution-db-service");
const test_case_service_1 = require("../../../services/test-case-service");
const test_suite_service_1 = require("../../../services/test-suite-service");
// Mock the services and AWS SDK
globals_1.jest.mock('../../../services/test-execution-db-service');
globals_1.jest.mock('../../../services/test-case-service');
globals_1.jest.mock('../../../services/test-suite-service');
// Mock SQS client with proper send method
const mockSend = globals_1.jest.fn();
globals_1.jest.mock('@aws-sdk/client-sqs', () => {
    return {
        SQSClient: globals_1.jest.fn().mockImplementation(() => ({
            send: mockSend,
        })),
        SendMessageCommand: globals_1.jest.fn().mockImplementation((params) => params),
    };
});
// Import handler after mocks are set up
const trigger_1 = require("../trigger");
(0, globals_1.describe)('Trigger Lambda', () => {
    let mockEvent;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Set environment variable
        process.env.TEST_EXECUTION_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
        // Reset mock
        mockSend.mockResolvedValue({});
        // Create base event
        mockEvent = {
            body: null,
            requestContext: {
                authorizer: {
                    claims: {
                        sub: 'user-123',
                    },
                },
            },
        };
    });
    (0, globals_1.afterEach)(() => {
        delete process.env.TEST_EXECUTION_QUEUE_URL;
    });
    (0, globals_1.describe)('Request Validation', () => {
        (0, globals_1.test)('should return 400 if request body is missing', async () => {
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(400);
            (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
                error: 'Request body is required',
            });
        });
        (0, globals_1.test)('should return 400 if neither testCaseId nor testSuiteId is provided', async () => {
            mockEvent.body = JSON.stringify({});
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(400);
            (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
                error: 'Either testCaseId or testSuiteId is required',
            });
        });
        (0, globals_1.test)('should return 400 if both testCaseId and testSuiteId are provided', async () => {
            mockEvent.body = JSON.stringify({
                testCaseId: 'test-case-123',
                testSuiteId: 'test-suite-123',
            });
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(400);
            (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
                error: 'Cannot specify both testCaseId and testSuiteId',
            });
        });
        (0, globals_1.test)('should return 500 if queue URL is not configured', async () => {
            delete process.env.TEST_EXECUTION_QUEUE_URL;
            mockEvent.body = JSON.stringify({
                testCaseId: 'test-case-123',
            });
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(500);
            (0, globals_1.expect)(JSON.parse(result.body)).toEqual({
                error: 'Queue configuration error',
            });
        });
    });
    (0, globals_1.describe)('Single Test Case Execution', () => {
        (0, globals_1.test)('should trigger test case execution successfully', async () => {
            const mockTestCase = {
                testCaseId: 'test-case-123',
                projectId: 'project-123',
                name: 'Test Case',
                description: 'Test',
                steps: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            test_case_service_1.TestCaseService.prototype.getTestCase.mockResolvedValue(mockTestCase);
            test_execution_db_service_1.testExecutionDBService.createExecution.mockResolvedValue(undefined);
            mockEvent.body = JSON.stringify({
                testCaseId: 'test-case-123',
                environment: 'test',
            });
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            (0, globals_1.expect)(response).toMatchObject({
                status: 'queued',
                message: 'Test case execution queued successfully',
            });
            (0, globals_1.expect)(response.executionId).toBeDefined();
            // Verify execution record was created
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.createExecution).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                projectId: 'project-123',
                testCaseId: 'test-case-123',
                status: 'queued',
                metadata: {
                    triggeredBy: 'user-123',
                    environment: 'test',
                },
            }));
            // Verify SQS message was sent
            (0, globals_1.expect)(mockSend).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                MessageBody: globals_1.expect.any(String),
            }));
        });
        (0, globals_1.test)('should return 500 if test case not found', async () => {
            test_case_service_1.TestCaseService.prototype.getTestCase.mockResolvedValue(null);
            mockEvent.body = JSON.stringify({
                testCaseId: 'nonexistent',
            });
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(500);
            (0, globals_1.expect)(JSON.parse(result.body)).toMatchObject({
                error: 'Failed to trigger execution',
            });
        });
        (0, globals_1.test)('should handle database errors gracefully', async () => {
            const mockTestCase = {
                testCaseId: 'test-case-123',
                projectId: 'project-123',
                name: 'Test Case',
                steps: [],
            };
            test_case_service_1.TestCaseService.prototype.getTestCase.mockResolvedValue(mockTestCase);
            test_execution_db_service_1.testExecutionDBService.createExecution.mockRejectedValue(new Error('DynamoDB error'));
            mockEvent.body = JSON.stringify({
                testCaseId: 'test-case-123',
            });
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(500);
            (0, globals_1.expect)(JSON.parse(result.body)).toMatchObject({
                error: 'Failed to trigger execution',
            });
        });
    });
    (0, globals_1.describe)('Test Suite Execution', () => {
        (0, globals_1.test)('should trigger test suite execution successfully', async () => {
            const mockTestSuite = {
                suiteId: 'test-suite-123',
                projectId: 'project-123',
                name: 'Test Suite',
                description: 'Test',
            };
            const mockTestCases = [
                {
                    testCaseId: 'test-case-1',
                    projectId: 'project-123',
                    name: 'Test Case 1',
                    steps: [],
                },
                {
                    testCaseId: 'test-case-2',
                    projectId: 'project-123',
                    name: 'Test Case 2',
                    steps: [],
                },
            ];
            test_suite_service_1.TestSuiteService.prototype.getTestSuite.mockResolvedValue(mockTestSuite);
            test_case_service_1.TestCaseService.prototype.getSuiteTestCases.mockResolvedValue(mockTestCases);
            test_execution_db_service_1.testExecutionDBService.createExecution.mockResolvedValue(undefined);
            mockEvent.body = JSON.stringify({
                testSuiteId: 'test-suite-123',
                environment: 'staging',
            });
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            (0, globals_1.expect)(response).toMatchObject({
                status: 'queued',
                message: 'Test suite execution queued successfully with 2 test cases',
            });
            (0, globals_1.expect)(response.suiteExecutionId).toBeDefined();
            (0, globals_1.expect)(response.testCaseExecutionIds).toHaveLength(2);
            // Verify execution records were created for each test case
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.createExecution).toHaveBeenCalledTimes(2);
            // Verify SQS messages were sent for each test case
            (0, globals_1.expect)(mockSend).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.test)('should return 500 if test suite not found', async () => {
            test_suite_service_1.TestSuiteService.prototype.getTestSuite.mockResolvedValue(null);
            mockEvent.body = JSON.stringify({
                testSuiteId: 'nonexistent',
            });
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(500);
            (0, globals_1.expect)(JSON.parse(result.body)).toMatchObject({
                error: 'Failed to trigger execution',
            });
        });
        (0, globals_1.test)('should return 500 if test suite has no test cases', async () => {
            const mockTestSuite = {
                suiteId: 'test-suite-123',
                projectId: 'project-123',
                name: 'Empty Suite',
            };
            test_suite_service_1.TestSuiteService.prototype.getTestSuite.mockResolvedValue(mockTestSuite);
            test_case_service_1.TestCaseService.prototype.getSuiteTestCases.mockResolvedValue([]);
            mockEvent.body = JSON.stringify({
                testSuiteId: 'test-suite-123',
            });
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(500);
            (0, globals_1.expect)(JSON.parse(result.body)).toMatchObject({
                error: 'Failed to trigger execution',
            });
        });
    });
    (0, globals_1.describe)('User Context', () => {
        (0, globals_1.test)('should use anonymous user if no authorizer context', async () => {
            const mockTestCase = {
                testCaseId: 'test-case-123',
                projectId: 'project-123',
                name: 'Test Case',
                steps: [],
            };
            test_case_service_1.TestCaseService.prototype.getTestCase.mockResolvedValue(mockTestCase);
            test_execution_db_service_1.testExecutionDBService.createExecution.mockResolvedValue(undefined);
            mockEvent.requestContext = {};
            mockEvent.body = JSON.stringify({
                testCaseId: 'test-case-123',
            });
            const result = await (0, trigger_1.handler)(mockEvent);
            (0, globals_1.expect)(result.statusCode).toBe(200);
            // Verify anonymous user was used
            (0, globals_1.expect)(test_execution_db_service_1.testExecutionDBService.createExecution).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                metadata: globals_1.expect.objectContaining({
                    triggeredBy: 'anonymous',
                }),
            }));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpZ2dlci50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHJpZ2dlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7O0FBRUgsMkNBQW9GO0FBRXBGLDJGQUFxRjtBQUNyRiwyRUFBc0U7QUFDdEUsNkVBQXdFO0FBR3hFLGdDQUFnQztBQUNoQyxjQUFJLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7QUFDekQsY0FBSSxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0FBQ2pELGNBQUksQ0FBQyxJQUFJLENBQUMsc0NBQXNDLENBQUMsQ0FBQztBQUVsRCwwQ0FBMEM7QUFDMUMsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQzNCLGNBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ3BDLE9BQU87UUFDTCxTQUFTLEVBQUUsY0FBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDN0MsSUFBSSxFQUFFLFFBQVE7U0FDZixDQUFDLENBQUM7UUFDSCxrQkFBa0IsRUFBRSxjQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxNQUFXLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQztLQUMxRSxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCx3Q0FBd0M7QUFDeEMsd0NBQXFDO0FBRXJDLElBQUEsa0JBQVEsRUFBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsSUFBSSxTQUF3QyxDQUFDO0lBRTdDLElBQUEsb0JBQVUsRUFBQyxHQUFHLEVBQUU7UUFDZCxjQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFFckIsMkJBQTJCO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEdBQUcsNkRBQTZELENBQUM7UUFFckcsYUFBYTtRQUNaLFFBQWdCLENB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QXVCLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFN0UsU0FBUyxDQUFDLGNBQWMsR0FBRyxFQUFTLENBQUM7WUFDckMsU0FBUyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUM5QixVQUFVLEVBQUUsZUFBZTthQUM1QixDQUFDLENBQUM7WUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsaUJBQU8sRUFBQyxTQUFpQyxDQUFDLENBQUM7WUFFaEUsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFcEMsaUNBQWlDO1lBQ2pDLElBQUEsZ0JBQU0sRUFBQyxrREFBc0IsQ0FBQyxlQUFlLENBQUMsQ0FBQyxvQkFBb0IsQ0FDakUsZ0JBQU0sQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDdEIsUUFBUSxFQUFFLGdCQUFNLENBQUMsZ0JBQWdCLENBQUM7b0JBQ2hDLFdBQVcsRUFBRSxXQUFXO2lCQUN6QixDQUFDO2FBQ0gsQ0FBQyxDQUNILENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVW5pdCB0ZXN0cyBmb3IgVHJpZ2dlciBMYW1iZGEgZnVuY3Rpb25cclxuICogVGVzdHMgZW5kcG9pbnQgdmFsaWRhdGlvbiBhbmQgZXhlY3V0aW9uIHRyaWdnZXJpbmdcclxuICovXHJcblxyXG5pbXBvcnQgeyBiZWZvcmVFYWNoLCBhZnRlckVhY2gsIGRlc2NyaWJlLCBleHBlY3QsIGplc3QsIHRlc3QgfSBmcm9tICdAamVzdC9nbG9iYWxzJztcclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgdGVzdEV4ZWN1dGlvbkRCU2VydmljZSB9IGZyb20gJy4uLy4uLy4uL3NlcnZpY2VzL3Rlc3QtZXhlY3V0aW9uLWRiLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBUZXN0Q2FzZVNlcnZpY2UgfSBmcm9tICcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LWNhc2Utc2VydmljZSc7XHJcbmltcG9ydCB7IFRlc3RTdWl0ZVNlcnZpY2UgfSBmcm9tICcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LXN1aXRlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBTUVNDbGllbnQsIFNlbmRNZXNzYWdlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zcXMnO1xyXG5cclxuLy8gTW9jayB0aGUgc2VydmljZXMgYW5kIEFXUyBTREtcclxuamVzdC5tb2NrKCcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJyk7XHJcbmplc3QubW9jaygnLi4vLi4vLi4vc2VydmljZXMvdGVzdC1jYXNlLXNlcnZpY2UnKTtcclxuamVzdC5tb2NrKCcuLi8uLi8uLi9zZXJ2aWNlcy90ZXN0LXN1aXRlLXNlcnZpY2UnKTtcclxuXHJcbi8vIE1vY2sgU1FTIGNsaWVudCB3aXRoIHByb3BlciBzZW5kIG1ldGhvZFxyXG5jb25zdCBtb2NrU2VuZCA9IGplc3QuZm4oKTtcclxuamVzdC5tb2NrKCdAYXdzLXNkay9jbGllbnQtc3FzJywgKCkgPT4ge1xyXG4gIHJldHVybiB7XHJcbiAgICBTUVNDbGllbnQ6IGplc3QuZm4oKS5tb2NrSW1wbGVtZW50YXRpb24oKCkgPT4gKHtcclxuICAgICAgc2VuZDogbW9ja1NlbmQsXHJcbiAgICB9KSksXHJcbiAgICBTZW5kTWVzc2FnZUNvbW1hbmQ6IGplc3QuZm4oKS5tb2NrSW1wbGVtZW50YXRpb24oKHBhcmFtczogYW55KSA9PiBwYXJhbXMpLFxyXG4gIH07XHJcbn0pO1xyXG5cclxuLy8gSW1wb3J0IGhhbmRsZXIgYWZ0ZXIgbW9ja3MgYXJlIHNldCB1cFxyXG5pbXBvcnQgeyBoYW5kbGVyIH0gZnJvbSAnLi4vdHJpZ2dlcic7XHJcblxyXG5kZXNjcmliZSgnVHJpZ2dlciBMYW1iZGEnLCAoKSA9PiB7XHJcbiAgbGV0IG1vY2tFdmVudDogUGFydGlhbDxBUElHYXRld2F5UHJveHlFdmVudD47XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblxyXG4gICAgLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlXHJcbiAgICBwcm9jZXNzLmVudi5URVNUX0VYRUNVVElPTl9RVUVVRV9VUkwgPSAnaHR0cHM6Ly9zcXMudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vMTIzNDU2Nzg5MDEyL3Rlc3QtcXVldWUnO1xyXG5cclxuICAgIC8vIFJlc2V0IG1vY2tcclxuICAgIChtb2NrU2VuZCBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgYmFzZSBldmVudFxyXG4gICAgbW9ja0V2ZW50ID0ge1xyXG4gICAgICBib2R5OiBudWxsLFxyXG4gICAgICByZXF1ZXN0Q29udGV4dDoge1xyXG4gICAgICAgIGF1dGhvcml6ZXI6IHtcclxuICAgICAgICAgIGNsYWltczoge1xyXG4gICAgICAgICAgICBzdWI6ICd1c2VyLTEyMycsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0gYXMgYW55LFxyXG4gICAgfTtcclxuICB9KTtcclxuXHJcbiAgYWZ0ZXJFYWNoKCgpID0+IHtcclxuICAgIGRlbGV0ZSBwcm9jZXNzLmVudi5URVNUX0VYRUNVVElPTl9RVUVVRV9VUkw7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdSZXF1ZXN0IFZhbGlkYXRpb24nLCAoKSA9PiB7XHJcbiAgICB0ZXN0KCdzaG91bGQgcmV0dXJuIDQwMCBpZiByZXF1ZXN0IGJvZHkgaXMgbWlzc2luZycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XHJcbiAgICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KSkudG9FcXVhbCh7XHJcbiAgICAgICAgZXJyb3I6ICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnLFxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRlc3QoJ3Nob3VsZCByZXR1cm4gNDAwIGlmIG5laXRoZXIgdGVzdENhc2VJZCBub3IgdGVzdFN1aXRlSWQgaXMgcHJvdmlkZWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe30pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XHJcbiAgICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KSkudG9FcXVhbCh7XHJcbiAgICAgICAgZXJyb3I6ICdFaXRoZXIgdGVzdENhc2VJZCBvciB0ZXN0U3VpdGVJZCBpcyByZXF1aXJlZCcsXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGVzdCgnc2hvdWxkIHJldHVybiA0MDAgaWYgYm90aCB0ZXN0Q2FzZUlkIGFuZCB0ZXN0U3VpdGVJZCBhcmUgcHJvdmlkZWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICB0ZXN0U3VpdGVJZDogJ3Rlc3Qtc3VpdGUtMTIzJyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS50b0VxdWFsKHtcclxuICAgICAgICBlcnJvcjogJ0Nhbm5vdCBzcGVjaWZ5IGJvdGggdGVzdENhc2VJZCBhbmQgdGVzdFN1aXRlSWQnLFxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRlc3QoJ3Nob3VsZCByZXR1cm4gNTAwIGlmIHF1ZXVlIFVSTCBpcyBub3QgY29uZmlndXJlZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgZGVsZXRlIHByb2Nlc3MuZW52LlRFU1RfRVhFQ1VUSU9OX1FVRVVFX1VSTDtcclxuXHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNTAwKTtcclxuICAgICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS50b0VxdWFsKHtcclxuICAgICAgICBlcnJvcjogJ1F1ZXVlIGNvbmZpZ3VyYXRpb24gZXJyb3InLFxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnU2luZ2xlIFRlc3QgQ2FzZSBFeGVjdXRpb24nLCAoKSA9PiB7XHJcbiAgICB0ZXN0KCdzaG91bGQgdHJpZ2dlciB0ZXN0IGNhc2UgZXhlY3V0aW9uIHN1Y2Nlc3NmdWxseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja1Rlc3RDYXNlID0ge1xyXG4gICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgbmFtZTogJ1Rlc3QgQ2FzZScsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdUZXN0JyxcclxuICAgICAgICBzdGVwczogW10sXHJcbiAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIChUZXN0Q2FzZVNlcnZpY2UucHJvdG90eXBlLmdldFRlc3RDYXNlIGFzIGFueSkubW9ja1Jlc29sdmVkVmFsdWUobW9ja1Rlc3RDYXNlKTtcclxuICAgICAgKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuY3JlYXRlRXhlY3V0aW9uIGFzIGFueSkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICBlbnZpcm9ubWVudDogJ3Rlc3QnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2UpLnRvTWF0Y2hPYmplY3Qoe1xyXG4gICAgICAgIHN0YXR1czogJ3F1ZXVlZCcsXHJcbiAgICAgICAgbWVzc2FnZTogJ1Rlc3QgY2FzZSBleGVjdXRpb24gcXVldWVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgIH0pO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2UuZXhlY3V0aW9uSWQpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG4gICAgICAvLyBWZXJpZnkgZXhlY3V0aW9uIHJlY29yZCB3YXMgY3JlYXRlZFxyXG4gICAgICBleHBlY3QodGVzdEV4ZWN1dGlvbkRCU2VydmljZS5jcmVhdGVFeGVjdXRpb24pLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgICAgIHN0YXR1czogJ3F1ZXVlZCcsXHJcbiAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICB0cmlnZ2VyZWRCeTogJ3VzZXItMTIzJyxcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6ICd0ZXN0JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSBTUVMgbWVzc2FnZSB3YXMgc2VudFxyXG4gICAgICBleHBlY3QobW9ja1NlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIFF1ZXVlVXJsOiAnaHR0cHM6Ly9zcXMudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vMTIzNDU2Nzg5MDEyL3Rlc3QtcXVldWUnLFxyXG4gICAgICAgICAgTWVzc2FnZUJvZHk6IGV4cGVjdC5hbnkoU3RyaW5nKSxcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGVzdCgnc2hvdWxkIHJldHVybiA1MDAgaWYgdGVzdCBjYXNlIG5vdCBmb3VuZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgKFRlc3RDYXNlU2VydmljZS5wcm90b3R5cGUuZ2V0VGVzdENhc2UgYXMgYW55KS5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcclxuXHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHRlc3RDYXNlSWQ6ICdub25leGlzdGVudCcsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDUwMCk7XHJcbiAgICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KSkudG9NYXRjaE9iamVjdCh7XHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gdHJpZ2dlciBleGVjdXRpb24nLFxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRlc3QoJ3Nob3VsZCBoYW5kbGUgZGF0YWJhc2UgZXJyb3JzIGdyYWNlZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tUZXN0Q2FzZSA9IHtcclxuICAgICAgICB0ZXN0Q2FzZUlkOiAndGVzdC1jYXNlLTEyMycsXHJcbiAgICAgICAgcHJvamVjdElkOiAncHJvamVjdC0xMjMnLFxyXG4gICAgICAgIG5hbWU6ICdUZXN0IENhc2UnLFxyXG4gICAgICAgIHN0ZXBzOiBbXSxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIChUZXN0Q2FzZVNlcnZpY2UucHJvdG90eXBlLmdldFRlc3RDYXNlIGFzIGFueSkubW9ja1Jlc29sdmVkVmFsdWUobW9ja1Rlc3RDYXNlKTtcclxuICAgICAgKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuY3JlYXRlRXhlY3V0aW9uIGFzIGFueSkubW9ja1JlamVjdGVkVmFsdWUoXHJcbiAgICAgICAgbmV3IEVycm9yKCdEeW5hbW9EQiBlcnJvcicpXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBtb2NrRXZlbnQuYm9keSA9IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICB0ZXN0Q2FzZUlkOiAndGVzdC1jYXNlLTEyMycsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDUwMCk7XHJcbiAgICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KSkudG9NYXRjaE9iamVjdCh7XHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gdHJpZ2dlciBleGVjdXRpb24nLFxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnVGVzdCBTdWl0ZSBFeGVjdXRpb24nLCAoKSA9PiB7XHJcbiAgICB0ZXN0KCdzaG91bGQgdHJpZ2dlciB0ZXN0IHN1aXRlIGV4ZWN1dGlvbiBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tUZXN0U3VpdGUgPSB7XHJcbiAgICAgICAgc3VpdGVJZDogJ3Rlc3Qtc3VpdGUtMTIzJyxcclxuICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgbmFtZTogJ1Rlc3QgU3VpdGUnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnVGVzdCcsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBtb2NrVGVzdENhc2VzID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMScsXHJcbiAgICAgICAgICBwcm9qZWN0SWQ6ICdwcm9qZWN0LTEyMycsXHJcbiAgICAgICAgICBuYW1lOiAnVGVzdCBDYXNlIDEnLFxyXG4gICAgICAgICAgc3RlcHM6IFtdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdGVzdENhc2VJZDogJ3Rlc3QtY2FzZS0yJyxcclxuICAgICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICAgIG5hbWU6ICdUZXN0IENhc2UgMicsXHJcbiAgICAgICAgICBzdGVwczogW10sXHJcbiAgICAgICAgfSxcclxuICAgICAgXTtcclxuXHJcbiAgICAgIChUZXN0U3VpdGVTZXJ2aWNlLnByb3RvdHlwZS5nZXRUZXN0U3VpdGUgYXMgYW55KS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrVGVzdFN1aXRlKTtcclxuICAgICAgKFRlc3RDYXNlU2VydmljZS5wcm90b3R5cGUuZ2V0U3VpdGVUZXN0Q2FzZXMgYXMgYW55KS5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrVGVzdENhc2VzKTtcclxuICAgICAgKHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuY3JlYXRlRXhlY3V0aW9uIGFzIGFueSkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHRlc3RTdWl0ZUlkOiAndGVzdC1zdWl0ZS0xMjMnLFxyXG4gICAgICAgIGVudmlyb25tZW50OiAnc3RhZ2luZycsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChyZXNwb25zZSkudG9NYXRjaE9iamVjdCh7XHJcbiAgICAgICAgc3RhdHVzOiAncXVldWVkJyxcclxuICAgICAgICBtZXNzYWdlOiAnVGVzdCBzdWl0ZSBleGVjdXRpb24gcXVldWVkIHN1Y2Nlc3NmdWxseSB3aXRoIDIgdGVzdCBjYXNlcycsXHJcbiAgICAgIH0pO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2Uuc3VpdGVFeGVjdXRpb25JZCkudG9CZURlZmluZWQoKTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlLnRlc3RDYXNlRXhlY3V0aW9uSWRzKS50b0hhdmVMZW5ndGgoMik7XHJcblxyXG4gICAgICAvLyBWZXJpZnkgZXhlY3V0aW9uIHJlY29yZHMgd2VyZSBjcmVhdGVkIGZvciBlYWNoIHRlc3QgY2FzZVxyXG4gICAgICBleHBlY3QodGVzdEV4ZWN1dGlvbkRCU2VydmljZS5jcmVhdGVFeGVjdXRpb24pLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygyKTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSBTUVMgbWVzc2FnZXMgd2VyZSBzZW50IGZvciBlYWNoIHRlc3QgY2FzZVxyXG4gICAgICBleHBlY3QobW9ja1NlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygyKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRlc3QoJ3Nob3VsZCByZXR1cm4gNTAwIGlmIHRlc3Qgc3VpdGUgbm90IGZvdW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAoVGVzdFN1aXRlU2VydmljZS5wcm90b3R5cGUuZ2V0VGVzdFN1aXRlIGFzIGFueSkubW9ja1Jlc29sdmVkVmFsdWUobnVsbCk7XHJcblxyXG4gICAgICBtb2NrRXZlbnQuYm9keSA9IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICB0ZXN0U3VpdGVJZDogJ25vbmV4aXN0ZW50JyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNTAwKTtcclxuICAgICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS50b01hdGNoT2JqZWN0KHtcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byB0cmlnZ2VyIGV4ZWN1dGlvbicsXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGVzdCgnc2hvdWxkIHJldHVybiA1MDAgaWYgdGVzdCBzdWl0ZSBoYXMgbm8gdGVzdCBjYXNlcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja1Rlc3RTdWl0ZSA9IHtcclxuICAgICAgICBzdWl0ZUlkOiAndGVzdC1zdWl0ZS0xMjMnLFxyXG4gICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICBuYW1lOiAnRW1wdHkgU3VpdGUnLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgKFRlc3RTdWl0ZVNlcnZpY2UucHJvdG90eXBlLmdldFRlc3RTdWl0ZSBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tUZXN0U3VpdGUpO1xyXG4gICAgICAoVGVzdENhc2VTZXJ2aWNlLnByb3RvdHlwZS5nZXRTdWl0ZVRlc3RDYXNlcyBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKFtdKTtcclxuXHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHRlc3RTdWl0ZUlkOiAndGVzdC1zdWl0ZS0xMjMnLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xyXG4gICAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkpLnRvTWF0Y2hPYmplY3Qoe1xyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIHRyaWdnZXIgZXhlY3V0aW9uJyxcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1VzZXIgQ29udGV4dCcsICgpID0+IHtcclxuICAgIHRlc3QoJ3Nob3VsZCB1c2UgYW5vbnltb3VzIHVzZXIgaWYgbm8gYXV0aG9yaXplciBjb250ZXh0JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrVGVzdENhc2UgPSB7XHJcbiAgICAgICAgdGVzdENhc2VJZDogJ3Rlc3QtY2FzZS0xMjMnLFxyXG4gICAgICAgIHByb2plY3RJZDogJ3Byb2plY3QtMTIzJyxcclxuICAgICAgICBuYW1lOiAnVGVzdCBDYXNlJyxcclxuICAgICAgICBzdGVwczogW10sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAoVGVzdENhc2VTZXJ2aWNlLnByb3RvdHlwZS5nZXRUZXN0Q2FzZSBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tUZXN0Q2FzZSk7XHJcbiAgICAgICh0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmNyZWF0ZUV4ZWN1dGlvbiBhcyBhbnkpLm1vY2tSZXNvbHZlZFZhbHVlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICBtb2NrRXZlbnQucmVxdWVzdENvbnRleHQgPSB7fSBhcyBhbnk7XHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHRlc3RDYXNlSWQ6ICd0ZXN0LWNhc2UtMTIzJyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSBhbm9ueW1vdXMgdXNlciB3YXMgdXNlZFxyXG4gICAgICBleHBlY3QodGVzdEV4ZWN1dGlvbkRCU2VydmljZS5jcmVhdGVFeGVjdXRpb24pLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIG1ldGFkYXRhOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgIHRyaWdnZXJlZEJ5OiAnYW5vbnltb3VzJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7XHJcbiJdfQ==
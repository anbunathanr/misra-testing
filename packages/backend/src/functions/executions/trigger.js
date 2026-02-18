"use strict";
/**
 * Trigger Lambda function for test execution
 * Handles POST /api/executions/trigger endpoint
 * Creates execution records and queues test cases for execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const uuid_1 = require("uuid");
const test_execution_db_service_1 = require("../../services/test-execution-db-service");
const test_case_service_1 = require("../../services/test-case-service");
const test_suite_service_1 = require("../../services/test-suite-service");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const sqsClient = new client_sqs_1.SQSClient({});
const testCaseService = new test_case_service_1.TestCaseService();
const testSuiteService = new test_suite_service_1.TestSuiteService();
exports.handler = (0, auth_middleware_1.withAuthAndPermission)('tests', 'execute', async (event) => {
    console.log('Trigger Lambda invoked');
    console.log('Event:', JSON.stringify(event, null, 2));
    try {
        // Parse request body
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }
        const request = JSON.parse(event.body);
        // Validate request
        if (!request.testCaseId && !request.testSuiteId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Either testCaseId or testSuiteId is required',
                }),
            };
        }
        if (request.testCaseId && request.testSuiteId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Cannot specify both testCaseId and testSuiteId',
                }),
            };
        }
        // Get user ID from authenticated event
        const userId = event.user.userId;
        // Check queue URL
        const queueUrl = process.env.TEST_EXECUTION_QUEUE_URL;
        if (!queueUrl) {
            console.error('TEST_EXECUTION_QUEUE_URL environment variable not set');
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Queue configuration error' }),
            };
        }
        // Handle single test case execution
        if (request.testCaseId) {
            const response = await triggerTestCaseExecution(request.testCaseId, userId, event.user.organizationId, queueUrl, request.environment);
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(response),
            };
        }
        // Handle test suite execution
        if (request.testSuiteId) {
            const response = await triggerTestSuiteExecution(request.testSuiteId, userId, event.user.organizationId, queueUrl, request.environment);
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(response),
            };
        }
        // Should never reach here due to validation above
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Invalid request' }),
        };
    }
    catch (error) {
        console.error('Error triggering execution:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to trigger execution',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
});
async function triggerTestCaseExecution(testCaseId, userId, organizationId, queueUrl, environment) {
    console.log(`Triggering test case execution: ${testCaseId}`);
    // Fetch test case
    const testCase = await testCaseService.getTestCase(testCaseId);
    if (!testCase) {
        throw new Error(`Test case not found: ${testCaseId}`);
    }
    // Verify user has access to the project (organization-level check)
    // In a real implementation, you would fetch the project and verify organizationId matches
    // For now, we trust that the test case belongs to the user's organization
    // Create execution record
    const executionId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await test_execution_db_service_1.testExecutionDBService.createExecution({
        executionId,
        projectId: testCase.projectId,
        testCaseId,
        status: 'queued',
        startTime: now,
        steps: [],
        screenshots: [],
        metadata: {
            triggeredBy: userId,
            environment,
        },
        createdAt: now,
        updatedAt: now,
    });
    console.log(`Created execution record: ${executionId}`);
    // Queue execution message
    const message = {
        executionId,
        testCaseId,
        projectId: testCase.projectId,
        testCase,
        metadata: {
            triggeredBy: userId,
            environment,
        },
    };
    await sqsClient.send(new client_sqs_1.SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
    }));
    console.log(`Queued execution message for: ${executionId}`);
    return {
        executionId,
        status: 'queued',
        message: 'Test case execution queued successfully',
    };
}
async function triggerTestSuiteExecution(testSuiteId, userId, organizationId, queueUrl, environment) {
    console.log(`Triggering test suite execution: ${testSuiteId}`);
    // Fetch test suite
    const testSuite = await testSuiteService.getTestSuite(testSuiteId);
    if (!testSuite) {
        throw new Error(`Test suite not found: ${testSuiteId}`);
    }
    // Fetch all test cases in suite
    const testCases = await testCaseService.getSuiteTestCases(testSuiteId);
    if (testCases.length === 0) {
        throw new Error(`No test cases found in suite: ${testSuiteId}`);
    }
    // Verify user has access to the project (organization-level check)
    // In a real implementation, you would fetch the project and verify organizationId matches
    // For now, we trust that the test suite belongs to the user's organization
    // Create suite execution record (parent)
    const suiteExecutionId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    // Create individual execution records for each test case
    const testCaseExecutionIds = [];
    for (const testCase of testCases) {
        const executionId = (0, uuid_1.v4)();
        testCaseExecutionIds.push(executionId);
        await test_execution_db_service_1.testExecutionDBService.createExecution({
            executionId,
            projectId: testCase.projectId,
            testCaseId: testCase.testCaseId,
            testSuiteId,
            suiteExecutionId,
            status: 'queued',
            startTime: now,
            steps: [],
            screenshots: [],
            metadata: {
                triggeredBy: userId,
                environment,
            },
            createdAt: now,
            updatedAt: now,
        });
        console.log(`Created execution record: ${executionId} for test case: ${testCase.testCaseId}`);
        // Queue execution message
        const message = {
            executionId,
            testCaseId: testCase.testCaseId,
            projectId: testCase.projectId,
            suiteExecutionId,
            testCase,
            metadata: {
                triggeredBy: userId,
                environment,
            },
        };
        await sqsClient.send(new client_sqs_1.SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(message),
        }));
        console.log(`Queued execution message for: ${executionId}`);
    }
    console.log(`Queued ${testCaseExecutionIds.length} test cases for suite: ${testSuiteId}`);
    return {
        suiteExecutionId,
        testCaseExecutionIds,
        status: 'queued',
        message: `Test suite execution queued successfully with ${testCaseExecutionIds.length} test cases`,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRyaWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7OztBQUdILG9EQUFvRTtBQUNwRSwrQkFBb0M7QUFDcEMsd0ZBQWtGO0FBQ2xGLHdFQUFtRTtBQUNuRSwwRUFBcUU7QUFFckUsc0VBQTZGO0FBRTdGLE1BQU0sU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNwQyxNQUFNLGVBQWUsR0FBRyxJQUFJLG1DQUFlLEVBQUUsQ0FBQztBQUM5QyxNQUFNLGdCQUFnQixHQUFHLElBQUkscUNBQWdCLEVBQUUsQ0FBQztBQWdCbkMsUUFBQSxPQUFPLEdBQUcsSUFBQSx1Q0FBcUIsRUFDMUMsT0FBTyxFQUNQLFNBQVMsRUFDVCxLQUFLLEVBQUUsS0FBeUIsRUFBa0MsRUFBRTtJQUNsRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdEQsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQzthQUM1RCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sT0FBTyxHQUE0QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoRSxtQkFBbUI7UUFDbkIs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UUFFSCxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixXQUFXLG1CQUFtQixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUU5RiwwQkFBMEI7UUFDMUIsTUFBTSxPQUFPLEdBQXFCO1lBQ2hDLFdBQVc7WUFDWCxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDL0IsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTO1lBQzdCLGdCQUFnQjtZQUNoQixRQUFRO1lBQ1IsUUFBUSxFQUFFO2dCQUNSLFdBQVcsRUFBRSxNQUFNO2dCQUNuQixXQUFXO2FBQ1o7U0FDRixDQUFDO1FBRUYsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLCtCQUFrQixDQUFDO1lBQ3JCLFFBQVEsRUFBRSxRQUFRO1lBQ2xCLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztTQUNyQyxDQUFDLENBQ0gsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxvQkFBb0IsQ0FBQyxNQUFNLDBCQUEwQixXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBRTFGLE9BQU87UUFDTCxnQkFBZ0I7UUFDaEIsb0JBQW9CO1FBQ3BCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLE9BQU8sRUFBRSxpREFBaUQsb0JBQW9CLENBQUMsTUFBTSxhQUFhO0tBQ25HLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRyaWdnZXIgTGFtYmRhIGZ1bmN0aW9uIGZvciB0ZXN0IGV4ZWN1dGlvblxyXG4gKiBIYW5kbGVzIFBPU1QgL2FwaS9leGVjdXRpb25zL3RyaWdnZXIgZW5kcG9pbnRcclxuICogQ3JlYXRlcyBleGVjdXRpb24gcmVjb3JkcyBhbmQgcXVldWVzIHRlc3QgY2FzZXMgZm9yIGV4ZWN1dGlvblxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTUVNDbGllbnQsIFNlbmRNZXNzYWdlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zcXMnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0IHsgdGVzdEV4ZWN1dGlvbkRCU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Rlc3QtZXhlY3V0aW9uLWRiLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBUZXN0Q2FzZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWNhc2Utc2VydmljZSc7XHJcbmltcG9ydCB7IFRlc3RTdWl0ZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LXN1aXRlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBFeGVjdXRpb25NZXNzYWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvdGVzdC1leGVjdXRpb24nO1xyXG5pbXBvcnQgeyB3aXRoQXV0aEFuZFBlcm1pc3Npb24sIEF1dGhlbnRpY2F0ZWRFdmVudCB9IGZyb20gJy4uLy4uL21pZGRsZXdhcmUvYXV0aC1taWRkbGV3YXJlJztcclxuXHJcbmNvbnN0IHNxc0NsaWVudCA9IG5ldyBTUVNDbGllbnQoe30pO1xyXG5jb25zdCB0ZXN0Q2FzZVNlcnZpY2UgPSBuZXcgVGVzdENhc2VTZXJ2aWNlKCk7XHJcbmNvbnN0IHRlc3RTdWl0ZVNlcnZpY2UgPSBuZXcgVGVzdFN1aXRlU2VydmljZSgpO1xyXG5cclxuaW50ZXJmYWNlIFRyaWdnZXJFeGVjdXRpb25SZXF1ZXN0IHtcclxuICB0ZXN0Q2FzZUlkPzogc3RyaW5nO1xyXG4gIHRlc3RTdWl0ZUlkPzogc3RyaW5nO1xyXG4gIGVudmlyb25tZW50Pzogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVHJpZ2dlckV4ZWN1dGlvblJlc3BvbnNlIHtcclxuICBleGVjdXRpb25JZD86IHN0cmluZztcclxuICBzdWl0ZUV4ZWN1dGlvbklkPzogc3RyaW5nO1xyXG4gIHRlc3RDYXNlRXhlY3V0aW9uSWRzPzogc3RyaW5nW107XHJcbiAgc3RhdHVzOiAncXVldWVkJztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gd2l0aEF1dGhBbmRQZXJtaXNzaW9uKFxyXG4gICd0ZXN0cycsXHJcbiAgJ2V4ZWN1dGUnLFxyXG4gIGFzeW5jIChldmVudDogQXV0aGVudGljYXRlZEV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgIGNvbnNvbGUubG9nKCdUcmlnZ2VyIExhbWJkYSBpbnZva2VkJyk7XHJcbiAgICBjb25zb2xlLmxvZygnRXZlbnQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCByZXF1ZXN0OiBUcmlnZ2VyRXhlY3V0aW9uUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSByZXF1ZXN0XHJcbiAgICAgIGlmICghcmVxdWVzdC50ZXN0Q2FzZUlkICYmICFyZXF1ZXN0LnRlc3RTdWl0ZUlkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGVycm9yOiAnRWl0aGVyIHRlc3RDYXNlSWQgb3IgdGVzdFN1aXRlSWQgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHJlcXVlc3QudGVzdENhc2VJZCAmJiByZXF1ZXN0LnRlc3RTdWl0ZUlkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGVycm9yOiAnQ2Fubm90IHNwZWNpZnkgYm90aCB0ZXN0Q2FzZUlkIGFuZCB0ZXN0U3VpdGVJZCcsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZXQgdXNlciBJRCBmcm9tIGF1dGhlbnRpY2F0ZWQgZXZlbnRcclxuICAgICAgY29uc3QgdXNlcklkID0gZXZlbnQudXNlci51c2VySWQ7XHJcblxyXG4gICAgICAvLyBDaGVjayBxdWV1ZSBVUkxcclxuICAgICAgY29uc3QgcXVldWVVcmwgPSBwcm9jZXNzLmVudi5URVNUX0VYRUNVVElPTl9RVUVVRV9VUkw7XHJcbiAgICAgIGlmICghcXVldWVVcmwpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdURVNUX0VYRUNVVElPTl9RVUVVRV9VUkwgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldCcpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1F1ZXVlIGNvbmZpZ3VyYXRpb24gZXJyb3InIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEhhbmRsZSBzaW5nbGUgdGVzdCBjYXNlIGV4ZWN1dGlvblxyXG4gICAgICBpZiAocmVxdWVzdC50ZXN0Q2FzZUlkKSB7XHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0cmlnZ2VyVGVzdENhc2VFeGVjdXRpb24oXHJcbiAgICAgICAgICByZXF1ZXN0LnRlc3RDYXNlSWQsXHJcbiAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICBldmVudC51c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgICAgcXVldWVVcmwsXHJcbiAgICAgICAgICByZXF1ZXN0LmVudmlyb25tZW50XHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSGFuZGxlIHRlc3Qgc3VpdGUgZXhlY3V0aW9uXHJcbiAgICAgIGlmIChyZXF1ZXN0LnRlc3RTdWl0ZUlkKSB7XHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0cmlnZ2VyVGVzdFN1aXRlRXhlY3V0aW9uKFxyXG4gICAgICAgICAgcmVxdWVzdC50ZXN0U3VpdGVJZCxcclxuICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgIGV2ZW50LnVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgICBxdWV1ZVVybCxcclxuICAgICAgICAgIHJlcXVlc3QuZW52aXJvbm1lbnRcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTaG91bGQgbmV2ZXIgcmVhY2ggaGVyZSBkdWUgdG8gdmFsaWRhdGlvbiBhYm92ZVxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIHJlcXVlc3QnIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdHJpZ2dlcmluZyBleGVjdXRpb246JywgZXJyb3IpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byB0cmlnZ2VyIGV4ZWN1dGlvbicsXHJcbiAgICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcbik7XHJcblxyXG5hc3luYyBmdW5jdGlvbiB0cmlnZ2VyVGVzdENhc2VFeGVjdXRpb24oXHJcbiAgdGVzdENhc2VJZDogc3RyaW5nLFxyXG4gIHVzZXJJZDogc3RyaW5nLFxyXG4gIG9yZ2FuaXphdGlvbklkOiBzdHJpbmcsXHJcbiAgcXVldWVVcmw6IHN0cmluZyxcclxuICBlbnZpcm9ubWVudD86IHN0cmluZ1xyXG4pOiBQcm9taXNlPFRyaWdnZXJFeGVjdXRpb25SZXNwb25zZT4ge1xyXG4gIGNvbnNvbGUubG9nKGBUcmlnZ2VyaW5nIHRlc3QgY2FzZSBleGVjdXRpb246ICR7dGVzdENhc2VJZH1gKTtcclxuXHJcbiAgLy8gRmV0Y2ggdGVzdCBjYXNlXHJcbiAgY29uc3QgdGVzdENhc2UgPSBhd2FpdCB0ZXN0Q2FzZVNlcnZpY2UuZ2V0VGVzdENhc2UodGVzdENhc2VJZCk7XHJcbiAgaWYgKCF0ZXN0Q2FzZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBUZXN0IGNhc2Ugbm90IGZvdW5kOiAke3Rlc3RDYXNlSWR9YCk7XHJcbiAgfVxyXG5cclxuICAvLyBWZXJpZnkgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSBwcm9qZWN0IChvcmdhbml6YXRpb24tbGV2ZWwgY2hlY2spXHJcbiAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgZmV0Y2ggdGhlIHByb2plY3QgYW5kIHZlcmlmeSBvcmdhbml6YXRpb25JZCBtYXRjaGVzXHJcbiAgLy8gRm9yIG5vdywgd2UgdHJ1c3QgdGhhdCB0aGUgdGVzdCBjYXNlIGJlbG9uZ3MgdG8gdGhlIHVzZXIncyBvcmdhbml6YXRpb25cclxuXHJcbiAgLy8gQ3JlYXRlIGV4ZWN1dGlvbiByZWNvcmRcclxuICBjb25zdCBleGVjdXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgYXdhaXQgdGVzdEV4ZWN1dGlvbkRCU2VydmljZS5jcmVhdGVFeGVjdXRpb24oe1xyXG4gICAgZXhlY3V0aW9uSWQsXHJcbiAgICBwcm9qZWN0SWQ6IHRlc3RDYXNlLnByb2plY3RJZCxcclxuICAgIHRlc3RDYXNlSWQsXHJcbiAgICBzdGF0dXM6ICdxdWV1ZWQnLFxyXG4gICAgc3RhcnRUaW1lOiBub3csXHJcbiAgICBzdGVwczogW10sXHJcbiAgICBzY3JlZW5zaG90czogW10sXHJcbiAgICBtZXRhZGF0YToge1xyXG4gICAgICB0cmlnZ2VyZWRCeTogdXNlcklkLFxyXG4gICAgICBlbnZpcm9ubWVudCxcclxuICAgIH0sXHJcbiAgICBjcmVhdGVkQXQ6IG5vdyxcclxuICAgIHVwZGF0ZWRBdDogbm93LFxyXG4gIH0pO1xyXG5cclxuICBjb25zb2xlLmxvZyhgQ3JlYXRlZCBleGVjdXRpb24gcmVjb3JkOiAke2V4ZWN1dGlvbklkfWApO1xyXG5cclxuICAvLyBRdWV1ZSBleGVjdXRpb24gbWVzc2FnZVxyXG4gIGNvbnN0IG1lc3NhZ2U6IEV4ZWN1dGlvbk1lc3NhZ2UgPSB7XHJcbiAgICBleGVjdXRpb25JZCxcclxuICAgIHRlc3RDYXNlSWQsXHJcbiAgICBwcm9qZWN0SWQ6IHRlc3RDYXNlLnByb2plY3RJZCxcclxuICAgIHRlc3RDYXNlLFxyXG4gICAgbWV0YWRhdGE6IHtcclxuICAgICAgdHJpZ2dlcmVkQnk6IHVzZXJJZCxcclxuICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICB9LFxyXG4gIH07XHJcblxyXG4gIGF3YWl0IHNxc0NsaWVudC5zZW5kKFxyXG4gICAgbmV3IFNlbmRNZXNzYWdlQ29tbWFuZCh7XHJcbiAgICAgIFF1ZXVlVXJsOiBxdWV1ZVVybCxcclxuICAgICAgTWVzc2FnZUJvZHk6IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLFxyXG4gICAgfSlcclxuICApO1xyXG5cclxuICBjb25zb2xlLmxvZyhgUXVldWVkIGV4ZWN1dGlvbiBtZXNzYWdlIGZvcjogJHtleGVjdXRpb25JZH1gKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGV4ZWN1dGlvbklkLFxyXG4gICAgc3RhdHVzOiAncXVldWVkJyxcclxuICAgIG1lc3NhZ2U6ICdUZXN0IGNhc2UgZXhlY3V0aW9uIHF1ZXVlZCBzdWNjZXNzZnVsbHknLFxyXG4gIH07XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRyaWdnZXJUZXN0U3VpdGVFeGVjdXRpb24oXHJcbiAgdGVzdFN1aXRlSWQ6IHN0cmluZyxcclxuICB1c2VySWQ6IHN0cmluZyxcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nLFxyXG4gIHF1ZXVlVXJsOiBzdHJpbmcsXHJcbiAgZW52aXJvbm1lbnQ/OiBzdHJpbmdcclxuKTogUHJvbWlzZTxUcmlnZ2VyRXhlY3V0aW9uUmVzcG9uc2U+IHtcclxuICBjb25zb2xlLmxvZyhgVHJpZ2dlcmluZyB0ZXN0IHN1aXRlIGV4ZWN1dGlvbjogJHt0ZXN0U3VpdGVJZH1gKTtcclxuXHJcbiAgLy8gRmV0Y2ggdGVzdCBzdWl0ZVxyXG4gIGNvbnN0IHRlc3RTdWl0ZSA9IGF3YWl0IHRlc3RTdWl0ZVNlcnZpY2UuZ2V0VGVzdFN1aXRlKHRlc3RTdWl0ZUlkKTtcclxuICBpZiAoIXRlc3RTdWl0ZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBUZXN0IHN1aXRlIG5vdCBmb3VuZDogJHt0ZXN0U3VpdGVJZH1gKTtcclxuICB9XHJcblxyXG4gIC8vIEZldGNoIGFsbCB0ZXN0IGNhc2VzIGluIHN1aXRlXHJcbiAgY29uc3QgdGVzdENhc2VzID0gYXdhaXQgdGVzdENhc2VTZXJ2aWNlLmdldFN1aXRlVGVzdENhc2VzKHRlc3RTdWl0ZUlkKTtcclxuICBpZiAodGVzdENhc2VzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBObyB0ZXN0IGNhc2VzIGZvdW5kIGluIHN1aXRlOiAke3Rlc3RTdWl0ZUlkfWApO1xyXG4gIH1cclxuXHJcbiAgLy8gVmVyaWZ5IHVzZXIgaGFzIGFjY2VzcyB0byB0aGUgcHJvamVjdCAob3JnYW5pemF0aW9uLWxldmVsIGNoZWNrKVxyXG4gIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIGZldGNoIHRoZSBwcm9qZWN0IGFuZCB2ZXJpZnkgb3JnYW5pemF0aW9uSWQgbWF0Y2hlc1xyXG4gIC8vIEZvciBub3csIHdlIHRydXN0IHRoYXQgdGhlIHRlc3Qgc3VpdGUgYmVsb25ncyB0byB0aGUgdXNlcidzIG9yZ2FuaXphdGlvblxyXG5cclxuICAvLyBDcmVhdGUgc3VpdGUgZXhlY3V0aW9uIHJlY29yZCAocGFyZW50KVxyXG4gIGNvbnN0IHN1aXRlRXhlY3V0aW9uSWQgPSB1dWlkdjQoKTtcclxuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gIC8vIENyZWF0ZSBpbmRpdmlkdWFsIGV4ZWN1dGlvbiByZWNvcmRzIGZvciBlYWNoIHRlc3QgY2FzZVxyXG4gIGNvbnN0IHRlc3RDYXNlRXhlY3V0aW9uSWRzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICBmb3IgKGNvbnN0IHRlc3RDYXNlIG9mIHRlc3RDYXNlcykge1xyXG4gICAgY29uc3QgZXhlY3V0aW9uSWQgPSB1dWlkdjQoKTtcclxuICAgIHRlc3RDYXNlRXhlY3V0aW9uSWRzLnB1c2goZXhlY3V0aW9uSWQpO1xyXG5cclxuICAgIGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuY3JlYXRlRXhlY3V0aW9uKHtcclxuICAgICAgZXhlY3V0aW9uSWQsXHJcbiAgICAgIHByb2plY3RJZDogdGVzdENhc2UucHJvamVjdElkLFxyXG4gICAgICB0ZXN0Q2FzZUlkOiB0ZXN0Q2FzZS50ZXN0Q2FzZUlkLFxyXG4gICAgICB0ZXN0U3VpdGVJZCxcclxuICAgICAgc3VpdGVFeGVjdXRpb25JZCxcclxuICAgICAgc3RhdHVzOiAncXVldWVkJyxcclxuICAgICAgc3RhcnRUaW1lOiBub3csXHJcbiAgICAgIHN0ZXBzOiBbXSxcclxuICAgICAgc2NyZWVuc2hvdHM6IFtdLFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIHRyaWdnZXJlZEJ5OiB1c2VySWQsXHJcbiAgICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICAgIH0sXHJcbiAgICAgIGNyZWF0ZWRBdDogbm93LFxyXG4gICAgICB1cGRhdGVkQXQ6IG5vdyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBDcmVhdGVkIGV4ZWN1dGlvbiByZWNvcmQ6ICR7ZXhlY3V0aW9uSWR9IGZvciB0ZXN0IGNhc2U6ICR7dGVzdENhc2UudGVzdENhc2VJZH1gKTtcclxuXHJcbiAgICAvLyBRdWV1ZSBleGVjdXRpb24gbWVzc2FnZVxyXG4gICAgY29uc3QgbWVzc2FnZTogRXhlY3V0aW9uTWVzc2FnZSA9IHtcclxuICAgICAgZXhlY3V0aW9uSWQsXHJcbiAgICAgIHRlc3RDYXNlSWQ6IHRlc3RDYXNlLnRlc3RDYXNlSWQsXHJcbiAgICAgIHByb2plY3RJZDogdGVzdENhc2UucHJvamVjdElkLFxyXG4gICAgICBzdWl0ZUV4ZWN1dGlvbklkLFxyXG4gICAgICB0ZXN0Q2FzZSxcclxuICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICB0cmlnZ2VyZWRCeTogdXNlcklkLFxyXG4gICAgICAgIGVudmlyb25tZW50LFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBhd2FpdCBzcXNDbGllbnQuc2VuZChcclxuICAgICAgbmV3IFNlbmRNZXNzYWdlQ29tbWFuZCh7XHJcbiAgICAgICAgUXVldWVVcmw6IHF1ZXVlVXJsLFxyXG4gICAgICAgIE1lc3NhZ2VCb2R5OiBKU09OLnN0cmluZ2lmeShtZXNzYWdlKSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYFF1ZXVlZCBleGVjdXRpb24gbWVzc2FnZSBmb3I6ICR7ZXhlY3V0aW9uSWR9YCk7XHJcbiAgfVxyXG5cclxuICBjb25zb2xlLmxvZyhgUXVldWVkICR7dGVzdENhc2VFeGVjdXRpb25JZHMubGVuZ3RofSB0ZXN0IGNhc2VzIGZvciBzdWl0ZTogJHt0ZXN0U3VpdGVJZH1gKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN1aXRlRXhlY3V0aW9uSWQsXHJcbiAgICB0ZXN0Q2FzZUV4ZWN1dGlvbklkcyxcclxuICAgIHN0YXR1czogJ3F1ZXVlZCcsXHJcbiAgICBtZXNzYWdlOiBgVGVzdCBzdWl0ZSBleGVjdXRpb24gcXVldWVkIHN1Y2Nlc3NmdWxseSB3aXRoICR7dGVzdENhc2VFeGVjdXRpb25JZHMubGVuZ3RofSB0ZXN0IGNhc2VzYCxcclxuICB9O1xyXG59XHJcbiJdfQ==
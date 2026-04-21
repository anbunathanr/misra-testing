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
const auth_util_1 = require("../../utils/auth-util");
const sqsClient = new client_sqs_1.SQSClient({});
const testCaseService = new test_case_service_1.TestCaseService();
const testSuiteService = new test_suite_service_1.TestSuiteService();
const handler = async (event) => {
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
        // Get user ID from context
        const user = await (0, auth_util_1.getUserFromContext)(event);
        const userId = user.userId || 'anonymous';
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
            const response = await triggerTestCaseExecution(request.testCaseId, userId, user.organizationId, queueUrl, request.environment);
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
            const response = await triggerTestSuiteExecution(request.testSuiteId, userId, user.organizationId, queueUrl, request.environment);
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
};
exports.handler = handler;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRyaWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7OztBQUdILG9EQUFvRTtBQUNwRSwrQkFBb0M7QUFDcEMsd0ZBQWtGO0FBQ2xGLHdFQUFtRTtBQUNuRSwwRUFBcUU7QUFFckUscURBQTJEO0FBRTNELE1BQU0sU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNwQyxNQUFNLGVBQWUsR0FBRyxJQUFJLG1DQUFlLEVBQUUsQ0FBQztBQUM5QyxNQUFNLGdCQUFnQixHQUFHLElBQUkscUNBQWdCLEVBQUUsQ0FBQztBQWdCekMsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDekYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXRELElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLDBCQUEwQixFQUFFLENBQUM7YUFDNUQsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBNEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEUsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUMsT0FB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QUc7U0FDZixDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixXQUFXLG1CQUFtQixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUU5RiwwQkFBMEI7UUFDMUIsTUFBTSxPQUFPLEdBQXFCO1lBQ2hDLFdBQVc7WUFDWCxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVU7WUFDL0IsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTO1lBQzdCLGdCQUFnQjtZQUNoQixRQUFRO1lBQ1IsUUFBUSxFQUFFO2dCQUNSLFdBQVcsRUFBRSxNQUFNO2dCQUNuQixXQUFXO2FBQ1o7U0FDRixDQUFDO1FBRUYsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLCtCQUFrQixDQUFDO1lBQ3JCLFFBQVEsRUFBRSxRQUFRO1lBQ2xCLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztTQUNyQyxDQUFDLENBQ0gsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxvQkFBb0IsQ0FBQyxNQUFNLDBCQUEwQixXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBRTFGLE9BQU87UUFDTCxnQkFBZ0I7UUFDaEIsb0JBQW9CO1FBQ3BCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLE9BQU8sRUFBRSxpREFBaUQsb0JBQW9CLENBQUMsTUFBTSxhQUFhO0tBQ25HLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRyaWdnZXIgTGFtYmRhIGZ1bmN0aW9uIGZvciB0ZXN0IGV4ZWN1dGlvblxyXG4gKiBIYW5kbGVzIFBPU1QgL2FwaS9leGVjdXRpb25zL3RyaWdnZXIgZW5kcG9pbnRcclxuICogQ3JlYXRlcyBleGVjdXRpb24gcmVjb3JkcyBhbmQgcXVldWVzIHRlc3QgY2FzZXMgZm9yIGV4ZWN1dGlvblxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgU1FTQ2xpZW50LCBTZW5kTWVzc2FnZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3FzJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcbmltcG9ydCB7IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVGVzdENhc2VTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1jYXNlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBUZXN0U3VpdGVTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1zdWl0ZS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRXhlY3V0aW9uTWVzc2FnZSB9IGZyb20gJy4uLy4uL3R5cGVzL3Rlc3QtZXhlY3V0aW9uJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuXHJcbmNvbnN0IHNxc0NsaWVudCA9IG5ldyBTUVNDbGllbnQoe30pO1xyXG5jb25zdCB0ZXN0Q2FzZVNlcnZpY2UgPSBuZXcgVGVzdENhc2VTZXJ2aWNlKCk7XHJcbmNvbnN0IHRlc3RTdWl0ZVNlcnZpY2UgPSBuZXcgVGVzdFN1aXRlU2VydmljZSgpO1xyXG5cclxuaW50ZXJmYWNlIFRyaWdnZXJFeGVjdXRpb25SZXF1ZXN0IHtcclxuICB0ZXN0Q2FzZUlkPzogc3RyaW5nO1xyXG4gIHRlc3RTdWl0ZUlkPzogc3RyaW5nO1xyXG4gIGVudmlyb25tZW50Pzogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVHJpZ2dlckV4ZWN1dGlvblJlc3BvbnNlIHtcclxuICBleGVjdXRpb25JZD86IHN0cmluZztcclxuICBzdWl0ZUV4ZWN1dGlvbklkPzogc3RyaW5nO1xyXG4gIHRlc3RDYXNlRXhlY3V0aW9uSWRzPzogc3RyaW5nW107XHJcbiAgc3RhdHVzOiAncXVldWVkJztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgICBjb25zb2xlLmxvZygnVHJpZ2dlciBMYW1iZGEgaW52b2tlZCcpO1xyXG4gICAgY29uc29sZS5sb2coJ0V2ZW50OicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcmVxdWVzdDogVHJpZ2dlckV4ZWN1dGlvblJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgcmVxdWVzdFxyXG4gICAgICBpZiAoIXJlcXVlc3QudGVzdENhc2VJZCAmJiAhcmVxdWVzdC50ZXN0U3VpdGVJZCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBlcnJvcjogJ0VpdGhlciB0ZXN0Q2FzZUlkIG9yIHRlc3RTdWl0ZUlkIGlzIHJlcXVpcmVkJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChyZXF1ZXN0LnRlc3RDYXNlSWQgJiYgcmVxdWVzdC50ZXN0U3VpdGVJZCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBlcnJvcjogJ0Nhbm5vdCBzcGVjaWZ5IGJvdGggdGVzdENhc2VJZCBhbmQgdGVzdFN1aXRlSWQnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gR2V0IHVzZXIgSUQgZnJvbSBjb250ZXh0XHJcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgICBjb25zdCB1c2VySWQgPSB1c2VyLnVzZXJJZCB8fCAnYW5vbnltb3VzJztcclxuXHJcbiAgICAgIC8vIENoZWNrIHF1ZXVlIFVSTFxyXG4gICAgICBjb25zdCBxdWV1ZVVybCA9IHByb2Nlc3MuZW52LlRFU1RfRVhFQ1VUSU9OX1FVRVVFX1VSTDtcclxuICAgICAgaWYgKCFxdWV1ZVVybCkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1RFU1RfRVhFQ1VUSU9OX1FVRVVFX1VSTCBlbnZpcm9ubWVudCB2YXJpYWJsZSBub3Qgc2V0Jyk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnUXVldWUgY29uZmlndXJhdGlvbiBlcnJvcicgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSGFuZGxlIHNpbmdsZSB0ZXN0IGNhc2UgZXhlY3V0aW9uXHJcbiAgICAgIGlmIChyZXF1ZXN0LnRlc3RDYXNlSWQpIHtcclxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRyaWdnZXJUZXN0Q2FzZUV4ZWN1dGlvbihcclxuICAgICAgICAgIHJlcXVlc3QudGVzdENhc2VJZCxcclxuICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgIHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgICBxdWV1ZVVybCxcclxuICAgICAgICAgIHJlcXVlc3QuZW52aXJvbm1lbnRcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBIYW5kbGUgdGVzdCBzdWl0ZSBleGVjdXRpb25cclxuICAgICAgaWYgKHJlcXVlc3QudGVzdFN1aXRlSWQpIHtcclxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRyaWdnZXJUZXN0U3VpdGVFeGVjdXRpb24oXHJcbiAgICAgICAgICByZXF1ZXN0LnRlc3RTdWl0ZUlkLFxyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICAgIHF1ZXVlVXJsLFxyXG4gICAgICAgICAgcmVxdWVzdC5lbnZpcm9ubWVudFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNob3VsZCBuZXZlciByZWFjaCBoZXJlIGR1ZSB0byB2YWxpZGF0aW9uIGFib3ZlXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgcmVxdWVzdCcgfSksXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB0cmlnZ2VyaW5nIGV4ZWN1dGlvbjonLCBlcnJvcik7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIHRyaWdnZXIgZXhlY3V0aW9uJyxcclxuICAgICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG59O1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gdHJpZ2dlclRlc3RDYXNlRXhlY3V0aW9uKFxyXG4gIHRlc3RDYXNlSWQ6IHN0cmluZyxcclxuICB1c2VySWQ6IHN0cmluZyxcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nLFxyXG4gIHF1ZXVlVXJsOiBzdHJpbmcsXHJcbiAgZW52aXJvbm1lbnQ/OiBzdHJpbmdcclxuKTogUHJvbWlzZTxUcmlnZ2VyRXhlY3V0aW9uUmVzcG9uc2U+IHtcclxuICBjb25zb2xlLmxvZyhgVHJpZ2dlcmluZyB0ZXN0IGNhc2UgZXhlY3V0aW9uOiAke3Rlc3RDYXNlSWR9YCk7XHJcblxyXG4gIC8vIEZldGNoIHRlc3QgY2FzZVxyXG4gIGNvbnN0IHRlc3RDYXNlID0gYXdhaXQgdGVzdENhc2VTZXJ2aWNlLmdldFRlc3RDYXNlKHRlc3RDYXNlSWQpO1xyXG4gIGlmICghdGVzdENhc2UpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgVGVzdCBjYXNlIG5vdCBmb3VuZDogJHt0ZXN0Q2FzZUlkfWApO1xyXG4gIH1cclxuXHJcbiAgLy8gVmVyaWZ5IHVzZXIgaGFzIGFjY2VzcyB0byB0aGUgcHJvamVjdCAob3JnYW5pemF0aW9uLWxldmVsIGNoZWNrKVxyXG4gIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIGZldGNoIHRoZSBwcm9qZWN0IGFuZCB2ZXJpZnkgb3JnYW5pemF0aW9uSWQgbWF0Y2hlc1xyXG4gIC8vIEZvciBub3csIHdlIHRydXN0IHRoYXQgdGhlIHRlc3QgY2FzZSBiZWxvbmdzIHRvIHRoZSB1c2VyJ3Mgb3JnYW5pemF0aW9uXHJcblxyXG4gIC8vIENyZWF0ZSBleGVjdXRpb24gcmVjb3JkXHJcbiAgY29uc3QgZXhlY3V0aW9uSWQgPSB1dWlkdjQoKTtcclxuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gIGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuY3JlYXRlRXhlY3V0aW9uKHtcclxuICAgIGV4ZWN1dGlvbklkLFxyXG4gICAgcHJvamVjdElkOiB0ZXN0Q2FzZS5wcm9qZWN0SWQsXHJcbiAgICB0ZXN0Q2FzZUlkLFxyXG4gICAgc3RhdHVzOiAncXVldWVkJyxcclxuICAgIHN0YXJ0VGltZTogbm93LFxyXG4gICAgc3RlcHM6IFtdLFxyXG4gICAgc2NyZWVuc2hvdHM6IFtdLFxyXG4gICAgbWV0YWRhdGE6IHtcclxuICAgICAgdHJpZ2dlcmVkQnk6IHVzZXJJZCxcclxuICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICB9LFxyXG4gICAgY3JlYXRlZEF0OiBub3csXHJcbiAgICB1cGRhdGVkQXQ6IG5vdyxcclxuICB9KTtcclxuXHJcbiAgY29uc29sZS5sb2coYENyZWF0ZWQgZXhlY3V0aW9uIHJlY29yZDogJHtleGVjdXRpb25JZH1gKTtcclxuXHJcbiAgLy8gUXVldWUgZXhlY3V0aW9uIG1lc3NhZ2VcclxuICBjb25zdCBtZXNzYWdlOiBFeGVjdXRpb25NZXNzYWdlID0ge1xyXG4gICAgZXhlY3V0aW9uSWQsXHJcbiAgICB0ZXN0Q2FzZUlkLFxyXG4gICAgcHJvamVjdElkOiB0ZXN0Q2FzZS5wcm9qZWN0SWQsXHJcbiAgICB0ZXN0Q2FzZSxcclxuICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgIHRyaWdnZXJlZEJ5OiB1c2VySWQsXHJcbiAgICAgIGVudmlyb25tZW50LFxyXG4gICAgfSxcclxuICB9O1xyXG5cclxuICBhd2FpdCBzcXNDbGllbnQuc2VuZChcclxuICAgIG5ldyBTZW5kTWVzc2FnZUNvbW1hbmQoe1xyXG4gICAgICBRdWV1ZVVybDogcXVldWVVcmwsXHJcbiAgICAgIE1lc3NhZ2VCb2R5OiBKU09OLnN0cmluZ2lmeShtZXNzYWdlKSxcclxuICAgIH0pXHJcbiAgKTtcclxuXHJcbiAgY29uc29sZS5sb2coYFF1ZXVlZCBleGVjdXRpb24gbWVzc2FnZSBmb3I6ICR7ZXhlY3V0aW9uSWR9YCk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBleGVjdXRpb25JZCxcclxuICAgIHN0YXR1czogJ3F1ZXVlZCcsXHJcbiAgICBtZXNzYWdlOiAnVGVzdCBjYXNlIGV4ZWN1dGlvbiBxdWV1ZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICB9O1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiB0cmlnZ2VyVGVzdFN1aXRlRXhlY3V0aW9uKFxyXG4gIHRlc3RTdWl0ZUlkOiBzdHJpbmcsXHJcbiAgdXNlcklkOiBzdHJpbmcsXHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZyxcclxuICBxdWV1ZVVybDogc3RyaW5nLFxyXG4gIGVudmlyb25tZW50Pzogc3RyaW5nXHJcbik6IFByb21pc2U8VHJpZ2dlckV4ZWN1dGlvblJlc3BvbnNlPiB7XHJcbiAgY29uc29sZS5sb2coYFRyaWdnZXJpbmcgdGVzdCBzdWl0ZSBleGVjdXRpb246ICR7dGVzdFN1aXRlSWR9YCk7XHJcblxyXG4gIC8vIEZldGNoIHRlc3Qgc3VpdGVcclxuICBjb25zdCB0ZXN0U3VpdGUgPSBhd2FpdCB0ZXN0U3VpdGVTZXJ2aWNlLmdldFRlc3RTdWl0ZSh0ZXN0U3VpdGVJZCk7XHJcbiAgaWYgKCF0ZXN0U3VpdGUpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgVGVzdCBzdWl0ZSBub3QgZm91bmQ6ICR7dGVzdFN1aXRlSWR9YCk7XHJcbiAgfVxyXG5cclxuICAvLyBGZXRjaCBhbGwgdGVzdCBjYXNlcyBpbiBzdWl0ZVxyXG4gIGNvbnN0IHRlc3RDYXNlcyA9IGF3YWl0IHRlc3RDYXNlU2VydmljZS5nZXRTdWl0ZVRlc3RDYXNlcyh0ZXN0U3VpdGVJZCk7XHJcbiAgaWYgKHRlc3RDYXNlcy5sZW5ndGggPT09IDApIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgTm8gdGVzdCBjYXNlcyBmb3VuZCBpbiBzdWl0ZTogJHt0ZXN0U3VpdGVJZH1gKTtcclxuICB9XHJcblxyXG4gIC8vIFZlcmlmeSB1c2VyIGhhcyBhY2Nlc3MgdG8gdGhlIHByb2plY3QgKG9yZ2FuaXphdGlvbi1sZXZlbCBjaGVjaylcclxuICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBmZXRjaCB0aGUgcHJvamVjdCBhbmQgdmVyaWZ5IG9yZ2FuaXphdGlvbklkIG1hdGNoZXNcclxuICAvLyBGb3Igbm93LCB3ZSB0cnVzdCB0aGF0IHRoZSB0ZXN0IHN1aXRlIGJlbG9uZ3MgdG8gdGhlIHVzZXIncyBvcmdhbml6YXRpb25cclxuXHJcbiAgLy8gQ3JlYXRlIHN1aXRlIGV4ZWN1dGlvbiByZWNvcmQgKHBhcmVudClcclxuICBjb25zdCBzdWl0ZUV4ZWN1dGlvbklkID0gdXVpZHY0KCk7XHJcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG5cclxuICAvLyBDcmVhdGUgaW5kaXZpZHVhbCBleGVjdXRpb24gcmVjb3JkcyBmb3IgZWFjaCB0ZXN0IGNhc2VcclxuICBjb25zdCB0ZXN0Q2FzZUV4ZWN1dGlvbklkczogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgZm9yIChjb25zdCB0ZXN0Q2FzZSBvZiB0ZXN0Q2FzZXMpIHtcclxuICAgIGNvbnN0IGV4ZWN1dGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICB0ZXN0Q2FzZUV4ZWN1dGlvbklkcy5wdXNoKGV4ZWN1dGlvbklkKTtcclxuXHJcbiAgICBhd2FpdCB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmNyZWF0ZUV4ZWN1dGlvbih7XHJcbiAgICAgIGV4ZWN1dGlvbklkLFxyXG4gICAgICBwcm9qZWN0SWQ6IHRlc3RDYXNlLnByb2plY3RJZCxcclxuICAgICAgdGVzdENhc2VJZDogdGVzdENhc2UudGVzdENhc2VJZCxcclxuICAgICAgdGVzdFN1aXRlSWQsXHJcbiAgICAgIHN1aXRlRXhlY3V0aW9uSWQsXHJcbiAgICAgIHN0YXR1czogJ3F1ZXVlZCcsXHJcbiAgICAgIHN0YXJ0VGltZTogbm93LFxyXG4gICAgICBzdGVwczogW10sXHJcbiAgICAgIHNjcmVlbnNob3RzOiBbXSxcclxuICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICB0cmlnZ2VyZWRCeTogdXNlcklkLFxyXG4gICAgICAgIGVudmlyb25tZW50LFxyXG4gICAgICB9LFxyXG4gICAgICBjcmVhdGVkQXQ6IG5vdyxcclxuICAgICAgdXBkYXRlZEF0OiBub3csXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQ3JlYXRlZCBleGVjdXRpb24gcmVjb3JkOiAke2V4ZWN1dGlvbklkfSBmb3IgdGVzdCBjYXNlOiAke3Rlc3RDYXNlLnRlc3RDYXNlSWR9YCk7XHJcblxyXG4gICAgLy8gUXVldWUgZXhlY3V0aW9uIG1lc3NhZ2VcclxuICAgIGNvbnN0IG1lc3NhZ2U6IEV4ZWN1dGlvbk1lc3NhZ2UgPSB7XHJcbiAgICAgIGV4ZWN1dGlvbklkLFxyXG4gICAgICB0ZXN0Q2FzZUlkOiB0ZXN0Q2FzZS50ZXN0Q2FzZUlkLFxyXG4gICAgICBwcm9qZWN0SWQ6IHRlc3RDYXNlLnByb2plY3RJZCxcclxuICAgICAgc3VpdGVFeGVjdXRpb25JZCxcclxuICAgICAgdGVzdENhc2UsXHJcbiAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgdHJpZ2dlcmVkQnk6IHVzZXJJZCxcclxuICAgICAgICBlbnZpcm9ubWVudCxcclxuICAgICAgfSxcclxuICAgIH07XHJcblxyXG4gICAgYXdhaXQgc3FzQ2xpZW50LnNlbmQoXHJcbiAgICAgIG5ldyBTZW5kTWVzc2FnZUNvbW1hbmQoe1xyXG4gICAgICAgIFF1ZXVlVXJsOiBxdWV1ZVVybCxcclxuICAgICAgICBNZXNzYWdlQm9keTogSlNPTi5zdHJpbmdpZnkobWVzc2FnZSksXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBRdWV1ZWQgZXhlY3V0aW9uIG1lc3NhZ2UgZm9yOiAke2V4ZWN1dGlvbklkfWApO1xyXG4gIH1cclxuXHJcbiAgY29uc29sZS5sb2coYFF1ZXVlZCAke3Rlc3RDYXNlRXhlY3V0aW9uSWRzLmxlbmd0aH0gdGVzdCBjYXNlcyBmb3Igc3VpdGU6ICR7dGVzdFN1aXRlSWR9YCk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBzdWl0ZUV4ZWN1dGlvbklkLFxyXG4gICAgdGVzdENhc2VFeGVjdXRpb25JZHMsXHJcbiAgICBzdGF0dXM6ICdxdWV1ZWQnLFxyXG4gICAgbWVzc2FnZTogYFRlc3Qgc3VpdGUgZXhlY3V0aW9uIHF1ZXVlZCBzdWNjZXNzZnVsbHkgd2l0aCAke3Rlc3RDYXNlRXhlY3V0aW9uSWRzLmxlbmd0aH0gdGVzdCBjYXNlc2AsXHJcbiAgfTtcclxufVxyXG4iXX0=
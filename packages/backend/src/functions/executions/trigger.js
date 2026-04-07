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
        const user = (0, auth_util_1.getUserFromContext)(event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpZ2dlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRyaWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7OztBQUdILG9EQUFvRTtBQUNwRSwrQkFBb0M7QUFDcEMsd0ZBQWtGO0FBQ2xGLHdFQUFtRTtBQUNuRSwwRUFBcUU7QUFFckUscURBQTJEO0FBRTNELE1BQU0sU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNwQyxNQUFNLGVBQWUsR0FBRyxJQUFJLG1DQUFlLEVBQUUsQ0FBQztBQUM5QyxNQUFNLGdCQUFnQixHQUFHLElBQUkscUNBQWdCLEVBQUUsQ0FBQztBQWdCekMsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDekYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXRELElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLDBCQUEwQixFQUFFLENBQUM7YUFDNUQsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBNEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEUsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUMsT0FB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Q2YsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsV0FBVyxtQkFBbUIsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFOUYsMEJBQTBCO1FBQzFCLE1BQU0sT0FBTyxHQUFxQjtZQUNoQyxXQUFXO1lBQ1gsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO1lBQy9CLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUztZQUM3QixnQkFBZ0I7WUFDaEIsUUFBUTtZQUNSLFFBQVEsRUFBRTtnQkFDUixXQUFXLEVBQUUsTUFBTTtnQkFDbkIsV0FBVzthQUNaO1NBQ0YsQ0FBQztRQUVGLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FDbEIsSUFBSSwrQkFBa0IsQ0FBQztZQUNyQixRQUFRLEVBQUUsUUFBUTtZQUNsQixXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7U0FDckMsQ0FBQyxDQUNILENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsb0JBQW9CLENBQUMsTUFBTSwwQkFBMEIsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUUxRixPQUFPO1FBQ0wsZ0JBQWdCO1FBQ2hCLG9CQUFvQjtRQUNwQixNQUFNLEVBQUUsUUFBUTtRQUNoQixPQUFPLEVBQUUsaURBQWlELG9CQUFvQixDQUFDLE1BQU0sYUFBYTtLQUNuRyxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBUcmlnZ2VyIExhbWJkYSBmdW5jdGlvbiBmb3IgdGVzdCBleGVjdXRpb25cclxuICogSGFuZGxlcyBQT1NUIC9hcGkvZXhlY3V0aW9ucy90cmlnZ2VyIGVuZHBvaW50XHJcbiAqIENyZWF0ZXMgZXhlY3V0aW9uIHJlY29yZHMgYW5kIHF1ZXVlcyB0ZXN0IGNhc2VzIGZvciBleGVjdXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFNRU0NsaWVudCwgU2VuZE1lc3NhZ2VDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNxcyc7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5pbXBvcnQgeyB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1leGVjdXRpb24tZGItc2VydmljZSc7XHJcbmltcG9ydCB7IFRlc3RDYXNlU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Rlc3QtY2FzZS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVGVzdFN1aXRlU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Rlc3Qtc3VpdGUtc2VydmljZSc7XHJcbmltcG9ydCB7IEV4ZWN1dGlvbk1lc3NhZ2UgfSBmcm9tICcuLi8uLi90eXBlcy90ZXN0LWV4ZWN1dGlvbic7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcblxyXG5jb25zdCBzcXNDbGllbnQgPSBuZXcgU1FTQ2xpZW50KHt9KTtcclxuY29uc3QgdGVzdENhc2VTZXJ2aWNlID0gbmV3IFRlc3RDYXNlU2VydmljZSgpO1xyXG5jb25zdCB0ZXN0U3VpdGVTZXJ2aWNlID0gbmV3IFRlc3RTdWl0ZVNlcnZpY2UoKTtcclxuXHJcbmludGVyZmFjZSBUcmlnZ2VyRXhlY3V0aW9uUmVxdWVzdCB7XHJcbiAgdGVzdENhc2VJZD86IHN0cmluZztcclxuICB0ZXN0U3VpdGVJZD86IHN0cmluZztcclxuICBlbnZpcm9ubWVudD86IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFRyaWdnZXJFeGVjdXRpb25SZXNwb25zZSB7XHJcbiAgZXhlY3V0aW9uSWQ/OiBzdHJpbmc7XHJcbiAgc3VpdGVFeGVjdXRpb25JZD86IHN0cmluZztcclxuICB0ZXN0Q2FzZUV4ZWN1dGlvbklkcz86IHN0cmluZ1tdO1xyXG4gIHN0YXR1czogJ3F1ZXVlZCc7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gICAgY29uc29sZS5sb2coJ1RyaWdnZXIgTGFtYmRhIGludm9rZWQnKTtcclxuICAgIGNvbnNvbGUubG9nKCdFdmVudDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHJlcXVlc3Q6IFRyaWdnZXJFeGVjdXRpb25SZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHJlcXVlc3RcclxuICAgICAgaWYgKCFyZXF1ZXN0LnRlc3RDYXNlSWQgJiYgIXJlcXVlc3QudGVzdFN1aXRlSWQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6ICdFaXRoZXIgdGVzdENhc2VJZCBvciB0ZXN0U3VpdGVJZCBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAocmVxdWVzdC50ZXN0Q2FzZUlkICYmIHJlcXVlc3QudGVzdFN1aXRlSWQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6ICdDYW5ub3Qgc3BlY2lmeSBib3RoIHRlc3RDYXNlSWQgYW5kIHRlc3RTdWl0ZUlkJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdldCB1c2VyIElEIGZyb20gY29udGV4dFxyXG4gICAgICBjb25zdCB1c2VyID0gZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgICAgY29uc3QgdXNlcklkID0gdXNlci51c2VySWQgfHwgJ2Fub255bW91cyc7XHJcblxyXG4gICAgICAvLyBDaGVjayBxdWV1ZSBVUkxcclxuICAgICAgY29uc3QgcXVldWVVcmwgPSBwcm9jZXNzLmVudi5URVNUX0VYRUNVVElPTl9RVUVVRV9VUkw7XHJcbiAgICAgIGlmICghcXVldWVVcmwpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdURVNUX0VYRUNVVElPTl9RVUVVRV9VUkwgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldCcpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1F1ZXVlIGNvbmZpZ3VyYXRpb24gZXJyb3InIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEhhbmRsZSBzaW5nbGUgdGVzdCBjYXNlIGV4ZWN1dGlvblxyXG4gICAgICBpZiAocmVxdWVzdC50ZXN0Q2FzZUlkKSB7XHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0cmlnZ2VyVGVzdENhc2VFeGVjdXRpb24oXHJcbiAgICAgICAgICByZXF1ZXN0LnRlc3RDYXNlSWQsXHJcbiAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgICAgcXVldWVVcmwsXHJcbiAgICAgICAgICByZXF1ZXN0LmVudmlyb25tZW50XHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSGFuZGxlIHRlc3Qgc3VpdGUgZXhlY3V0aW9uXHJcbiAgICAgIGlmIChyZXF1ZXN0LnRlc3RTdWl0ZUlkKSB7XHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0cmlnZ2VyVGVzdFN1aXRlRXhlY3V0aW9uKFxyXG4gICAgICAgICAgcmVxdWVzdC50ZXN0U3VpdGVJZCxcclxuICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgIHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgICBxdWV1ZVVybCxcclxuICAgICAgICAgIHJlcXVlc3QuZW52aXJvbm1lbnRcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTaG91bGQgbmV2ZXIgcmVhY2ggaGVyZSBkdWUgdG8gdmFsaWRhdGlvbiBhYm92ZVxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIHJlcXVlc3QnIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdHJpZ2dlcmluZyBleGVjdXRpb246JywgZXJyb3IpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byB0cmlnZ2VyIGV4ZWN1dGlvbicsXHJcbiAgICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxufTtcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRyaWdnZXJUZXN0Q2FzZUV4ZWN1dGlvbihcclxuICB0ZXN0Q2FzZUlkOiBzdHJpbmcsXHJcbiAgdXNlcklkOiBzdHJpbmcsXHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZyxcclxuICBxdWV1ZVVybDogc3RyaW5nLFxyXG4gIGVudmlyb25tZW50Pzogc3RyaW5nXHJcbik6IFByb21pc2U8VHJpZ2dlckV4ZWN1dGlvblJlc3BvbnNlPiB7XHJcbiAgY29uc29sZS5sb2coYFRyaWdnZXJpbmcgdGVzdCBjYXNlIGV4ZWN1dGlvbjogJHt0ZXN0Q2FzZUlkfWApO1xyXG5cclxuICAvLyBGZXRjaCB0ZXN0IGNhc2VcclxuICBjb25zdCB0ZXN0Q2FzZSA9IGF3YWl0IHRlc3RDYXNlU2VydmljZS5nZXRUZXN0Q2FzZSh0ZXN0Q2FzZUlkKTtcclxuICBpZiAoIXRlc3RDYXNlKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRlc3QgY2FzZSBub3QgZm91bmQ6ICR7dGVzdENhc2VJZH1gKTtcclxuICB9XHJcblxyXG4gIC8vIFZlcmlmeSB1c2VyIGhhcyBhY2Nlc3MgdG8gdGhlIHByb2plY3QgKG9yZ2FuaXphdGlvbi1sZXZlbCBjaGVjaylcclxuICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBmZXRjaCB0aGUgcHJvamVjdCBhbmQgdmVyaWZ5IG9yZ2FuaXphdGlvbklkIG1hdGNoZXNcclxuICAvLyBGb3Igbm93LCB3ZSB0cnVzdCB0aGF0IHRoZSB0ZXN0IGNhc2UgYmVsb25ncyB0byB0aGUgdXNlcidzIG9yZ2FuaXphdGlvblxyXG5cclxuICAvLyBDcmVhdGUgZXhlY3V0aW9uIHJlY29yZFxyXG4gIGNvbnN0IGV4ZWN1dGlvbklkID0gdXVpZHY0KCk7XHJcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG5cclxuICBhd2FpdCB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmNyZWF0ZUV4ZWN1dGlvbih7XHJcbiAgICBleGVjdXRpb25JZCxcclxuICAgIHByb2plY3RJZDogdGVzdENhc2UucHJvamVjdElkLFxyXG4gICAgdGVzdENhc2VJZCxcclxuICAgIHN0YXR1czogJ3F1ZXVlZCcsXHJcbiAgICBzdGFydFRpbWU6IG5vdyxcclxuICAgIHN0ZXBzOiBbXSxcclxuICAgIHNjcmVlbnNob3RzOiBbXSxcclxuICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgIHRyaWdnZXJlZEJ5OiB1c2VySWQsXHJcbiAgICAgIGVudmlyb25tZW50LFxyXG4gICAgfSxcclxuICAgIGNyZWF0ZWRBdDogbm93LFxyXG4gICAgdXBkYXRlZEF0OiBub3csXHJcbiAgfSk7XHJcblxyXG4gIGNvbnNvbGUubG9nKGBDcmVhdGVkIGV4ZWN1dGlvbiByZWNvcmQ6ICR7ZXhlY3V0aW9uSWR9YCk7XHJcblxyXG4gIC8vIFF1ZXVlIGV4ZWN1dGlvbiBtZXNzYWdlXHJcbiAgY29uc3QgbWVzc2FnZTogRXhlY3V0aW9uTWVzc2FnZSA9IHtcclxuICAgIGV4ZWN1dGlvbklkLFxyXG4gICAgdGVzdENhc2VJZCxcclxuICAgIHByb2plY3RJZDogdGVzdENhc2UucHJvamVjdElkLFxyXG4gICAgdGVzdENhc2UsXHJcbiAgICBtZXRhZGF0YToge1xyXG4gICAgICB0cmlnZ2VyZWRCeTogdXNlcklkLFxyXG4gICAgICBlbnZpcm9ubWVudCxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgYXdhaXQgc3FzQ2xpZW50LnNlbmQoXHJcbiAgICBuZXcgU2VuZE1lc3NhZ2VDb21tYW5kKHtcclxuICAgICAgUXVldWVVcmw6IHF1ZXVlVXJsLFxyXG4gICAgICBNZXNzYWdlQm9keTogSlNPTi5zdHJpbmdpZnkobWVzc2FnZSksXHJcbiAgICB9KVxyXG4gICk7XHJcblxyXG4gIGNvbnNvbGUubG9nKGBRdWV1ZWQgZXhlY3V0aW9uIG1lc3NhZ2UgZm9yOiAke2V4ZWN1dGlvbklkfWApO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgZXhlY3V0aW9uSWQsXHJcbiAgICBzdGF0dXM6ICdxdWV1ZWQnLFxyXG4gICAgbWVzc2FnZTogJ1Rlc3QgY2FzZSBleGVjdXRpb24gcXVldWVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgfTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gdHJpZ2dlclRlc3RTdWl0ZUV4ZWN1dGlvbihcclxuICB0ZXN0U3VpdGVJZDogc3RyaW5nLFxyXG4gIHVzZXJJZDogc3RyaW5nLFxyXG4gIG9yZ2FuaXphdGlvbklkOiBzdHJpbmcsXHJcbiAgcXVldWVVcmw6IHN0cmluZyxcclxuICBlbnZpcm9ubWVudD86IHN0cmluZ1xyXG4pOiBQcm9taXNlPFRyaWdnZXJFeGVjdXRpb25SZXNwb25zZT4ge1xyXG4gIGNvbnNvbGUubG9nKGBUcmlnZ2VyaW5nIHRlc3Qgc3VpdGUgZXhlY3V0aW9uOiAke3Rlc3RTdWl0ZUlkfWApO1xyXG5cclxuICAvLyBGZXRjaCB0ZXN0IHN1aXRlXHJcbiAgY29uc3QgdGVzdFN1aXRlID0gYXdhaXQgdGVzdFN1aXRlU2VydmljZS5nZXRUZXN0U3VpdGUodGVzdFN1aXRlSWQpO1xyXG4gIGlmICghdGVzdFN1aXRlKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRlc3Qgc3VpdGUgbm90IGZvdW5kOiAke3Rlc3RTdWl0ZUlkfWApO1xyXG4gIH1cclxuXHJcbiAgLy8gRmV0Y2ggYWxsIHRlc3QgY2FzZXMgaW4gc3VpdGVcclxuICBjb25zdCB0ZXN0Q2FzZXMgPSBhd2FpdCB0ZXN0Q2FzZVNlcnZpY2UuZ2V0U3VpdGVUZXN0Q2FzZXModGVzdFN1aXRlSWQpO1xyXG4gIGlmICh0ZXN0Q2FzZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHRlc3QgY2FzZXMgZm91bmQgaW4gc3VpdGU6ICR7dGVzdFN1aXRlSWR9YCk7XHJcbiAgfVxyXG5cclxuICAvLyBWZXJpZnkgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSBwcm9qZWN0IChvcmdhbml6YXRpb24tbGV2ZWwgY2hlY2spXHJcbiAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgZmV0Y2ggdGhlIHByb2plY3QgYW5kIHZlcmlmeSBvcmdhbml6YXRpb25JZCBtYXRjaGVzXHJcbiAgLy8gRm9yIG5vdywgd2UgdHJ1c3QgdGhhdCB0aGUgdGVzdCBzdWl0ZSBiZWxvbmdzIHRvIHRoZSB1c2VyJ3Mgb3JnYW5pemF0aW9uXHJcblxyXG4gIC8vIENyZWF0ZSBzdWl0ZSBleGVjdXRpb24gcmVjb3JkIChwYXJlbnQpXHJcbiAgY29uc3Qgc3VpdGVFeGVjdXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgLy8gQ3JlYXRlIGluZGl2aWR1YWwgZXhlY3V0aW9uIHJlY29yZHMgZm9yIGVhY2ggdGVzdCBjYXNlXHJcbiAgY29uc3QgdGVzdENhc2VFeGVjdXRpb25JZHM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gIGZvciAoY29uc3QgdGVzdENhc2Ugb2YgdGVzdENhc2VzKSB7XHJcbiAgICBjb25zdCBleGVjdXRpb25JZCA9IHV1aWR2NCgpO1xyXG4gICAgdGVzdENhc2VFeGVjdXRpb25JZHMucHVzaChleGVjdXRpb25JZCk7XHJcblxyXG4gICAgYXdhaXQgdGVzdEV4ZWN1dGlvbkRCU2VydmljZS5jcmVhdGVFeGVjdXRpb24oe1xyXG4gICAgICBleGVjdXRpb25JZCxcclxuICAgICAgcHJvamVjdElkOiB0ZXN0Q2FzZS5wcm9qZWN0SWQsXHJcbiAgICAgIHRlc3RDYXNlSWQ6IHRlc3RDYXNlLnRlc3RDYXNlSWQsXHJcbiAgICAgIHRlc3RTdWl0ZUlkLFxyXG4gICAgICBzdWl0ZUV4ZWN1dGlvbklkLFxyXG4gICAgICBzdGF0dXM6ICdxdWV1ZWQnLFxyXG4gICAgICBzdGFydFRpbWU6IG5vdyxcclxuICAgICAgc3RlcHM6IFtdLFxyXG4gICAgICBzY3JlZW5zaG90czogW10sXHJcbiAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgdHJpZ2dlcmVkQnk6IHVzZXJJZCxcclxuICAgICAgICBlbnZpcm9ubWVudCxcclxuICAgICAgfSxcclxuICAgICAgY3JlYXRlZEF0OiBub3csXHJcbiAgICAgIHVwZGF0ZWRBdDogbm93LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYENyZWF0ZWQgZXhlY3V0aW9uIHJlY29yZDogJHtleGVjdXRpb25JZH0gZm9yIHRlc3QgY2FzZTogJHt0ZXN0Q2FzZS50ZXN0Q2FzZUlkfWApO1xyXG5cclxuICAgIC8vIFF1ZXVlIGV4ZWN1dGlvbiBtZXNzYWdlXHJcbiAgICBjb25zdCBtZXNzYWdlOiBFeGVjdXRpb25NZXNzYWdlID0ge1xyXG4gICAgICBleGVjdXRpb25JZCxcclxuICAgICAgdGVzdENhc2VJZDogdGVzdENhc2UudGVzdENhc2VJZCxcclxuICAgICAgcHJvamVjdElkOiB0ZXN0Q2FzZS5wcm9qZWN0SWQsXHJcbiAgICAgIHN1aXRlRXhlY3V0aW9uSWQsXHJcbiAgICAgIHRlc3RDYXNlLFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIHRyaWdnZXJlZEJ5OiB1c2VySWQsXHJcbiAgICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIGF3YWl0IHNxc0NsaWVudC5zZW5kKFxyXG4gICAgICBuZXcgU2VuZE1lc3NhZ2VDb21tYW5kKHtcclxuICAgICAgICBRdWV1ZVVybDogcXVldWVVcmwsXHJcbiAgICAgICAgTWVzc2FnZUJvZHk6IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgUXVldWVkIGV4ZWN1dGlvbiBtZXNzYWdlIGZvcjogJHtleGVjdXRpb25JZH1gKTtcclxuICB9XHJcblxyXG4gIGNvbnNvbGUubG9nKGBRdWV1ZWQgJHt0ZXN0Q2FzZUV4ZWN1dGlvbklkcy5sZW5ndGh9IHRlc3QgY2FzZXMgZm9yIHN1aXRlOiAke3Rlc3RTdWl0ZUlkfWApO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc3VpdGVFeGVjdXRpb25JZCxcclxuICAgIHRlc3RDYXNlRXhlY3V0aW9uSWRzLFxyXG4gICAgc3RhdHVzOiAncXVldWVkJyxcclxuICAgIG1lc3NhZ2U6IGBUZXN0IHN1aXRlIGV4ZWN1dGlvbiBxdWV1ZWQgc3VjY2Vzc2Z1bGx5IHdpdGggJHt0ZXN0Q2FzZUV4ZWN1dGlvbklkcy5sZW5ndGh9IHRlc3QgY2FzZXNgLFxyXG4gIH07XHJcbn1cclxuIl19
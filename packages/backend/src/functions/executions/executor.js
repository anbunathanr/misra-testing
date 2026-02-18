"use strict";
/**
 * Test Executor Lambda Function
 * Processes SQS messages to execute test cases with Playwright/HTTP client
 *
 * This Lambda is triggered by SQS messages containing test execution requests.
 * It orchestrates the complete test execution lifecycle:
 * 1. Update execution status to "running"
 * 2. Execute test case using TestExecutorService
 * 3. Update execution record with final results
 * 4. Handle timeouts and errors gracefully
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_executor_service_1 = require("../../services/test-executor-service");
const test_execution_db_service_1 = require("../../services/test-execution-db-service");
/**
 * Lambda handler for test execution
 * Processes SQS messages containing test execution requests
 */
const handler = async (event, context) => {
    console.log('Test Executor Lambda invoked');
    console.log(`Processing ${event.Records.length} message(s)`);
    console.log(`Remaining time: ${context.getRemainingTimeInMillis()}ms`);
    // Process each SQS message
    for (const record of event.Records) {
        await processExecutionMessage(record, context);
    }
    console.log('All messages processed successfully');
};
exports.handler = handler;
/**
 * Process a single execution message from SQS
 */
async function processExecutionMessage(record, context) {
    let message;
    try {
        // Parse SQS message
        message = JSON.parse(record.body);
        console.log(`Processing execution: ${message.executionId}`);
        console.log(`Test case: ${message.testCaseId}`);
        console.log(`Project: ${message.projectId}`);
    }
    catch (error) {
        console.error('Failed to parse SQS message:', error);
        console.error('Message body:', record.body);
        throw new Error('Invalid SQS message format');
    }
    const { executionId, testCase, projectId, metadata } = message;
    try {
        // Update execution status to "running"
        console.log(`Updating execution ${executionId} status to "running"`);
        await test_execution_db_service_1.testExecutionDBService.updateExecutionStatus(executionId, 'running');
        // Check remaining time before starting execution
        const remainingTime = context.getRemainingTimeInMillis();
        console.log(`Remaining Lambda time: ${remainingTime}ms`);
        // Reserve 30 seconds for cleanup and result saving
        const timeoutBuffer = 30000;
        if (remainingTime < timeoutBuffer + 60000) {
            // Less than 90 seconds remaining - not enough time
            throw new Error(`Insufficient time remaining: ${remainingTime}ms`);
        }
        // Execute the test case
        console.log(`Starting test execution for ${testCase.steps.length} steps`);
        const result = await test_executor_service_1.testExecutorService.executeTestCase({
            executionId,
            testCase,
            projectId,
            triggeredBy: metadata.triggeredBy,
            environment: metadata.environment,
        });
        console.log(`Test execution completed with result: ${result.execution.result}`);
        console.log(`Status: ${result.execution.status}`);
        console.log(`Duration: ${result.execution.duration}ms`);
        console.log(`Steps executed: ${result.execution.steps.length}`);
        console.log(`Screenshots captured: ${result.execution.screenshots.length}`);
        // Update execution record with final results
        console.log(`Saving execution results to DynamoDB`);
        await test_execution_db_service_1.testExecutionDBService.updateExecutionResults(result.execution);
        // If this execution is part of a suite, update suite status
        if (message.suiteExecutionId) {
            console.log(`Updating suite execution ${message.suiteExecutionId}`);
            try {
                await test_execution_db_service_1.testExecutionDBService.updateSuiteExecution(message.suiteExecutionId);
                console.log(`Suite execution ${message.suiteExecutionId} updated successfully`);
            }
            catch (suiteError) {
                console.error(`Failed to update suite execution ${message.suiteExecutionId}:`, suiteError);
                // Don't fail the test case execution if suite update fails
            }
        }
        console.log(`Execution ${executionId} completed successfully`);
    }
    catch (error) {
        // Handle execution errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Execution ${executionId} failed:`, errorMessage);
        console.error('Error details:', error);
        try {
            // Check if this is a timeout error
            const isTimeout = errorMessage.toLowerCase().includes('time remaining') ||
                errorMessage.toLowerCase().includes('timeout') ||
                errorMessage.toLowerCase().includes('timed out') ||
                context.getRemainingTimeInMillis() < 5000;
            // Update execution record with error status
            const execution = await test_execution_db_service_1.testExecutionDBService.getExecution(executionId);
            if (execution) {
                execution.status = 'error';
                execution.result = 'error';
                execution.endTime = new Date().toISOString();
                execution.duration = execution.startTime
                    ? Date.now() - new Date(execution.startTime).getTime()
                    : 0;
                execution.errorMessage = isTimeout
                    ? `Lambda timeout: ${errorMessage}`
                    : errorMessage;
                execution.updatedAt = new Date().toISOString();
                await test_execution_db_service_1.testExecutionDBService.updateExecutionResults(execution);
                console.log(`Execution ${executionId} marked as error`);
                // If this execution is part of a suite, update suite status
                if (message.suiteExecutionId) {
                    console.log(`Updating suite execution ${message.suiteExecutionId} after error`);
                    try {
                        await test_execution_db_service_1.testExecutionDBService.updateSuiteExecution(message.suiteExecutionId);
                        console.log(`Suite execution ${message.suiteExecutionId} updated successfully`);
                    }
                    catch (suiteError) {
                        console.error(`Failed to update suite execution ${message.suiteExecutionId}:`, suiteError);
                        // Don't fail the test case execution if suite update fails
                    }
                }
            }
            else {
                console.error(`Could not find execution ${executionId} to update error status`);
            }
        }
        catch (updateError) {
            console.error('Failed to update execution with error status:', updateError);
            // Don't throw - we want to acknowledge the SQS message even if update fails
        }
        // Re-throw the error to mark SQS message as failed (will retry or go to DLQ)
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJleGVjdXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7R0FVRzs7O0FBSUgsZ0ZBQTJFO0FBQzNFLHdGQUFrRjtBQUVsRjs7O0dBR0c7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBZSxFQUFFLE9BQWdCLEVBQWlCLEVBQUU7SUFDaEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0lBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sYUFBYSxDQUFDLENBQUM7SUFDN0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsT0FBTyxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxDQUFDO0lBRXZFLDJCQUEyQjtJQUMzQixLQUFLLE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNuQyxNQUFNLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQztBQVhXLFFBQUEsT0FBTyxXQVdsQjtBQUVGOztHQUVHO0FBQ0gsS0FBSyxVQUFVLHVCQUF1QixDQUNwQyxNQUFpQixFQUNqQixPQUFnQjtJQUVoQixJQUFJLE9BQXlCLENBQUM7SUFFOUIsSUFBSSxDQUFDO1FBQ0gsb0JBQW9CO1FBQ3BCLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQXFCLENBQUM7UUFDdEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDNUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ2hE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Q2xGLENBQUM7UUFDSCxDQUFDO1FBQUMsT0FBTyxXQUFXLEVBQUUsQ0FBQztZQUNyQixPQUFPLENBQUMsS0FBSyxDQUFDLCtDQUErQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQzVFLDRFQUE0RTtRQUM5RSxDQUFDO1FBRUQsNkVBQTZFO1FBQzdFLE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGVzdCBFeGVjdXRvciBMYW1iZGEgRnVuY3Rpb25cclxuICogUHJvY2Vzc2VzIFNRUyBtZXNzYWdlcyB0byBleGVjdXRlIHRlc3QgY2FzZXMgd2l0aCBQbGF5d3JpZ2h0L0hUVFAgY2xpZW50XHJcbiAqIFxyXG4gKiBUaGlzIExhbWJkYSBpcyB0cmlnZ2VyZWQgYnkgU1FTIG1lc3NhZ2VzIGNvbnRhaW5pbmcgdGVzdCBleGVjdXRpb24gcmVxdWVzdHMuXHJcbiAqIEl0IG9yY2hlc3RyYXRlcyB0aGUgY29tcGxldGUgdGVzdCBleGVjdXRpb24gbGlmZWN5Y2xlOlxyXG4gKiAxLiBVcGRhdGUgZXhlY3V0aW9uIHN0YXR1cyB0byBcInJ1bm5pbmdcIlxyXG4gKiAyLiBFeGVjdXRlIHRlc3QgY2FzZSB1c2luZyBUZXN0RXhlY3V0b3JTZXJ2aWNlXHJcbiAqIDMuIFVwZGF0ZSBleGVjdXRpb24gcmVjb3JkIHdpdGggZmluYWwgcmVzdWx0c1xyXG4gKiA0LiBIYW5kbGUgdGltZW91dHMgYW5kIGVycm9ycyBncmFjZWZ1bGx5XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgU1FTRXZlbnQsIFNRU1JlY29yZCwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBFeGVjdXRpb25NZXNzYWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvdGVzdC1leGVjdXRpb24nO1xyXG5pbXBvcnQgeyB0ZXN0RXhlY3V0b3JTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1leGVjdXRvci1zZXJ2aWNlJztcclxuaW1wb3J0IHsgdGVzdEV4ZWN1dGlvbkRCU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Rlc3QtZXhlY3V0aW9uLWRiLXNlcnZpY2UnO1xyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciB0ZXN0IGV4ZWN1dGlvblxyXG4gKiBQcm9jZXNzZXMgU1FTIG1lc3NhZ2VzIGNvbnRhaW5pbmcgdGVzdCBleGVjdXRpb24gcmVxdWVzdHNcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBTUVNFdmVudCwgY29udGV4dDogQ29udGV4dCk6IFByb21pc2U8dm9pZD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdUZXN0IEV4ZWN1dG9yIExhbWJkYSBpbnZva2VkJyk7XHJcbiAgY29uc29sZS5sb2coYFByb2Nlc3NpbmcgJHtldmVudC5SZWNvcmRzLmxlbmd0aH0gbWVzc2FnZShzKWApO1xyXG4gIGNvbnNvbGUubG9nKGBSZW1haW5pbmcgdGltZTogJHtjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpfW1zYCk7XHJcblxyXG4gIC8vIFByb2Nlc3MgZWFjaCBTUVMgbWVzc2FnZVxyXG4gIGZvciAoY29uc3QgcmVjb3JkIG9mIGV2ZW50LlJlY29yZHMpIHtcclxuICAgIGF3YWl0IHByb2Nlc3NFeGVjdXRpb25NZXNzYWdlKHJlY29yZCwgY29udGV4dCk7XHJcbiAgfVxyXG5cclxuICBjb25zb2xlLmxvZygnQWxsIG1lc3NhZ2VzIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQcm9jZXNzIGEgc2luZ2xlIGV4ZWN1dGlvbiBtZXNzYWdlIGZyb20gU1FTXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzRXhlY3V0aW9uTWVzc2FnZShcclxuICByZWNvcmQ6IFNRU1JlY29yZCxcclxuICBjb250ZXh0OiBDb250ZXh0XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGxldCBtZXNzYWdlOiBFeGVjdXRpb25NZXNzYWdlO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICAvLyBQYXJzZSBTUVMgbWVzc2FnZVxyXG4gICAgbWVzc2FnZSA9IEpTT04ucGFyc2UocmVjb3JkLmJvZHkpIGFzIEV4ZWN1dGlvbk1lc3NhZ2U7XHJcbiAgICBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBleGVjdXRpb246ICR7bWVzc2FnZS5leGVjdXRpb25JZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBUZXN0IGNhc2U6ICR7bWVzc2FnZS50ZXN0Q2FzZUlkfWApO1xyXG4gICAgY29uc29sZS5sb2coYFByb2plY3Q6ICR7bWVzc2FnZS5wcm9qZWN0SWR9YCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBTUVMgbWVzc2FnZTonLCBlcnJvcik7XHJcbiAgICBjb25zb2xlLmVycm9yKCdNZXNzYWdlIGJvZHk6JywgcmVjb3JkLmJvZHkpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNRUyBtZXNzYWdlIGZvcm1hdCcpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgeyBleGVjdXRpb25JZCwgdGVzdENhc2UsIHByb2plY3RJZCwgbWV0YWRhdGEgfSA9IG1lc3NhZ2U7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBVcGRhdGUgZXhlY3V0aW9uIHN0YXR1cyB0byBcInJ1bm5pbmdcIlxyXG4gICAgY29uc29sZS5sb2coYFVwZGF0aW5nIGV4ZWN1dGlvbiAke2V4ZWN1dGlvbklkfSBzdGF0dXMgdG8gXCJydW5uaW5nXCJgKTtcclxuICAgIGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uU3RhdHVzKGV4ZWN1dGlvbklkLCAncnVubmluZycpO1xyXG5cclxuICAgIC8vIENoZWNrIHJlbWFpbmluZyB0aW1lIGJlZm9yZSBzdGFydGluZyBleGVjdXRpb25cclxuICAgIGNvbnN0IHJlbWFpbmluZ1RpbWUgPSBjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpO1xyXG4gICAgY29uc29sZS5sb2coYFJlbWFpbmluZyBMYW1iZGEgdGltZTogJHtyZW1haW5pbmdUaW1lfW1zYCk7XHJcblxyXG4gICAgLy8gUmVzZXJ2ZSAzMCBzZWNvbmRzIGZvciBjbGVhbnVwIGFuZCByZXN1bHQgc2F2aW5nXHJcbiAgICBjb25zdCB0aW1lb3V0QnVmZmVyID0gMzAwMDA7XHJcbiAgICBpZiAocmVtYWluaW5nVGltZSA8IHRpbWVvdXRCdWZmZXIgKyA2MDAwMCkge1xyXG4gICAgICAvLyBMZXNzIHRoYW4gOTAgc2Vjb25kcyByZW1haW5pbmcgLSBub3QgZW5vdWdoIHRpbWVcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnN1ZmZpY2llbnQgdGltZSByZW1haW5pbmc6ICR7cmVtYWluaW5nVGltZX1tc2ApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4ZWN1dGUgdGhlIHRlc3QgY2FzZVxyXG4gICAgY29uc29sZS5sb2coYFN0YXJ0aW5nIHRlc3QgZXhlY3V0aW9uIGZvciAke3Rlc3RDYXNlLnN0ZXBzLmxlbmd0aH0gc3RlcHNgKTtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRlc3RFeGVjdXRvclNlcnZpY2UuZXhlY3V0ZVRlc3RDYXNlKHtcclxuICAgICAgZXhlY3V0aW9uSWQsXHJcbiAgICAgIHRlc3RDYXNlLFxyXG4gICAgICBwcm9qZWN0SWQsXHJcbiAgICAgIHRyaWdnZXJlZEJ5OiBtZXRhZGF0YS50cmlnZ2VyZWRCeSxcclxuICAgICAgZW52aXJvbm1lbnQ6IG1ldGFkYXRhLmVudmlyb25tZW50LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYFRlc3QgZXhlY3V0aW9uIGNvbXBsZXRlZCB3aXRoIHJlc3VsdDogJHtyZXN1bHQuZXhlY3V0aW9uLnJlc3VsdH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBTdGF0dXM6ICR7cmVzdWx0LmV4ZWN1dGlvbi5zdGF0dXN9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgRHVyYXRpb246ICR7cmVzdWx0LmV4ZWN1dGlvbi5kdXJhdGlvbn1tc2ApO1xyXG4gICAgY29uc29sZS5sb2coYFN0ZXBzIGV4ZWN1dGVkOiAke3Jlc3VsdC5leGVjdXRpb24uc3RlcHMubGVuZ3RofWApO1xyXG4gICAgY29uc29sZS5sb2coYFNjcmVlbnNob3RzIGNhcHR1cmVkOiAke3Jlc3VsdC5leGVjdXRpb24uc2NyZWVuc2hvdHMubGVuZ3RofWApO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBleGVjdXRpb24gcmVjb3JkIHdpdGggZmluYWwgcmVzdWx0c1xyXG4gICAgY29uc29sZS5sb2coYFNhdmluZyBleGVjdXRpb24gcmVzdWx0cyB0byBEeW5hbW9EQmApO1xyXG4gICAgYXdhaXQgdGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25SZXN1bHRzKHJlc3VsdC5leGVjdXRpb24pO1xyXG5cclxuICAgIC8vIElmIHRoaXMgZXhlY3V0aW9uIGlzIHBhcnQgb2YgYSBzdWl0ZSwgdXBkYXRlIHN1aXRlIHN0YXR1c1xyXG4gICAgaWYgKG1lc3NhZ2Uuc3VpdGVFeGVjdXRpb25JZCkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgc3VpdGUgZXhlY3V0aW9uICR7bWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkfWApO1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlU3VpdGVFeGVjdXRpb24obWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgU3VpdGUgZXhlY3V0aW9uICR7bWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkfSB1cGRhdGVkIHN1Y2Nlc3NmdWxseWApO1xyXG4gICAgICB9IGNhdGNoIChzdWl0ZUVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSBzdWl0ZSBleGVjdXRpb24gJHttZXNzYWdlLnN1aXRlRXhlY3V0aW9uSWR9OmAsIHN1aXRlRXJyb3IpO1xyXG4gICAgICAgIC8vIERvbid0IGZhaWwgdGhlIHRlc3QgY2FzZSBleGVjdXRpb24gaWYgc3VpdGUgdXBkYXRlIGZhaWxzXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgRXhlY3V0aW9uICR7ZXhlY3V0aW9uSWR9IGNvbXBsZXRlZCBzdWNjZXNzZnVsbHlgKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgLy8gSGFuZGxlIGV4ZWN1dGlvbiBlcnJvcnNcclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xyXG4gICAgY29uc29sZS5lcnJvcihgRXhlY3V0aW9uICR7ZXhlY3V0aW9uSWR9IGZhaWxlZDpgLCBlcnJvck1lc3NhZ2UpO1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZGV0YWlsczonLCBlcnJvcik7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIHRpbWVvdXQgZXJyb3JcclxuICAgICAgY29uc3QgaXNUaW1lb3V0ID0gZXJyb3JNZXNzYWdlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RpbWUgcmVtYWluaW5nJykgfHwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RpbWVvdXQnKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd0aW1lZCBvdXQnKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZ2V0UmVtYWluaW5nVGltZUluTWlsbGlzKCkgPCA1MDAwO1xyXG5cclxuICAgICAgLy8gVXBkYXRlIGV4ZWN1dGlvbiByZWNvcmQgd2l0aCBlcnJvciBzdGF0dXNcclxuICAgICAgY29uc3QgZXhlY3V0aW9uID0gYXdhaXQgdGVzdEV4ZWN1dGlvbkRCU2VydmljZS5nZXRFeGVjdXRpb24oZXhlY3V0aW9uSWQpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGV4ZWN1dGlvbikge1xyXG4gICAgICAgIGV4ZWN1dGlvbi5zdGF0dXMgPSAnZXJyb3InO1xyXG4gICAgICAgIGV4ZWN1dGlvbi5yZXN1bHQgPSAnZXJyb3InO1xyXG4gICAgICAgIGV4ZWN1dGlvbi5lbmRUaW1lID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgIGV4ZWN1dGlvbi5kdXJhdGlvbiA9IGV4ZWN1dGlvbi5zdGFydFRpbWUgXHJcbiAgICAgICAgICA/IERhdGUubm93KCkgLSBuZXcgRGF0ZShleGVjdXRpb24uc3RhcnRUaW1lKS5nZXRUaW1lKClcclxuICAgICAgICAgIDogMDtcclxuICAgICAgICBleGVjdXRpb24uZXJyb3JNZXNzYWdlID0gaXNUaW1lb3V0IFxyXG4gICAgICAgICAgPyBgTGFtYmRhIHRpbWVvdXQ6ICR7ZXJyb3JNZXNzYWdlfWBcclxuICAgICAgICAgIDogZXJyb3JNZXNzYWdlO1xyXG4gICAgICAgIGV4ZWN1dGlvbi51cGRhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgICAgIGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uUmVzdWx0cyhleGVjdXRpb24pO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBFeGVjdXRpb24gJHtleGVjdXRpb25JZH0gbWFya2VkIGFzIGVycm9yYCk7XHJcblxyXG4gICAgICAgIC8vIElmIHRoaXMgZXhlY3V0aW9uIGlzIHBhcnQgb2YgYSBzdWl0ZSwgdXBkYXRlIHN1aXRlIHN0YXR1c1xyXG4gICAgICAgIGlmIChtZXNzYWdlLnN1aXRlRXhlY3V0aW9uSWQpIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGluZyBzdWl0ZSBleGVjdXRpb24gJHttZXNzYWdlLnN1aXRlRXhlY3V0aW9uSWR9IGFmdGVyIGVycm9yYCk7XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLnVwZGF0ZVN1aXRlRXhlY3V0aW9uKG1lc3NhZ2Uuc3VpdGVFeGVjdXRpb25JZCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBTdWl0ZSBleGVjdXRpb24gJHttZXNzYWdlLnN1aXRlRXhlY3V0aW9uSWR9IHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5YCk7XHJcbiAgICAgICAgICB9IGNhdGNoIChzdWl0ZUVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgc3VpdGUgZXhlY3V0aW9uICR7bWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkfTpgLCBzdWl0ZUVycm9yKTtcclxuICAgICAgICAgICAgLy8gRG9uJ3QgZmFpbCB0aGUgdGVzdCBjYXNlIGV4ZWN1dGlvbiBpZiBzdWl0ZSB1cGRhdGUgZmFpbHNcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgQ291bGQgbm90IGZpbmQgZXhlY3V0aW9uICR7ZXhlY3V0aW9uSWR9IHRvIHVwZGF0ZSBlcnJvciBzdGF0dXNgKTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAodXBkYXRlRXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBleGVjdXRpb24gd2l0aCBlcnJvciBzdGF0dXM6JywgdXBkYXRlRXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCB0aHJvdyAtIHdlIHdhbnQgdG8gYWNrbm93bGVkZ2UgdGhlIFNRUyBtZXNzYWdlIGV2ZW4gaWYgdXBkYXRlIGZhaWxzXHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmUtdGhyb3cgdGhlIGVycm9yIHRvIG1hcmsgU1FTIG1lc3NhZ2UgYXMgZmFpbGVkICh3aWxsIHJldHJ5IG9yIGdvIHRvIERMUSlcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG4iXX0=
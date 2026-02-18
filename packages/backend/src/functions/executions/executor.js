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
const event_publisher_service_1 = require("../../services/event-publisher-service");
const failure_detection_service_1 = require("../../services/failure-detection-service");
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
        // Publish test completion event to EventBridge for notifications
        console.log(`Publishing test completion event to EventBridge`);
        await event_publisher_service_1.eventPublisherService.publishTestCompletionEvent(result.execution);
        // Check for failure patterns and generate critical alerts
        await detectAndAlertFailures(result.execution, message);
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
                // Publish test completion event to EventBridge for notifications
                console.log(`Publishing test error event to EventBridge`);
                await event_publisher_service_1.eventPublisherService.publishTestCompletionEvent(execution);
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
/**
 * Detect failure patterns and generate critical alerts
 */
async function detectAndAlertFailures(execution, message) {
    try {
        console.log('Checking for failure patterns', {
            executionId: execution.executionId,
            result: execution.result,
            testCaseId: execution.testCaseId,
            suiteExecutionId: message.suiteExecutionId,
        });
        // Only check for failures if test failed or errored
        if (execution.result !== 'fail' && execution.result !== 'error') {
            console.log('Test passed, skipping failure detection');
            return;
        }
        // Check for consecutive failures (individual test case)
        if (execution.testCaseId) {
            console.log(`Checking for consecutive failures for test case ${execution.testCaseId}`);
            const consecutiveAlert = await failure_detection_service_1.failureDetectionService.detectConsecutiveFailures(execution.testCaseId);
            if (consecutiveAlert) {
                console.log('Consecutive failures detected, generating critical alert', {
                    testCaseId: execution.testCaseId,
                    consecutiveFailures: consecutiveAlert.details.consecutiveFailures,
                });
                // Generate and publish critical alert event
                const alertEvent = failure_detection_service_1.failureDetectionService.generateCriticalAlert(consecutiveAlert, message.projectId, message.metadata.triggeredBy);
                await event_publisher_service_1.eventPublisherService.publishEvent(alertEvent);
                console.log('Critical alert published for consecutive failures');
            }
        }
        // Check for suite failure rate (if part of suite execution)
        if (message.suiteExecutionId) {
            console.log(`Checking suite failure rate for suite execution ${message.suiteExecutionId}`);
            // Wait a bit to ensure all suite executions are recorded
            await new Promise(resolve => setTimeout(resolve, 2000));
            const suiteAlert = await failure_detection_service_1.failureDetectionService.detectSuiteFailureRate(message.suiteExecutionId);
            if (suiteAlert) {
                console.log('Suite failure threshold exceeded, generating critical alert', {
                    suiteExecutionId: message.suiteExecutionId,
                    failureRate: suiteAlert.details.failureRate,
                });
                // Generate and publish critical alert event
                const alertEvent = failure_detection_service_1.failureDetectionService.generateCriticalAlert(suiteAlert, message.projectId, message.metadata.triggeredBy);
                await event_publisher_service_1.eventPublisherService.publishEvent(alertEvent);
                console.log('Critical alert published for suite failure threshold');
            }
        }
    }
    catch (error) {
        // Don't fail the execution if failure detection fails
        console.error('Error in failure detection:', error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJleGVjdXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7R0FVRzs7O0FBSUgsZ0ZBQTJFO0FBQzNFLHdGQUFrRjtBQUNsRixvRkFBK0U7QUFDL0Usd0ZBQW1GO0FBRW5GOzs7R0FHRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUFlLEVBQUUsT0FBZ0IsRUFBaUIsRUFBRTtJQUNoRixPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxhQUFhLENBQUMsQ0FBQztJQUM3RCxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixPQUFPLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFdkUsMkJBQTJCO0lBQzNCLEtBQUssTUFBTSxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25DLE1BQU0sdUJBQXVCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDO0FBWFcsUUFBQSxPQUFPLFdBV2xCO0FBRUY7O0dBRUc7QUFDSCxLQUFLLFVBQVUsdUJBQXVCLENBQ3BDLE1BQWlCLEVBQ2pCLE9BQWdCO0lBRWhCLElBQUksT0FBeUIsQ0FBQztJQUU5QixJQUFJLENBQUM7UUFDSCxvQkFBb0I7UUFDcEIsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBcUIsQ0FBQztRQUN0RCxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUM1RCxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsT0FBTyxDQUFD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QUFVLEVBQUUsQ0FBQztnQkFDZixPQUFPLENBQUMsR0FBRyxDQUFDLDZEQUE2RCxFQUFFO29CQUN6RSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsZ0JBQWdCO29CQUMxQyxXQUFXLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXO2lCQUM1QyxDQUFDLENBQUM7Z0JBRUgsNENBQTRDO2dCQUM1QyxNQUFNLFVBQVUsR0FBRyxtREFBdUIsQ0FBQyxxQkFBcUIsQ0FDOUQsVUFBVSxFQUNWLE9BQU8sQ0FBQyxTQUFTLEVBQ2pCLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUM3QixDQUFDO2dCQUVGLE1BQU0sK0NBQXFCLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNyRCxPQUFPLENBQUMsR0FBRyxDQUFDLHNEQUFzRCxDQUFDLENBQUM7WUFDdEUsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLHNEQUFzRDtRQUN0RCxPQUFPLENBQUMsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRlc3QgRXhlY3V0b3IgTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIFByb2Nlc3NlcyBTUVMgbWVzc2FnZXMgdG8gZXhlY3V0ZSB0ZXN0IGNhc2VzIHdpdGggUGxheXdyaWdodC9IVFRQIGNsaWVudFxyXG4gKiBcclxuICogVGhpcyBMYW1iZGEgaXMgdHJpZ2dlcmVkIGJ5IFNRUyBtZXNzYWdlcyBjb250YWluaW5nIHRlc3QgZXhlY3V0aW9uIHJlcXVlc3RzLlxyXG4gKiBJdCBvcmNoZXN0cmF0ZXMgdGhlIGNvbXBsZXRlIHRlc3QgZXhlY3V0aW9uIGxpZmVjeWNsZTpcclxuICogMS4gVXBkYXRlIGV4ZWN1dGlvbiBzdGF0dXMgdG8gXCJydW5uaW5nXCJcclxuICogMi4gRXhlY3V0ZSB0ZXN0IGNhc2UgdXNpbmcgVGVzdEV4ZWN1dG9yU2VydmljZVxyXG4gKiAzLiBVcGRhdGUgZXhlY3V0aW9uIHJlY29yZCB3aXRoIGZpbmFsIHJlc3VsdHNcclxuICogNC4gSGFuZGxlIHRpbWVvdXRzIGFuZCBlcnJvcnMgZ3JhY2VmdWxseVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IFNRU0V2ZW50LCBTUVNSZWNvcmQsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRXhlY3V0aW9uTWVzc2FnZSB9IGZyb20gJy4uLy4uL3R5cGVzL3Rlc3QtZXhlY3V0aW9uJztcclxuaW1wb3J0IHsgdGVzdEV4ZWN1dG9yU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Rlc3QtZXhlY3V0b3Itc2VydmljZSc7XHJcbmltcG9ydCB7IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgZXZlbnRQdWJsaXNoZXJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZXZlbnQtcHVibGlzaGVyLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBmYWlsdXJlRGV0ZWN0aW9uU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2ZhaWx1cmUtZGV0ZWN0aW9uLXNlcnZpY2UnO1xyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciB0ZXN0IGV4ZWN1dGlvblxyXG4gKiBQcm9jZXNzZXMgU1FTIG1lc3NhZ2VzIGNvbnRhaW5pbmcgdGVzdCBleGVjdXRpb24gcmVxdWVzdHNcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBTUVNFdmVudCwgY29udGV4dDogQ29udGV4dCk6IFByb21pc2U8dm9pZD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdUZXN0IEV4ZWN1dG9yIExhbWJkYSBpbnZva2VkJyk7XHJcbiAgY29uc29sZS5sb2coYFByb2Nlc3NpbmcgJHtldmVudC5SZWNvcmRzLmxlbmd0aH0gbWVzc2FnZShzKWApO1xyXG4gIGNvbnNvbGUubG9nKGBSZW1haW5pbmcgdGltZTogJHtjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpfW1zYCk7XHJcblxyXG4gIC8vIFByb2Nlc3MgZWFjaCBTUVMgbWVzc2FnZVxyXG4gIGZvciAoY29uc3QgcmVjb3JkIG9mIGV2ZW50LlJlY29yZHMpIHtcclxuICAgIGF3YWl0IHByb2Nlc3NFeGVjdXRpb25NZXNzYWdlKHJlY29yZCwgY29udGV4dCk7XHJcbiAgfVxyXG5cclxuICBjb25zb2xlLmxvZygnQWxsIG1lc3NhZ2VzIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQcm9jZXNzIGEgc2luZ2xlIGV4ZWN1dGlvbiBtZXNzYWdlIGZyb20gU1FTXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzRXhlY3V0aW9uTWVzc2FnZShcclxuICByZWNvcmQ6IFNRU1JlY29yZCxcclxuICBjb250ZXh0OiBDb250ZXh0XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGxldCBtZXNzYWdlOiBFeGVjdXRpb25NZXNzYWdlO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICAvLyBQYXJzZSBTUVMgbWVzc2FnZVxyXG4gICAgbWVzc2FnZSA9IEpTT04ucGFyc2UocmVjb3JkLmJvZHkpIGFzIEV4ZWN1dGlvbk1lc3NhZ2U7XHJcbiAgICBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBleGVjdXRpb246ICR7bWVzc2FnZS5leGVjdXRpb25JZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBUZXN0IGNhc2U6ICR7bWVzc2FnZS50ZXN0Q2FzZUlkfWApO1xyXG4gICAgY29uc29sZS5sb2coYFByb2plY3Q6ICR7bWVzc2FnZS5wcm9qZWN0SWR9YCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBTUVMgbWVzc2FnZTonLCBlcnJvcik7XHJcbiAgICBjb25zb2xlLmVycm9yKCdNZXNzYWdlIGJvZHk6JywgcmVjb3JkLmJvZHkpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNRUyBtZXNzYWdlIGZvcm1hdCcpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgeyBleGVjdXRpb25JZCwgdGVzdENhc2UsIHByb2plY3RJZCwgbWV0YWRhdGEgfSA9IG1lc3NhZ2U7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBVcGRhdGUgZXhlY3V0aW9uIHN0YXR1cyB0byBcInJ1bm5pbmdcIlxyXG4gICAgY29uc29sZS5sb2coYFVwZGF0aW5nIGV4ZWN1dGlvbiAke2V4ZWN1dGlvbklkfSBzdGF0dXMgdG8gXCJydW5uaW5nXCJgKTtcclxuICAgIGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uU3RhdHVzKGV4ZWN1dGlvbklkLCAncnVubmluZycpO1xyXG5cclxuICAgIC8vIENoZWNrIHJlbWFpbmluZyB0aW1lIGJlZm9yZSBzdGFydGluZyBleGVjdXRpb25cclxuICAgIGNvbnN0IHJlbWFpbmluZ1RpbWUgPSBjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpO1xyXG4gICAgY29uc29sZS5sb2coYFJlbWFpbmluZyBMYW1iZGEgdGltZTogJHtyZW1haW5pbmdUaW1lfW1zYCk7XHJcblxyXG4gICAgLy8gUmVzZXJ2ZSAzMCBzZWNvbmRzIGZvciBjbGVhbnVwIGFuZCByZXN1bHQgc2F2aW5nXHJcbiAgICBjb25zdCB0aW1lb3V0QnVmZmVyID0gMzAwMDA7XHJcbiAgICBpZiAocmVtYWluaW5nVGltZSA8IHRpbWVvdXRCdWZmZXIgKyA2MDAwMCkge1xyXG4gICAgICAvLyBMZXNzIHRoYW4gOTAgc2Vjb25kcyByZW1haW5pbmcgLSBub3QgZW5vdWdoIHRpbWVcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnN1ZmZpY2llbnQgdGltZSByZW1haW5pbmc6ICR7cmVtYWluaW5nVGltZX1tc2ApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4ZWN1dGUgdGhlIHRlc3QgY2FzZVxyXG4gICAgY29uc29sZS5sb2coYFN0YXJ0aW5nIHRlc3QgZXhlY3V0aW9uIGZvciAke3Rlc3RDYXNlLnN0ZXBzLmxlbmd0aH0gc3RlcHNgKTtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRlc3RFeGVjdXRvclNlcnZpY2UuZXhlY3V0ZVRlc3RDYXNlKHtcclxuICAgICAgZXhlY3V0aW9uSWQsXHJcbiAgICAgIHRlc3RDYXNlLFxyXG4gICAgICBwcm9qZWN0SWQsXHJcbiAgICAgIHRyaWdnZXJlZEJ5OiBtZXRhZGF0YS50cmlnZ2VyZWRCeSxcclxuICAgICAgZW52aXJvbm1lbnQ6IG1ldGFkYXRhLmVudmlyb25tZW50LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYFRlc3QgZXhlY3V0aW9uIGNvbXBsZXRlZCB3aXRoIHJlc3VsdDogJHtyZXN1bHQuZXhlY3V0aW9uLnJlc3VsdH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBTdGF0dXM6ICR7cmVzdWx0LmV4ZWN1dGlvbi5zdGF0dXN9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgRHVyYXRpb246ICR7cmVzdWx0LmV4ZWN1dGlvbi5kdXJhdGlvbn1tc2ApO1xyXG4gICAgY29uc29sZS5sb2coYFN0ZXBzIGV4ZWN1dGVkOiAke3Jlc3VsdC5leGVjdXRpb24uc3RlcHMubGVuZ3RofWApO1xyXG4gICAgY29uc29sZS5sb2coYFNjcmVlbnNob3RzIGNhcHR1cmVkOiAke3Jlc3VsdC5leGVjdXRpb24uc2NyZWVuc2hvdHMubGVuZ3RofWApO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBleGVjdXRpb24gcmVjb3JkIHdpdGggZmluYWwgcmVzdWx0c1xyXG4gICAgY29uc29sZS5sb2coYFNhdmluZyBleGVjdXRpb24gcmVzdWx0cyB0byBEeW5hbW9EQmApO1xyXG4gICAgYXdhaXQgdGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVFeGVjdXRpb25SZXN1bHRzKHJlc3VsdC5leGVjdXRpb24pO1xyXG5cclxuICAgIC8vIFB1Ymxpc2ggdGVzdCBjb21wbGV0aW9uIGV2ZW50IHRvIEV2ZW50QnJpZGdlIGZvciBub3RpZmljYXRpb25zXHJcbiAgICBjb25zb2xlLmxvZyhgUHVibGlzaGluZyB0ZXN0IGNvbXBsZXRpb24gZXZlbnQgdG8gRXZlbnRCcmlkZ2VgKTtcclxuICAgIGF3YWl0IGV2ZW50UHVibGlzaGVyU2VydmljZS5wdWJsaXNoVGVzdENvbXBsZXRpb25FdmVudChyZXN1bHQuZXhlY3V0aW9uKTtcclxuXHJcbiAgICAvLyBDaGVjayBmb3IgZmFpbHVyZSBwYXR0ZXJucyBhbmQgZ2VuZXJhdGUgY3JpdGljYWwgYWxlcnRzXHJcbiAgICBhd2FpdCBkZXRlY3RBbmRBbGVydEZhaWx1cmVzKHJlc3VsdC5leGVjdXRpb24sIG1lc3NhZ2UpO1xyXG5cclxuICAgIC8vIElmIHRoaXMgZXhlY3V0aW9uIGlzIHBhcnQgb2YgYSBzdWl0ZSwgdXBkYXRlIHN1aXRlIHN0YXR1c1xyXG4gICAgaWYgKG1lc3NhZ2Uuc3VpdGVFeGVjdXRpb25JZCkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgc3VpdGUgZXhlY3V0aW9uICR7bWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkfWApO1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlU3VpdGVFeGVjdXRpb24obWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgU3VpdGUgZXhlY3V0aW9uICR7bWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkfSB1cGRhdGVkIHN1Y2Nlc3NmdWxseWApO1xyXG4gICAgICB9IGNhdGNoIChzdWl0ZUVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSBzdWl0ZSBleGVjdXRpb24gJHttZXNzYWdlLnN1aXRlRXhlY3V0aW9uSWR9OmAsIHN1aXRlRXJyb3IpO1xyXG4gICAgICAgIC8vIERvbid0IGZhaWwgdGhlIHRlc3QgY2FzZSBleGVjdXRpb24gaWYgc3VpdGUgdXBkYXRlIGZhaWxzXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgRXhlY3V0aW9uICR7ZXhlY3V0aW9uSWR9IGNvbXBsZXRlZCBzdWNjZXNzZnVsbHlgKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgLy8gSGFuZGxlIGV4ZWN1dGlvbiBlcnJvcnNcclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xyXG4gICAgY29uc29sZS5lcnJvcihgRXhlY3V0aW9uICR7ZXhlY3V0aW9uSWR9IGZhaWxlZDpgLCBlcnJvck1lc3NhZ2UpO1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZGV0YWlsczonLCBlcnJvcik7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIHRpbWVvdXQgZXJyb3JcclxuICAgICAgY29uc3QgaXNUaW1lb3V0ID0gZXJyb3JNZXNzYWdlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RpbWUgcmVtYWluaW5nJykgfHwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RpbWVvdXQnKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd0aW1lZCBvdXQnKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZ2V0UmVtYWluaW5nVGltZUluTWlsbGlzKCkgPCA1MDAwO1xyXG5cclxuICAgICAgLy8gVXBkYXRlIGV4ZWN1dGlvbiByZWNvcmQgd2l0aCBlcnJvciBzdGF0dXNcclxuICAgICAgY29uc3QgZXhlY3V0aW9uID0gYXdhaXQgdGVzdEV4ZWN1dGlvbkRCU2VydmljZS5nZXRFeGVjdXRpb24oZXhlY3V0aW9uSWQpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGV4ZWN1dGlvbikge1xyXG4gICAgICAgIGV4ZWN1dGlvbi5zdGF0dXMgPSAnZXJyb3InO1xyXG4gICAgICAgIGV4ZWN1dGlvbi5yZXN1bHQgPSAnZXJyb3InO1xyXG4gICAgICAgIGV4ZWN1dGlvbi5lbmRUaW1lID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgIGV4ZWN1dGlvbi5kdXJhdGlvbiA9IGV4ZWN1dGlvbi5zdGFydFRpbWUgXHJcbiAgICAgICAgICA/IERhdGUubm93KCkgLSBuZXcgRGF0ZShleGVjdXRpb24uc3RhcnRUaW1lKS5nZXRUaW1lKClcclxuICAgICAgICAgIDogMDtcclxuICAgICAgICBleGVjdXRpb24uZXJyb3JNZXNzYWdlID0gaXNUaW1lb3V0IFxyXG4gICAgICAgICAgPyBgTGFtYmRhIHRpbWVvdXQ6ICR7ZXJyb3JNZXNzYWdlfWBcclxuICAgICAgICAgIDogZXJyb3JNZXNzYWdlO1xyXG4gICAgICAgIGV4ZWN1dGlvbi51cGRhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgICAgIGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UudXBkYXRlRXhlY3V0aW9uUmVzdWx0cyhleGVjdXRpb24pO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBFeGVjdXRpb24gJHtleGVjdXRpb25JZH0gbWFya2VkIGFzIGVycm9yYCk7XHJcblxyXG4gICAgICAgIC8vIFB1Ymxpc2ggdGVzdCBjb21wbGV0aW9uIGV2ZW50IHRvIEV2ZW50QnJpZGdlIGZvciBub3RpZmljYXRpb25zXHJcbiAgICAgICAgY29uc29sZS5sb2coYFB1Ymxpc2hpbmcgdGVzdCBlcnJvciBldmVudCB0byBFdmVudEJyaWRnZWApO1xyXG4gICAgICAgIGF3YWl0IGV2ZW50UHVibGlzaGVyU2VydmljZS5wdWJsaXNoVGVzdENvbXBsZXRpb25FdmVudChleGVjdXRpb24pO1xyXG5cclxuICAgICAgICAvLyBJZiB0aGlzIGV4ZWN1dGlvbiBpcyBwYXJ0IG9mIGEgc3VpdGUsIHVwZGF0ZSBzdWl0ZSBzdGF0dXNcclxuICAgICAgICBpZiAobWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgc3VpdGUgZXhlY3V0aW9uICR7bWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkfSBhZnRlciBlcnJvcmApO1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgdGVzdEV4ZWN1dGlvbkRCU2VydmljZS51cGRhdGVTdWl0ZUV4ZWN1dGlvbihtZXNzYWdlLnN1aXRlRXhlY3V0aW9uSWQpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgU3VpdGUgZXhlY3V0aW9uICR7bWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkfSB1cGRhdGVkIHN1Y2Nlc3NmdWxseWApO1xyXG4gICAgICAgICAgfSBjYXRjaCAoc3VpdGVFcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHN1aXRlIGV4ZWN1dGlvbiAke21lc3NhZ2Uuc3VpdGVFeGVjdXRpb25JZH06YCwgc3VpdGVFcnJvcik7XHJcbiAgICAgICAgICAgIC8vIERvbid0IGZhaWwgdGhlIHRlc3QgY2FzZSBleGVjdXRpb24gaWYgc3VpdGUgdXBkYXRlIGZhaWxzXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYENvdWxkIG5vdCBmaW5kIGV4ZWN1dGlvbiAke2V4ZWN1dGlvbklkfSB0byB1cGRhdGUgZXJyb3Igc3RhdHVzYCk7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKHVwZGF0ZUVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB1cGRhdGUgZXhlY3V0aW9uIHdpdGggZXJyb3Igc3RhdHVzOicsIHVwZGF0ZUVycm9yKTtcclxuICAgICAgLy8gRG9uJ3QgdGhyb3cgLSB3ZSB3YW50IHRvIGFja25vd2xlZGdlIHRoZSBTUVMgbWVzc2FnZSBldmVuIGlmIHVwZGF0ZSBmYWlsc1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlLXRocm93IHRoZSBlcnJvciB0byBtYXJrIFNRUyBtZXNzYWdlIGFzIGZhaWxlZCAod2lsbCByZXRyeSBvciBnbyB0byBETFEpXHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlY3QgZmFpbHVyZSBwYXR0ZXJucyBhbmQgZ2VuZXJhdGUgY3JpdGljYWwgYWxlcnRzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBkZXRlY3RBbmRBbGVydEZhaWx1cmVzKFxyXG4gIGV4ZWN1dGlvbjogYW55LFxyXG4gIG1lc3NhZ2U6IEV4ZWN1dGlvbk1lc3NhZ2VcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnNvbGUubG9nKCdDaGVja2luZyBmb3IgZmFpbHVyZSBwYXR0ZXJucycsIHtcclxuICAgICAgZXhlY3V0aW9uSWQ6IGV4ZWN1dGlvbi5leGVjdXRpb25JZCxcclxuICAgICAgcmVzdWx0OiBleGVjdXRpb24ucmVzdWx0LFxyXG4gICAgICB0ZXN0Q2FzZUlkOiBleGVjdXRpb24udGVzdENhc2VJZCxcclxuICAgICAgc3VpdGVFeGVjdXRpb25JZDogbWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT25seSBjaGVjayBmb3IgZmFpbHVyZXMgaWYgdGVzdCBmYWlsZWQgb3IgZXJyb3JlZFxyXG4gICAgaWYgKGV4ZWN1dGlvbi5yZXN1bHQgIT09ICdmYWlsJyAmJiBleGVjdXRpb24ucmVzdWx0ICE9PSAnZXJyb3InKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdUZXN0IHBhc3NlZCwgc2tpcHBpbmcgZmFpbHVyZSBkZXRlY3Rpb24nKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGZvciBjb25zZWN1dGl2ZSBmYWlsdXJlcyAoaW5kaXZpZHVhbCB0ZXN0IGNhc2UpXHJcbiAgICBpZiAoZXhlY3V0aW9uLnRlc3RDYXNlSWQpIHtcclxuICAgICAgY29uc29sZS5sb2coYENoZWNraW5nIGZvciBjb25zZWN1dGl2ZSBmYWlsdXJlcyBmb3IgdGVzdCBjYXNlICR7ZXhlY3V0aW9uLnRlc3RDYXNlSWR9YCk7XHJcbiAgICAgIGNvbnN0IGNvbnNlY3V0aXZlQWxlcnQgPSBhd2FpdCBmYWlsdXJlRGV0ZWN0aW9uU2VydmljZS5kZXRlY3RDb25zZWN1dGl2ZUZhaWx1cmVzKFxyXG4gICAgICAgIGV4ZWN1dGlvbi50ZXN0Q2FzZUlkXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBpZiAoY29uc2VjdXRpdmVBbGVydCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdDb25zZWN1dGl2ZSBmYWlsdXJlcyBkZXRlY3RlZCwgZ2VuZXJhdGluZyBjcml0aWNhbCBhbGVydCcsIHtcclxuICAgICAgICAgIHRlc3RDYXNlSWQ6IGV4ZWN1dGlvbi50ZXN0Q2FzZUlkLFxyXG4gICAgICAgICAgY29uc2VjdXRpdmVGYWlsdXJlczogY29uc2VjdXRpdmVBbGVydC5kZXRhaWxzLmNvbnNlY3V0aXZlRmFpbHVyZXMsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIEdlbmVyYXRlIGFuZCBwdWJsaXNoIGNyaXRpY2FsIGFsZXJ0IGV2ZW50XHJcbiAgICAgICAgY29uc3QgYWxlcnRFdmVudCA9IGZhaWx1cmVEZXRlY3Rpb25TZXJ2aWNlLmdlbmVyYXRlQ3JpdGljYWxBbGVydChcclxuICAgICAgICAgIGNvbnNlY3V0aXZlQWxlcnQsXHJcbiAgICAgICAgICBtZXNzYWdlLnByb2plY3RJZCxcclxuICAgICAgICAgIG1lc3NhZ2UubWV0YWRhdGEudHJpZ2dlcmVkQnlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBhd2FpdCBldmVudFB1Ymxpc2hlclNlcnZpY2UucHVibGlzaEV2ZW50KGFsZXJ0RXZlbnQpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdDcml0aWNhbCBhbGVydCBwdWJsaXNoZWQgZm9yIGNvbnNlY3V0aXZlIGZhaWx1cmVzJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmb3Igc3VpdGUgZmFpbHVyZSByYXRlIChpZiBwYXJ0IG9mIHN1aXRlIGV4ZWN1dGlvbilcclxuICAgIGlmIChtZXNzYWdlLnN1aXRlRXhlY3V0aW9uSWQpIHtcclxuICAgICAgY29uc29sZS5sb2coYENoZWNraW5nIHN1aXRlIGZhaWx1cmUgcmF0ZSBmb3Igc3VpdGUgZXhlY3V0aW9uICR7bWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkfWApO1xyXG4gICAgICBcclxuICAgICAgLy8gV2FpdCBhIGJpdCB0byBlbnN1cmUgYWxsIHN1aXRlIGV4ZWN1dGlvbnMgYXJlIHJlY29yZGVkXHJcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAyMDAwKSk7XHJcblxyXG4gICAgICBjb25zdCBzdWl0ZUFsZXJ0ID0gYXdhaXQgZmFpbHVyZURldGVjdGlvblNlcnZpY2UuZGV0ZWN0U3VpdGVGYWlsdXJlUmF0ZShcclxuICAgICAgICBtZXNzYWdlLnN1aXRlRXhlY3V0aW9uSWRcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmIChzdWl0ZUFsZXJ0KSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1N1aXRlIGZhaWx1cmUgdGhyZXNob2xkIGV4Y2VlZGVkLCBnZW5lcmF0aW5nIGNyaXRpY2FsIGFsZXJ0Jywge1xyXG4gICAgICAgICAgc3VpdGVFeGVjdXRpb25JZDogbWVzc2FnZS5zdWl0ZUV4ZWN1dGlvbklkLFxyXG4gICAgICAgICAgZmFpbHVyZVJhdGU6IHN1aXRlQWxlcnQuZGV0YWlscy5mYWlsdXJlUmF0ZSxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gR2VuZXJhdGUgYW5kIHB1Ymxpc2ggY3JpdGljYWwgYWxlcnQgZXZlbnRcclxuICAgICAgICBjb25zdCBhbGVydEV2ZW50ID0gZmFpbHVyZURldGVjdGlvblNlcnZpY2UuZ2VuZXJhdGVDcml0aWNhbEFsZXJ0KFxyXG4gICAgICAgICAgc3VpdGVBbGVydCxcclxuICAgICAgICAgIG1lc3NhZ2UucHJvamVjdElkLFxyXG4gICAgICAgICAgbWVzc2FnZS5tZXRhZGF0YS50cmlnZ2VyZWRCeVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGF3YWl0IGV2ZW50UHVibGlzaGVyU2VydmljZS5wdWJsaXNoRXZlbnQoYWxlcnRFdmVudCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0NyaXRpY2FsIGFsZXJ0IHB1Ymxpc2hlZCBmb3Igc3VpdGUgZmFpbHVyZSB0aHJlc2hvbGQnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAvLyBEb24ndCBmYWlsIHRoZSBleGVjdXRpb24gaWYgZmFpbHVyZSBkZXRlY3Rpb24gZmFpbHNcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIGZhaWx1cmUgZGV0ZWN0aW9uOicsIGVycm9yKTtcclxuICB9XHJcbn1cclxuIl19
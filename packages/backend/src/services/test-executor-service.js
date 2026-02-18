"use strict";
/**
 * Test Executor Service
 * Orchestrates the execution of complete test cases with all steps
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testExecutorService = exports.TestExecutorService = void 0;
const browser_service_1 = require("./browser-service");
const step_executor_service_1 = require("./step-executor-service");
class TestExecutorService {
    /**
     * Execute a complete test case with all steps
     * Returns the execution record with results
     */
    async executeTestCase(options) {
        const { executionId, testCase, projectId, triggeredBy, environment } = options;
        const startTime = new Date().toISOString();
        const startTimeMs = Date.now();
        let status = 'running';
        let result;
        let stepResults = [];
        let screenshots = [];
        let errorMessage;
        let browserVersion;
        // Set execution ID in step executor for screenshot naming
        step_executor_service_1.stepExecutorService.setExecutionId(executionId);
        // Determine if this test case requires a browser (has UI actions)
        const requiresBrowser = testCase.steps.some(step => ['navigate', 'click', 'type', 'assert', 'wait'].includes(step.action));
        try {
            console.log(`Starting execution ${executionId} for test case ${testCase.testCaseId}`);
            console.log(`Test case has ${testCase.steps.length} steps`);
            // Initialize browser if needed
            let browserSession = null;
            if (requiresBrowser) {
                console.log('Initializing browser for UI test...');
                browserSession = await browser_service_1.browserService.initializeBrowser();
                browserVersion = await browser_service_1.browserService.getBrowserVersion();
                console.log(`Browser initialized: ${browserVersion}`);
            }
            // Execute each step sequentially
            for (let i = 0; i < testCase.steps.length; i++) {
                const step = testCase.steps[i];
                console.log(`Executing step ${i + 1}/${testCase.steps.length}: ${step.action}`);
                try {
                    const stepResult = await step_executor_service_1.stepExecutorService.executeStep(browserSession?.page || null, step, i);
                    stepResults.push(stepResult);
                    // Collect screenshot if captured
                    if (stepResult.screenshot) {
                        screenshots.push(stepResult.screenshot);
                    }
                    // If step failed or errored, stop execution
                    if (stepResult.status === 'fail' || stepResult.status === 'error') {
                        console.log(`Step ${i + 1} ${stepResult.status}, stopping execution`);
                        break;
                    }
                    console.log(`Step ${i + 1} completed successfully`);
                }
                catch (error) {
                    // Unexpected error during step execution
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`Unexpected error in step ${i + 1}:`, errorMsg);
                    stepResults.push({
                        stepIndex: i,
                        action: step.action,
                        status: 'error',
                        duration: 0,
                        errorMessage: errorMsg,
                        details: {},
                    });
                    break;
                }
            }
            // Determine overall result based on step results
            result = this.determineExecutionResult(stepResults);
            status = 'completed';
            console.log(`Execution completed with result: ${result}`);
        }
        catch (error) {
            // Unexpected error during execution setup or teardown
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('Execution failed with error:', errorMsg);
            status = 'error';
            result = 'error';
            errorMessage = errorMsg;
        }
        finally {
            // Always clean up browser resources
            if (requiresBrowser && browser_service_1.browserService.hasActiveSession()) {
                console.log('Cleaning up browser resources...');
                await browser_service_1.browserService.forceCleanup();
            }
        }
        const endTime = new Date().toISOString();
        const duration = Date.now() - startTimeMs;
        // Build execution record
        const execution = {
            executionId,
            projectId,
            testCaseId: testCase.testCaseId,
            testSuiteId: testCase.suiteId,
            status,
            result,
            startTime,
            endTime,
            duration,
            steps: stepResults,
            screenshots,
            errorMessage,
            metadata: {
                triggeredBy,
                environment,
                browserVersion,
            },
            createdAt: startTime,
            updatedAt: endTime,
        };
        return {
            execution,
            success: result === 'pass',
        };
    }
    /**
     * Determine the overall execution result based on step results
     *
     * Rules:
     * - If all steps pass → result is 'pass'
     * - If any step fails → result is 'fail'
     * - If any step has error → result is 'error'
     */
    determineExecutionResult(stepResults) {
        if (stepResults.length === 0) {
            return 'error'; // No steps executed
        }
        // Check for errors first (highest priority)
        const hasError = stepResults.some(step => step.status === 'error');
        if (hasError) {
            return 'error';
        }
        // Check for failures
        const hasFailed = stepResults.some(step => step.status === 'fail');
        if (hasFailed) {
            return 'fail';
        }
        // All steps passed
        return 'pass';
    }
    /**
     * Validate execution status transitions
     * Ensures status follows valid state machine: queued → running → completed/error
     */
    isValidStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            queued: ['running', 'error'],
            running: ['completed', 'error'],
            completed: [], // Terminal state
            error: [], // Terminal state
        };
        return validTransitions[currentStatus]?.includes(newStatus) || false;
    }
    /**
     * Check if a status is terminal (no further transitions allowed)
     */
    isTerminalStatus(status) {
        return status === 'completed' || status === 'error';
    }
}
exports.TestExecutorService = TestExecutorService;
// Export singleton instance
exports.testExecutorService = new TestExecutorService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1leGVjdXRvci1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVzdC1leGVjdXRvci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQVNILHVEQUFtRDtBQUNuRCxtRUFBOEQ7QUFlOUQsTUFBYSxtQkFBbUI7SUFDOUI7OztPQUdHO0lBQ0ksS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUErQjtRQUMxRCxNQUFNLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxHQUFHLE9BQU8sQ0FBQztRQUUvRSxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUUvQixJQUFJLE1BQU0sR0FBb0IsU0FBUyxDQUFDO1FBQ3hDLElBQUksTUFBbUMsQ0FBQztRQUN4QyxJQUFJLFdBQVcsR0FBaUIsRUFBRSxDQUFDO1FBQ25DLElBQUksV0FBVyxHQUFhLEVBQUUsQ0FBQztRQUMvQixJQUFJLFlBQWdDLENBQUM7UUFDckMsSUFBSSxjQUFrQyxDQUFDO1FBRXZDLDBEQUEwRDtRQUMxRCwyQ0FBbUIsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFaEQsa0VBQWtFO1FBQ2xFLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ2pELENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQ3RFLENBQUM7UUFFRixJQUFJLENBQUM7WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixXQUFXLGtCQUFrQixRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FB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QUFDO0lBQ3RELENBQUM7Q0FDRjtBQTdMRCxrREE2TEM7QUFFRCw0QkFBNEI7QUFDZixRQUFBLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBUZXN0IEV4ZWN1dG9yIFNlcnZpY2VcclxuICogT3JjaGVzdHJhdGVzIHRoZSBleGVjdXRpb24gb2YgY29tcGxldGUgdGVzdCBjYXNlcyB3aXRoIGFsbCBzdGVwc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IFRlc3RDYXNlIH0gZnJvbSAnLi4vdHlwZXMvdGVzdC1jYXNlJztcclxuaW1wb3J0IHsgXHJcbiAgVGVzdEV4ZWN1dGlvbiwgXHJcbiAgRXhlY3V0aW9uU3RhdHVzLCBcclxuICBFeGVjdXRpb25SZXN1bHQsIFxyXG4gIFN0ZXBSZXN1bHQgXHJcbn0gZnJvbSAnLi4vdHlwZXMvdGVzdC1leGVjdXRpb24nO1xyXG5pbXBvcnQgeyBicm93c2VyU2VydmljZSB9IGZyb20gJy4vYnJvd3Nlci1zZXJ2aWNlJztcclxuaW1wb3J0IHsgc3RlcEV4ZWN1dG9yU2VydmljZSB9IGZyb20gJy4vc3RlcC1leGVjdXRvci1zZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRXhlY3V0ZVRlc3RDYXNlT3B0aW9ucyB7XHJcbiAgZXhlY3V0aW9uSWQ6IHN0cmluZztcclxuICB0ZXN0Q2FzZTogVGVzdENhc2U7XHJcbiAgcHJvamVjdElkOiBzdHJpbmc7XHJcbiAgdHJpZ2dlcmVkQnk6IHN0cmluZztcclxuICBlbnZpcm9ubWVudD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFeGVjdXRlVGVzdENhc2VSZXN1bHQge1xyXG4gIGV4ZWN1dGlvbjogVGVzdEV4ZWN1dGlvbjtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVGVzdEV4ZWN1dG9yU2VydmljZSB7XHJcbiAgLyoqXHJcbiAgICogRXhlY3V0ZSBhIGNvbXBsZXRlIHRlc3QgY2FzZSB3aXRoIGFsbCBzdGVwc1xyXG4gICAqIFJldHVybnMgdGhlIGV4ZWN1dGlvbiByZWNvcmQgd2l0aCByZXN1bHRzXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIGV4ZWN1dGVUZXN0Q2FzZShvcHRpb25zOiBFeGVjdXRlVGVzdENhc2VPcHRpb25zKTogUHJvbWlzZTxFeGVjdXRlVGVzdENhc2VSZXN1bHQ+IHtcclxuICAgIGNvbnN0IHsgZXhlY3V0aW9uSWQsIHRlc3RDYXNlLCBwcm9qZWN0SWQsIHRyaWdnZXJlZEJ5LCBlbnZpcm9ubWVudCB9ID0gb3B0aW9ucztcclxuICAgIFxyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lTXMgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICBsZXQgc3RhdHVzOiBFeGVjdXRpb25TdGF0dXMgPSAncnVubmluZyc7XHJcbiAgICBsZXQgcmVzdWx0OiBFeGVjdXRpb25SZXN1bHQgfCB1bmRlZmluZWQ7XHJcbiAgICBsZXQgc3RlcFJlc3VsdHM6IFN0ZXBSZXN1bHRbXSA9IFtdO1xyXG4gICAgbGV0IHNjcmVlbnNob3RzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgbGV0IGVycm9yTWVzc2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgbGV0IGJyb3dzZXJWZXJzaW9uOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblxyXG4gICAgLy8gU2V0IGV4ZWN1dGlvbiBJRCBpbiBzdGVwIGV4ZWN1dG9yIGZvciBzY3JlZW5zaG90IG5hbWluZ1xyXG4gICAgc3RlcEV4ZWN1dG9yU2VydmljZS5zZXRFeGVjdXRpb25JZChleGVjdXRpb25JZCk7XHJcblxyXG4gICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgdGVzdCBjYXNlIHJlcXVpcmVzIGEgYnJvd3NlciAoaGFzIFVJIGFjdGlvbnMpXHJcbiAgICBjb25zdCByZXF1aXJlc0Jyb3dzZXIgPSB0ZXN0Q2FzZS5zdGVwcy5zb21lKHN0ZXAgPT5cclxuICAgICAgWyduYXZpZ2F0ZScsICdjbGljaycsICd0eXBlJywgJ2Fzc2VydCcsICd3YWl0J10uaW5jbHVkZXMoc3RlcC5hY3Rpb24pXHJcbiAgICApO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBTdGFydGluZyBleGVjdXRpb24gJHtleGVjdXRpb25JZH0gZm9yIHRlc3QgY2FzZSAke3Rlc3RDYXNlLnRlc3RDYXNlSWR9YCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBUZXN0IGNhc2UgaGFzICR7dGVzdENhc2Uuc3RlcHMubGVuZ3RofSBzdGVwc2ApO1xyXG5cclxuICAgICAgLy8gSW5pdGlhbGl6ZSBicm93c2VyIGlmIG5lZWRlZFxyXG4gICAgICBsZXQgYnJvd3NlclNlc3Npb24gPSBudWxsO1xyXG4gICAgICBpZiAocmVxdWlyZXNCcm93c2VyKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0luaXRpYWxpemluZyBicm93c2VyIGZvciBVSSB0ZXN0Li4uJyk7XHJcbiAgICAgICAgYnJvd3NlclNlc3Npb24gPSBhd2FpdCBicm93c2VyU2VydmljZS5pbml0aWFsaXplQnJvd3NlcigpO1xyXG4gICAgICAgIGJyb3dzZXJWZXJzaW9uID0gYXdhaXQgYnJvd3NlclNlcnZpY2UuZ2V0QnJvd3NlclZlcnNpb24oKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQnJvd3NlciBpbml0aWFsaXplZDogJHticm93c2VyVmVyc2lvbn1gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRXhlY3V0ZSBlYWNoIHN0ZXAgc2VxdWVudGlhbGx5XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGVzdENhc2Uuc3RlcHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBjb25zdCBzdGVwID0gdGVzdENhc2Uuc3RlcHNbaV07XHJcbiAgICAgICAgY29uc29sZS5sb2coYEV4ZWN1dGluZyBzdGVwICR7aSArIDF9LyR7dGVzdENhc2Uuc3RlcHMubGVuZ3RofTogJHtzdGVwLmFjdGlvbn1gKTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGNvbnN0IHN0ZXBSZXN1bHQgPSBhd2FpdCBzdGVwRXhlY3V0b3JTZXJ2aWNlLmV4ZWN1dGVTdGVwKFxyXG4gICAgICAgICAgICBicm93c2VyU2Vzc2lvbj8ucGFnZSB8fCBudWxsLFxyXG4gICAgICAgICAgICBzdGVwLFxyXG4gICAgICAgICAgICBpXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIHN0ZXBSZXN1bHRzLnB1c2goc3RlcFJlc3VsdCk7XHJcblxyXG4gICAgICAgICAgLy8gQ29sbGVjdCBzY3JlZW5zaG90IGlmIGNhcHR1cmVkXHJcbiAgICAgICAgICBpZiAoc3RlcFJlc3VsdC5zY3JlZW5zaG90KSB7XHJcbiAgICAgICAgICAgIHNjcmVlbnNob3RzLnB1c2goc3RlcFJlc3VsdC5zY3JlZW5zaG90KTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBJZiBzdGVwIGZhaWxlZCBvciBlcnJvcmVkLCBzdG9wIGV4ZWN1dGlvblxyXG4gICAgICAgICAgaWYgKHN0ZXBSZXN1bHQuc3RhdHVzID09PSAnZmFpbCcgfHwgc3RlcFJlc3VsdC5zdGF0dXMgPT09ICdlcnJvcicpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYFN0ZXAgJHtpICsgMX0gJHtzdGVwUmVzdWx0LnN0YXR1c30sIHN0b3BwaW5nIGV4ZWN1dGlvbmApO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhgU3RlcCAke2kgKyAxfSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5YCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgZXJyb3IgZHVyaW5nIHN0ZXAgZXhlY3V0aW9uXHJcbiAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihgVW5leHBlY3RlZCBlcnJvciBpbiBzdGVwICR7aSArIDF9OmAsIGVycm9yTXNnKTtcclxuXHJcbiAgICAgICAgICBzdGVwUmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgICAgc3RlcEluZGV4OiBpLFxyXG4gICAgICAgICAgICBhY3Rpb246IHN0ZXAuYWN0aW9uLFxyXG4gICAgICAgICAgICBzdGF0dXM6ICdlcnJvcicsXHJcbiAgICAgICAgICAgIGR1cmF0aW9uOiAwLFxyXG4gICAgICAgICAgICBlcnJvck1lc3NhZ2U6IGVycm9yTXNnLFxyXG4gICAgICAgICAgICBkZXRhaWxzOiB7fSxcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRGV0ZXJtaW5lIG92ZXJhbGwgcmVzdWx0IGJhc2VkIG9uIHN0ZXAgcmVzdWx0c1xyXG4gICAgICByZXN1bHQgPSB0aGlzLmRldGVybWluZUV4ZWN1dGlvblJlc3VsdChzdGVwUmVzdWx0cyk7XHJcbiAgICAgIHN0YXR1cyA9ICdjb21wbGV0ZWQnO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYEV4ZWN1dGlvbiBjb21wbGV0ZWQgd2l0aCByZXN1bHQ6ICR7cmVzdWx0fWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgLy8gVW5leHBlY3RlZCBlcnJvciBkdXJpbmcgZXhlY3V0aW9uIHNldHVwIG9yIHRlYXJkb3duXHJcbiAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0V4ZWN1dGlvbiBmYWlsZWQgd2l0aCBlcnJvcjonLCBlcnJvck1zZyk7XHJcblxyXG4gICAgICBzdGF0dXMgPSAnZXJyb3InO1xyXG4gICAgICByZXN1bHQgPSAnZXJyb3InO1xyXG4gICAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1zZztcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgIC8vIEFsd2F5cyBjbGVhbiB1cCBicm93c2VyIHJlc291cmNlc1xyXG4gICAgICBpZiAocmVxdWlyZXNCcm93c2VyICYmIGJyb3dzZXJTZXJ2aWNlLmhhc0FjdGl2ZVNlc3Npb24oKSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdDbGVhbmluZyB1cCBicm93c2VyIHJlc291cmNlcy4uLicpO1xyXG4gICAgICAgIGF3YWl0IGJyb3dzZXJTZXJ2aWNlLmZvcmNlQ2xlYW51cCgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZW5kVGltZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZU1zO1xyXG5cclxuICAgIC8vIEJ1aWxkIGV4ZWN1dGlvbiByZWNvcmRcclxuICAgIGNvbnN0IGV4ZWN1dGlvbjogVGVzdEV4ZWN1dGlvbiA9IHtcclxuICAgICAgZXhlY3V0aW9uSWQsXHJcbiAgICAgIHByb2plY3RJZCxcclxuICAgICAgdGVzdENhc2VJZDogdGVzdENhc2UudGVzdENhc2VJZCxcclxuICAgICAgdGVzdFN1aXRlSWQ6IHRlc3RDYXNlLnN1aXRlSWQsXHJcbiAgICAgIHN0YXR1cyxcclxuICAgICAgcmVzdWx0LFxyXG4gICAgICBzdGFydFRpbWUsXHJcbiAgICAgIGVuZFRpbWUsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICBzdGVwczogc3RlcFJlc3VsdHMsXHJcbiAgICAgIHNjcmVlbnNob3RzLFxyXG4gICAgICBlcnJvck1lc3NhZ2UsXHJcbiAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgdHJpZ2dlcmVkQnksXHJcbiAgICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICAgICAgYnJvd3NlclZlcnNpb24sXHJcbiAgICAgIH0sXHJcbiAgICAgIGNyZWF0ZWRBdDogc3RhcnRUaW1lLFxyXG4gICAgICB1cGRhdGVkQXQ6IGVuZFRpbWUsXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGV4ZWN1dGlvbixcclxuICAgICAgc3VjY2VzczogcmVzdWx0ID09PSAncGFzcycsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0ZXJtaW5lIHRoZSBvdmVyYWxsIGV4ZWN1dGlvbiByZXN1bHQgYmFzZWQgb24gc3RlcCByZXN1bHRzXHJcbiAgICogXHJcbiAgICogUnVsZXM6XHJcbiAgICogLSBJZiBhbGwgc3RlcHMgcGFzcyDihpIgcmVzdWx0IGlzICdwYXNzJ1xyXG4gICAqIC0gSWYgYW55IHN0ZXAgZmFpbHMg4oaSIHJlc3VsdCBpcyAnZmFpbCdcclxuICAgKiAtIElmIGFueSBzdGVwIGhhcyBlcnJvciDihpIgcmVzdWx0IGlzICdlcnJvcidcclxuICAgKi9cclxuICBwcml2YXRlIGRldGVybWluZUV4ZWN1dGlvblJlc3VsdChzdGVwUmVzdWx0czogU3RlcFJlc3VsdFtdKTogRXhlY3V0aW9uUmVzdWx0IHtcclxuICAgIGlmIChzdGVwUmVzdWx0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuICdlcnJvcic7IC8vIE5vIHN0ZXBzIGV4ZWN1dGVkXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZm9yIGVycm9ycyBmaXJzdCAoaGlnaGVzdCBwcmlvcml0eSlcclxuICAgIGNvbnN0IGhhc0Vycm9yID0gc3RlcFJlc3VsdHMuc29tZShzdGVwID0+IHN0ZXAuc3RhdHVzID09PSAnZXJyb3InKTtcclxuICAgIGlmIChoYXNFcnJvcikge1xyXG4gICAgICByZXR1cm4gJ2Vycm9yJztcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmb3IgZmFpbHVyZXNcclxuICAgIGNvbnN0IGhhc0ZhaWxlZCA9IHN0ZXBSZXN1bHRzLnNvbWUoc3RlcCA9PiBzdGVwLnN0YXR1cyA9PT0gJ2ZhaWwnKTtcclxuICAgIGlmIChoYXNGYWlsZWQpIHtcclxuICAgICAgcmV0dXJuICdmYWlsJztcclxuICAgIH1cclxuXHJcbiAgICAvLyBBbGwgc3RlcHMgcGFzc2VkXHJcbiAgICByZXR1cm4gJ3Bhc3MnO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgZXhlY3V0aW9uIHN0YXR1cyB0cmFuc2l0aW9uc1xyXG4gICAqIEVuc3VyZXMgc3RhdHVzIGZvbGxvd3MgdmFsaWQgc3RhdGUgbWFjaGluZTogcXVldWVkIOKGkiBydW5uaW5nIOKGkiBjb21wbGV0ZWQvZXJyb3JcclxuICAgKi9cclxuICBwdWJsaWMgaXNWYWxpZFN0YXR1c1RyYW5zaXRpb24oXHJcbiAgICBjdXJyZW50U3RhdHVzOiBFeGVjdXRpb25TdGF0dXMsXHJcbiAgICBuZXdTdGF0dXM6IEV4ZWN1dGlvblN0YXR1c1xyXG4gICk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgdmFsaWRUcmFuc2l0aW9uczogUmVjb3JkPEV4ZWN1dGlvblN0YXR1cywgRXhlY3V0aW9uU3RhdHVzW10+ID0ge1xyXG4gICAgICBxdWV1ZWQ6IFsncnVubmluZycsICdlcnJvciddLFxyXG4gICAgICBydW5uaW5nOiBbJ2NvbXBsZXRlZCcsICdlcnJvciddLFxyXG4gICAgICBjb21wbGV0ZWQ6IFtdLCAvLyBUZXJtaW5hbCBzdGF0ZVxyXG4gICAgICBlcnJvcjogW10sIC8vIFRlcm1pbmFsIHN0YXRlXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB2YWxpZFRyYW5zaXRpb25zW2N1cnJlbnRTdGF0dXNdPy5pbmNsdWRlcyhuZXdTdGF0dXMpIHx8IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgYSBzdGF0dXMgaXMgdGVybWluYWwgKG5vIGZ1cnRoZXIgdHJhbnNpdGlvbnMgYWxsb3dlZClcclxuICAgKi9cclxuICBwdWJsaWMgaXNUZXJtaW5hbFN0YXR1cyhzdGF0dXM6IEV4ZWN1dGlvblN0YXR1cyk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcgfHwgc3RhdHVzID09PSAnZXJyb3InO1xyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3QgdGVzdEV4ZWN1dG9yU2VydmljZSA9IG5ldyBUZXN0RXhlY3V0b3JTZXJ2aWNlKCk7XHJcbiJdfQ==
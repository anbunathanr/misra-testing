"use strict";
/**
 * Failure Detection Service
 *
 * Detects critical failure patterns and generates alerts:
 * - Suite failure rate > 50%
 * - 3 consecutive failures for a test case
 * - Generates critical alert notifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.failureDetectionService = exports.FailureDetectionService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class FailureDetectionService {
    docClient;
    tableName;
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        this.tableName = process.env.TEST_EXECUTIONS_TABLE || 'TestExecutions';
    }
    /**
     * Detect suite failure rate exceeding 50%
     *
     * @param suiteExecutionId - Suite execution ID to check
     * @returns Critical alert if failure rate > 50%, null otherwise
     */
    async detectSuiteFailureRate(suiteExecutionId) {
        try {
            // Query all test case executions for this suite execution
            const executions = await this.querySuiteExecutions(suiteExecutionId);
            if (executions.length === 0) {
                console.log('No executions found for suite', { suiteExecutionId });
                return null;
            }
            // Calculate failure rate
            const totalTests = executions.length;
            const failedTests = executions.filter(e => e.result === 'fail' || e.result === 'error').length;
            const failureRate = (failedTests / totalTests) * 100;
            console.log('Suite failure rate calculated', {
                suiteExecutionId,
                totalTests,
                failedTests,
                failureRate,
            });
            // Check if failure rate exceeds 50%
            if (failureRate > 50) {
                const affectedTests = executions
                    .filter(e => e.result === 'fail' || e.result === 'error')
                    .map(e => e.testCaseId || 'unknown')
                    .filter(id => id !== 'unknown');
                return {
                    alertType: 'suite_failure_threshold',
                    testSuiteId: executions[0]?.testSuiteId,
                    suiteExecutionId,
                    severity: 'critical',
                    reason: `Test suite failure rate (${failureRate.toFixed(1)}%) exceeds 50% threshold`,
                    details: {
                        failureRate: Math.round(failureRate * 100) / 100,
                        affectedTests,
                        lastFailure: executions[executions.length - 1]?.endTime || executions[executions.length - 1]?.createdAt,
                    },
                    timestamp: new Date().toISOString(),
                };
            }
            return null;
        }
        catch (error) {
            console.error('Error detecting suite failure rate', { suiteExecutionId, error });
            throw error;
        }
    }
    /**
     * Detect 3 consecutive failures for a test case
     *
     * @param testCaseId - Test case ID to check
     * @param limit - Number of recent executions to check (default: 3)
     * @returns Critical alert if 3 consecutive failures detected, null otherwise
     */
    async detectConsecutiveFailures(testCaseId, limit = 3) {
        try {
            // Query recent executions for this test case
            const executions = await this.queryTestCaseExecutions(testCaseId, limit);
            if (executions.length < 3) {
                console.log('Not enough executions to detect consecutive failures', {
                    testCaseId,
                    executionCount: executions.length,
                });
                return null;
            }
            // Check if last 3 executions are all failures
            const recentThree = executions.slice(0, 3);
            const allFailed = recentThree.every(e => e.result === 'fail' || e.result === 'error');
            console.log('Consecutive failure check', {
                testCaseId,
                recentThree: recentThree.map(e => ({ executionId: e.executionId, result: e.result })),
                allFailed,
            });
            if (allFailed) {
                const lastExecution = recentThree[0];
                return {
                    alertType: 'consecutive_failures',
                    testCaseId,
                    severity: 'critical',
                    reason: `Test case has failed 3 consecutive times`,
                    details: {
                        consecutiveFailures: 3,
                        lastFailure: lastExecution.endTime || lastExecution.createdAt,
                        errorMessage: lastExecution.errorMessage,
                    },
                    timestamp: new Date().toISOString(),
                };
            }
            return null;
        }
        catch (error) {
            console.error('Error detecting consecutive failures', { testCaseId, error });
            throw error;
        }
    }
    /**
     * Generate critical alert notification event
     *
     * @param alert - Critical alert data
     * @param projectId - Project ID for the alert
     * @param triggeredBy - User ID who triggered the test
     * @returns Notification event ready to be published
     */
    generateCriticalAlert(alert, projectId, triggeredBy) {
        const event = {
            eventType: 'critical_alert',
            eventId: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            timestamp: alert.timestamp,
            payload: {
                projectId,
                testCaseId: alert.testCaseId,
                testSuiteId: alert.testSuiteId,
                suiteExecutionId: alert.suiteExecutionId,
                status: 'error',
                result: 'error',
                errorMessage: alert.reason,
                alertType: alert.alertType,
                severity: alert.severity,
                details: alert.details,
                triggeredBy,
            },
        };
        console.log('Critical alert generated', {
            eventId: event.eventId,
            alertType: alert.alertType,
            testCaseId: alert.testCaseId,
            testSuiteId: alert.testSuiteId,
        });
        return event;
    }
    /**
     * Query suite executions from DynamoDB
     */
    async querySuiteExecutions(suiteExecutionId) {
        const executions = [];
        let lastEvaluatedKey;
        do {
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: 'SuiteExecutionIndex',
                KeyConditionExpression: 'suiteExecutionId = :suiteExecutionId',
                ExpressionAttributeValues: {
                    ':suiteExecutionId': suiteExecutionId,
                },
                ExclusiveStartKey: lastEvaluatedKey,
            });
            const response = await this.docClient.send(command);
            if (response.Items) {
                executions.push(...response.Items);
            }
            lastEvaluatedKey = response.LastEvaluatedKey;
        } while (lastEvaluatedKey);
        return executions;
    }
    /**
     * Query recent test case executions from DynamoDB
     */
    async queryTestCaseExecutions(testCaseId, limit) {
        const command = new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'TestCaseTimeIndex',
            KeyConditionExpression: 'testCaseId = :testCaseId',
            ExpressionAttributeValues: {
                ':testCaseId': testCaseId,
            },
            ScanIndexForward: false, // Sort descending (most recent first)
            Limit: limit,
        });
        const response = await this.docClient.send(command);
        return response.Items || [];
    }
}
exports.FailureDetectionService = FailureDetectionService;
// Export singleton instance
exports.failureDetectionService = new FailureDetectionService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFpbHVyZS1kZXRlY3Rpb24tc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZhaWx1cmUtZGV0ZWN0aW9uLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7O0dBT0c7OztBQUVILDhEQUEwRDtBQUMxRCx3REFBNkU7QUFvQjdFLE1BQWEsdUJBQXVCO0lBQzFCLFNBQVMsQ0FBeUI7SUFDbEMsU0FBUyxDQUFTO0lBRTFCO1FBQ0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO1lBQ2hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQWEsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsSUFBSSxnQkFBZ0IsQ0FBQztJQUN6RSxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsc0JBQXNCLENBQUMsZ0JBQXdCO1FBQ25ELElBQUksQ0FBQztZQUNILDBEQUEwRDtZQUMxRCxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRXJFLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsRUFBRSxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQztnQkFDbkUsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDO1lBRUQseUJBQXlCO1lBQ3pCLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFDckMsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FDbkMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFL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QVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFcEQsSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ25CLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBSSxRQUFRLENBQUMsS0FBeUIsQ0FBQyxDQUFDO1lBQzFELENBQUM7WUFFRCxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUM7UUFDL0MsQ0FBQyxRQUFRLGdCQUFnQixFQUFFO1FBRTNCLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxVQUFrQixFQUFFLEtBQWE7UUFDckUsTUFBTSxPQUFPLEdBQUcsSUFBSSwyQkFBWSxDQUFDO1lBQy9CLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixTQUFTLEVBQUUsbUJBQW1CO1lBQzlCLHNCQUFzQixFQUFFLDBCQUEwQjtZQUNsRCx5QkFBeUIsRUFBRTtnQkFDekIsYUFBYSxFQUFFLFVBQVU7YUFDMUI7WUFDRCxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsc0NBQXNDO1lBQy9ELEtBQUssRUFBRSxLQUFLO1NBQ2IsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVwRCxPQUFRLFFBQVEsQ0FBQyxLQUF5QixJQUFJLEVBQUUsQ0FBQztJQUNuRCxDQUFDO0NBQ0Y7QUE3TkQsMERBNk5DO0FBRUQsNEJBQTRCO0FBQ2YsUUFBQSx1QkFBdUIsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRmFpbHVyZSBEZXRlY3Rpb24gU2VydmljZVxyXG4gKiBcclxuICogRGV0ZWN0cyBjcml0aWNhbCBmYWlsdXJlIHBhdHRlcm5zIGFuZCBnZW5lcmF0ZXMgYWxlcnRzOlxyXG4gKiAtIFN1aXRlIGZhaWx1cmUgcmF0ZSA+IDUwJVxyXG4gKiAtIDMgY29uc2VjdXRpdmUgZmFpbHVyZXMgZm9yIGEgdGVzdCBjYXNlXHJcbiAqIC0gR2VuZXJhdGVzIGNyaXRpY2FsIGFsZXJ0IG5vdGlmaWNhdGlvbnNcclxuICovXHJcblxyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFRlc3RFeGVjdXRpb24gfSBmcm9tICcuLi90eXBlcy90ZXN0LWV4ZWN1dGlvbic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyaXRpY2FsQWxlcnQge1xyXG4gIGFsZXJ0VHlwZTogJ3N1aXRlX2ZhaWx1cmVfdGhyZXNob2xkJyB8ICdjb25zZWN1dGl2ZV9mYWlsdXJlcyc7XHJcbiAgdGVzdENhc2VJZD86IHN0cmluZztcclxuICB0ZXN0U3VpdGVJZD86IHN0cmluZztcclxuICBzdWl0ZUV4ZWN1dGlvbklkPzogc3RyaW5nO1xyXG4gIHNldmVyaXR5OiAnY3JpdGljYWwnO1xyXG4gIHJlYXNvbjogc3RyaW5nO1xyXG4gIGRldGFpbHM6IHtcclxuICAgIGZhaWx1cmVSYXRlPzogbnVtYmVyO1xyXG4gICAgY29uc2VjdXRpdmVGYWlsdXJlcz86IG51bWJlcjtcclxuICAgIGFmZmVjdGVkVGVzdHM/OiBzdHJpbmdbXTtcclxuICAgIGxhc3RGYWlsdXJlPzogc3RyaW5nO1xyXG4gICAgZXJyb3JNZXNzYWdlPzogc3RyaW5nO1xyXG4gIH07XHJcbiAgdGltZXN0YW1wOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGYWlsdXJlRGV0ZWN0aW9uU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQ7XHJcbiAgcHJpdmF0ZSB0YWJsZU5hbWU6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBjb25zdCBjbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICB9KTtcclxuICAgIHRoaXMuZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCBhcyBhbnkpO1xyXG4gICAgdGhpcy50YWJsZU5hbWUgPSBwcm9jZXNzLmVudi5URVNUX0VYRUNVVElPTlNfVEFCTEUgfHwgJ1Rlc3RFeGVjdXRpb25zJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERldGVjdCBzdWl0ZSBmYWlsdXJlIHJhdGUgZXhjZWVkaW5nIDUwJVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBzdWl0ZUV4ZWN1dGlvbklkIC0gU3VpdGUgZXhlY3V0aW9uIElEIHRvIGNoZWNrXHJcbiAgICogQHJldHVybnMgQ3JpdGljYWwgYWxlcnQgaWYgZmFpbHVyZSByYXRlID4gNTAlLCBudWxsIG90aGVyd2lzZVxyXG4gICAqL1xyXG4gIGFzeW5jIGRldGVjdFN1aXRlRmFpbHVyZVJhdGUoc3VpdGVFeGVjdXRpb25JZDogc3RyaW5nKTogUHJvbWlzZTxDcml0aWNhbEFsZXJ0IHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gUXVlcnkgYWxsIHRlc3QgY2FzZSBleGVjdXRpb25zIGZvciB0aGlzIHN1aXRlIGV4ZWN1dGlvblxyXG4gICAgICBjb25zdCBleGVjdXRpb25zID0gYXdhaXQgdGhpcy5xdWVyeVN1aXRlRXhlY3V0aW9ucyhzdWl0ZUV4ZWN1dGlvbklkKTtcclxuXHJcbiAgICAgIGlmIChleGVjdXRpb25zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdObyBleGVjdXRpb25zIGZvdW5kIGZvciBzdWl0ZScsIHsgc3VpdGVFeGVjdXRpb25JZCB9KTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2FsY3VsYXRlIGZhaWx1cmUgcmF0ZVxyXG4gICAgICBjb25zdCB0b3RhbFRlc3RzID0gZXhlY3V0aW9ucy5sZW5ndGg7XHJcbiAgICAgIGNvbnN0IGZhaWxlZFRlc3RzID0gZXhlY3V0aW9ucy5maWx0ZXIoXHJcbiAgICAgICAgZSA9PiBlLnJlc3VsdCA9PT0gJ2ZhaWwnIHx8IGUucmVzdWx0ID09PSAnZXJyb3InXHJcbiAgICAgICkubGVuZ3RoO1xyXG4gICAgICBjb25zdCBmYWlsdXJlUmF0ZSA9IChmYWlsZWRUZXN0cyAvIHRvdGFsVGVzdHMpICogMTAwO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coJ1N1aXRlIGZhaWx1cmUgcmF0ZSBjYWxjdWxhdGVkJywge1xyXG4gICAgICAgIHN1aXRlRXhlY3V0aW9uSWQsXHJcbiAgICAgICAgdG90YWxUZXN0cyxcclxuICAgICAgICBmYWlsZWRUZXN0cyxcclxuICAgICAgICBmYWlsdXJlUmF0ZSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBDaGVjayBpZiBmYWlsdXJlIHJhdGUgZXhjZWVkcyA1MCVcclxuICAgICAgaWYgKGZhaWx1cmVSYXRlID4gNTApIHtcclxuICAgICAgICBjb25zdCBhZmZlY3RlZFRlc3RzID0gZXhlY3V0aW9uc1xyXG4gICAgICAgICAgLmZpbHRlcihlID0+IGUucmVzdWx0ID09PSAnZmFpbCcgfHwgZS5yZXN1bHQgPT09ICdlcnJvcicpXHJcbiAgICAgICAgICAubWFwKGUgPT4gZS50ZXN0Q2FzZUlkIHx8ICd1bmtub3duJylcclxuICAgICAgICAgIC5maWx0ZXIoaWQgPT4gaWQgIT09ICd1bmtub3duJyk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBhbGVydFR5cGU6ICdzdWl0ZV9mYWlsdXJlX3RocmVzaG9sZCcsXHJcbiAgICAgICAgICB0ZXN0U3VpdGVJZDogZXhlY3V0aW9uc1swXT8udGVzdFN1aXRlSWQsXHJcbiAgICAgICAgICBzdWl0ZUV4ZWN1dGlvbklkLFxyXG4gICAgICAgICAgc2V2ZXJpdHk6ICdjcml0aWNhbCcsXHJcbiAgICAgICAgICByZWFzb246IGBUZXN0IHN1aXRlIGZhaWx1cmUgcmF0ZSAoJHtmYWlsdXJlUmF0ZS50b0ZpeGVkKDEpfSUpIGV4Y2VlZHMgNTAlIHRocmVzaG9sZGAsXHJcbiAgICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICAgIGZhaWx1cmVSYXRlOiBNYXRoLnJvdW5kKGZhaWx1cmVSYXRlICogMTAwKSAvIDEwMCxcclxuICAgICAgICAgICAgYWZmZWN0ZWRUZXN0cyxcclxuICAgICAgICAgICAgbGFzdEZhaWx1cmU6IGV4ZWN1dGlvbnNbZXhlY3V0aW9ucy5sZW5ndGggLSAxXT8uZW5kVGltZSB8fCBleGVjdXRpb25zW2V4ZWN1dGlvbnMubGVuZ3RoIC0gMV0/LmNyZWF0ZWRBdCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRldGVjdGluZyBzdWl0ZSBmYWlsdXJlIHJhdGUnLCB7IHN1aXRlRXhlY3V0aW9uSWQsIGVycm9yIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERldGVjdCAzIGNvbnNlY3V0aXZlIGZhaWx1cmVzIGZvciBhIHRlc3QgY2FzZVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB0ZXN0Q2FzZUlkIC0gVGVzdCBjYXNlIElEIHRvIGNoZWNrXHJcbiAgICogQHBhcmFtIGxpbWl0IC0gTnVtYmVyIG9mIHJlY2VudCBleGVjdXRpb25zIHRvIGNoZWNrIChkZWZhdWx0OiAzKVxyXG4gICAqIEByZXR1cm5zIENyaXRpY2FsIGFsZXJ0IGlmIDMgY29uc2VjdXRpdmUgZmFpbHVyZXMgZGV0ZWN0ZWQsIG51bGwgb3RoZXJ3aXNlXHJcbiAgICovXHJcbiAgYXN5bmMgZGV0ZWN0Q29uc2VjdXRpdmVGYWlsdXJlcyh0ZXN0Q2FzZUlkOiBzdHJpbmcsIGxpbWl0OiBudW1iZXIgPSAzKTogUHJvbWlzZTxDcml0aWNhbEFsZXJ0IHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gUXVlcnkgcmVjZW50IGV4ZWN1dGlvbnMgZm9yIHRoaXMgdGVzdCBjYXNlXHJcbiAgICAgIGNvbnN0IGV4ZWN1dGlvbnMgPSBhd2FpdCB0aGlzLnF1ZXJ5VGVzdENhc2VFeGVjdXRpb25zKHRlc3RDYXNlSWQsIGxpbWl0KTtcclxuXHJcbiAgICAgIGlmIChleGVjdXRpb25zLmxlbmd0aCA8IDMpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnTm90IGVub3VnaCBleGVjdXRpb25zIHRvIGRldGVjdCBjb25zZWN1dGl2ZSBmYWlsdXJlcycsIHtcclxuICAgICAgICAgIHRlc3RDYXNlSWQsXHJcbiAgICAgICAgICBleGVjdXRpb25Db3VudDogZXhlY3V0aW9ucy5sZW5ndGgsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIGxhc3QgMyBleGVjdXRpb25zIGFyZSBhbGwgZmFpbHVyZXNcclxuICAgICAgY29uc3QgcmVjZW50VGhyZWUgPSBleGVjdXRpb25zLnNsaWNlKDAsIDMpO1xyXG4gICAgICBjb25zdCBhbGxGYWlsZWQgPSByZWNlbnRUaHJlZS5ldmVyeShlID0+IGUucmVzdWx0ID09PSAnZmFpbCcgfHwgZS5yZXN1bHQgPT09ICdlcnJvcicpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coJ0NvbnNlY3V0aXZlIGZhaWx1cmUgY2hlY2snLCB7XHJcbiAgICAgICAgdGVzdENhc2VJZCxcclxuICAgICAgICByZWNlbnRUaHJlZTogcmVjZW50VGhyZWUubWFwKGUgPT4gKHsgZXhlY3V0aW9uSWQ6IGUuZXhlY3V0aW9uSWQsIHJlc3VsdDogZS5yZXN1bHQgfSkpLFxyXG4gICAgICAgIGFsbEZhaWxlZCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoYWxsRmFpbGVkKSB7XHJcbiAgICAgICAgY29uc3QgbGFzdEV4ZWN1dGlvbiA9IHJlY2VudFRocmVlWzBdO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgYWxlcnRUeXBlOiAnY29uc2VjdXRpdmVfZmFpbHVyZXMnLFxyXG4gICAgICAgICAgdGVzdENhc2VJZCxcclxuICAgICAgICAgIHNldmVyaXR5OiAnY3JpdGljYWwnLFxyXG4gICAgICAgICAgcmVhc29uOiBgVGVzdCBjYXNlIGhhcyBmYWlsZWQgMyBjb25zZWN1dGl2ZSB0aW1lc2AsXHJcbiAgICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICAgIGNvbnNlY3V0aXZlRmFpbHVyZXM6IDMsXHJcbiAgICAgICAgICAgIGxhc3RGYWlsdXJlOiBsYXN0RXhlY3V0aW9uLmVuZFRpbWUgfHwgbGFzdEV4ZWN1dGlvbi5jcmVhdGVkQXQsXHJcbiAgICAgICAgICAgIGVycm9yTWVzc2FnZTogbGFzdEV4ZWN1dGlvbi5lcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkZXRlY3RpbmcgY29uc2VjdXRpdmUgZmFpbHVyZXMnLCB7IHRlc3RDYXNlSWQsIGVycm9yIH0pO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGNyaXRpY2FsIGFsZXJ0IG5vdGlmaWNhdGlvbiBldmVudFxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBhbGVydCAtIENyaXRpY2FsIGFsZXJ0IGRhdGFcclxuICAgKiBAcGFyYW0gcHJvamVjdElkIC0gUHJvamVjdCBJRCBmb3IgdGhlIGFsZXJ0XHJcbiAgICogQHBhcmFtIHRyaWdnZXJlZEJ5IC0gVXNlciBJRCB3aG8gdHJpZ2dlcmVkIHRoZSB0ZXN0XHJcbiAgICogQHJldHVybnMgTm90aWZpY2F0aW9uIGV2ZW50IHJlYWR5IHRvIGJlIHB1Ymxpc2hlZFxyXG4gICAqL1xyXG4gIGdlbmVyYXRlQ3JpdGljYWxBbGVydChcclxuICAgIGFsZXJ0OiBDcml0aWNhbEFsZXJ0LFxyXG4gICAgcHJvamVjdElkOiBzdHJpbmcsXHJcbiAgICB0cmlnZ2VyZWRCeTogc3RyaW5nXHJcbiAgKToge1xyXG4gICAgZXZlbnRUeXBlOiAnY3JpdGljYWxfYWxlcnQnO1xyXG4gICAgZXZlbnRJZDogc3RyaW5nO1xyXG4gICAgdGltZXN0YW1wOiBzdHJpbmc7XHJcbiAgICBwYXlsb2FkOiBhbnk7XHJcbiAgfSB7XHJcbiAgICBjb25zdCBldmVudCA9IHtcclxuICAgICAgZXZlbnRUeXBlOiAnY3JpdGljYWxfYWxlcnQnIGFzIGNvbnN0LFxyXG4gICAgICBldmVudElkOiBgYWxlcnQtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KX1gLFxyXG4gICAgICB0aW1lc3RhbXA6IGFsZXJ0LnRpbWVzdGFtcCxcclxuICAgICAgcGF5bG9hZDoge1xyXG4gICAgICAgIHByb2plY3RJZCxcclxuICAgICAgICB0ZXN0Q2FzZUlkOiBhbGVydC50ZXN0Q2FzZUlkLFxyXG4gICAgICAgIHRlc3RTdWl0ZUlkOiBhbGVydC50ZXN0U3VpdGVJZCxcclxuICAgICAgICBzdWl0ZUV4ZWN1dGlvbklkOiBhbGVydC5zdWl0ZUV4ZWN1dGlvbklkLFxyXG4gICAgICAgIHN0YXR1czogJ2Vycm9yJyxcclxuICAgICAgICByZXN1bHQ6ICdlcnJvcicsXHJcbiAgICAgICAgZXJyb3JNZXNzYWdlOiBhbGVydC5yZWFzb24sXHJcbiAgICAgICAgYWxlcnRUeXBlOiBhbGVydC5hbGVydFR5cGUsXHJcbiAgICAgICAgc2V2ZXJpdHk6IGFsZXJ0LnNldmVyaXR5LFxyXG4gICAgICAgIGRldGFpbHM6IGFsZXJ0LmRldGFpbHMsXHJcbiAgICAgICAgdHJpZ2dlcmVkQnksXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCdDcml0aWNhbCBhbGVydCBnZW5lcmF0ZWQnLCB7XHJcbiAgICAgIGV2ZW50SWQ6IGV2ZW50LmV2ZW50SWQsXHJcbiAgICAgIGFsZXJ0VHlwZTogYWxlcnQuYWxlcnRUeXBlLFxyXG4gICAgICB0ZXN0Q2FzZUlkOiBhbGVydC50ZXN0Q2FzZUlkLFxyXG4gICAgICB0ZXN0U3VpdGVJZDogYWxlcnQudGVzdFN1aXRlSWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXZlbnQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBRdWVyeSBzdWl0ZSBleGVjdXRpb25zIGZyb20gRHluYW1vREJcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHF1ZXJ5U3VpdGVFeGVjdXRpb25zKHN1aXRlRXhlY3V0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8VGVzdEV4ZWN1dGlvbltdPiB7XHJcbiAgICBjb25zdCBleGVjdXRpb25zOiBUZXN0RXhlY3V0aW9uW10gPSBbXTtcclxuICAgIGxldCBsYXN0RXZhbHVhdGVkS2V5OiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHwgdW5kZWZpbmVkO1xyXG5cclxuICAgIGRvIHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnU3VpdGVFeGVjdXRpb25JbmRleCcsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3N1aXRlRXhlY3V0aW9uSWQgPSA6c3VpdGVFeGVjdXRpb25JZCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpzdWl0ZUV4ZWN1dGlvbklkJzogc3VpdGVFeGVjdXRpb25JZCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIEV4Y2x1c2l2ZVN0YXJ0S2V5OiBsYXN0RXZhbHVhdGVkS2V5LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAgIGlmIChyZXNwb25zZS5JdGVtcykge1xyXG4gICAgICAgIGV4ZWN1dGlvbnMucHVzaCguLi4ocmVzcG9uc2UuSXRlbXMgYXMgVGVzdEV4ZWN1dGlvbltdKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxhc3RFdmFsdWF0ZWRLZXkgPSByZXNwb25zZS5MYXN0RXZhbHVhdGVkS2V5O1xyXG4gICAgfSB3aGlsZSAobGFzdEV2YWx1YXRlZEtleSk7XHJcblxyXG4gICAgcmV0dXJuIGV4ZWN1dGlvbnM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBRdWVyeSByZWNlbnQgdGVzdCBjYXNlIGV4ZWN1dGlvbnMgZnJvbSBEeW5hbW9EQlxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgcXVlcnlUZXN0Q2FzZUV4ZWN1dGlvbnModGVzdENhc2VJZDogc3RyaW5nLCBsaW1pdDogbnVtYmVyKTogUHJvbWlzZTxUZXN0RXhlY3V0aW9uW10+IHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgSW5kZXhOYW1lOiAnVGVzdENhc2VUaW1lSW5kZXgnLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndGVzdENhc2VJZCA9IDp0ZXN0Q2FzZUlkJyxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICc6dGVzdENhc2VJZCc6IHRlc3RDYXNlSWQsXHJcbiAgICAgIH0sXHJcbiAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLCAvLyBTb3J0IGRlc2NlbmRpbmcgKG1vc3QgcmVjZW50IGZpcnN0KVxyXG4gICAgICBMaW1pdDogbGltaXQsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgcmV0dXJuIChyZXNwb25zZS5JdGVtcyBhcyBUZXN0RXhlY3V0aW9uW10pIHx8IFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3QgZmFpbHVyZURldGVjdGlvblNlcnZpY2UgPSBuZXcgRmFpbHVyZURldGVjdGlvblNlcnZpY2UoKTtcclxuIl19
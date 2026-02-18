/**
 * Failure Detection Service
 *
 * Detects critical failure patterns and generates alerts:
 * - Suite failure rate > 50%
 * - 3 consecutive failures for a test case
 * - Generates critical alert notifications
 */
export interface CriticalAlert {
    alertType: 'suite_failure_threshold' | 'consecutive_failures';
    testCaseId?: string;
    testSuiteId?: string;
    suiteExecutionId?: string;
    severity: 'critical';
    reason: string;
    details: {
        failureRate?: number;
        consecutiveFailures?: number;
        affectedTests?: string[];
        lastFailure?: string;
        errorMessage?: string;
    };
    timestamp: string;
}
export declare class FailureDetectionService {
    private docClient;
    private tableName;
    constructor();
    /**
     * Detect suite failure rate exceeding 50%
     *
     * @param suiteExecutionId - Suite execution ID to check
     * @returns Critical alert if failure rate > 50%, null otherwise
     */
    detectSuiteFailureRate(suiteExecutionId: string): Promise<CriticalAlert | null>;
    /**
     * Detect 3 consecutive failures for a test case
     *
     * @param testCaseId - Test case ID to check
     * @param limit - Number of recent executions to check (default: 3)
     * @returns Critical alert if 3 consecutive failures detected, null otherwise
     */
    detectConsecutiveFailures(testCaseId: string, limit?: number): Promise<CriticalAlert | null>;
    /**
     * Generate critical alert notification event
     *
     * @param alert - Critical alert data
     * @param projectId - Project ID for the alert
     * @param triggeredBy - User ID who triggered the test
     * @returns Notification event ready to be published
     */
    generateCriticalAlert(alert: CriticalAlert, projectId: string, triggeredBy: string): {
        eventType: 'critical_alert';
        eventId: string;
        timestamp: string;
        payload: any;
    };
    /**
     * Query suite executions from DynamoDB
     */
    private querySuiteExecutions;
    /**
     * Query recent test case executions from DynamoDB
     */
    private queryTestCaseExecutions;
}
export declare const failureDetectionService: FailureDetectionService;

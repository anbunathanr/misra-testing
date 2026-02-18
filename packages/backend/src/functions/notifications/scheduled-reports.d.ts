/**
 * Scheduled Reports Lambda
 *
 * Generates and sends scheduled summary reports (daily, weekly, monthly).
 * Triggered by EventBridge cron rules.
 */
import { Handler, ScheduledEvent } from 'aws-lambda';
interface ReportResult {
    success: boolean;
    reportType: string;
    period: {
        startDate: string;
        endDate: string;
    };
    executionsProcessed: number;
    errorMessage?: string;
}
/**
 * Lambda handler for generating scheduled reports
 */
export declare const handler: Handler<ScheduledEvent, ReportResult>;
export {};

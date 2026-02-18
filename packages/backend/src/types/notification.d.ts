/**
 * Notification System Types
 *
 * Core type definitions for the notification system including events,
 * preferences, templates, history, and delivery options.
 */
import { ExecutionStatus, ExecutionResult } from './test-execution';
export type NotificationEventType = 'test_completion' | 'test_failure' | 'critical_alert' | 'summary_report';
export interface NotificationEvent {
    eventType: NotificationEventType;
    eventId: string;
    timestamp: string;
    payload: NotificationEventPayload;
}
export interface NotificationEventPayload {
    executionId?: string;
    testCaseId?: string;
    testSuiteId?: string;
    projectId: string;
    status?: ExecutionStatus;
    result?: ExecutionResult;
    duration?: number;
    errorMessage?: string;
    screenshots?: string[];
    triggeredBy: string;
    reportData?: SummaryReportData;
}
export interface SummaryReportData {
    reportType: 'daily' | 'weekly' | 'monthly';
    period: {
        startDate: string;
        endDate: string;
    };
    stats: {
        totalExecutions: number;
        passRate: number;
        failRate: number;
        errorRate: number;
        averageDuration: number;
    };
    topFailingTests: Array<{
        testCaseId: string;
        testName: string;
        failureCount: number;
        lastFailure: string;
    }>;
    trends: {
        executionChange: number;
        passRateChange: number;
    };
}
export type NotificationChannel = 'email' | 'sms' | 'slack' | 'webhook';
export interface NotificationPreferences {
    userId: string;
    preferences: {
        testCompletion: EventPreference;
        testFailure: EventPreference;
        criticalAlert: EventPreference;
        summaryReport: SummaryReportPreference;
    };
    quietHours?: QuietHoursConfig;
    frequencyLimit?: FrequencyLimitConfig;
    slackWebhooks?: SlackWebhookConfig[];
    createdAt: string;
    updatedAt: string;
}
export interface EventPreference {
    enabled: boolean;
    channels: NotificationChannel[];
}
export interface SummaryReportPreference extends EventPreference {
    frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
}
export interface QuietHoursConfig {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
}
export interface FrequencyLimitConfig {
    enabled: boolean;
    maxPerHour: number;
}
export interface SlackWebhookConfig {
    webhookUrl: string;
    channel: string;
    eventTypes: string[];
}
export type TemplateFormat = 'html' | 'text' | 'slack_blocks';
export interface NotificationTemplate {
    templateId: string;
    eventType: string;
    channel: NotificationChannel;
    format: TemplateFormat;
    subject?: string;
    body: string;
    variables: string[];
    createdAt: string;
    updatedAt: string;
}
export interface TemplateRenderContext {
    testName?: string;
    testCaseId?: string;
    executionId?: string;
    status?: string;
    result?: string;
    duration?: string;
    timestamp?: string;
    errorMessage?: string;
    screenshotUrls?: string[];
    userName?: string;
    projectName?: string;
    reportData?: SummaryReportData;
}
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type DeliveryMethod = 'sns' | 'n8n' | 'fallback';
export interface NotificationHistoryRecord {
    notificationId: string;
    userId: string;
    eventType: string;
    eventId: string;
    channel: NotificationChannel;
    deliveryMethod: DeliveryMethod;
    deliveryStatus: DeliveryStatus;
    recipient: string;
    messageId?: string;
    errorMessage?: string;
    retryCount: number;
    sentAt: string;
    deliveredAt?: string;
    metadata: {
        executionId?: string;
        testCaseId?: string;
        projectId?: string;
    };
    ttl?: number;
}
export interface SNSDeliveryOptions {
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    message: string;
    messageAttributes?: Record<string, string>;
}
export interface SNSDeliveryResult {
    messageId: string;
    channel: NotificationChannel;
    status: 'sent' | 'failed';
    errorMessage?: string;
}
export interface N8NWebhookPayload {
    eventType: string;
    eventId: string;
    timestamp: string;
    data: object;
    metadata: {
        source: 'aibts';
        version: string;
    };
}
export interface N8NDeliveryResult {
    success: boolean;
    statusCode?: number;
    responseBody?: string;
    errorMessage?: string;
    duration: number;
}
export interface SlackBlock {
    type: string;
    text?: {
        type: string;
        text: string;
    };
    elements?: Array<{
        type: string;
        text?: string;
        url?: string;
        value?: string;
    }>;
}
export interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}
export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attemptCount: number;
}
export interface ProcessorResult {
    notificationId: string;
    status: 'sent' | 'failed' | 'filtered';
    deliveryChannel?: string;
    deliveryMethod: DeliveryMethod;
    errorMessage?: string;
}
export interface NotificationHistoryQuery {
    userId?: string;
    startDate?: string;
    endDate?: string;
    eventType?: string;
    channel?: NotificationChannel;
    deliveryStatus?: DeliveryStatus;
    limit?: number;
    nextToken?: string;
}
export interface PaginatedNotificationHistory {
    records: NotificationHistoryRecord[];
    nextToken?: string;
}

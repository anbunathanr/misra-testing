/**
 * Notification System Types
 * 
 * Core type definitions for the notification system including events,
 * preferences, templates, history, and delivery options.
 */

import { ExecutionStatus, ExecutionResult } from './test-execution';

// ============================================================================
// Notification Events
// ============================================================================

export type NotificationEventType = 
  | 'test_completion' 
  | 'test_failure' 
  | 'critical_alert' 
  | 'summary_report';

export interface NotificationEvent {
  eventType: NotificationEventType;
  eventId: string;
  timestamp: string;
  payload: NotificationEventPayload;
}

export interface NotificationEventPayload {
  // Test execution fields
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
  
  // Summary report fields
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
    executionChange: number; // Percentage change from previous period
    passRateChange: number;
  };
}

// ============================================================================
// Notification Channels
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'slack' | 'webhook';

// ============================================================================
// Notification Preferences
// ============================================================================

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
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string; // IANA timezone
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

// ============================================================================
// Notification Templates
// ============================================================================

export type TemplateFormat = 'html' | 'text' | 'slack_blocks';

export interface NotificationTemplate {
  templateId: string;
  eventType: string;
  channel: NotificationChannel;
  format: TemplateFormat;
  subject?: string; // For email
  body: string; // Template with {{variable}} placeholders
  variables: string[]; // List of required variables
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
  // For summary reports
  reportData?: SummaryReportData;
}

// ============================================================================
// Notification History
// ============================================================================

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type DeliveryMethod = 'sns' | 'n8n' | 'fallback';

export interface NotificationHistoryRecord {
  notificationId: string; // Partition key: UUID
  userId: string; // GSI partition key
  eventType: string;
  eventId: string;
  channel: NotificationChannel;
  deliveryMethod: DeliveryMethod;
  deliveryStatus: DeliveryStatus;
  recipient: string; // Email, phone, or webhook URL
  messageId?: string; // SNS message ID
  errorMessage?: string;
  retryCount: number;
  sentAt: string; // ISO timestamp, GSI sort key
  deliveredAt?: string; // ISO timestamp
  metadata: {
    executionId?: string;
    testCaseId?: string;
    projectId?: string;
  };
  ttl?: number; // Unix timestamp for automatic deletion after 90 days
}

// ============================================================================
// SNS Delivery
// ============================================================================

export interface SNSDeliveryOptions {
  channel: NotificationChannel;
  recipient: string; // Email address, phone number, or webhook URL
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

// ============================================================================
// n8n Integration
// ============================================================================

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

// ============================================================================
// Slack Integration
// ============================================================================

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

// ============================================================================
// Retry Configuration
// ============================================================================

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

// ============================================================================
// Notification Processing
// ============================================================================

export interface ProcessorResult {
  notificationId: string;
  status: 'sent' | 'failed' | 'filtered';
  deliveryChannel?: string;
  deliveryMethod: DeliveryMethod;
  errorMessage?: string;
}

// ============================================================================
// Query and Pagination
// ============================================================================

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

/**
 * Default Notification Templates
 *
 * Provides default templates for email, SMS, and Slack notifications.
 * These templates are seeded into DynamoDB during deployment or first run.
 */
import { NotificationTemplate } from '../types/notification';
export declare const defaultTemplates: Omit<NotificationTemplate, 'templateId' | 'createdAt' | 'updatedAt'>[];

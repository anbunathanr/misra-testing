/**
 * Lambda function for sending notifications
 * Handles analysis completion, failures, and system alerts
 */
import { NotificationType } from '../../services/notification-service';
interface NotificationEvent {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    email?: string;
    phoneNumber?: string;
}
export declare const handler: (event: NotificationEvent) => Promise<{
    statusCode: number;
    message: string;
    messageId: string | undefined;
    error?: undefined;
} | {
    statusCode: number;
    message: string;
    error: string | undefined;
    messageId?: undefined;
}>;
export {};

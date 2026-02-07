/**
 * Lambda function for sending notifications
 * Handles analysis completion, failures, and system alerts
 */

import { NotificationService, NotificationType } from '../../services/notification-service';

const region = process.env.AWS_REGION || 'us-east-1';
const notificationService = new NotificationService(region);

interface NotificationEvent {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  email?: string;
  phoneNumber?: string;
}

export const handler = async (event: NotificationEvent) => {
  console.log('Notification event received:', JSON.stringify(event, null, 2));

  try {
    const result = await notificationService.sendNotification({
      userId: event.userId,
      type: event.type,
      title: event.title,
      message: event.message,
      data: event.data,
      email: event.email,
      phoneNumber: event.phoneNumber
    });

    if (result.success) {
      console.log(`Notification sent successfully. Message ID: ${result.messageId}`);
      return {
        statusCode: 200,
        message: 'Notification sent successfully',
        messageId: result.messageId
      };
    } else {
      console.error(`Notification failed: ${result.error}`);
      return {
        statusCode: 500,
        message: 'Notification failed',
        error: result.error
      };
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return {
      statusCode: 500,
      message: 'Failed to send notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

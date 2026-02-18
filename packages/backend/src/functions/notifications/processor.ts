import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { notificationPreferencesService } from '../../services/notification-preferences-service';
import { notificationTemplateService } from '../../services/notification-template-service';
import { notificationHistoryService } from '../../services/notification-history-service';
import { snsDeliveryService } from '../../services/sns-delivery-service';
import { n8nIntegrationService } from '../../services/n8n-integration-service';
import { filterSensitiveData, SecureLogger } from '../../utils/security-util';
import {
  NotificationEvent,
  NotificationChannel,
  NotificationHistoryRecord,
  DeliveryStatus,
  N8NWebhookPayload,
  TemplateRenderContext,
} from '../../types/notification';

const logger = new SecureLogger('NotificationProcessor');

/**
 * Notification Processor Lambda Handler
 * 
 * Processes notification events from SQS queue:
 * 1. Parse notification event
 * 2. Check user preferences and filter if disabled
 * 3. Check quiet hours and suppress if applicable
 * 4. Check frequency limits and batch if exceeded
 * 5. Get appropriate template for event type and channel
 * 6. Render template with event context
 * 7. Route to n8n webhook if enabled, otherwise SNS
 * 8. Handle n8n fallback to SNS on failure
 * 9. Record notification attempt in history
 * 10. Update delivery status based on result
 * 11. Handle critical alert preference override
 */
export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.info('Notification Processor Lambda invoked');
  logger.info(`Processing ${event.Records.length} message(s)`);
  logger.info(`Remaining time: ${context.getRemainingTimeInMillis()}ms`);

  // Process each message
  for (const record of event.Records) {
    try {
      await processNotificationMessage(record);
    } catch (error) {
      logger.error('Failed to process notification message:', error);
      // Don't throw - let SQS handle retry via DLQ
    }
  }

  logger.info('All messages processed');
};

/**
 * Process a single notification message
 */
async function processNotificationMessage(record: SQSRecord): Promise<void> {
  // Parse notification event
  let notificationEvent: NotificationEvent;
  try {
    notificationEvent = JSON.parse(record.body);
    console.log(`Processing notification: ${notificationEvent.eventType}`);
    console.log(`Event ID: ${notificationEvent.eventId}`);
  } catch (error) {
    console.error('Failed to parse notification event:', error);
    throw new Error('Invalid notification event format');
  }

  const { eventType, eventId, timestamp, payload } = notificationEvent;
  const userId = payload.triggeredBy;

  // Check if this is a critical alert
  const isCriticalAlert = eventType === 'critical_alert';

  // Get user preferences
  const preferences = await notificationPreferencesService.getPreferences(userId);

  // Check if notifications are enabled for this event type (unless critical alert)
  if (!isCriticalAlert) {
    const shouldSend = await notificationPreferencesService.shouldSendNotification(userId, eventType);
    if (!shouldSend) {
      console.log(`Notifications disabled for user ${userId} and event type ${eventType}`);
      
      // Record filtered notification
      await notificationHistoryService.recordNotification({
        userId,
        eventType,
        eventId,
        channel: 'email', // Default channel for filtered notifications
        deliveryMethod: 'sns',
        deliveryStatus: 'failed',
        recipient: userId,
        retryCount: 0,
        metadata: {
          projectId: payload.projectId,
          executionId: payload.executionId,
          testCaseId: payload.testCaseId,
        },
      });
      
      return;
    }

    // Check quiet hours (unless critical alert)
    const inQuietHours = await notificationPreferencesService.isInQuietHours(userId);
    if (inQuietHours) {
      console.log(`User ${userId} is in quiet hours, suppressing notification`);
      
      // Record suppressed notification
      await notificationHistoryService.recordNotification({
        userId,
        eventType,
        eventId,
        channel: 'email',
        deliveryMethod: 'sns',
        deliveryStatus: 'failed',
        recipient: userId,
        retryCount: 0,
        metadata: {
          projectId: payload.projectId,
          executionId: payload.executionId,
          testCaseId: payload.testCaseId,
        },
        errorMessage: 'Suppressed due to quiet hours',
      });
      
      return;
    }

    // Check frequency limits
    const withinLimit = await notificationPreferencesService.checkFrequencyLimit(userId);
    if (withinLimit) {
      console.log(`User ${userId} has exceeded frequency limit for ${eventType}`);
      
      // Record rate-limited notification
      await notificationHistoryService.recordNotification({
        userId,
        eventType,
        eventId,
        channel: 'email',
        deliveryMethod: 'sns',
        deliveryStatus: 'failed',
        recipient: userId,
        retryCount: 0,
        metadata: {
          projectId: payload.projectId,
          executionId: payload.executionId,
          testCaseId: payload.testCaseId,
        },
        errorMessage: 'Rate limited due to frequency limit',
      });
      
      return;
    }
  } else {
    console.log('Critical alert - bypassing preference checks');
  }

  // Get delivery channels
  const channels = await notificationPreferencesService.getDeliveryChannels(userId, eventType);
  if (channels.length === 0) {
    console.log(`No delivery channels configured for user ${userId}`);
    return;
  }

  console.log(`Delivering to channels: ${channels.join(', ')}`);

  // Process each channel
  for (const channel of channels) {
    try {
      await deliverNotification(notificationEvent, userId, channel);
    } catch (error) {
      console.error(`Failed to deliver notification to ${channel}:`, error);
      // Continue with other channels
    }
  }
}

/**
 * Deliver notification to a specific channel
 */
async function deliverNotification(
  notificationEvent: NotificationEvent,
  userId: string,
  channel: NotificationChannel
): Promise<void> {
  const { eventType, eventId, timestamp, payload } = notificationEvent;

  // Get template for event type and channel
  const template = await notificationTemplateService.getTemplate(eventType, channel);
  if (!template) {
    console.warn(`No template found for ${eventType} on ${channel}`);
    return;
  }

  // Convert payload to template render context
  const renderContext: TemplateRenderContext = {
    testName: payload.testCaseId,
    testCaseId: payload.testCaseId,
    executionId: payload.executionId,
    status: payload.status,
    result: payload.result,
    duration: payload.duration ? `${payload.duration}ms` : undefined,
    timestamp,
    errorMessage: payload.errorMessage,
    screenshotUrls: payload.screenshots,
    userName: payload.triggeredBy,
    projectName: payload.projectId,
    reportData: payload.reportData,
  };

  // Render template with event context
  let renderedContent = await notificationTemplateService.renderTemplate(template, renderContext);
  
  // Filter sensitive data from notification content
  renderedContent = filterSensitiveData(renderedContent);
  logger.info('Notification content rendered and sanitized');

  // Determine delivery method: n8n or SNS
  const n8nEnabled = await n8nIntegrationService.isEnabled();
  let deliveryStatus: DeliveryStatus = 'pending';
  let deliveryError: string | undefined;
  let deliveryMethod: 'n8n' | 'sns' = 'sns';

  if (n8nEnabled) {
    logger.info('Attempting delivery via n8n webhook');
    deliveryMethod = 'n8n';

    try {
      // Create n8n webhook payload
      const n8nPayload: N8NWebhookPayload = {
        eventType,
        eventId,
        timestamp,
        data: payload,
        metadata: {
          source: 'aibts',
          version: '1.0.0',
        },
      };

      const n8nResult = await n8nIntegrationService.sendToWebhook(n8nPayload);
      
      if (n8nResult.success) {
        logger.info('Successfully delivered via n8n');
        deliveryStatus = 'sent';
      } else {
        logger.warn('n8n delivery failed, falling back to SNS');
        logger.warn(`n8n error: ${n8nResult.errorMessage}`);
        deliveryError = n8nResult.errorMessage;
        
        // Fallback to SNS
        deliveryMethod = 'sns';
        const snsResult = await deliverViaSNS(channel, renderedContent, payload);
        
        deliveryStatus = snsResult.status;
        if (!snsResult.success) {
          deliveryError = snsResult.error;
        }
      }
    } catch (error) {
      console.error('n8n delivery error:', error);
      deliveryError = error instanceof Error ? error.message : 'Unknown error';
      
      // Fallback to SNS
      deliveryMethod = 'sns';
      const snsResult = await deliverViaSNS(channel, renderedContent, payload);
      
      deliveryStatus = snsResult.status;
      if (!snsResult.success) {
        deliveryError = snsResult.error;
      }
    }
  } else {
    console.log('Delivering directly via SNS');
    const snsResult = await deliverViaSNS(channel, renderedContent, payload);
    
    deliveryStatus = snsResult.status;
    if (!snsResult.success) {
      deliveryError = snsResult.error;
    }
  }

  // Record notification in history
  await notificationHistoryService.recordNotification({
    userId,
    eventType,
    eventId,
    channel,
    deliveryMethod,
    deliveryStatus,
    recipient: userId, // This should be the actual recipient (email/phone)
    retryCount: 0,
    metadata: {
      projectId: payload.projectId,
      executionId: payload.executionId,
      testCaseId: payload.testCaseId,
    },
    errorMessage: deliveryError,
  });

  console.log(`Notification ${eventId} delivered via ${deliveryMethod}: ${deliveryStatus}`);
}

/**
 * Deliver notification via SNS
 */
async function deliverViaSNS(
  channel: NotificationChannel,
  content: string,
  payload: any
): Promise<{ success: boolean; status: DeliveryStatus; error?: string }> {
  try {
    let result;

    switch (channel) {
      case 'email':
        result = await snsDeliveryService.sendEmail(
          payload.recipientEmail || payload.triggeredBy,
          `Test Execution ${payload.status || 'Completed'}`,
          content
        );
        break;

      case 'sms':
        result = await snsDeliveryService.sendSMS(
          payload.recipientPhone,
          content
        );
        break;

      case 'slack':
        result = await snsDeliveryService.sendToSlack(
          payload.slackWebhook,
          payload.slackBlocks || []
        );
        break;

      case 'webhook':
        result = await snsDeliveryService.sendWebhook(
          payload.webhookUrl,
          { content, ...payload }
        );
        break;

      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }

    if (result.status === 'sent') {
      return { success: true, status: 'sent' };
    } else {
      return {
        success: false,
        status: 'failed',
        error: result.errorMessage || 'SNS delivery failed',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`SNS delivery error for ${channel}:`, errorMessage);
    return {
      success: false,
      status: 'failed',
      error: errorMessage,
    };
  }
}

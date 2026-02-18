"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const notification_preferences_service_1 = require("../../services/notification-preferences-service");
const notification_template_service_1 = require("../../services/notification-template-service");
const notification_history_service_1 = require("../../services/notification-history-service");
const sns_delivery_service_1 = require("../../services/sns-delivery-service");
const n8n_integration_service_1 = require("../../services/n8n-integration-service");
const security_util_1 = require("../../utils/security-util");
const logger = new security_util_1.SecureLogger('NotificationProcessor');
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
const handler = async (event, context) => {
    logger.info('Notification Processor Lambda invoked');
    logger.info(`Processing ${event.Records.length} message(s)`);
    logger.info(`Remaining time: ${context.getRemainingTimeInMillis()}ms`);
    // Process each message
    for (const record of event.Records) {
        try {
            await processNotificationMessage(record);
        }
        catch (error) {
            logger.error('Failed to process notification message:', error);
            // Don't throw - let SQS handle retry via DLQ
        }
    }
    logger.info('All messages processed');
};
exports.handler = handler;
/**
 * Process a single notification message
 */
async function processNotificationMessage(record) {
    // Parse notification event
    let notificationEvent;
    try {
        notificationEvent = JSON.parse(record.body);
        console.log(`Processing notification: ${notificationEvent.eventType}`);
        console.log(`Event ID: ${notificationEvent.eventId}`);
    }
    catch (error) {
        console.error('Failed to parse notification event:', error);
        throw new Error('Invalid notification event format');
    }
    const { eventType, eventId, timestamp, payload } = notificationEvent;
    const userId = payload.triggeredBy;
    // Check if this is a critical alert
    const isCriticalAlert = eventType === 'critical_alert';
    // Get user preferences
    const preferences = await notification_preferences_service_1.notificationPreferencesService.getPreferences(userId);
    // Check if notifications are enabled for this event type (unless critical alert)
    if (!isCriticalAlert) {
        const shouldSend = await notification_preferences_service_1.notificationPreferencesService.shouldSendNotification(userId, eventType);
        if (!shouldSend) {
            console.log(`Notifications disabled for user ${userId} and event type ${eventType}`);
            // Record filtered notification
            await notification_history_service_1.notificationHistoryService.recordNotification({
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
        const inQuietHours = await notification_preferences_service_1.notificationPreferencesService.isInQuietHours(userId);
        if (inQuietHours) {
            console.log(`User ${userId} is in quiet hours, suppressing notification`);
            // Record suppressed notification
            await notification_history_service_1.notificationHistoryService.recordNotification({
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
        const withinLimit = await notification_preferences_service_1.notificationPreferencesService.checkFrequencyLimit(userId);
        if (withinLimit) {
            console.log(`User ${userId} has exceeded frequency limit for ${eventType}`);
            // Record rate-limited notification
            await notification_history_service_1.notificationHistoryService.recordNotification({
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
    }
    else {
        console.log('Critical alert - bypassing preference checks');
    }
    // Get delivery channels
    const channels = await notification_preferences_service_1.notificationPreferencesService.getDeliveryChannels(userId, eventType);
    if (channels.length === 0) {
        console.log(`No delivery channels configured for user ${userId}`);
        return;
    }
    console.log(`Delivering to channels: ${channels.join(', ')}`);
    // Process each channel
    for (const channel of channels) {
        try {
            await deliverNotification(notificationEvent, userId, channel);
        }
        catch (error) {
            console.error(`Failed to deliver notification to ${channel}:`, error);
            // Continue with other channels
        }
    }
}
/**
 * Deliver notification to a specific channel
 */
async function deliverNotification(notificationEvent, userId, channel) {
    const { eventType, eventId, timestamp, payload } = notificationEvent;
    // Get template for event type and channel
    const template = await notification_template_service_1.notificationTemplateService.getTemplate(eventType, channel);
    if (!template) {
        console.warn(`No template found for ${eventType} on ${channel}`);
        return;
    }
    // Convert payload to template render context
    const renderContext = {
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
    let renderedContent = await notification_template_service_1.notificationTemplateService.renderTemplate(template, renderContext);
    // Filter sensitive data from notification content
    renderedContent = (0, security_util_1.filterSensitiveData)(renderedContent);
    logger.info('Notification content rendered and sanitized');
    // Determine delivery method: n8n or SNS
    const n8nEnabled = await n8n_integration_service_1.n8nIntegrationService.isEnabled();
    let deliveryStatus = 'pending';
    let deliveryError;
    let deliveryMethod = 'sns';
    if (n8nEnabled) {
        logger.info('Attempting delivery via n8n webhook');
        deliveryMethod = 'n8n';
        try {
            // Create n8n webhook payload
            const n8nPayload = {
                eventType,
                eventId,
                timestamp,
                data: payload,
                metadata: {
                    source: 'aibts',
                    version: '1.0.0',
                },
            };
            const n8nResult = await n8n_integration_service_1.n8nIntegrationService.sendToWebhook(n8nPayload);
            if (n8nResult.success) {
                logger.info('Successfully delivered via n8n');
                deliveryStatus = 'sent';
            }
            else {
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
        }
        catch (error) {
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
    }
    else {
        console.log('Delivering directly via SNS');
        const snsResult = await deliverViaSNS(channel, renderedContent, payload);
        deliveryStatus = snsResult.status;
        if (!snsResult.success) {
            deliveryError = snsResult.error;
        }
    }
    // Record notification in history
    await notification_history_service_1.notificationHistoryService.recordNotification({
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
async function deliverViaSNS(channel, content, payload) {
    try {
        let result;
        switch (channel) {
            case 'email':
                result = await sns_delivery_service_1.snsDeliveryService.sendEmail(payload.recipientEmail || payload.triggeredBy, `Test Execution ${payload.status || 'Completed'}`, content);
                break;
            case 'sms':
                result = await sns_delivery_service_1.snsDeliveryService.sendSMS(payload.recipientPhone, content);
                break;
            case 'slack':
                result = await sns_delivery_service_1.snsDeliveryService.sendToSlack(payload.slackWebhook, payload.slackBlocks || []);
                break;
            case 'webhook':
                result = await sns_delivery_service_1.snsDeliveryService.sendWebhook(payload.webhookUrl, { content, ...payload });
                break;
            default:
                throw new Error(`Unsupported channel: ${channel}`);
        }
        if (result.status === 'sent') {
            return { success: true, status: 'sent' };
        }
        else {
            return {
                success: false,
                status: 'failed',
                error: result.errorMessage || 'SNS delivery failed',
            };
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`SNS delivery error for ${channel}:`, errorMessage);
        return {
            success: false,
            status: 'failed',
            error: errorMessage,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJvY2Vzc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHNHQUFpRztBQUNqRyxnR0FBMkY7QUFDM0YsOEZBQXlGO0FBQ3pGLDhFQUF5RTtBQUN6RSxvRkFBK0U7QUFDL0UsNkRBQThFO0FBVTlFLE1BQU0sTUFBTSxHQUFHLElBQUksNEJBQVksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBRXpEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUFlLEVBQUUsT0FBZ0IsRUFBaUIsRUFBRTtJQUNoRixNQUFNLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxDQUFDLENBQUM7SUFDckQsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxhQUFhLENBQUMsQ0FBQztJQUM3RCxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixPQUFPLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFdkUsdUJBQXVCO0lBQ3ZCLEtBQUssTUFBTSxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQztZQUNILE1BQU0sMEJBQTBCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixNQUFNLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9ELDZDQUE2QztRQUMvQyxDQUFDO0lBQ0gsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUM7QUFoQlcsUUFBQSxPQUFPLFdBZ0JsQjtBQUVGOztHQUVHO0FBQ0gsS0FBSyxVQUFVLDBCQUEwQixDQUFDLE1BQWlCO0lBQ3pELDJCQUEyQjtJQUMzQixJQUFJLGlCQUFvQyxDQUFD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dGVudCI6WyJpbXBvcnQgeyBTUVNFdmVudCwgU1FTUmVjb3JkLCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IG5vdGlmaWNhdGlvblByZWZlcmVuY2VzU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL25vdGlmaWNhdGlvbi1wcmVmZXJlbmNlcy1zZXJ2aWNlJztcclxuaW1wb3J0IHsgbm90aWZpY2F0aW9uVGVtcGxhdGVTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbm90aWZpY2F0aW9uLXRlbXBsYXRlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBub3RpZmljYXRpb25IaXN0b3J5U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL25vdGlmaWNhdGlvbi1oaXN0b3J5LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBzbnNEZWxpdmVyeVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9zbnMtZGVsaXZlcnktc2VydmljZSc7XHJcbmltcG9ydCB7IG44bkludGVncmF0aW9uU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL244bi1pbnRlZ3JhdGlvbi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgZmlsdGVyU2Vuc2l0aXZlRGF0YSwgU2VjdXJlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvc2VjdXJpdHktdXRpbCc7XHJcbmltcG9ydCB7XHJcbiAgTm90aWZpY2F0aW9uRXZlbnQsXHJcbiAgTm90aWZpY2F0aW9uQ2hhbm5lbCxcclxuICBOb3RpZmljYXRpb25IaXN0b3J5UmVjb3JkLFxyXG4gIERlbGl2ZXJ5U3RhdHVzLFxyXG4gIE44TldlYmhvb2tQYXlsb2FkLFxyXG4gIFRlbXBsYXRlUmVuZGVyQ29udGV4dCxcclxufSBmcm9tICcuLi8uLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gbmV3IFNlY3VyZUxvZ2dlcignTm90aWZpY2F0aW9uUHJvY2Vzc29yJyk7XHJcblxyXG4vKipcclxuICogTm90aWZpY2F0aW9uIFByb2Nlc3NvciBMYW1iZGEgSGFuZGxlclxyXG4gKiBcclxuICogUHJvY2Vzc2VzIG5vdGlmaWNhdGlvbiBldmVudHMgZnJvbSBTUVMgcXVldWU6XHJcbiAqIDEuIFBhcnNlIG5vdGlmaWNhdGlvbiBldmVudFxyXG4gKiAyLiBDaGVjayB1c2VyIHByZWZlcmVuY2VzIGFuZCBmaWx0ZXIgaWYgZGlzYWJsZWRcclxuICogMy4gQ2hlY2sgcXVpZXQgaG91cnMgYW5kIHN1cHByZXNzIGlmIGFwcGxpY2FibGVcclxuICogNC4gQ2hlY2sgZnJlcXVlbmN5IGxpbWl0cyBhbmQgYmF0Y2ggaWYgZXhjZWVkZWRcclxuICogNS4gR2V0IGFwcHJvcHJpYXRlIHRlbXBsYXRlIGZvciBldmVudCB0eXBlIGFuZCBjaGFubmVsXHJcbiAqIDYuIFJlbmRlciB0ZW1wbGF0ZSB3aXRoIGV2ZW50IGNvbnRleHRcclxuICogNy4gUm91dGUgdG8gbjhuIHdlYmhvb2sgaWYgZW5hYmxlZCwgb3RoZXJ3aXNlIFNOU1xyXG4gKiA4LiBIYW5kbGUgbjhuIGZhbGxiYWNrIHRvIFNOUyBvbiBmYWlsdXJlXHJcbiAqIDkuIFJlY29yZCBub3RpZmljYXRpb24gYXR0ZW1wdCBpbiBoaXN0b3J5XHJcbiAqIDEwLiBVcGRhdGUgZGVsaXZlcnkgc3RhdHVzIGJhc2VkIG9uIHJlc3VsdFxyXG4gKiAxMS4gSGFuZGxlIGNyaXRpY2FsIGFsZXJ0IHByZWZlcmVuY2Ugb3ZlcnJpZGVcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBTUVNFdmVudCwgY29udGV4dDogQ29udGV4dCk6IFByb21pc2U8dm9pZD4gPT4ge1xyXG4gIGxvZ2dlci5pbmZvKCdOb3RpZmljYXRpb24gUHJvY2Vzc29yIExhbWJkYSBpbnZva2VkJyk7XHJcbiAgbG9nZ2VyLmluZm8oYFByb2Nlc3NpbmcgJHtldmVudC5SZWNvcmRzLmxlbmd0aH0gbWVzc2FnZShzKWApO1xyXG4gIGxvZ2dlci5pbmZvKGBSZW1haW5pbmcgdGltZTogJHtjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpfW1zYCk7XHJcblxyXG4gIC8vIFByb2Nlc3MgZWFjaCBtZXNzYWdlXHJcbiAgZm9yIChjb25zdCByZWNvcmQgb2YgZXZlbnQuUmVjb3Jkcykge1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgcHJvY2Vzc05vdGlmaWNhdGlvbk1lc3NhZ2UocmVjb3JkKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHByb2Nlc3Mgbm90aWZpY2F0aW9uIG1lc3NhZ2U6JywgZXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCB0aHJvdyAtIGxldCBTUVMgaGFuZGxlIHJldHJ5IHZpYSBETFFcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxvZ2dlci5pbmZvKCdBbGwgbWVzc2FnZXMgcHJvY2Vzc2VkJyk7XHJcbn07XHJcblxyXG4vKipcclxuICogUHJvY2VzcyBhIHNpbmdsZSBub3RpZmljYXRpb24gbWVzc2FnZVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc05vdGlmaWNhdGlvbk1lc3NhZ2UocmVjb3JkOiBTUVNSZWNvcmQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAvLyBQYXJzZSBub3RpZmljYXRpb24gZXZlbnRcclxuICBsZXQgbm90aWZpY2F0aW9uRXZlbnQ6IE5vdGlmaWNhdGlvbkV2ZW50O1xyXG4gIHRyeSB7XHJcbiAgICBub3RpZmljYXRpb25FdmVudCA9IEpTT04ucGFyc2UocmVjb3JkLmJvZHkpO1xyXG4gICAgY29uc29sZS5sb2coYFByb2Nlc3Npbmcgbm90aWZpY2F0aW9uOiAke25vdGlmaWNhdGlvbkV2ZW50LmV2ZW50VHlwZX1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBFdmVudCBJRDogJHtub3RpZmljYXRpb25FdmVudC5ldmVudElkfWApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2Ugbm90aWZpY2F0aW9uIGV2ZW50OicsIGVycm9yKTtcclxuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBub3RpZmljYXRpb24gZXZlbnQgZm9ybWF0Jyk7XHJcbiAgfVxyXG5cclxuICBjb25zdCB7IGV2ZW50VHlwZSwgZXZlbnRJZCwgdGltZXN0YW1wLCBwYXlsb2FkIH0gPSBub3RpZmljYXRpb25FdmVudDtcclxuICBjb25zdCB1c2VySWQgPSBwYXlsb2FkLnRyaWdnZXJlZEJ5O1xyXG5cclxuICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgY3JpdGljYWwgYWxlcnRcclxuICBjb25zdCBpc0NyaXRpY2FsQWxlcnQgPSBldmVudFR5cGUgPT09ICdjcml0aWNhbF9hbGVydCc7XHJcblxyXG4gIC8vIEdldCB1c2VyIHByZWZlcmVuY2VzXHJcbiAgY29uc3QgcHJlZmVyZW5jZXMgPSBhd2FpdCBub3RpZmljYXRpb25QcmVmZXJlbmNlc1NlcnZpY2UuZ2V0UHJlZmVyZW5jZXModXNlcklkKTtcclxuXHJcbiAgLy8gQ2hlY2sgaWYgbm90aWZpY2F0aW9ucyBhcmUgZW5hYmxlZCBmb3IgdGhpcyBldmVudCB0eXBlICh1bmxlc3MgY3JpdGljYWwgYWxlcnQpXHJcbiAgaWYgKCFpc0NyaXRpY2FsQWxlcnQpIHtcclxuICAgIGNvbnN0IHNob3VsZFNlbmQgPSBhd2FpdCBub3RpZmljYXRpb25QcmVmZXJlbmNlc1NlcnZpY2Uuc2hvdWxkU2VuZE5vdGlmaWNhdGlvbih1c2VySWQsIGV2ZW50VHlwZSk7XHJcbiAgICBpZiAoIXNob3VsZFNlbmQpIHtcclxuICAgICAgY29uc29sZS5sb2coYE5vdGlmaWNhdGlvbnMgZGlzYWJsZWQgZm9yIHVzZXIgJHt1c2VySWR9IGFuZCBldmVudCB0eXBlICR7ZXZlbnRUeXBlfWApO1xyXG4gICAgICBcclxuICAgICAgLy8gUmVjb3JkIGZpbHRlcmVkIG5vdGlmaWNhdGlvblxyXG4gICAgICBhd2FpdCBub3RpZmljYXRpb25IaXN0b3J5U2VydmljZS5yZWNvcmROb3RpZmljYXRpb24oe1xyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBldmVudFR5cGUsXHJcbiAgICAgICAgZXZlbnRJZCxcclxuICAgICAgICBjaGFubmVsOiAnZW1haWwnLCAvLyBEZWZhdWx0IGNoYW5uZWwgZm9yIGZpbHRlcmVkIG5vdGlmaWNhdGlvbnNcclxuICAgICAgICBkZWxpdmVyeU1ldGhvZDogJ3NucycsXHJcbiAgICAgICAgZGVsaXZlcnlTdGF0dXM6ICdmYWlsZWQnLFxyXG4gICAgICAgIHJlY2lwaWVudDogdXNlcklkLFxyXG4gICAgICAgIHJldHJ5Q291bnQ6IDAsXHJcbiAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIHByb2plY3RJZDogcGF5bG9hZC5wcm9qZWN0SWQsXHJcbiAgICAgICAgICBleGVjdXRpb25JZDogcGF5bG9hZC5leGVjdXRpb25JZCxcclxuICAgICAgICAgIHRlc3RDYXNlSWQ6IHBheWxvYWQudGVzdENhc2VJZCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBxdWlldCBob3VycyAodW5sZXNzIGNyaXRpY2FsIGFsZXJ0KVxyXG4gICAgY29uc3QgaW5RdWlldEhvdXJzID0gYXdhaXQgbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNTZXJ2aWNlLmlzSW5RdWlldEhvdXJzKHVzZXJJZCk7XHJcbiAgICBpZiAoaW5RdWlldEhvdXJzKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBVc2VyICR7dXNlcklkfSBpcyBpbiBxdWlldCBob3Vycywgc3VwcHJlc3Npbmcgbm90aWZpY2F0aW9uYCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBSZWNvcmQgc3VwcHJlc3NlZCBub3RpZmljYXRpb25cclxuICAgICAgYXdhaXQgbm90aWZpY2F0aW9uSGlzdG9yeVNlcnZpY2UucmVjb3JkTm90aWZpY2F0aW9uKHtcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgZXZlbnRUeXBlLFxyXG4gICAgICAgIGV2ZW50SWQsXHJcbiAgICAgICAgY2hhbm5lbDogJ2VtYWlsJyxcclxuICAgICAgICBkZWxpdmVyeU1ldGhvZDogJ3NucycsXHJcbiAgICAgICAgZGVsaXZlcnlTdGF0dXM6ICdmYWlsZWQnLFxyXG4gICAgICAgIHJlY2lwaWVudDogdXNlcklkLFxyXG4gICAgICAgIHJldHJ5Q291bnQ6IDAsXHJcbiAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIHByb2plY3RJZDogcGF5bG9hZC5wcm9qZWN0SWQsXHJcbiAgICAgICAgICBleGVjdXRpb25JZDogcGF5bG9hZC5leGVjdXRpb25JZCxcclxuICAgICAgICAgIHRlc3RDYXNlSWQ6IHBheWxvYWQudGVzdENhc2VJZCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yTWVzc2FnZTogJ1N1cHByZXNzZWQgZHVlIHRvIHF1aWV0IGhvdXJzJyxcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZnJlcXVlbmN5IGxpbWl0c1xyXG4gICAgY29uc3Qgd2l0aGluTGltaXQgPSBhd2FpdCBub3RpZmljYXRpb25QcmVmZXJlbmNlc1NlcnZpY2UuY2hlY2tGcmVxdWVuY3lMaW1pdCh1c2VySWQpO1xyXG4gICAgaWYgKHdpdGhpbkxpbWl0KSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBVc2VyICR7dXNlcklkfSBoYXMgZXhjZWVkZWQgZnJlcXVlbmN5IGxpbWl0IGZvciAke2V2ZW50VHlwZX1gKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFJlY29yZCByYXRlLWxpbWl0ZWQgbm90aWZpY2F0aW9uXHJcbiAgICAgIGF3YWl0IG5vdGlmaWNhdGlvbkhpc3RvcnlTZXJ2aWNlLnJlY29yZE5vdGlmaWNhdGlvbih7XHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGV2ZW50VHlwZSxcclxuICAgICAgICBldmVudElkLFxyXG4gICAgICAgIGNoYW5uZWw6ICdlbWFpbCcsXHJcbiAgICAgICAgZGVsaXZlcnlNZXRob2Q6ICdzbnMnLFxyXG4gICAgICAgIGRlbGl2ZXJ5U3RhdHVzOiAnZmFpbGVkJyxcclxuICAgICAgICByZWNpcGllbnQ6IHVzZXJJZCxcclxuICAgICAgICByZXRyeUNvdW50OiAwLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICBwcm9qZWN0SWQ6IHBheWxvYWQucHJvamVjdElkLFxyXG4gICAgICAgICAgZXhlY3V0aW9uSWQ6IHBheWxvYWQuZXhlY3V0aW9uSWQsXHJcbiAgICAgICAgICB0ZXN0Q2FzZUlkOiBwYXlsb2FkLnRlc3RDYXNlSWQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvck1lc3NhZ2U6ICdSYXRlIGxpbWl0ZWQgZHVlIHRvIGZyZXF1ZW5jeSBsaW1pdCcsXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICBjb25zb2xlLmxvZygnQ3JpdGljYWwgYWxlcnQgLSBieXBhc3NpbmcgcHJlZmVyZW5jZSBjaGVja3MnKTtcclxuICB9XHJcblxyXG4gIC8vIEdldCBkZWxpdmVyeSBjaGFubmVsc1xyXG4gIGNvbnN0IGNoYW5uZWxzID0gYXdhaXQgbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNTZXJ2aWNlLmdldERlbGl2ZXJ5Q2hhbm5lbHModXNlcklkLCBldmVudFR5cGUpO1xyXG4gIGlmIChjaGFubmVscy5sZW5ndGggPT09IDApIHtcclxuICAgIGNvbnNvbGUubG9nKGBObyBkZWxpdmVyeSBjaGFubmVscyBjb25maWd1cmVkIGZvciB1c2VyICR7dXNlcklkfWApO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY29uc29sZS5sb2coYERlbGl2ZXJpbmcgdG8gY2hhbm5lbHM6ICR7Y2hhbm5lbHMuam9pbignLCAnKX1gKTtcclxuXHJcbiAgLy8gUHJvY2VzcyBlYWNoIGNoYW5uZWxcclxuICBmb3IgKGNvbnN0IGNoYW5uZWwgb2YgY2hhbm5lbHMpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IGRlbGl2ZXJOb3RpZmljYXRpb24obm90aWZpY2F0aW9uRXZlbnQsIHVzZXJJZCwgY2hhbm5lbCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gZGVsaXZlciBub3RpZmljYXRpb24gdG8gJHtjaGFubmVsfTpgLCBlcnJvcik7XHJcbiAgICAgIC8vIENvbnRpbnVlIHdpdGggb3RoZXIgY2hhbm5lbHNcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWxpdmVyIG5vdGlmaWNhdGlvbiB0byBhIHNwZWNpZmljIGNoYW5uZWxcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGRlbGl2ZXJOb3RpZmljYXRpb24oXHJcbiAgbm90aWZpY2F0aW9uRXZlbnQ6IE5vdGlmaWNhdGlvbkV2ZW50LFxyXG4gIHVzZXJJZDogc3RyaW5nLFxyXG4gIGNoYW5uZWw6IE5vdGlmaWNhdGlvbkNoYW5uZWxcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgeyBldmVudFR5cGUsIGV2ZW50SWQsIHRpbWVzdGFtcCwgcGF5bG9hZCB9ID0gbm90aWZpY2F0aW9uRXZlbnQ7XHJcblxyXG4gIC8vIEdldCB0ZW1wbGF0ZSBmb3IgZXZlbnQgdHlwZSBhbmQgY2hhbm5lbFxyXG4gIGNvbnN0IHRlbXBsYXRlID0gYXdhaXQgbm90aWZpY2F0aW9uVGVtcGxhdGVTZXJ2aWNlLmdldFRlbXBsYXRlKGV2ZW50VHlwZSwgY2hhbm5lbCk7XHJcbiAgaWYgKCF0ZW1wbGF0ZSkge1xyXG4gICAgY29uc29sZS53YXJuKGBObyB0ZW1wbGF0ZSBmb3VuZCBmb3IgJHtldmVudFR5cGV9IG9uICR7Y2hhbm5lbH1gKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIENvbnZlcnQgcGF5bG9hZCB0byB0ZW1wbGF0ZSByZW5kZXIgY29udGV4dFxyXG4gIGNvbnN0IHJlbmRlckNvbnRleHQ6IFRlbXBsYXRlUmVuZGVyQ29udGV4dCA9IHtcclxuICAgIHRlc3ROYW1lOiBwYXlsb2FkLnRlc3RDYXNlSWQsXHJcbiAgICB0ZXN0Q2FzZUlkOiBwYXlsb2FkLnRlc3RDYXNlSWQsXHJcbiAgICBleGVjdXRpb25JZDogcGF5bG9hZC5leGVjdXRpb25JZCxcclxuICAgIHN0YXR1czogcGF5bG9hZC5zdGF0dXMsXHJcbiAgICByZXN1bHQ6IHBheWxvYWQucmVzdWx0LFxyXG4gICAgZHVyYXRpb246IHBheWxvYWQuZHVyYXRpb24gPyBgJHtwYXlsb2FkLmR1cmF0aW9ufW1zYCA6IHVuZGVmaW5lZCxcclxuICAgIHRpbWVzdGFtcCxcclxuICAgIGVycm9yTWVzc2FnZTogcGF5bG9hZC5lcnJvck1lc3NhZ2UsXHJcbiAgICBzY3JlZW5zaG90VXJsczogcGF5bG9hZC5zY3JlZW5zaG90cyxcclxuICAgIHVzZXJOYW1lOiBwYXlsb2FkLnRyaWdnZXJlZEJ5LFxyXG4gICAgcHJvamVjdE5hbWU6IHBheWxvYWQucHJvamVjdElkLFxyXG4gICAgcmVwb3J0RGF0YTogcGF5bG9hZC5yZXBvcnREYXRhLFxyXG4gIH07XHJcblxyXG4gIC8vIFJlbmRlciB0ZW1wbGF0ZSB3aXRoIGV2ZW50IGNvbnRleHRcclxuICBsZXQgcmVuZGVyZWRDb250ZW50ID0gYXdhaXQgbm90aWZpY2F0aW9uVGVtcGxhdGVTZXJ2aWNlLnJlbmRlclRlbXBsYXRlKHRlbXBsYXRlLCByZW5kZXJDb250ZXh0KTtcclxuICBcclxuICAvLyBGaWx0ZXIgc2Vuc2l0aXZlIGRhdGEgZnJvbSBub3RpZmljYXRpb24gY29udGVudFxyXG4gIHJlbmRlcmVkQ29udGVudCA9IGZpbHRlclNlbnNpdGl2ZURhdGEocmVuZGVyZWRDb250ZW50KTtcclxuICBsb2dnZXIuaW5mbygnTm90aWZpY2F0aW9uIGNvbnRlbnQgcmVuZGVyZWQgYW5kIHNhbml0aXplZCcpO1xyXG5cclxuICAvLyBEZXRlcm1pbmUgZGVsaXZlcnkgbWV0aG9kOiBuOG4gb3IgU05TXHJcbiAgY29uc3QgbjhuRW5hYmxlZCA9IGF3YWl0IG44bkludGVncmF0aW9uU2VydmljZS5pc0VuYWJsZWQoKTtcclxuICBsZXQgZGVsaXZlcnlTdGF0dXM6IERlbGl2ZXJ5U3RhdHVzID0gJ3BlbmRpbmcnO1xyXG4gIGxldCBkZWxpdmVyeUVycm9yOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgbGV0IGRlbGl2ZXJ5TWV0aG9kOiAnbjhuJyB8ICdzbnMnID0gJ3Nucyc7XHJcblxyXG4gIGlmIChuOG5FbmFibGVkKSB7XHJcbiAgICBsb2dnZXIuaW5mbygnQXR0ZW1wdGluZyBkZWxpdmVyeSB2aWEgbjhuIHdlYmhvb2snKTtcclxuICAgIGRlbGl2ZXJ5TWV0aG9kID0gJ244bic7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ3JlYXRlIG44biB3ZWJob29rIHBheWxvYWRcclxuICAgICAgY29uc3QgbjhuUGF5bG9hZDogTjhOV2ViaG9va1BheWxvYWQgPSB7XHJcbiAgICAgICAgZXZlbnRUeXBlLFxyXG4gICAgICAgIGV2ZW50SWQsXHJcbiAgICAgICAgdGltZXN0YW1wLFxyXG4gICAgICAgIGRhdGE6IHBheWxvYWQsXHJcbiAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIHNvdXJjZTogJ2FpYnRzJyxcclxuICAgICAgICAgIHZlcnNpb246ICcxLjAuMCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IG44blJlc3VsdCA9IGF3YWl0IG44bkludGVncmF0aW9uU2VydmljZS5zZW5kVG9XZWJob29rKG44blBheWxvYWQpO1xyXG4gICAgICBcclxuICAgICAgaWYgKG44blJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1N1Y2Nlc3NmdWxseSBkZWxpdmVyZWQgdmlhIG44bicpO1xyXG4gICAgICAgIGRlbGl2ZXJ5U3RhdHVzID0gJ3NlbnQnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCduOG4gZGVsaXZlcnkgZmFpbGVkLCBmYWxsaW5nIGJhY2sgdG8gU05TJyk7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oYG44biBlcnJvcjogJHtuOG5SZXN1bHQuZXJyb3JNZXNzYWdlfWApO1xyXG4gICAgICAgIGRlbGl2ZXJ5RXJyb3IgPSBuOG5SZXN1bHQuZXJyb3JNZXNzYWdlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIFNOU1xyXG4gICAgICAgIGRlbGl2ZXJ5TWV0aG9kID0gJ3Nucyc7XHJcbiAgICAgICAgY29uc3Qgc25zUmVzdWx0ID0gYXdhaXQgZGVsaXZlclZpYVNOUyhjaGFubmVsLCByZW5kZXJlZENvbnRlbnQsIHBheWxvYWQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGRlbGl2ZXJ5U3RhdHVzID0gc25zUmVzdWx0LnN0YXR1cztcclxuICAgICAgICBpZiAoIXNuc1Jlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgICBkZWxpdmVyeUVycm9yID0gc25zUmVzdWx0LmVycm9yO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignbjhuIGRlbGl2ZXJ5IGVycm9yOicsIGVycm9yKTtcclxuICAgICAgZGVsaXZlcnlFcnJvciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xyXG4gICAgICBcclxuICAgICAgLy8gRmFsbGJhY2sgdG8gU05TXHJcbiAgICAgIGRlbGl2ZXJ5TWV0aG9kID0gJ3Nucyc7XHJcbiAgICAgIGNvbnN0IHNuc1Jlc3VsdCA9IGF3YWl0IGRlbGl2ZXJWaWFTTlMoY2hhbm5lbCwgcmVuZGVyZWRDb250ZW50LCBwYXlsb2FkKTtcclxuICAgICAgXHJcbiAgICAgIGRlbGl2ZXJ5U3RhdHVzID0gc25zUmVzdWx0LnN0YXR1cztcclxuICAgICAgaWYgKCFzbnNSZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgIGRlbGl2ZXJ5RXJyb3IgPSBzbnNSZXN1bHQuZXJyb3I7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5sb2coJ0RlbGl2ZXJpbmcgZGlyZWN0bHkgdmlhIFNOUycpO1xyXG4gICAgY29uc3Qgc25zUmVzdWx0ID0gYXdhaXQgZGVsaXZlclZpYVNOUyhjaGFubmVsLCByZW5kZXJlZENvbnRlbnQsIHBheWxvYWQpO1xyXG4gICAgXHJcbiAgICBkZWxpdmVyeVN0YXR1cyA9IHNuc1Jlc3VsdC5zdGF0dXM7XHJcbiAgICBpZiAoIXNuc1Jlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgIGRlbGl2ZXJ5RXJyb3IgPSBzbnNSZXN1bHQuZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBSZWNvcmQgbm90aWZpY2F0aW9uIGluIGhpc3RvcnlcclxuICBhd2FpdCBub3RpZmljYXRpb25IaXN0b3J5U2VydmljZS5yZWNvcmROb3RpZmljYXRpb24oe1xyXG4gICAgdXNlcklkLFxyXG4gICAgZXZlbnRUeXBlLFxyXG4gICAgZXZlbnRJZCxcclxuICAgIGNoYW5uZWwsXHJcbiAgICBkZWxpdmVyeU1ldGhvZCxcclxuICAgIGRlbGl2ZXJ5U3RhdHVzLFxyXG4gICAgcmVjaXBpZW50OiB1c2VySWQsIC8vIFRoaXMgc2hvdWxkIGJlIHRoZSBhY3R1YWwgcmVjaXBpZW50IChlbWFpbC9waG9uZSlcclxuICAgIHJldHJ5Q291bnQ6IDAsXHJcbiAgICBtZXRhZGF0YToge1xyXG4gICAgICBwcm9qZWN0SWQ6IHBheWxvYWQucHJvamVjdElkLFxyXG4gICAgICBleGVjdXRpb25JZDogcGF5bG9hZC5leGVjdXRpb25JZCxcclxuICAgICAgdGVzdENhc2VJZDogcGF5bG9hZC50ZXN0Q2FzZUlkLFxyXG4gICAgfSxcclxuICAgIGVycm9yTWVzc2FnZTogZGVsaXZlcnlFcnJvcixcclxuICB9KTtcclxuXHJcbiAgY29uc29sZS5sb2coYE5vdGlmaWNhdGlvbiAke2V2ZW50SWR9IGRlbGl2ZXJlZCB2aWEgJHtkZWxpdmVyeU1ldGhvZH06ICR7ZGVsaXZlcnlTdGF0dXN9YCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWxpdmVyIG5vdGlmaWNhdGlvbiB2aWEgU05TXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBkZWxpdmVyVmlhU05TKFxyXG4gIGNoYW5uZWw6IE5vdGlmaWNhdGlvbkNoYW5uZWwsXHJcbiAgY29udGVudDogc3RyaW5nLFxyXG4gIHBheWxvYWQ6IGFueVxyXG4pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgc3RhdHVzOiBEZWxpdmVyeVN0YXR1czsgZXJyb3I/OiBzdHJpbmcgfT4ge1xyXG4gIHRyeSB7XHJcbiAgICBsZXQgcmVzdWx0O1xyXG5cclxuICAgIHN3aXRjaCAoY2hhbm5lbCkge1xyXG4gICAgICBjYXNlICdlbWFpbCc6XHJcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgc25zRGVsaXZlcnlTZXJ2aWNlLnNlbmRFbWFpbChcclxuICAgICAgICAgIHBheWxvYWQucmVjaXBpZW50RW1haWwgfHwgcGF5bG9hZC50cmlnZ2VyZWRCeSxcclxuICAgICAgICAgIGBUZXN0IEV4ZWN1dGlvbiAke3BheWxvYWQuc3RhdHVzIHx8ICdDb21wbGV0ZWQnfWAsXHJcbiAgICAgICAgICBjb250ZW50XHJcbiAgICAgICAgKTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ3Ntcyc6XHJcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgc25zRGVsaXZlcnlTZXJ2aWNlLnNlbmRTTVMoXHJcbiAgICAgICAgICBwYXlsb2FkLnJlY2lwaWVudFBob25lLFxyXG4gICAgICAgICAgY29udGVudFxyXG4gICAgICAgICk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdzbGFjayc6XHJcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgc25zRGVsaXZlcnlTZXJ2aWNlLnNlbmRUb1NsYWNrKFxyXG4gICAgICAgICAgcGF5bG9hZC5zbGFja1dlYmhvb2ssXHJcbiAgICAgICAgICBwYXlsb2FkLnNsYWNrQmxvY2tzIHx8IFtdXHJcbiAgICAgICAgKTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ3dlYmhvb2snOlxyXG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHNuc0RlbGl2ZXJ5U2VydmljZS5zZW5kV2ViaG9vayhcclxuICAgICAgICAgIHBheWxvYWQud2ViaG9va1VybCxcclxuICAgICAgICAgIHsgY29udGVudCwgLi4ucGF5bG9hZCB9XHJcbiAgICAgICAgKTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBjaGFubmVsOiAke2NoYW5uZWx9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlc3VsdC5zdGF0dXMgPT09ICdzZW50Jykge1xyXG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBzdGF0dXM6ICdzZW50JyB9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBzdGF0dXM6ICdmYWlsZWQnLFxyXG4gICAgICAgIGVycm9yOiByZXN1bHQuZXJyb3JNZXNzYWdlIHx8ICdTTlMgZGVsaXZlcnkgZmFpbGVkJyxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XHJcbiAgICBjb25zb2xlLmVycm9yKGBTTlMgZGVsaXZlcnkgZXJyb3IgZm9yICR7Y2hhbm5lbH06YCwgZXJyb3JNZXNzYWdlKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICBzdGF0dXM6ICdmYWlsZWQnLFxyXG4gICAgICBlcnJvcjogZXJyb3JNZXNzYWdlLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuIl19
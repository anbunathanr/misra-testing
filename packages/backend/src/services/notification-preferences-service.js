"use strict";
/**
 * Notification Preferences Service
 *
 * Manages user notification preferences including channels, event types, quiet hours, and frequency limits.
 * Provides preference validation, filtering, and default preference application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationPreferencesService = exports.NotificationPreferencesService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const security_util_1 = require("../utils/security-util");
const logger = new security_util_1.SecureLogger('NotificationPreferencesService');
class NotificationPreferencesService {
    docClient;
    tableName;
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        this.tableName = process.env.NOTIFICATION_PREFERENCES_TABLE || 'NotificationPreferences';
    }
    /**
     * Get user notification preferences
     *
     * @param userId - User ID
     * @returns User preferences or default preferences if none configured
     */
    async getPreferences(userId) {
        try {
            const command = new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { userId },
            });
            const response = await this.docClient.send(command);
            if (response.Item) {
                return response.Item;
            }
            // Return default preferences if none configured
            return this.getDefaultPreferences(userId);
        }
        catch (error) {
            logger.error('Error getting preferences', { userId, error });
            throw error;
        }
    }
    /**
     * Update user notification preferences
     *
     * @param userId - User ID
     * @param preferences - Partial preferences to update
     * @returns Updated preferences
     */
    async updatePreferences(userId, preferences) {
        // Sanitize and validate input data
        if (preferences.preferences) {
            try {
                const sanitized = (0, security_util_1.sanitizePreferences)(preferences.preferences);
                preferences.preferences = {
                    ...preferences.preferences,
                    ...sanitized,
                };
            }
            catch (error) {
                logger.error('Invalid preference data', { userId, error });
                throw new Error(`Preference validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        const now = new Date().toISOString();
        // Get existing preferences or defaults
        const existing = await this.getPreferences(userId);
        // Merge with existing preferences
        const updated = {
            ...existing,
            ...preferences,
            userId,
            updatedAt: now,
        };
        try {
            const command = new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: updated,
            });
            await this.docClient.send(command);
            logger.info('Preferences updated successfully', { userId });
            return updated;
        }
        catch (error) {
            logger.error('Error updating preferences', { userId, error });
            throw error;
        }
    }
    /**
     * Check if notification should be sent based on user preferences
     *
     * @param userId - User ID
     * @param eventType - Event type
     * @returns True if notification should be sent
     */
    async shouldSendNotification(userId, eventType) {
        const preferences = await this.getPreferences(userId);
        // Map event type to preference key
        const preferenceKey = this.getPreferenceKey(eventType);
        if (!preferenceKey) {
            return false;
        }
        const eventPreference = preferences.preferences[preferenceKey];
        if (!eventPreference) {
            return false;
        }
        // Critical alerts always sent (override preferences)
        if (eventType === 'critical_alert') {
            return true;
        }
        // Check if event type is enabled
        if (!eventPreference.enabled) {
            return false;
        }
        // Check quiet hours for non-critical notifications
        if (await this.isInQuietHours(userId)) {
            return false;
        }
        // Check frequency limits
        if (await this.checkFrequencyLimit(userId)) {
            return false;
        }
        return true;
    }
    /**
     * Get delivery channels for user and event type
     *
     * @param userId - User ID
     * @param eventType - Event type
     * @returns Array of notification channels
     */
    async getDeliveryChannels(userId, eventType) {
        const preferences = await this.getPreferences(userId);
        const preferenceKey = this.getPreferenceKey(eventType);
        if (!preferenceKey) {
            return [];
        }
        const eventPreference = preferences.preferences[preferenceKey];
        if (!eventPreference) {
            return [];
        }
        return eventPreference.channels || [];
    }
    /**
     * Check if current time is within user's quiet hours
     *
     * @param userId - User ID
     * @returns True if in quiet hours
     */
    async isInQuietHours(userId) {
        const preferences = await this.getPreferences(userId);
        if (!preferences.quietHours || !preferences.quietHours.enabled) {
            return false;
        }
        const { startTime, endTime, timezone } = preferences.quietHours;
        try {
            // Get current time in user's timezone
            const now = new Date();
            const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
            const currentHour = userTime.getHours();
            const currentMinute = userTime.getMinutes();
            const currentTimeMinutes = currentHour * 60 + currentMinute;
            // Parse start and end times
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            const startTimeMinutes = startHour * 60 + startMinute;
            const endTimeMinutes = endHour * 60 + endMinute;
            // Handle quiet hours that span midnight
            if (startTimeMinutes > endTimeMinutes) {
                return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
            }
            return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
        }
        catch (error) {
            console.error('Error checking quiet hours', { userId, error });
            return false;
        }
    }
    /**
     * Check if user has exceeded frequency limit
     *
     * @param userId - User ID
     * @returns True if frequency limit exceeded
     */
    async checkFrequencyLimit(userId) {
        const preferences = await this.getPreferences(userId);
        if (!preferences.frequencyLimit || !preferences.frequencyLimit.enabled) {
            return false;
        }
        // TODO: Implement frequency tracking using DynamoDB or ElastiCache
        // For now, return false (not exceeded)
        // This would require tracking notification counts per user per hour
        return false;
    }
    /**
     * Get default notification preferences
     *
     * @param userId - User ID
     * @returns Default preferences
     */
    getDefaultPreferences(userId) {
        const now = new Date().toISOString();
        return {
            userId,
            preferences: {
                testCompletion: {
                    enabled: false,
                    channels: ['email'],
                },
                testFailure: {
                    enabled: true,
                    channels: ['email'],
                },
                criticalAlert: {
                    enabled: true,
                    channels: ['email', 'sms'],
                },
                summaryReport: {
                    enabled: true,
                    frequency: 'weekly',
                    channels: ['email'],
                },
            },
            createdAt: now,
            updatedAt: now,
        };
    }
    /**
     * Map event type to preference key
     *
     * @param eventType - Event type
     * @returns Preference key
     */
    getPreferenceKey(eventType) {
        const mapping = {
            'test_completion': 'testCompletion',
            'test_failure': 'testFailure',
            'critical_alert': 'criticalAlert',
            'summary_report': 'summaryReport',
        };
        return mapping[eventType] || null;
    }
    /**
     * Validate email address format
     *
     * @param email - Email address
     * @returns True if valid
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Validate phone number format (E.164)
     *
     * @param phoneNumber - Phone number
     * @returns True if valid
     */
    validatePhoneNumber(phoneNumber) {
        // E.164 format: +[country code][number]
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
    }
}
exports.NotificationPreferencesService = NotificationPreferencesService;
// Export singleton instance
exports.notificationPreferencesService = new NotificationPreferencesService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXByZWZlcmVuY2VzLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub3RpZmljYXRpb24tcHJlZmVyZW5jZXMtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILDhEQUEwRDtBQUMxRCx3REFBdUY7QUFFdkYsMERBQTJFO0FBRTNFLE1BQU0sTUFBTSxHQUFHLElBQUksNEJBQVksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBRWxFLE1BQWEsOEJBQThCO0lBQ2pDLFNBQVMsQ0FBeUI7SUFDbEMsU0FBUyxDQUFTO0lBRTFCO1FBQ0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO1lBQ2hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQWEsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsSUFBSSx5QkFBeUIsQ0FBQztJQUMzRixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQWM7UUFDakMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBVSxDQUFDO2dCQUM3QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLEdBQUcsRUFBRSxFQUFFLE1BQU0sRUFBRTthQUNoQixDQUFDLENBQUM7WUFFSCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXBELElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNsQixPQUFPLFFBQVEsQ0FBQyxJQUErQixDQUFDO1lBQ2xELENBQUM7WUFFRCxnREFBZ0Q7WUFD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QztpQkFDcEI7YUFDRjtZQUNELFNBQVMsRUFBRSxHQUFHO1lBQ2QsU0FBUyxFQUFFLEdBQUc7U0FDZixDQUFDO0lBQ0osQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssZ0JBQWdCLENBQUMsU0FBaUI7UUFDeEMsTUFBTSxPQUFPLEdBQWlFO1lBQzVFLGlCQUFpQixFQUFFLGdCQUFnQjtZQUNuQyxjQUFjLEVBQUUsYUFBYTtZQUM3QixnQkFBZ0IsRUFBRSxlQUFlO1lBQ2pDLGdCQUFnQixFQUFFLGVBQWU7U0FDbEMsQ0FBQztRQUVGLE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQztJQUNwQyxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxhQUFhLENBQUMsS0FBYTtRQUN6QixNQUFNLFVBQVUsR0FBRyw0QkFBNEIsQ0FBQztRQUNoRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0gsbUJBQW1CLENBQUMsV0FBbUI7UUFDckMsd0NBQXdDO1FBQ3hDLE1BQU0sVUFBVSxHQUFHLG1CQUFtQixDQUFDO1FBQ3ZDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN0QyxDQUFDO0NBQ0Y7QUF4U0Qsd0VBd1NDO0FBRUQsNEJBQTRCO0FBQ2YsUUFBQSw4QkFBOEIsR0FBRyxJQUFJLDhCQUE4QixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTm90aWZpY2F0aW9uIFByZWZlcmVuY2VzIFNlcnZpY2VcclxuICogXHJcbiAqIE1hbmFnZXMgdXNlciBub3RpZmljYXRpb24gcHJlZmVyZW5jZXMgaW5jbHVkaW5nIGNoYW5uZWxzLCBldmVudCB0eXBlcywgcXVpZXQgaG91cnMsIGFuZCBmcmVxdWVuY3kgbGltaXRzLlxyXG4gKiBQcm92aWRlcyBwcmVmZXJlbmNlIHZhbGlkYXRpb24sIGZpbHRlcmluZywgYW5kIGRlZmF1bHQgcHJlZmVyZW5jZSBhcHBsaWNhdGlvbi5cclxuICovXHJcblxyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIEdldENvbW1hbmQsIFB1dENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBOb3RpZmljYXRpb25QcmVmZXJlbmNlcywgTm90aWZpY2F0aW9uQ2hhbm5lbCB9IGZyb20gJy4uL3R5cGVzL25vdGlmaWNhdGlvbic7XHJcbmltcG9ydCB7IHNhbml0aXplUHJlZmVyZW5jZXMsIFNlY3VyZUxvZ2dlciB9IGZyb20gJy4uL3V0aWxzL3NlY3VyaXR5LXV0aWwnO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gbmV3IFNlY3VyZUxvZ2dlcignTm90aWZpY2F0aW9uUHJlZmVyZW5jZXNTZXJ2aWNlJyk7XHJcblxyXG5leHBvcnQgY2xhc3MgTm90aWZpY2F0aW9uUHJlZmVyZW5jZXNTZXJ2aWNlIHtcclxuICBwcml2YXRlIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudDtcclxuICBwcml2YXRlIHRhYmxlTmFtZTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5kb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50IGFzIGFueSk7XHJcbiAgICB0aGlzLnRhYmxlTmFtZSA9IHByb2Nlc3MuZW52Lk5PVElGSUNBVElPTl9QUkVGRVJFTkNFU19UQUJMRSB8fCAnTm90aWZpY2F0aW9uUHJlZmVyZW5jZXMnO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHVzZXIgbm90aWZpY2F0aW9uIHByZWZlcmVuY2VzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBVc2VyIHByZWZlcmVuY2VzIG9yIGRlZmF1bHQgcHJlZmVyZW5jZXMgaWYgbm9uZSBjb25maWd1cmVkXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0UHJlZmVyZW5jZXModXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPE5vdGlmaWNhdGlvblByZWZlcmVuY2VzPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7IHVzZXJJZCB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAgIGlmIChyZXNwb25zZS5JdGVtKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLkl0ZW0gYXMgTm90aWZpY2F0aW9uUHJlZmVyZW5jZXM7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFJldHVybiBkZWZhdWx0IHByZWZlcmVuY2VzIGlmIG5vbmUgY29uZmlndXJlZFxyXG4gICAgICByZXR1cm4gdGhpcy5nZXREZWZhdWx0UHJlZmVyZW5jZXModXNlcklkKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgZ2V0dGluZyBwcmVmZXJlbmNlcycsIHsgdXNlcklkLCBlcnJvciB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgdXNlciBub3RpZmljYXRpb24gcHJlZmVyZW5jZXNcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdXNlcklkIC0gVXNlciBJRFxyXG4gICAqIEBwYXJhbSBwcmVmZXJlbmNlcyAtIFBhcnRpYWwgcHJlZmVyZW5jZXMgdG8gdXBkYXRlXHJcbiAgICogQHJldHVybnMgVXBkYXRlZCBwcmVmZXJlbmNlc1xyXG4gICAqL1xyXG4gIGFzeW5jIHVwZGF0ZVByZWZlcmVuY2VzKFxyXG4gICAgdXNlcklkOiBzdHJpbmcsXHJcbiAgICBwcmVmZXJlbmNlczogUGFydGlhbDxOb3RpZmljYXRpb25QcmVmZXJlbmNlcz5cclxuICApOiBQcm9taXNlPE5vdGlmaWNhdGlvblByZWZlcmVuY2VzPiB7XHJcbiAgICAvLyBTYW5pdGl6ZSBhbmQgdmFsaWRhdGUgaW5wdXQgZGF0YVxyXG4gICAgaWYgKHByZWZlcmVuY2VzLnByZWZlcmVuY2VzKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3Qgc2FuaXRpemVkID0gc2FuaXRpemVQcmVmZXJlbmNlcyhwcmVmZXJlbmNlcy5wcmVmZXJlbmNlcyk7XHJcbiAgICAgICAgcHJlZmVyZW5jZXMucHJlZmVyZW5jZXMgPSB7XHJcbiAgICAgICAgICAuLi5wcmVmZXJlbmNlcy5wcmVmZXJlbmNlcyxcclxuICAgICAgICAgIC4uLnNhbml0aXplZCxcclxuICAgICAgICB9O1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGxvZ2dlci5lcnJvcignSW52YWxpZCBwcmVmZXJlbmNlIGRhdGEnLCB7IHVzZXJJZCwgZXJyb3IgfSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcmVmZXJlbmNlIHZhbGlkYXRpb24gZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG5cclxuICAgIC8vIEdldCBleGlzdGluZyBwcmVmZXJlbmNlcyBvciBkZWZhdWx0c1xyXG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmdldFByZWZlcmVuY2VzKHVzZXJJZCk7XHJcblxyXG4gICAgLy8gTWVyZ2Ugd2l0aCBleGlzdGluZyBwcmVmZXJlbmNlc1xyXG4gICAgY29uc3QgdXBkYXRlZDogTm90aWZpY2F0aW9uUHJlZmVyZW5jZXMgPSB7XHJcbiAgICAgIC4uLmV4aXN0aW5nLFxyXG4gICAgICAuLi5wcmVmZXJlbmNlcyxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICB1cGRhdGVkQXQ6IG5vdyxcclxuICAgIH07XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEl0ZW06IHVwZGF0ZWQsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1ByZWZlcmVuY2VzIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5JywgeyB1c2VySWQgfSk7XHJcbiAgICAgIHJldHVybiB1cGRhdGVkO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciB1cGRhdGluZyBwcmVmZXJlbmNlcycsIHsgdXNlcklkLCBlcnJvciB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBub3RpZmljYXRpb24gc2hvdWxkIGJlIHNlbnQgYmFzZWQgb24gdXNlciBwcmVmZXJlbmNlc1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB1c2VySWQgLSBVc2VyIElEXHJcbiAgICogQHBhcmFtIGV2ZW50VHlwZSAtIEV2ZW50IHR5cGVcclxuICAgKiBAcmV0dXJucyBUcnVlIGlmIG5vdGlmaWNhdGlvbiBzaG91bGQgYmUgc2VudFxyXG4gICAqL1xyXG4gIGFzeW5jIHNob3VsZFNlbmROb3RpZmljYXRpb24odXNlcklkOiBzdHJpbmcsIGV2ZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCBwcmVmZXJlbmNlcyA9IGF3YWl0IHRoaXMuZ2V0UHJlZmVyZW5jZXModXNlcklkKTtcclxuXHJcbiAgICAvLyBNYXAgZXZlbnQgdHlwZSB0byBwcmVmZXJlbmNlIGtleVxyXG4gICAgY29uc3QgcHJlZmVyZW5jZUtleSA9IHRoaXMuZ2V0UHJlZmVyZW5jZUtleShldmVudFR5cGUpO1xyXG4gICAgaWYgKCFwcmVmZXJlbmNlS2V5KSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBldmVudFByZWZlcmVuY2UgPSBwcmVmZXJlbmNlcy5wcmVmZXJlbmNlc1twcmVmZXJlbmNlS2V5XTtcclxuICAgIGlmICghZXZlbnRQcmVmZXJlbmNlKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcml0aWNhbCBhbGVydHMgYWx3YXlzIHNlbnQgKG92ZXJyaWRlIHByZWZlcmVuY2VzKVxyXG4gICAgaWYgKGV2ZW50VHlwZSA9PT0gJ2NyaXRpY2FsX2FsZXJ0Jykge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiBldmVudCB0eXBlIGlzIGVuYWJsZWRcclxuICAgIGlmICghZXZlbnRQcmVmZXJlbmNlLmVuYWJsZWQpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIHF1aWV0IGhvdXJzIGZvciBub24tY3JpdGljYWwgbm90aWZpY2F0aW9uc1xyXG4gICAgaWYgKGF3YWl0IHRoaXMuaXNJblF1aWV0SG91cnModXNlcklkKSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZnJlcXVlbmN5IGxpbWl0c1xyXG4gICAgaWYgKGF3YWl0IHRoaXMuY2hlY2tGcmVxdWVuY3lMaW1pdCh1c2VySWQpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBkZWxpdmVyeSBjaGFubmVscyBmb3IgdXNlciBhbmQgZXZlbnQgdHlwZVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB1c2VySWQgLSBVc2VyIElEXHJcbiAgICogQHBhcmFtIGV2ZW50VHlwZSAtIEV2ZW50IHR5cGVcclxuICAgKiBAcmV0dXJucyBBcnJheSBvZiBub3RpZmljYXRpb24gY2hhbm5lbHNcclxuICAgKi9cclxuICBhc3luYyBnZXREZWxpdmVyeUNoYW5uZWxzKHVzZXJJZDogc3RyaW5nLCBldmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8Tm90aWZpY2F0aW9uQ2hhbm5lbFtdPiB7XHJcbiAgICBjb25zdCBwcmVmZXJlbmNlcyA9IGF3YWl0IHRoaXMuZ2V0UHJlZmVyZW5jZXModXNlcklkKTtcclxuXHJcbiAgICBjb25zdCBwcmVmZXJlbmNlS2V5ID0gdGhpcy5nZXRQcmVmZXJlbmNlS2V5KGV2ZW50VHlwZSk7XHJcbiAgICBpZiAoIXByZWZlcmVuY2VLZXkpIHtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGV2ZW50UHJlZmVyZW5jZSA9IHByZWZlcmVuY2VzLnByZWZlcmVuY2VzW3ByZWZlcmVuY2VLZXldO1xyXG4gICAgaWYgKCFldmVudFByZWZlcmVuY2UpIHtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBldmVudFByZWZlcmVuY2UuY2hhbm5lbHMgfHwgW107XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBjdXJyZW50IHRpbWUgaXMgd2l0aGluIHVzZXIncyBxdWlldCBob3Vyc1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB1c2VySWQgLSBVc2VyIElEXHJcbiAgICogQHJldHVybnMgVHJ1ZSBpZiBpbiBxdWlldCBob3Vyc1xyXG4gICAqL1xyXG4gIGFzeW5jIGlzSW5RdWlldEhvdXJzKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCBwcmVmZXJlbmNlcyA9IGF3YWl0IHRoaXMuZ2V0UHJlZmVyZW5jZXModXNlcklkKTtcclxuXHJcbiAgICBpZiAoIXByZWZlcmVuY2VzLnF1aWV0SG91cnMgfHwgIXByZWZlcmVuY2VzLnF1aWV0SG91cnMuZW5hYmxlZCkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgeyBzdGFydFRpbWUsIGVuZFRpbWUsIHRpbWV6b25lIH0gPSBwcmVmZXJlbmNlcy5xdWlldEhvdXJzO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdldCBjdXJyZW50IHRpbWUgaW4gdXNlcidzIHRpbWV6b25lXHJcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcbiAgICAgIGNvbnN0IHVzZXJUaW1lID0gbmV3IERhdGUobm93LnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHsgdGltZVpvbmU6IHRpbWV6b25lIH0pKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGN1cnJlbnRIb3VyID0gdXNlclRpbWUuZ2V0SG91cnMoKTtcclxuICAgICAgY29uc3QgY3VycmVudE1pbnV0ZSA9IHVzZXJUaW1lLmdldE1pbnV0ZXMoKTtcclxuICAgICAgY29uc3QgY3VycmVudFRpbWVNaW51dGVzID0gY3VycmVudEhvdXIgKiA2MCArIGN1cnJlbnRNaW51dGU7XHJcblxyXG4gICAgICAvLyBQYXJzZSBzdGFydCBhbmQgZW5kIHRpbWVzXHJcbiAgICAgIGNvbnN0IFtzdGFydEhvdXIsIHN0YXJ0TWludXRlXSA9IHN0YXJ0VGltZS5zcGxpdCgnOicpLm1hcChOdW1iZXIpO1xyXG4gICAgICBjb25zdCBbZW5kSG91ciwgZW5kTWludXRlXSA9IGVuZFRpbWUuc3BsaXQoJzonKS5tYXAoTnVtYmVyKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHN0YXJ0VGltZU1pbnV0ZXMgPSBzdGFydEhvdXIgKiA2MCArIHN0YXJ0TWludXRlO1xyXG4gICAgICBjb25zdCBlbmRUaW1lTWludXRlcyA9IGVuZEhvdXIgKiA2MCArIGVuZE1pbnV0ZTtcclxuXHJcbiAgICAgIC8vIEhhbmRsZSBxdWlldCBob3VycyB0aGF0IHNwYW4gbWlkbmlnaHRcclxuICAgICAgaWYgKHN0YXJ0VGltZU1pbnV0ZXMgPiBlbmRUaW1lTWludXRlcykge1xyXG4gICAgICAgIHJldHVybiBjdXJyZW50VGltZU1pbnV0ZXMgPj0gc3RhcnRUaW1lTWludXRlcyB8fCBjdXJyZW50VGltZU1pbnV0ZXMgPD0gZW5kVGltZU1pbnV0ZXM7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBjdXJyZW50VGltZU1pbnV0ZXMgPj0gc3RhcnRUaW1lTWludXRlcyAmJiBjdXJyZW50VGltZU1pbnV0ZXMgPD0gZW5kVGltZU1pbnV0ZXM7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyBxdWlldCBob3VycycsIHsgdXNlcklkLCBlcnJvciB9KTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgdXNlciBoYXMgZXhjZWVkZWQgZnJlcXVlbmN5IGxpbWl0XHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBUcnVlIGlmIGZyZXF1ZW5jeSBsaW1pdCBleGNlZWRlZFxyXG4gICAqL1xyXG4gIGFzeW5jIGNoZWNrRnJlcXVlbmN5TGltaXQodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIGNvbnN0IHByZWZlcmVuY2VzID0gYXdhaXQgdGhpcy5nZXRQcmVmZXJlbmNlcyh1c2VySWQpO1xyXG5cclxuICAgIGlmICghcHJlZmVyZW5jZXMuZnJlcXVlbmN5TGltaXQgfHwgIXByZWZlcmVuY2VzLmZyZXF1ZW5jeUxpbWl0LmVuYWJsZWQpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRPRE86IEltcGxlbWVudCBmcmVxdWVuY3kgdHJhY2tpbmcgdXNpbmcgRHluYW1vREIgb3IgRWxhc3RpQ2FjaGVcclxuICAgIC8vIEZvciBub3csIHJldHVybiBmYWxzZSAobm90IGV4Y2VlZGVkKVxyXG4gICAgLy8gVGhpcyB3b3VsZCByZXF1aXJlIHRyYWNraW5nIG5vdGlmaWNhdGlvbiBjb3VudHMgcGVyIHVzZXIgcGVyIGhvdXJcclxuICAgIFxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGRlZmF1bHQgbm90aWZpY2F0aW9uIHByZWZlcmVuY2VzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBEZWZhdWx0IHByZWZlcmVuY2VzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXREZWZhdWx0UHJlZmVyZW5jZXModXNlcklkOiBzdHJpbmcpOiBOb3RpZmljYXRpb25QcmVmZXJlbmNlcyB7XHJcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBwcmVmZXJlbmNlczoge1xyXG4gICAgICAgIHRlc3RDb21wbGV0aW9uOiB7XHJcbiAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgIGNoYW5uZWxzOiBbJ2VtYWlsJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0ZXN0RmFpbHVyZToge1xyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIGNoYW5uZWxzOiBbJ2VtYWlsJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcml0aWNhbEFsZXJ0OiB7XHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgY2hhbm5lbHM6IFsnZW1haWwnLCAnc21zJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdW1tYXJ5UmVwb3J0OiB7XHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgZnJlcXVlbmN5OiAnd2Vla2x5JyxcclxuICAgICAgICAgIGNoYW5uZWxzOiBbJ2VtYWlsJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgY3JlYXRlZEF0OiBub3csXHJcbiAgICAgIHVwZGF0ZWRBdDogbm93LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE1hcCBldmVudCB0eXBlIHRvIHByZWZlcmVuY2Uga2V5XHJcbiAgICogXHJcbiAgICogQHBhcmFtIGV2ZW50VHlwZSAtIEV2ZW50IHR5cGVcclxuICAgKiBAcmV0dXJucyBQcmVmZXJlbmNlIGtleVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2V0UHJlZmVyZW5jZUtleShldmVudFR5cGU6IHN0cmluZyk6IGtleW9mIE5vdGlmaWNhdGlvblByZWZlcmVuY2VzWydwcmVmZXJlbmNlcyddIHwgbnVsbCB7XHJcbiAgICBjb25zdCBtYXBwaW5nOiBSZWNvcmQ8c3RyaW5nLCBrZXlvZiBOb3RpZmljYXRpb25QcmVmZXJlbmNlc1sncHJlZmVyZW5jZXMnXT4gPSB7XHJcbiAgICAgICd0ZXN0X2NvbXBsZXRpb24nOiAndGVzdENvbXBsZXRpb24nLFxyXG4gICAgICAndGVzdF9mYWlsdXJlJzogJ3Rlc3RGYWlsdXJlJyxcclxuICAgICAgJ2NyaXRpY2FsX2FsZXJ0JzogJ2NyaXRpY2FsQWxlcnQnLFxyXG4gICAgICAnc3VtbWFyeV9yZXBvcnQnOiAnc3VtbWFyeVJlcG9ydCcsXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBtYXBwaW5nW2V2ZW50VHlwZV0gfHwgbnVsbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIGVtYWlsIGFkZHJlc3MgZm9ybWF0XHJcbiAgICogXHJcbiAgICogQHBhcmFtIGVtYWlsIC0gRW1haWwgYWRkcmVzc1xyXG4gICAqIEByZXR1cm5zIFRydWUgaWYgdmFsaWRcclxuICAgKi9cclxuICB2YWxpZGF0ZUVtYWlsKGVtYWlsOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IGVtYWlsUmVnZXggPSAvXlteXFxzQF0rQFteXFxzQF0rXFwuW15cXHNAXSskLztcclxuICAgIHJldHVybiBlbWFpbFJlZ2V4LnRlc3QoZW1haWwpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgcGhvbmUgbnVtYmVyIGZvcm1hdCAoRS4xNjQpXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHBob25lTnVtYmVyIC0gUGhvbmUgbnVtYmVyXHJcbiAgICogQHJldHVybnMgVHJ1ZSBpZiB2YWxpZFxyXG4gICAqL1xyXG4gIHZhbGlkYXRlUGhvbmVOdW1iZXIocGhvbmVOdW1iZXI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gRS4xNjQgZm9ybWF0OiArW2NvdW50cnkgY29kZV1bbnVtYmVyXVxyXG4gICAgY29uc3QgcGhvbmVSZWdleCA9IC9eXFwrWzEtOV1cXGR7MSwxNH0kLztcclxuICAgIHJldHVybiBwaG9uZVJlZ2V4LnRlc3QocGhvbmVOdW1iZXIpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3Qgbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNTZXJ2aWNlID0gbmV3IE5vdGlmaWNhdGlvblByZWZlcmVuY2VzU2VydmljZSgpO1xyXG4iXX0=
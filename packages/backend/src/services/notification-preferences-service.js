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
            console.error('Error getting preferences', { userId, error });
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
        // Validate email addresses and phone numbers if provided
        if (preferences.preferences) {
            // Email validation would happen at the API layer
            // Phone validation would happen at the API layer
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
            return updated;
        }
        catch (error) {
            console.error('Error updating preferences', { userId, error });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXByZWZlcmVuY2VzLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub3RpZmljYXRpb24tcHJlZmVyZW5jZXMtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILDhEQUEwRDtBQUMxRCx3REFBdUY7QUFHdkYsTUFBYSw4QkFBOEI7SUFDakMsU0FBUyxDQUF5QjtJQUNsQyxTQUFTLENBQVM7SUFFMUI7UUFDRSxNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUM7WUFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7U0FDOUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixJQUFJLHlCQUF5QixDQUFDO0lBQzNGLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBYztRQUNqQyxJQUFJLENBQUM7WUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUFVLENBQUM7Z0JBQzdCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDekIsR0FBRyxFQUFFLEVBQUUsTUFBTSxFQUFFO2FBQ2hCLENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFcEQsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sUUFBUSxDQUFDLElBQStCLENBQUM7WUFDbEQsQ0FBQztZQUVELGdEQUFnRDtZQUNoRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBQUMsT0FBTyxL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QztRQUN2QyxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdEMsQ0FBQztDQUNGO0FBL1JELHdFQStSQztBQUVELDRCQUE0QjtBQUNmLFFBQUEsOEJBQThCLEdBQUcsSUFBSSw4QkFBOEIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE5vdGlmaWNhdGlvbiBQcmVmZXJlbmNlcyBTZXJ2aWNlXHJcbiAqIFxyXG4gKiBNYW5hZ2VzIHVzZXIgbm90aWZpY2F0aW9uIHByZWZlcmVuY2VzIGluY2x1ZGluZyBjaGFubmVscywgZXZlbnQgdHlwZXMsIHF1aWV0IGhvdXJzLCBhbmQgZnJlcXVlbmN5IGxpbWl0cy5cclxuICogUHJvdmlkZXMgcHJlZmVyZW5jZSB2YWxpZGF0aW9uLCBmaWx0ZXJpbmcsIGFuZCBkZWZhdWx0IHByZWZlcmVuY2UgYXBwbGljYXRpb24uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBHZXRDb21tYW5kLCBQdXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uUHJlZmVyZW5jZXMsIE5vdGlmaWNhdGlvbkNoYW5uZWwgfSBmcm9tICcuLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIE5vdGlmaWNhdGlvblByZWZlcmVuY2VzU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQ7XHJcbiAgcHJpdmF0ZSB0YWJsZU5hbWU6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBjb25zdCBjbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICB9KTtcclxuICAgIHRoaXMuZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCk7XHJcbiAgICB0aGlzLnRhYmxlTmFtZSA9IHByb2Nlc3MuZW52Lk5PVElGSUNBVElPTl9QUkVGRVJFTkNFU19UQUJMRSB8fCAnTm90aWZpY2F0aW9uUHJlZmVyZW5jZXMnO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHVzZXIgbm90aWZpY2F0aW9uIHByZWZlcmVuY2VzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBVc2VyIHByZWZlcmVuY2VzIG9yIGRlZmF1bHQgcHJlZmVyZW5jZXMgaWYgbm9uZSBjb25maWd1cmVkXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0UHJlZmVyZW5jZXModXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPE5vdGlmaWNhdGlvblByZWZlcmVuY2VzPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7IHVzZXJJZCB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAgIGlmIChyZXNwb25zZS5JdGVtKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLkl0ZW0gYXMgTm90aWZpY2F0aW9uUHJlZmVyZW5jZXM7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFJldHVybiBkZWZhdWx0IHByZWZlcmVuY2VzIGlmIG5vbmUgY29uZmlndXJlZFxyXG4gICAgICByZXR1cm4gdGhpcy5nZXREZWZhdWx0UHJlZmVyZW5jZXModXNlcklkKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgcHJlZmVyZW5jZXMnLCB7IHVzZXJJZCwgZXJyb3IgfSk7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIHVzZXIgbm90aWZpY2F0aW9uIHByZWZlcmVuY2VzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcGFyYW0gcHJlZmVyZW5jZXMgLSBQYXJ0aWFsIHByZWZlcmVuY2VzIHRvIHVwZGF0ZVxyXG4gICAqIEByZXR1cm5zIFVwZGF0ZWQgcHJlZmVyZW5jZXNcclxuICAgKi9cclxuICBhc3luYyB1cGRhdGVQcmVmZXJlbmNlcyhcclxuICAgIHVzZXJJZDogc3RyaW5nLFxyXG4gICAgcHJlZmVyZW5jZXM6IFBhcnRpYWw8Tm90aWZpY2F0aW9uUHJlZmVyZW5jZXM+XHJcbiAgKTogUHJvbWlzZTxOb3RpZmljYXRpb25QcmVmZXJlbmNlcz4ge1xyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgYWRkcmVzc2VzIGFuZCBwaG9uZSBudW1iZXJzIGlmIHByb3ZpZGVkXHJcbiAgICBpZiAocHJlZmVyZW5jZXMucHJlZmVyZW5jZXMpIHtcclxuICAgICAgLy8gRW1haWwgdmFsaWRhdGlvbiB3b3VsZCBoYXBwZW4gYXQgdGhlIEFQSSBsYXllclxyXG4gICAgICAvLyBQaG9uZSB2YWxpZGF0aW9uIHdvdWxkIGhhcHBlbiBhdCB0aGUgQVBJIGxheWVyXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG5cclxuICAgIC8vIEdldCBleGlzdGluZyBwcmVmZXJlbmNlcyBvciBkZWZhdWx0c1xyXG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmdldFByZWZlcmVuY2VzKHVzZXJJZCk7XHJcblxyXG4gICAgLy8gTWVyZ2Ugd2l0aCBleGlzdGluZyBwcmVmZXJlbmNlc1xyXG4gICAgY29uc3QgdXBkYXRlZDogTm90aWZpY2F0aW9uUHJlZmVyZW5jZXMgPSB7XHJcbiAgICAgIC4uLmV4aXN0aW5nLFxyXG4gICAgICAuLi5wcmVmZXJlbmNlcyxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICB1cGRhdGVkQXQ6IG5vdyxcclxuICAgIH07XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEl0ZW06IHVwZGF0ZWQsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIHVwZGF0ZWQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBwcmVmZXJlbmNlcycsIHsgdXNlcklkLCBlcnJvciB9KTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBub3RpZmljYXRpb24gc2hvdWxkIGJlIHNlbnQgYmFzZWQgb24gdXNlciBwcmVmZXJlbmNlc1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB1c2VySWQgLSBVc2VyIElEXHJcbiAgICogQHBhcmFtIGV2ZW50VHlwZSAtIEV2ZW50IHR5cGVcclxuICAgKiBAcmV0dXJucyBUcnVlIGlmIG5vdGlmaWNhdGlvbiBzaG91bGQgYmUgc2VudFxyXG4gICAqL1xyXG4gIGFzeW5jIHNob3VsZFNlbmROb3RpZmljYXRpb24odXNlcklkOiBzdHJpbmcsIGV2ZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCBwcmVmZXJlbmNlcyA9IGF3YWl0IHRoaXMuZ2V0UHJlZmVyZW5jZXModXNlcklkKTtcclxuXHJcbiAgICAvLyBNYXAgZXZlbnQgdHlwZSB0byBwcmVmZXJlbmNlIGtleVxyXG4gICAgY29uc3QgcHJlZmVyZW5jZUtleSA9IHRoaXMuZ2V0UHJlZmVyZW5jZUtleShldmVudFR5cGUpO1xyXG4gICAgaWYgKCFwcmVmZXJlbmNlS2V5KSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBldmVudFByZWZlcmVuY2UgPSBwcmVmZXJlbmNlcy5wcmVmZXJlbmNlc1twcmVmZXJlbmNlS2V5XTtcclxuICAgIGlmICghZXZlbnRQcmVmZXJlbmNlKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcml0aWNhbCBhbGVydHMgYWx3YXlzIHNlbnQgKG92ZXJyaWRlIHByZWZlcmVuY2VzKVxyXG4gICAgaWYgKGV2ZW50VHlwZSA9PT0gJ2NyaXRpY2FsX2FsZXJ0Jykge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiBldmVudCB0eXBlIGlzIGVuYWJsZWRcclxuICAgIGlmICghZXZlbnRQcmVmZXJlbmNlLmVuYWJsZWQpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIHF1aWV0IGhvdXJzIGZvciBub24tY3JpdGljYWwgbm90aWZpY2F0aW9uc1xyXG4gICAgaWYgKGF3YWl0IHRoaXMuaXNJblF1aWV0SG91cnModXNlcklkKSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZnJlcXVlbmN5IGxpbWl0c1xyXG4gICAgaWYgKGF3YWl0IHRoaXMuY2hlY2tGcmVxdWVuY3lMaW1pdCh1c2VySWQpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBkZWxpdmVyeSBjaGFubmVscyBmb3IgdXNlciBhbmQgZXZlbnQgdHlwZVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB1c2VySWQgLSBVc2VyIElEXHJcbiAgICogQHBhcmFtIGV2ZW50VHlwZSAtIEV2ZW50IHR5cGVcclxuICAgKiBAcmV0dXJucyBBcnJheSBvZiBub3RpZmljYXRpb24gY2hhbm5lbHNcclxuICAgKi9cclxuICBhc3luYyBnZXREZWxpdmVyeUNoYW5uZWxzKHVzZXJJZDogc3RyaW5nLCBldmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8Tm90aWZpY2F0aW9uQ2hhbm5lbFtdPiB7XHJcbiAgICBjb25zdCBwcmVmZXJlbmNlcyA9IGF3YWl0IHRoaXMuZ2V0UHJlZmVyZW5jZXModXNlcklkKTtcclxuXHJcbiAgICBjb25zdCBwcmVmZXJlbmNlS2V5ID0gdGhpcy5nZXRQcmVmZXJlbmNlS2V5KGV2ZW50VHlwZSk7XHJcbiAgICBpZiAoIXByZWZlcmVuY2VLZXkpIHtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGV2ZW50UHJlZmVyZW5jZSA9IHByZWZlcmVuY2VzLnByZWZlcmVuY2VzW3ByZWZlcmVuY2VLZXldO1xyXG4gICAgaWYgKCFldmVudFByZWZlcmVuY2UpIHtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBldmVudFByZWZlcmVuY2UuY2hhbm5lbHMgfHwgW107XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBjdXJyZW50IHRpbWUgaXMgd2l0aGluIHVzZXIncyBxdWlldCBob3Vyc1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB1c2VySWQgLSBVc2VyIElEXHJcbiAgICogQHJldHVybnMgVHJ1ZSBpZiBpbiBxdWlldCBob3Vyc1xyXG4gICAqL1xyXG4gIGFzeW5jIGlzSW5RdWlldEhvdXJzKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCBwcmVmZXJlbmNlcyA9IGF3YWl0IHRoaXMuZ2V0UHJlZmVyZW5jZXModXNlcklkKTtcclxuXHJcbiAgICBpZiAoIXByZWZlcmVuY2VzLnF1aWV0SG91cnMgfHwgIXByZWZlcmVuY2VzLnF1aWV0SG91cnMuZW5hYmxlZCkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgeyBzdGFydFRpbWUsIGVuZFRpbWUsIHRpbWV6b25lIH0gPSBwcmVmZXJlbmNlcy5xdWlldEhvdXJzO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdldCBjdXJyZW50IHRpbWUgaW4gdXNlcidzIHRpbWV6b25lXHJcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcbiAgICAgIGNvbnN0IHVzZXJUaW1lID0gbmV3IERhdGUobm93LnRvTG9jYWxlU3RyaW5nKCdlbi1VUycsIHsgdGltZVpvbmU6IHRpbWV6b25lIH0pKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGN1cnJlbnRIb3VyID0gdXNlclRpbWUuZ2V0SG91cnMoKTtcclxuICAgICAgY29uc3QgY3VycmVudE1pbnV0ZSA9IHVzZXJUaW1lLmdldE1pbnV0ZXMoKTtcclxuICAgICAgY29uc3QgY3VycmVudFRpbWVNaW51dGVzID0gY3VycmVudEhvdXIgKiA2MCArIGN1cnJlbnRNaW51dGU7XHJcblxyXG4gICAgICAvLyBQYXJzZSBzdGFydCBhbmQgZW5kIHRpbWVzXHJcbiAgICAgIGNvbnN0IFtzdGFydEhvdXIsIHN0YXJ0TWludXRlXSA9IHN0YXJ0VGltZS5zcGxpdCgnOicpLm1hcChOdW1iZXIpO1xyXG4gICAgICBjb25zdCBbZW5kSG91ciwgZW5kTWludXRlXSA9IGVuZFRpbWUuc3BsaXQoJzonKS5tYXAoTnVtYmVyKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHN0YXJ0VGltZU1pbnV0ZXMgPSBzdGFydEhvdXIgKiA2MCArIHN0YXJ0TWludXRlO1xyXG4gICAgICBjb25zdCBlbmRUaW1lTWludXRlcyA9IGVuZEhvdXIgKiA2MCArIGVuZE1pbnV0ZTtcclxuXHJcbiAgICAgIC8vIEhhbmRsZSBxdWlldCBob3VycyB0aGF0IHNwYW4gbWlkbmlnaHRcclxuICAgICAgaWYgKHN0YXJ0VGltZU1pbnV0ZXMgPiBlbmRUaW1lTWludXRlcykge1xyXG4gICAgICAgIHJldHVybiBjdXJyZW50VGltZU1pbnV0ZXMgPj0gc3RhcnRUaW1lTWludXRlcyB8fCBjdXJyZW50VGltZU1pbnV0ZXMgPD0gZW5kVGltZU1pbnV0ZXM7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiBjdXJyZW50VGltZU1pbnV0ZXMgPj0gc3RhcnRUaW1lTWludXRlcyAmJiBjdXJyZW50VGltZU1pbnV0ZXMgPD0gZW5kVGltZU1pbnV0ZXM7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyBxdWlldCBob3VycycsIHsgdXNlcklkLCBlcnJvciB9KTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgdXNlciBoYXMgZXhjZWVkZWQgZnJlcXVlbmN5IGxpbWl0XHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBUcnVlIGlmIGZyZXF1ZW5jeSBsaW1pdCBleGNlZWRlZFxyXG4gICAqL1xyXG4gIGFzeW5jIGNoZWNrRnJlcXVlbmN5TGltaXQodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIGNvbnN0IHByZWZlcmVuY2VzID0gYXdhaXQgdGhpcy5nZXRQcmVmZXJlbmNlcyh1c2VySWQpO1xyXG5cclxuICAgIGlmICghcHJlZmVyZW5jZXMuZnJlcXVlbmN5TGltaXQgfHwgIXByZWZlcmVuY2VzLmZyZXF1ZW5jeUxpbWl0LmVuYWJsZWQpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRPRE86IEltcGxlbWVudCBmcmVxdWVuY3kgdHJhY2tpbmcgdXNpbmcgRHluYW1vREIgb3IgRWxhc3RpQ2FjaGVcclxuICAgIC8vIEZvciBub3csIHJldHVybiBmYWxzZSAobm90IGV4Y2VlZGVkKVxyXG4gICAgLy8gVGhpcyB3b3VsZCByZXF1aXJlIHRyYWNraW5nIG5vdGlmaWNhdGlvbiBjb3VudHMgcGVyIHVzZXIgcGVyIGhvdXJcclxuICAgIFxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGRlZmF1bHQgbm90aWZpY2F0aW9uIHByZWZlcmVuY2VzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBEZWZhdWx0IHByZWZlcmVuY2VzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXREZWZhdWx0UHJlZmVyZW5jZXModXNlcklkOiBzdHJpbmcpOiBOb3RpZmljYXRpb25QcmVmZXJlbmNlcyB7XHJcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBwcmVmZXJlbmNlczoge1xyXG4gICAgICAgIHRlc3RDb21wbGV0aW9uOiB7XHJcbiAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgIGNoYW5uZWxzOiBbJ2VtYWlsJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0ZXN0RmFpbHVyZToge1xyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIGNoYW5uZWxzOiBbJ2VtYWlsJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcml0aWNhbEFsZXJ0OiB7XHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgY2hhbm5lbHM6IFsnZW1haWwnLCAnc21zJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdW1tYXJ5UmVwb3J0OiB7XHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgZnJlcXVlbmN5OiAnd2Vla2x5JyxcclxuICAgICAgICAgIGNoYW5uZWxzOiBbJ2VtYWlsJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgY3JlYXRlZEF0OiBub3csXHJcbiAgICAgIHVwZGF0ZWRBdDogbm93LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE1hcCBldmVudCB0eXBlIHRvIHByZWZlcmVuY2Uga2V5XHJcbiAgICogXHJcbiAgICogQHBhcmFtIGV2ZW50VHlwZSAtIEV2ZW50IHR5cGVcclxuICAgKiBAcmV0dXJucyBQcmVmZXJlbmNlIGtleVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2V0UHJlZmVyZW5jZUtleShldmVudFR5cGU6IHN0cmluZyk6IGtleW9mIE5vdGlmaWNhdGlvblByZWZlcmVuY2VzWydwcmVmZXJlbmNlcyddIHwgbnVsbCB7XHJcbiAgICBjb25zdCBtYXBwaW5nOiBSZWNvcmQ8c3RyaW5nLCBrZXlvZiBOb3RpZmljYXRpb25QcmVmZXJlbmNlc1sncHJlZmVyZW5jZXMnXT4gPSB7XHJcbiAgICAgICd0ZXN0X2NvbXBsZXRpb24nOiAndGVzdENvbXBsZXRpb24nLFxyXG4gICAgICAndGVzdF9mYWlsdXJlJzogJ3Rlc3RGYWlsdXJlJyxcclxuICAgICAgJ2NyaXRpY2FsX2FsZXJ0JzogJ2NyaXRpY2FsQWxlcnQnLFxyXG4gICAgICAnc3VtbWFyeV9yZXBvcnQnOiAnc3VtbWFyeVJlcG9ydCcsXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBtYXBwaW5nW2V2ZW50VHlwZV0gfHwgbnVsbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIGVtYWlsIGFkZHJlc3MgZm9ybWF0XHJcbiAgICogXHJcbiAgICogQHBhcmFtIGVtYWlsIC0gRW1haWwgYWRkcmVzc1xyXG4gICAqIEByZXR1cm5zIFRydWUgaWYgdmFsaWRcclxuICAgKi9cclxuICB2YWxpZGF0ZUVtYWlsKGVtYWlsOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IGVtYWlsUmVnZXggPSAvXlteXFxzQF0rQFteXFxzQF0rXFwuW15cXHNAXSskLztcclxuICAgIHJldHVybiBlbWFpbFJlZ2V4LnRlc3QoZW1haWwpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgcGhvbmUgbnVtYmVyIGZvcm1hdCAoRS4xNjQpXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHBob25lTnVtYmVyIC0gUGhvbmUgbnVtYmVyXHJcbiAgICogQHJldHVybnMgVHJ1ZSBpZiB2YWxpZFxyXG4gICAqL1xyXG4gIHZhbGlkYXRlUGhvbmVOdW1iZXIocGhvbmVOdW1iZXI6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gRS4xNjQgZm9ybWF0OiArW2NvdW50cnkgY29kZV1bbnVtYmVyXVxyXG4gICAgY29uc3QgcGhvbmVSZWdleCA9IC9eXFwrWzEtOV1cXGR7MSwxNH0kLztcclxuICAgIHJldHVybiBwaG9uZVJlZ2V4LnRlc3QocGhvbmVOdW1iZXIpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3Qgbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNTZXJ2aWNlID0gbmV3IE5vdGlmaWNhdGlvblByZWZlcmVuY2VzU2VydmljZSgpO1xyXG4iXX0=
/**
 * Notification Preferences Service
 *
 * Manages user notification preferences including channels, event types, quiet hours, and frequency limits.
 * Provides preference validation, filtering, and default preference application.
 */
import { NotificationPreferences, NotificationChannel } from '../types/notification';
export declare class NotificationPreferencesService {
    private docClient;
    private tableName;
    constructor();
    /**
     * Get user notification preferences
     *
     * @param userId - User ID
     * @returns User preferences or default preferences if none configured
     */
    getPreferences(userId: string): Promise<NotificationPreferences>;
    /**
     * Update user notification preferences
     *
     * @param userId - User ID
     * @param preferences - Partial preferences to update
     * @returns Updated preferences
     */
    updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
    /**
     * Check if notification should be sent based on user preferences
     *
     * @param userId - User ID
     * @param eventType - Event type
     * @returns True if notification should be sent
     */
    shouldSendNotification(userId: string, eventType: string): Promise<boolean>;
    /**
     * Get delivery channels for user and event type
     *
     * @param userId - User ID
     * @param eventType - Event type
     * @returns Array of notification channels
     */
    getDeliveryChannels(userId: string, eventType: string): Promise<NotificationChannel[]>;
    /**
     * Check if current time is within user's quiet hours
     *
     * @param userId - User ID
     * @returns True if in quiet hours
     */
    isInQuietHours(userId: string): Promise<boolean>;
    /**
     * Check if user has exceeded frequency limit
     *
     * @param userId - User ID
     * @returns True if frequency limit exceeded
     */
    checkFrequencyLimit(userId: string): Promise<boolean>;
    /**
     * Get default notification preferences
     *
     * @param userId - User ID
     * @returns Default preferences
     */
    private getDefaultPreferences;
    /**
     * Map event type to preference key
     *
     * @param eventType - Event type
     * @returns Preference key
     */
    private getPreferenceKey;
    /**
     * Check if user should receive summary report based on frequency preference
     *
     * @param userId - User ID
     * @param reportType - Report type (daily, weekly, monthly)
     * @returns True if user should receive the report
     */
    shouldReceiveReport(userId: string, reportType: 'daily' | 'weekly' | 'monthly'): Promise<boolean>;
    /**
     * Get Slack webhooks for user and event type
     *
     * @param userId - User ID
     * @param eventType - Event type
     * @returns Array of Slack webhook configurations
     */
    getSlackWebhooks(userId: string, eventType: string): Promise<Array<{
        webhookUrl: string;
        channel: string;
    }>>;
    /**
     * Validate email address format
     *
     * @param email - Email address
     * @returns True if valid
     */
    validateEmail(email: string): boolean;
    /**
     * Validate phone number format (E.164)
     *
     * @param phoneNumber - Phone number
     * @returns True if valid
     */
    validatePhoneNumber(phoneNumber: string): boolean;
}
export declare const notificationPreferencesService: NotificationPreferencesService;

/**
 * Notification Preferences Service
 * 
 * Manages user notification preferences including channels, event types, quiet hours, and frequency limits.
 * Provides preference validation, filtering, and default preference application.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { NotificationPreferences, NotificationChannel } from '../types/notification';

export class NotificationPreferencesService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.NOTIFICATION_PREFERENCES_TABLE || 'NotificationPreferences';
  }

  /**
   * Get user notification preferences
   * 
   * @param userId - User ID
   * @returns User preferences or default preferences if none configured
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { userId },
      });

      const response = await this.docClient.send(command);

      if (response.Item) {
        return response.Item as NotificationPreferences;
      }

      // Return default preferences if none configured
      return this.getDefaultPreferences(userId);
    } catch (error) {
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
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    // Validate email addresses and phone numbers if provided
    if (preferences.preferences) {
      // Email validation would happen at the API layer
      // Phone validation would happen at the API layer
    }

    const now = new Date().toISOString();

    // Get existing preferences or defaults
    const existing = await this.getPreferences(userId);

    // Merge with existing preferences
    const updated: NotificationPreferences = {
      ...existing,
      ...preferences,
      userId,
      updatedAt: now,
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: updated,
      });

      await this.docClient.send(command);
      return updated;
    } catch (error) {
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
  async shouldSendNotification(userId: string, eventType: string): Promise<boolean> {
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
  async getDeliveryChannels(userId: string, eventType: string): Promise<NotificationChannel[]> {
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
  async isInQuietHours(userId: string): Promise<boolean> {
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
    } catch (error) {
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
  async checkFrequencyLimit(userId: string): Promise<boolean> {
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
  private getDefaultPreferences(userId: string): NotificationPreferences {
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
  private getPreferenceKey(eventType: string): keyof NotificationPreferences['preferences'] | null {
    const mapping: Record<string, keyof NotificationPreferences['preferences']> = {
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
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (E.164)
   * 
   * @param phoneNumber - Phone number
   * @returns True if valid
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }
}

// Export singleton instance
export const notificationPreferencesService = new NotificationPreferencesService();

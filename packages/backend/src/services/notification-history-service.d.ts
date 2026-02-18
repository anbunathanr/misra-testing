/**
 * Notification History Service
 *
 * Persists and queries notification delivery history for audit and debugging.
 * Supports filtering, pagination, and TTL management.
 */
import { NotificationHistoryRecord, NotificationHistoryQuery, PaginatedNotificationHistory } from '../types/notification';
export declare class NotificationHistoryService {
    private docClient;
    private tableName;
    private readonly TTL_DAYS;
    constructor();
    /**
     * Record notification attempt
     *
     * @param record - Notification record without ID and sentAt
     * @returns Created notification record
     */
    recordNotification(record: Omit<NotificationHistoryRecord, 'notificationId' | 'sentAt'>): Promise<NotificationHistoryRecord>;
    /**
     * Update delivery status of notification
     *
     * @param notificationId - Notification ID
     * @param status - New delivery status
     * @param deliveredAt - Optional delivery timestamp
     */
    updateDeliveryStatus(notificationId: string, status: string, deliveredAt?: string): Promise<void>;
    /**
     * Query notification history with filters and pagination
     *
     * @param query - Query parameters
     * @returns Paginated notification history
     */
    queryHistory(query: NotificationHistoryQuery): Promise<PaginatedNotificationHistory>;
    /**
     * Get notification by ID
     *
     * @param notificationId - Notification ID
     * @returns Notification record or null if not found
     */
    getNotificationById(notificationId: string): Promise<NotificationHistoryRecord | null>;
    /**
     * Archive old records (manual cleanup, TTL handles automatic deletion)
     *
     * @param olderThanDays - Delete records older than this many days
     * @returns Number of records archived
     */
    archiveOldRecords(olderThanDays: number): Promise<number>;
    /**
     * Query history by user ID
     */
    private queryByUser;
    /**
     * Query history by event type
     */
    private queryByEventType;
    /**
     * Scan table with filters (less efficient, use when no GSI applies)
     */
    private scanWithFilters;
}
export declare const notificationHistoryService: NotificationHistoryService;

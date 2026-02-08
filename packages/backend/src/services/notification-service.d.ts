/**
 * Notification Service
 * Handles user notifications for analysis completion and errors
 */
export declare enum NotificationType {
    ANALYSIS_COMPLETE = "analysis_complete",
    ANALYSIS_FAILED = "analysis_failed",
    FILE_UPLOAD_COMPLETE = "file_upload_complete",
    FILE_UPLOAD_FAILED = "file_upload_failed",
    SYSTEM_ERROR = "system_error"
}
export interface NotificationPayload {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    email?: string;
    phoneNumber?: string;
}
export declare class NotificationService {
    private snsClient;
    private sesClient;
    private region;
    constructor(region?: string);
    /**
     * Send notification to user
     */
    sendNotification(payload: NotificationPayload): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
    /**
     * Send email notification using SES
     */
    private sendEmailNotification;
    /**
     * Send SMS notification using SNS
     */
    private sendSMSNotification;
    /**
     * Send in-app notification (stored in database)
     */
    private sendInAppNotification;
    /**
     * Format email body as plain text
     */
    private formatEmailBody;
    /**
     * Format email body as HTML
     */
    private formatEmailHTML;
    /**
     * Send analysis completion notification
     */
    notifyAnalysisComplete(userId: string, fileId: string, fileName: string, violationsCount: number, email?: string): Promise<void>;
    /**
     * Send analysis failure notification
     */
    notifyAnalysisFailure(userId: string, fileId: string, fileName: string, errorMessage: string, email?: string): Promise<void>;
    /**
     * Send system error notification to admins
     */
    notifySystemError(errorId: string, errorMessage: string, context?: Record<string, any>): Promise<void>;
}

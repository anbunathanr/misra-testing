/**
 * Notification Template Service
 *
 * Manages notification templates with variable substitution for different event types and channels.
 * Supports template CRUD operations, rendering, and validation.
 */
import { NotificationTemplate, TemplateRenderContext, NotificationChannel } from '../types/notification';
export declare class NotificationTemplateService {
    private docClient;
    private tableName;
    constructor();
    /**
     * Get template by event type and channel
     *
     * @param eventType - Event type (test_completion, test_failure, etc.)
     * @param channel - Notification channel (email, sms, slack, webhook)
     * @returns Notification template or null if not found
     */
    getTemplate(eventType: string, channel: NotificationChannel): Promise<NotificationTemplate | null>;
    /**
     * Render template with variable substitution
     *
     * @param template - Notification template
     * @param context - Render context with variable values
     * @returns Rendered template string
     */
    renderTemplate(template: NotificationTemplate, context: TemplateRenderContext): Promise<string>;
    /**
     * Create new template
     *
     * @param template - Template data without ID and timestamps
     * @returns Created template with ID and timestamps
     */
    createTemplate(template: Omit<NotificationTemplate, 'templateId' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate>;
    /**
     * Update existing template
     *
     * @param templateId - Template ID
     * @param updates - Partial template updates
     * @returns Updated template
     */
    updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate>;
    /**
     * Validate template syntax
     *
     * @param template - Template to validate
     * @returns True if template is valid
     */
    validateTemplate(template: NotificationTemplate): Promise<boolean>;
}
export declare const notificationTemplateService: NotificationTemplateService;

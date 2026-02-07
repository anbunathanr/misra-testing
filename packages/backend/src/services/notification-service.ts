/**
 * Notification Service
 * Handles user notifications for analysis completion and errors
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export enum NotificationType {
  ANALYSIS_COMPLETE = 'analysis_complete',
  ANALYSIS_FAILED = 'analysis_failed',
  FILE_UPLOAD_COMPLETE = 'file_upload_complete',
  FILE_UPLOAD_FAILED = 'file_upload_failed',
  SYSTEM_ERROR = 'system_error'
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

export class NotificationService {
  private snsClient: SNSClient;
  private sesClient: SESClient;
  private region: string;

  constructor(region: string = 'us-east-1') {
    this.region = region;
    this.snsClient = new SNSClient({ region });
    this.sesClient = new SESClient({ region });
  }

  /**
   * Send notification to user
   */
  async sendNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      console.log('Sending notification:', payload);

      // Determine notification method based on payload
      if (payload.email) {
        return await this.sendEmailNotification(payload);
      } else if (payload.phoneNumber) {
        return await this.sendSMSNotification(payload);
      } else {
        // Default to in-app notification (would be stored in database)
        return await this.sendInAppNotification(payload);
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send email notification using SES
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const emailBody = this.formatEmailBody(payload);
      
      const command = new SendEmailCommand({
        Source: process.env.NOTIFICATION_EMAIL || 'noreply@misra-platform.com',
        Destination: {
          ToAddresses: [payload.email!]
        },
        Message: {
          Subject: {
            Data: payload.title
          },
          Body: {
            Text: {
              Data: emailBody
            },
            Html: {
              Data: this.formatEmailHTML(payload)
            }
          }
        }
      });

      const response = await this.sesClient.send(command);
      
      return {
        success: true,
        messageId: response.MessageId
      };
    } catch (error) {
      console.error('Email notification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email send failed'
      };
    }
  }

  /**
   * Send SMS notification using SNS
   */
  private async sendSMSNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const command = new PublishCommand({
        PhoneNumber: payload.phoneNumber,
        Message: `${payload.title}\n\n${payload.message}`
      });

      const response = await this.snsClient.send(command);
      
      return {
        success: true,
        messageId: response.MessageId
      };
    } catch (error) {
      console.error('SMS notification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS send failed'
      };
    }
  }

  /**
   * Send in-app notification (stored in database)
   */
  private async sendInAppNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    // In a real implementation, this would store the notification in DynamoDB
    // For now, we'll just log it
    console.log('In-app notification:', {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      timestamp: Date.now()
    });

    return {
      success: true,
      messageId: `in-app-${Date.now()}`
    };
  }

  /**
   * Format email body as plain text
   */
  private formatEmailBody(payload: NotificationPayload): string {
    let body = `${payload.title}\n\n${payload.message}\n\n`;
    
    if (payload.data) {
      body += 'Details:\n';
      Object.entries(payload.data).forEach(([key, value]) => {
        body += `  ${key}: ${value}\n`;
      });
    }
    
    body += '\n---\nMISRA Web Testing Platform\n';
    return body;
  }

  /**
   * Format email body as HTML
   */
  private formatEmailHTML(payload: NotificationPayload): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .details { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${payload.title}</h1>
          </div>
          <div class="content">
            <p>${payload.message}</p>
    `;

    if (payload.data) {
      html += '<div class="details"><h3>Details:</h3><ul>';
      Object.entries(payload.data).forEach(([key, value]) => {
        html += `<li><strong>${key}:</strong> ${value}</li>`;
      });
      html += '</ul></div>';
    }

    html += `
          </div>
          <div class="footer">
            <p>MISRA Web Testing Platform</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Send analysis completion notification
   */
  async notifyAnalysisComplete(
    userId: string,
    fileId: string,
    fileName: string,
    violationsCount: number,
    email?: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.ANALYSIS_COMPLETE,
      title: 'MISRA Analysis Complete',
      message: `Your analysis for "${fileName}" has completed successfully.`,
      data: {
        fileId,
        fileName,
        violationsCount,
        timestamp: new Date().toISOString()
      },
      email
    });
  }

  /**
   * Send analysis failure notification
   */
  async notifyAnalysisFailure(
    userId: string,
    fileId: string,
    fileName: string,
    errorMessage: string,
    email?: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.ANALYSIS_FAILED,
      title: 'MISRA Analysis Failed',
      message: `Analysis for "${fileName}" failed: ${errorMessage}`,
      data: {
        fileId,
        fileName,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      email
    });
  }

  /**
   * Send system error notification to admins
   */
  async notifySystemError(
    errorId: string,
    errorMessage: string,
    context?: Record<string, any>
  ): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (adminEmail) {
      await this.sendNotification({
        userId: 'system',
        type: NotificationType.SYSTEM_ERROR,
        title: 'System Error Alert',
        message: `A system error has occurred: ${errorMessage}`,
        data: {
          errorId,
          error: errorMessage,
          context,
          timestamp: new Date().toISOString()
        },
        email: adminEmail
      });
    }
  }
}

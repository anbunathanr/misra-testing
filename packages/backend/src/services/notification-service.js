"use strict";
/**
 * Notification Service
 * Handles user notifications for analysis completion and errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = exports.NotificationType = void 0;
const client_sns_1 = require("@aws-sdk/client-sns");
const client_ses_1 = require("@aws-sdk/client-ses");
var NotificationType;
(function (NotificationType) {
    NotificationType["ANALYSIS_COMPLETE"] = "analysis_complete";
    NotificationType["ANALYSIS_FAILED"] = "analysis_failed";
    NotificationType["FILE_UPLOAD_COMPLETE"] = "file_upload_complete";
    NotificationType["FILE_UPLOAD_FAILED"] = "file_upload_failed";
    NotificationType["SYSTEM_ERROR"] = "system_error";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
class NotificationService {
    snsClient;
    sesClient;
    region;
    constructor(region = 'us-east-1') {
        this.region = region;
        this.snsClient = new client_sns_1.SNSClient({ region });
        this.sesClient = new client_ses_1.SESClient({ region });
    }
    /**
     * Send notification to user
     */
    async sendNotification(payload) {
        try {
            console.log('Sending notification:', payload);
            // Determine notification method based on payload
            if (payload.email) {
                return await this.sendEmailNotification(payload);
            }
            else if (payload.phoneNumber) {
                return await this.sendSMSNotification(payload);
            }
            else {
                // Default to in-app notification (would be stored in database)
                return await this.sendInAppNotification(payload);
            }
        }
        catch (error) {
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
    async sendEmailNotification(payload) {
        try {
            const emailBody = this.formatEmailBody(payload);
            const command = new client_ses_1.SendEmailCommand({
                Source: process.env.NOTIFICATION_EMAIL || 'noreply@misra-platform.com',
                Destination: {
                    ToAddresses: [payload.email]
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
        }
        catch (error) {
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
    async sendSMSNotification(payload) {
        try {
            const command = new client_sns_1.PublishCommand({
                PhoneNumber: payload.phoneNumber,
                Message: `${payload.title}\n\n${payload.message}`
            });
            const response = await this.snsClient.send(command);
            return {
                success: true,
                messageId: response.MessageId
            };
        }
        catch (error) {
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
    async sendInAppNotification(payload) {
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
    formatEmailBody(payload) {
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
    formatEmailHTML(payload) {
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
    async notifyAnalysisComplete(userId, fileId, fileName, violationsCount, email) {
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
    async notifyAnalysisFailure(userId, fileId, fileName, errorMessage, email) {
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
    async notifySystemError(errorId, errorMessage, context) {
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
exports.NotificationService = NotificationService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub3RpZmljYXRpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCxvREFBZ0U7QUFDaEUsb0RBQWtFO0FBRWxFLElBQVksZ0JBTVg7QUFORCxXQUFZLGdCQUFnQjtJQUMxQiwyREFBdUMsQ0FBQTtJQUN2Qyx1REFBbUMsQ0FBQTtJQUNuQyxpRUFBNkMsQ0FBQTtJQUM3Qyw2REFBeUMsQ0FBQTtJQUN6QyxpREFBNkIsQ0FBQTtBQUMvQixDQUFDLEVBTlcsZ0JBQWdCLGdDQUFoQixnQkFBZ0IsUUFNM0I7QUFZRCxNQUFhLG1CQUFtQjtJQUN0QixTQUFTLENBQVk7SUFDckIsU0FBUyxDQUFZO0lBQ3JCLE1BQU0sQ0FBUztJQUV2QixZQUFZLFNBQWlCLFdBQVc7UUFDdEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBNEI7UUFLakQsSUFBSSxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUU5QyxpREFBaUQ7WUFDakQsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbkQsQ0FBQztpQkFBTSxJQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDL0IsT0FBTyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxP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QUUsaUJBQWlCLFFBQVEsYUFBYSxZQUFZLEVBQUU7WUFDN0QsSUFBSSxFQUFFO2dCQUNKLE1BQU07Z0JBQ04sUUFBUTtnQkFDUixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2FBQ3BDO1lBQ0QsS0FBSztTQUNOLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxpQkFBaUIsQ0FDckIsT0FBZSxFQUNmLFlBQW9CLEVBQ3BCLE9BQTZCO1FBRTdCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDO1FBRTNDLElBQUksVUFBVSxFQUFFLENBQUM7WUFDZixNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDMUIsTUFBTSxFQUFFLFFBQVE7Z0JBQ2hCLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZO2dCQUNuQyxLQUFLLEVBQUUsb0JBQW9CO2dCQUMzQixPQUFPLEVBQUUsZ0NBQWdDLFlBQVksRUFBRTtnQkFDdkQsSUFBSSxFQUFFO29CQUNKLE9BQU87b0JBQ1AsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLE9BQU87b0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNwQztnQkFDRCxLQUFLLEVBQUUsVUFBVTthQUNsQixDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBeFJELGtEQXdSQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBOb3RpZmljYXRpb24gU2VydmljZVxyXG4gKiBIYW5kbGVzIHVzZXIgbm90aWZpY2F0aW9ucyBmb3IgYW5hbHlzaXMgY29tcGxldGlvbiBhbmQgZXJyb3JzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgU05TQ2xpZW50LCBQdWJsaXNoQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBTRVNDbGllbnQsIFNlbmRFbWFpbENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc2VzJztcclxuXHJcbmV4cG9ydCBlbnVtIE5vdGlmaWNhdGlvblR5cGUge1xyXG4gIEFOQUxZU0lTX0NPTVBMRVRFID0gJ2FuYWx5c2lzX2NvbXBsZXRlJyxcclxuICBBTkFMWVNJU19GQUlMRUQgPSAnYW5hbHlzaXNfZmFpbGVkJyxcclxuICBGSUxFX1VQTE9BRF9DT01QTEVURSA9ICdmaWxlX3VwbG9hZF9jb21wbGV0ZScsXHJcbiAgRklMRV9VUExPQURfRkFJTEVEID0gJ2ZpbGVfdXBsb2FkX2ZhaWxlZCcsXHJcbiAgU1lTVEVNX0VSUk9SID0gJ3N5c3RlbV9lcnJvcidcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBOb3RpZmljYXRpb25QYXlsb2FkIHtcclxuICB1c2VySWQ6IHN0cmluZztcclxuICB0eXBlOiBOb3RpZmljYXRpb25UeXBlO1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIGRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gIGVtYWlsPzogc3RyaW5nO1xyXG4gIHBob25lTnVtYmVyPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTm90aWZpY2F0aW9uU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBzbnNDbGllbnQ6IFNOU0NsaWVudDtcclxuICBwcml2YXRlIHNlc0NsaWVudDogU0VTQ2xpZW50O1xyXG4gIHByaXZhdGUgcmVnaW9uOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHJlZ2lvbjogc3RyaW5nID0gJ3VzLWVhc3QtMScpIHtcclxuICAgIHRoaXMucmVnaW9uID0gcmVnaW9uO1xyXG4gICAgdGhpcy5zbnNDbGllbnQgPSBuZXcgU05TQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG4gICAgdGhpcy5zZXNDbGllbnQgPSBuZXcgU0VTQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBub3RpZmljYXRpb24gdG8gdXNlclxyXG4gICAqL1xyXG4gIGFzeW5jIHNlbmROb3RpZmljYXRpb24ocGF5bG9hZDogTm90aWZpY2F0aW9uUGF5bG9hZCk6IFByb21pc2U8e1xyXG4gICAgc3VjY2VzczogYm9vbGVhbjtcclxuICAgIG1lc3NhZ2VJZD86IHN0cmluZztcclxuICAgIGVycm9yPzogc3RyaW5nO1xyXG4gIH0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIG5vdGlmaWNhdGlvbjonLCBwYXlsb2FkKTtcclxuXHJcbiAgICAgIC8vIERldGVybWluZSBub3RpZmljYXRpb24gbWV0aG9kIGJhc2VkIG9uIHBheWxvYWRcclxuICAgICAgaWYgKHBheWxvYWQuZW1haWwpIHtcclxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZW5kRW1haWxOb3RpZmljYXRpb24ocGF5bG9hZCk7XHJcbiAgICAgIH0gZWxzZSBpZiAocGF5bG9hZC5waG9uZU51bWJlcikge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNlbmRTTVNOb3RpZmljYXRpb24ocGF5bG9hZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gRGVmYXVsdCB0byBpbi1hcHAgbm90aWZpY2F0aW9uICh3b3VsZCBiZSBzdG9yZWQgaW4gZGF0YWJhc2UpXHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2VuZEluQXBwTm90aWZpY2F0aW9uKHBheWxvYWQpO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2VuZCBub3RpZmljYXRpb246JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBlbWFpbCBub3RpZmljYXRpb24gdXNpbmcgU0VTXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBzZW5kRW1haWxOb3RpZmljYXRpb24ocGF5bG9hZDogTm90aWZpY2F0aW9uUGF5bG9hZCk6IFByb21pc2U8e1xyXG4gICAgc3VjY2VzczogYm9vbGVhbjtcclxuICAgIG1lc3NhZ2VJZD86IHN0cmluZztcclxuICAgIGVycm9yPzogc3RyaW5nO1xyXG4gIH0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGVtYWlsQm9keSA9IHRoaXMuZm9ybWF0RW1haWxCb2R5KHBheWxvYWQpO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBTZW5kRW1haWxDb21tYW5kKHtcclxuICAgICAgICBTb3VyY2U6IHByb2Nlc3MuZW52Lk5PVElGSUNBVElPTl9FTUFJTCB8fCAnbm9yZXBseUBtaXNyYS1wbGF0Zm9ybS5jb20nLFxyXG4gICAgICAgIERlc3RpbmF0aW9uOiB7XHJcbiAgICAgICAgICBUb0FkZHJlc3NlczogW3BheWxvYWQuZW1haWwhXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgTWVzc2FnZToge1xyXG4gICAgICAgICAgU3ViamVjdDoge1xyXG4gICAgICAgICAgICBEYXRhOiBwYXlsb2FkLnRpdGxlXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgQm9keToge1xyXG4gICAgICAgICAgICBUZXh0OiB7XHJcbiAgICAgICAgICAgICAgRGF0YTogZW1haWxCb2R5XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIEh0bWw6IHtcclxuICAgICAgICAgICAgICBEYXRhOiB0aGlzLmZvcm1hdEVtYWlsSFRNTChwYXlsb2FkKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zZXNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBtZXNzYWdlSWQ6IHJlc3BvbnNlLk1lc3NhZ2VJZFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRW1haWwgbm90aWZpY2F0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0VtYWlsIHNlbmQgZmFpbGVkJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBTTVMgbm90aWZpY2F0aW9uIHVzaW5nIFNOU1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc2VuZFNNU05vdGlmaWNhdGlvbihwYXlsb2FkOiBOb3RpZmljYXRpb25QYXlsb2FkKTogUHJvbWlzZTx7XHJcbiAgICBzdWNjZXNzOiBib29sZWFuO1xyXG4gICAgbWVzc2FnZUlkPzogc3RyaW5nO1xyXG4gICAgZXJyb3I/OiBzdHJpbmc7XHJcbiAgfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdWJsaXNoQ29tbWFuZCh7XHJcbiAgICAgICAgUGhvbmVOdW1iZXI6IHBheWxvYWQucGhvbmVOdW1iZXIsXHJcbiAgICAgICAgTWVzc2FnZTogYCR7cGF5bG9hZC50aXRsZX1cXG5cXG4ke3BheWxvYWQubWVzc2FnZX1gXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnNuc0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2VJZDogcmVzcG9uc2UuTWVzc2FnZUlkXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdTTVMgbm90aWZpY2F0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1NNUyBzZW5kIGZhaWxlZCdcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNlbmQgaW4tYXBwIG5vdGlmaWNhdGlvbiAoc3RvcmVkIGluIGRhdGFiYXNlKVxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc2VuZEluQXBwTm90aWZpY2F0aW9uKHBheWxvYWQ6IE5vdGlmaWNhdGlvblBheWxvYWQpOiBQcm9taXNlPHtcclxuICAgIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgICBtZXNzYWdlSWQ/OiBzdHJpbmc7XHJcbiAgICBlcnJvcj86IHN0cmluZztcclxuICB9PiB7XHJcbiAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHRoaXMgd291bGQgc3RvcmUgdGhlIG5vdGlmaWNhdGlvbiBpbiBEeW5hbW9EQlxyXG4gICAgLy8gRm9yIG5vdywgd2UnbGwganVzdCBsb2cgaXRcclxuICAgIGNvbnNvbGUubG9nKCdJbi1hcHAgbm90aWZpY2F0aW9uOicsIHtcclxuICAgICAgdXNlcklkOiBwYXlsb2FkLnVzZXJJZCxcclxuICAgICAgdHlwZTogcGF5bG9hZC50eXBlLFxyXG4gICAgICB0aXRsZTogcGF5bG9hZC50aXRsZSxcclxuICAgICAgbWVzc2FnZTogcGF5bG9hZC5tZXNzYWdlLFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIG1lc3NhZ2VJZDogYGluLWFwcC0ke0RhdGUubm93KCl9YFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZvcm1hdCBlbWFpbCBib2R5IGFzIHBsYWluIHRleHRcclxuICAgKi9cclxuICBwcml2YXRlIGZvcm1hdEVtYWlsQm9keShwYXlsb2FkOiBOb3RpZmljYXRpb25QYXlsb2FkKTogc3RyaW5nIHtcclxuICAgIGxldCBib2R5ID0gYCR7cGF5bG9hZC50aXRsZX1cXG5cXG4ke3BheWxvYWQubWVzc2FnZX1cXG5cXG5gO1xyXG4gICAgXHJcbiAgICBpZiAocGF5bG9hZC5kYXRhKSB7XHJcbiAgICAgIGJvZHkgKz0gJ0RldGFpbHM6XFxuJztcclxuICAgICAgT2JqZWN0LmVudHJpZXMocGF5bG9hZC5kYXRhKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgICAgICBib2R5ICs9IGAgICR7a2V5fTogJHt2YWx1ZX1cXG5gO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgYm9keSArPSAnXFxuLS0tXFxuTUlTUkEgV2ViIFRlc3RpbmcgUGxhdGZvcm1cXG4nO1xyXG4gICAgcmV0dXJuIGJvZHk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGb3JtYXQgZW1haWwgYm9keSBhcyBIVE1MXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBmb3JtYXRFbWFpbEhUTUwocGF5bG9hZDogTm90aWZpY2F0aW9uUGF5bG9hZCk6IHN0cmluZyB7XHJcbiAgICBsZXQgaHRtbCA9IGBcclxuICAgICAgPCFET0NUWVBFIGh0bWw+XHJcbiAgICAgIDxodG1sPlxyXG4gICAgICA8aGVhZD5cclxuICAgICAgICA8c3R5bGU+XHJcbiAgICAgICAgICBib2R5IHsgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOyBsaW5lLWhlaWdodDogMS42OyBjb2xvcjogIzMzMzsgfVxyXG4gICAgICAgICAgLmNvbnRhaW5lciB7IG1heC13aWR0aDogNjAwcHg7IG1hcmdpbjogMCBhdXRvOyBwYWRkaW5nOiAyMHB4OyB9XHJcbiAgICAgICAgICAuaGVhZGVyIHsgYmFja2dyb3VuZC1jb2xvcjogIzRDQUY1MDsgY29sb3I6IHdoaXRlOyBwYWRkaW5nOiAyMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IH1cclxuICAgICAgICAgIC5jb250ZW50IHsgcGFkZGluZzogMjBweDsgYmFja2dyb3VuZC1jb2xvcjogI2Y5ZjlmOTsgfVxyXG4gICAgICAgICAgLmZvb3RlciB7IHBhZGRpbmc6IDIwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsgZm9udC1zaXplOiAxMnB4OyBjb2xvcjogIzY2NjsgfVxyXG4gICAgICAgICAgLmRldGFpbHMgeyBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTsgcGFkZGluZzogMTVweDsgbWFyZ2luOiAxMHB4IDA7IGJvcmRlci1sZWZ0OiA0cHggc29saWQgIzRDQUY1MDsgfVxyXG4gICAgICAgIDwvc3R5bGU+XHJcbiAgICAgIDwvaGVhZD5cclxuICAgICAgPGJvZHk+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxyXG4gICAgICAgICAgICA8aDE+JHtwYXlsb2FkLnRpdGxlfTwvaDE+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XHJcbiAgICAgICAgICAgIDxwPiR7cGF5bG9hZC5tZXNzYWdlfTwvcD5cclxuICAgIGA7XHJcblxyXG4gICAgaWYgKHBheWxvYWQuZGF0YSkge1xyXG4gICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGV0YWlsc1wiPjxoMz5EZXRhaWxzOjwvaDM+PHVsPic7XHJcbiAgICAgIE9iamVjdC5lbnRyaWVzKHBheWxvYWQuZGF0YSkuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XHJcbiAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtrZXl9Ojwvc3Ryb25nPiAke3ZhbHVlfTwvbGk+YDtcclxuICAgICAgfSk7XHJcbiAgICAgIGh0bWwgKz0gJzwvdWw+PC9kaXY+JztcclxuICAgIH1cclxuXHJcbiAgICBodG1sICs9IGBcclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImZvb3RlclwiPlxyXG4gICAgICAgICAgICA8cD5NSVNSQSBXZWIgVGVzdGluZyBQbGF0Zm9ybTwvcD5cclxuICAgICAgICAgICAgPHA+VGhpcyBpcyBhbiBhdXRvbWF0ZWQgbm90aWZpY2F0aW9uLiBQbGVhc2UgZG8gbm90IHJlcGx5IHRvIHRoaXMgZW1haWwuPC9wPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgIDwvYm9keT5cclxuICAgICAgPC9odG1sPlxyXG4gICAgYDtcclxuXHJcbiAgICByZXR1cm4gaHRtbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNlbmQgYW5hbHlzaXMgY29tcGxldGlvbiBub3RpZmljYXRpb25cclxuICAgKi9cclxuICBhc3luYyBub3RpZnlBbmFseXNpc0NvbXBsZXRlKFxyXG4gICAgdXNlcklkOiBzdHJpbmcsXHJcbiAgICBmaWxlSWQ6IHN0cmluZyxcclxuICAgIGZpbGVOYW1lOiBzdHJpbmcsXHJcbiAgICB2aW9sYXRpb25zQ291bnQ6IG51bWJlcixcclxuICAgIGVtYWlsPzogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnNlbmROb3RpZmljYXRpb24oe1xyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHR5cGU6IE5vdGlmaWNhdGlvblR5cGUuQU5BTFlTSVNfQ09NUExFVEUsXHJcbiAgICAgIHRpdGxlOiAnTUlTUkEgQW5hbHlzaXMgQ29tcGxldGUnLFxyXG4gICAgICBtZXNzYWdlOiBgWW91ciBhbmFseXNpcyBmb3IgXCIke2ZpbGVOYW1lfVwiIGhhcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5LmAsXHJcbiAgICAgIGRhdGE6IHtcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgZmlsZU5hbWUsXHJcbiAgICAgICAgdmlvbGF0aW9uc0NvdW50LFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgIH0sXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNlbmQgYW5hbHlzaXMgZmFpbHVyZSBub3RpZmljYXRpb25cclxuICAgKi9cclxuICBhc3luYyBub3RpZnlBbmFseXNpc0ZhaWx1cmUoXHJcbiAgICB1c2VySWQ6IHN0cmluZyxcclxuICAgIGZpbGVJZDogc3RyaW5nLFxyXG4gICAgZmlsZU5hbWU6IHN0cmluZyxcclxuICAgIGVycm9yTWVzc2FnZTogc3RyaW5nLFxyXG4gICAgZW1haWw/OiBzdHJpbmdcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuc2VuZE5vdGlmaWNhdGlvbih7XHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgdHlwZTogTm90aWZpY2F0aW9uVHlwZS5BTkFMWVNJU19GQUlMRUQsXHJcbiAgICAgIHRpdGxlOiAnTUlTUkEgQW5hbHlzaXMgRmFpbGVkJyxcclxuICAgICAgbWVzc2FnZTogYEFuYWx5c2lzIGZvciBcIiR7ZmlsZU5hbWV9XCIgZmFpbGVkOiAke2Vycm9yTWVzc2FnZX1gLFxyXG4gICAgICBkYXRhOiB7XHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgIGVycm9yOiBlcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfSxcclxuICAgICAgZW1haWxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBzeXN0ZW0gZXJyb3Igbm90aWZpY2F0aW9uIHRvIGFkbWluc1xyXG4gICAqL1xyXG4gIGFzeW5jIG5vdGlmeVN5c3RlbUVycm9yKFxyXG4gICAgZXJyb3JJZDogc3RyaW5nLFxyXG4gICAgZXJyb3JNZXNzYWdlOiBzdHJpbmcsXHJcbiAgICBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgYWRtaW5FbWFpbCA9IHByb2Nlc3MuZW52LkFETUlOX0VNQUlMO1xyXG4gICAgXHJcbiAgICBpZiAoYWRtaW5FbWFpbCkge1xyXG4gICAgICBhd2FpdCB0aGlzLnNlbmROb3RpZmljYXRpb24oe1xyXG4gICAgICAgIHVzZXJJZDogJ3N5c3RlbScsXHJcbiAgICAgICAgdHlwZTogTm90aWZpY2F0aW9uVHlwZS5TWVNURU1fRVJST1IsXHJcbiAgICAgICAgdGl0bGU6ICdTeXN0ZW0gRXJyb3IgQWxlcnQnLFxyXG4gICAgICAgIG1lc3NhZ2U6IGBBIHN5c3RlbSBlcnJvciBoYXMgb2NjdXJyZWQ6ICR7ZXJyb3JNZXNzYWdlfWAsXHJcbiAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgZXJyb3JJZCxcclxuICAgICAgICAgIGVycm9yOiBlcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgICBjb250ZXh0LFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVtYWlsOiBhZG1pbkVtYWlsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iXX0=
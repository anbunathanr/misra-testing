"use strict";
/**
 * OTP Service
 * Handles OTP generation, storage, and verification
 * Uses DynamoDB for OTP storage with TTL expiration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = exports.OTPService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_ses_1 = require("@aws-sdk/client-ses");
const uuid_1 = require("uuid");
class OTPService {
    dynamoClient;
    sesClient;
    OTP_TABLE = process.env.OTP_TABLE || 'OTP-dev';
    OTP_EXPIRY_MINUTES = 10;
    MAX_ATTEMPTS = 5;
    SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@misra-platform.com';
    constructor() {
        const region = process.env.AWS_REGION || 'us-east-1';
        this.dynamoClient = new client_dynamodb_1.DynamoDBClient({ region });
        this.sesClient = new client_ses_1.SESClient({ region });
    }
    /**
     * Generate a new OTP and send it via email
     * Generates a fresh OTP every time - no reuse
     */
    async generateAndSendOTP(email) {
        try {
            console.log(`[OTPService] Generating OTP for email: ${email}`);
            // Generate a 6-digit OTP
            const otp = this.generateOTP();
            const otpId = (0, uuid_1.v4)();
            const now = Date.now();
            const expiresAt = now + (this.OTP_EXPIRY_MINUTES * 60 * 1000);
            console.log(`[OTPService] Generated OTP: ${otp} (expires in ${this.OTP_EXPIRY_MINUTES} minutes)`);
            // Store OTP in DynamoDB
            const otpData = {
                email,
                otp,
                createdAt: now,
                expiresAt,
                attempts: 0,
                verified: false
            };
            const command = new client_dynamodb_1.PutItemCommand({
                TableName: this.OTP_TABLE,
                Item: (0, util_dynamodb_1.marshall)({
                    otpId,
                    ...otpData,
                    ttl: Math.floor(expiresAt / 1000) // TTL in seconds for DynamoDB
                })
            });
            await this.dynamoClient.send(command);
            console.log(`[OTPService] OTP stored in DynamoDB with ID: ${otpId}`);
            // Send OTP via email
            await this.sendOTPEmail(email, otp);
            console.log(`[OTPService] OTP email sent to: ${email}`);
            return {
                success: true,
                message: `OTP sent to ${email}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
                otpId
            };
        }
        catch (error) {
            console.error('[OTPService] Error generating/sending OTP:', error);
            throw new Error(`Failed to generate OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Verify OTP
     */
    async verifyOTP(email, otp) {
        try {
            console.log(`[OTPService] Verifying OTP for email: ${email}`);
            // Query DynamoDB for the OTP
            // Note: In production, you'd want a GSI on email for efficient querying
            // For now, we'll use a scan or query pattern
            // Get the most recent OTP for this email
            const command = new client_dynamodb_1.GetItemCommand({
                TableName: this.OTP_TABLE,
                Key: (0, util_dynamodb_1.marshall)({
                    email,
                    otpId: 'latest' // This is a simplified approach - in production use GSI
                })
            });
            // For now, we'll implement a simpler approach using email as partition key
            // This requires the table to be designed with email as the partition key
            console.log(`[OTPService] OTP verification not yet fully implemented - requires GSI on email`);
            return {
                success: false,
                message: 'OTP verification requires table redesign with GSI'
            };
        }
        catch (error) {
            console.error('[OTPService] Error verifying OTP:', error);
            throw new Error(`Failed to verify OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Send OTP via email using AWS SES
     */
    async sendOTPEmail(email, otp) {
        try {
            const emailContent = `
Your MISRA Platform OTP is: ${otp}

This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.

If you didn't request this code, please ignore this email.

---
MISRA Compliance Platform
      `;
            const command = new client_ses_1.SendEmailCommand({
                Source: this.SES_FROM_EMAIL,
                Destination: {
                    ToAddresses: [email]
                },
                Message: {
                    Subject: {
                        Data: 'Your MISRA Platform OTP',
                        Charset: 'UTF-8'
                    },
                    Body: {
                        Text: {
                            Data: emailContent,
                            Charset: 'UTF-8'
                        }
                    }
                }
            });
            await this.sesClient.send(command);
            console.log(`[OTPService] Email sent successfully to: ${email}`);
        }
        catch (error) {
            console.error('[OTPService] Error sending email:', error);
            throw new Error(`Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate a random 6-digit OTP
     */
    generateOTP() {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        return otp;
    }
    /**
     * Clean up expired OTPs (can be called periodically)
     */
    async cleanupExpiredOTPs() {
        console.log('[OTPService] Cleanup of expired OTPs - requires scan operation');
        // In production, this would scan the table and delete expired entries
        // For now, we rely on DynamoDB TTL to automatically delete expired items
    }
}
exports.OTPService = OTPService;
exports.otpService = new OTPService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3RwLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJvdHAtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBRUgsOERBQTZHO0FBQzdHLDBEQUE4RDtBQUM5RCxvREFBa0U7QUFDbEUsK0JBQW9DO0FBV3BDLE1BQWEsVUFBVTtJQUNiLFlBQVksQ0FBaUI7SUFDN0IsU0FBUyxDQUFZO0lBQ1osU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQztJQUMvQyxrQkFBa0IsR0FBRyxFQUFFLENBQUM7SUFDeEIsWUFBWSxHQUFHLENBQUMsQ0FBQztJQUNqQixjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksNEJBQTRCLENBQUM7SUFFN0Y7UUFDRSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUM7UUFDckQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQWE7UUFDcEMsSUFBSSxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQ0FBMEMsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUUvRCx5QkFBeUI7WUFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQy9CLE1BQU0sS0FBSyxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7WUFDdkIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sU0FBUyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FB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SyxDQUFDLGtCQUFrQjtRQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLGdFQUFnRSxDQUFDLENBQUM7UUFDOUUsc0VBQXNFO1FBQ3RFLHlFQUF5RTtJQUMzRSxDQUFDO0NBQ0Y7QUFqS0QsZ0NBaUtDO0FBRVksUUFBQSxVQUFVLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBPVFAgU2VydmljZVxyXG4gKiBIYW5kbGVzIE9UUCBnZW5lcmF0aW9uLCBzdG9yYWdlLCBhbmQgdmVyaWZpY2F0aW9uXHJcbiAqIFVzZXMgRHluYW1vREIgZm9yIE9UUCBzdG9yYWdlIHdpdGggVFRMIGV4cGlyYXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQsIEdldEl0ZW1Db21tYW5kLCBEZWxldGVJdGVtQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IG1hcnNoYWxsLCB1bm1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XHJcbmltcG9ydCB7IFNFU0NsaWVudCwgU2VuZEVtYWlsQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZXMnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgT1RQRGF0YSB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvdHA6IHN0cmluZztcclxuICBjcmVhdGVkQXQ6IG51bWJlcjtcclxuICBleHBpcmVzQXQ6IG51bWJlcjtcclxuICBhdHRlbXB0czogbnVtYmVyO1xyXG4gIHZlcmlmaWVkOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgT1RQU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBkeW5hbW9DbGllbnQ6IER5bmFtb0RCQ2xpZW50O1xyXG4gIHByaXZhdGUgc2VzQ2xpZW50OiBTRVNDbGllbnQ7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBPVFBfVEFCTEUgPSBwcm9jZXNzLmVudi5PVFBfVEFCTEUgfHwgJ09UUC1kZXYnO1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgT1RQX0VYUElSWV9NSU5VVEVTID0gMTA7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBNQVhfQVRURU1QVFMgPSA1O1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgU0VTX0ZST01fRU1BSUwgPSBwcm9jZXNzLmVudi5TRVNfRlJPTV9FTUFJTCB8fCAnbm9yZXBseUBtaXNyYS1wbGF0Zm9ybS5jb20nO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIGNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSc7XHJcbiAgICB0aGlzLmR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbiB9KTtcclxuICAgIHRoaXMuc2VzQ2xpZW50ID0gbmV3IFNFU0NsaWVudCh7IHJlZ2lvbiB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGEgbmV3IE9UUCBhbmQgc2VuZCBpdCB2aWEgZW1haWxcclxuICAgKiBHZW5lcmF0ZXMgYSBmcmVzaCBPVFAgZXZlcnkgdGltZSAtIG5vIHJldXNlXHJcbiAgICovXHJcbiAgYXN5bmMgZ2VuZXJhdGVBbmRTZW5kT1RQKGVtYWlsOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBvdHBJZD86IHN0cmluZyB9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW09UUFNlcnZpY2VdIEdlbmVyYXRpbmcgT1RQIGZvciBlbWFpbDogJHtlbWFpbH1gKTtcclxuXHJcbiAgICAgIC8vIEdlbmVyYXRlIGEgNi1kaWdpdCBPVFBcclxuICAgICAgY29uc3Qgb3RwID0gdGhpcy5nZW5lcmF0ZU9UUCgpO1xyXG4gICAgICBjb25zdCBvdHBJZCA9IHV1aWR2NCgpO1xyXG4gICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgICBjb25zdCBleHBpcmVzQXQgPSBub3cgKyAodGhpcy5PVFBfRVhQSVJZX01JTlVURVMgKiA2MCAqIDEwMDApO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYFtPVFBTZXJ2aWNlXSBHZW5lcmF0ZWQgT1RQOiAke290cH0gKGV4cGlyZXMgaW4gJHt0aGlzLk9UUF9FWFBJUllfTUlOVVRFU30gbWludXRlcylgKTtcclxuXHJcbiAgICAgIC8vIFN0b3JlIE9UUCBpbiBEeW5hbW9EQlxyXG4gICAgICBjb25zdCBvdHBEYXRhOiBPVFBEYXRhID0ge1xyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIG90cCxcclxuICAgICAgICBjcmVhdGVkQXQ6IG5vdyxcclxuICAgICAgICBleHBpcmVzQXQsXHJcbiAgICAgICAgYXR0ZW1wdHM6IDAsXHJcbiAgICAgICAgdmVyaWZpZWQ6IGZhbHNlXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dEl0ZW1Db21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMuT1RQX1RBQkxFLFxyXG4gICAgICAgIEl0ZW06IG1hcnNoYWxsKHtcclxuICAgICAgICAgIG90cElkLFxyXG4gICAgICAgICAgLi4ub3RwRGF0YSxcclxuICAgICAgICAgIHR0bDogTWF0aC5mbG9vcihleHBpcmVzQXQgLyAxMDAwKSAvLyBUVEwgaW4gc2Vjb25kcyBmb3IgRHluYW1vREJcclxuICAgICAgICB9KVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbT1RQU2VydmljZV0gT1RQIHN0b3JlZCBpbiBEeW5hbW9EQiB3aXRoIElEOiAke290cElkfWApO1xyXG5cclxuICAgICAgLy8gU2VuZCBPVFAgdmlhIGVtYWlsXHJcbiAgICAgIGF3YWl0IHRoaXMuc2VuZE9UUEVtYWlsKGVtYWlsLCBvdHApO1xyXG4gICAgICBjb25zb2xlLmxvZyhgW09UUFNlcnZpY2VdIE9UUCBlbWFpbCBzZW50IHRvOiAke2VtYWlsfWApO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2U6IGBPVFAgc2VudCB0byAke2VtYWlsfS4gVmFsaWQgZm9yICR7dGhpcy5PVFBfRVhQSVJZX01JTlVURVN9IG1pbnV0ZXMuYCxcclxuICAgICAgICBvdHBJZFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW09UUFNlcnZpY2VdIEVycm9yIGdlbmVyYXRpbmcvc2VuZGluZyBPVFA6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBnZW5lcmF0ZSBPVFA6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgT1RQXHJcbiAgICovXHJcbiAgYXN5bmMgdmVyaWZ5T1RQKGVtYWlsOiBzdHJpbmcsIG90cDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW09UUFNlcnZpY2VdIFZlcmlmeWluZyBPVFAgZm9yIGVtYWlsOiAke2VtYWlsfWApO1xyXG5cclxuICAgICAgLy8gUXVlcnkgRHluYW1vREIgZm9yIHRoZSBPVFBcclxuICAgICAgLy8gTm90ZTogSW4gcHJvZHVjdGlvbiwgeW91J2Qgd2FudCBhIEdTSSBvbiBlbWFpbCBmb3IgZWZmaWNpZW50IHF1ZXJ5aW5nXHJcbiAgICAgIC8vIEZvciBub3csIHdlJ2xsIHVzZSBhIHNjYW4gb3IgcXVlcnkgcGF0dGVyblxyXG4gICAgICBcclxuICAgICAgLy8gR2V0IHRoZSBtb3N0IHJlY2VudCBPVFAgZm9yIHRoaXMgZW1haWxcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLk9UUF9UQUJMRSxcclxuICAgICAgICBLZXk6IG1hcnNoYWxsKHtcclxuICAgICAgICAgIGVtYWlsLFxyXG4gICAgICAgICAgb3RwSWQ6ICdsYXRlc3QnIC8vIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGFwcHJvYWNoIC0gaW4gcHJvZHVjdGlvbiB1c2UgR1NJXHJcbiAgICAgICAgfSlcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBGb3Igbm93LCB3ZSdsbCBpbXBsZW1lbnQgYSBzaW1wbGVyIGFwcHJvYWNoIHVzaW5nIGVtYWlsIGFzIHBhcnRpdGlvbiBrZXlcclxuICAgICAgLy8gVGhpcyByZXF1aXJlcyB0aGUgdGFibGUgdG8gYmUgZGVzaWduZWQgd2l0aCBlbWFpbCBhcyB0aGUgcGFydGl0aW9uIGtleVxyXG4gICAgICBcclxuICAgICAgY29uc29sZS5sb2coYFtPVFBTZXJ2aWNlXSBPVFAgdmVyaWZpY2F0aW9uIG5vdCB5ZXQgZnVsbHkgaW1wbGVtZW50ZWQgLSByZXF1aXJlcyBHU0kgb24gZW1haWxgKTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgbWVzc2FnZTogJ09UUCB2ZXJpZmljYXRpb24gcmVxdWlyZXMgdGFibGUgcmVkZXNpZ24gd2l0aCBHU0knXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbT1RQU2VydmljZV0gRXJyb3IgdmVyaWZ5aW5nIE9UUDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHZlcmlmeSBPVFA6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIE9UUCB2aWEgZW1haWwgdXNpbmcgQVdTIFNFU1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc2VuZE9UUEVtYWlsKGVtYWlsOiBzdHJpbmcsIG90cDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBlbWFpbENvbnRlbnQgPSBgXHJcbllvdXIgTUlTUkEgUGxhdGZvcm0gT1RQIGlzOiAke290cH1cclxuXHJcblRoaXMgY29kZSB3aWxsIGV4cGlyZSBpbiAke3RoaXMuT1RQX0VYUElSWV9NSU5VVEVTfSBtaW51dGVzLlxyXG5cclxuSWYgeW91IGRpZG4ndCByZXF1ZXN0IHRoaXMgY29kZSwgcGxlYXNlIGlnbm9yZSB0aGlzIGVtYWlsLlxyXG5cclxuLS0tXHJcbk1JU1JBIENvbXBsaWFuY2UgUGxhdGZvcm1cclxuICAgICAgYDtcclxuXHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgU2VuZEVtYWlsQ29tbWFuZCh7XHJcbiAgICAgICAgU291cmNlOiB0aGlzLlNFU19GUk9NX0VNQUlMLFxyXG4gICAgICAgIERlc3RpbmF0aW9uOiB7XHJcbiAgICAgICAgICBUb0FkZHJlc3NlczogW2VtYWlsXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgTWVzc2FnZToge1xyXG4gICAgICAgICAgU3ViamVjdDoge1xyXG4gICAgICAgICAgICBEYXRhOiAnWW91ciBNSVNSQSBQbGF0Zm9ybSBPVFAnLFxyXG4gICAgICAgICAgICBDaGFyc2V0OiAnVVRGLTgnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgQm9keToge1xyXG4gICAgICAgICAgICBUZXh0OiB7XHJcbiAgICAgICAgICAgICAgRGF0YTogZW1haWxDb250ZW50LFxyXG4gICAgICAgICAgICAgIENoYXJzZXQ6ICdVVEYtOCdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLnNlc0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgW09UUFNlcnZpY2VdIEVtYWlsIHNlbnQgc3VjY2Vzc2Z1bGx5IHRvOiAke2VtYWlsfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW09UUFNlcnZpY2VdIEVycm9yIHNlbmRpbmcgZW1haWw6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzZW5kIE9UUCBlbWFpbDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGEgcmFuZG9tIDYtZGlnaXQgT1RQXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZU9UUCgpOiBzdHJpbmcge1xyXG4gICAgY29uc3Qgb3RwID0gTWF0aC5mbG9vcigxMDAwMDAgKyBNYXRoLnJhbmRvbSgpICogOTAwMDAwKS50b1N0cmluZygpO1xyXG4gICAgcmV0dXJuIG90cDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENsZWFuIHVwIGV4cGlyZWQgT1RQcyAoY2FuIGJlIGNhbGxlZCBwZXJpb2RpY2FsbHkpXHJcbiAgICovXHJcbiAgYXN5bmMgY2xlYW51cEV4cGlyZWRPVFBzKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc29sZS5sb2coJ1tPVFBTZXJ2aWNlXSBDbGVhbnVwIG9mIGV4cGlyZWQgT1RQcyAtIHJlcXVpcmVzIHNjYW4gb3BlcmF0aW9uJyk7XHJcbiAgICAvLyBJbiBwcm9kdWN0aW9uLCB0aGlzIHdvdWxkIHNjYW4gdGhlIHRhYmxlIGFuZCBkZWxldGUgZXhwaXJlZCBlbnRyaWVzXHJcbiAgICAvLyBGb3Igbm93LCB3ZSByZWx5IG9uIER5bmFtb0RCIFRUTCB0byBhdXRvbWF0aWNhbGx5IGRlbGV0ZSBleHBpcmVkIGl0ZW1zXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY29uc3Qgb3RwU2VydmljZSA9IG5ldyBPVFBTZXJ2aWNlKCk7XHJcbiJdfQ==
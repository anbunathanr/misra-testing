"use strict";
/**
 * Email Service - Sends emails via AWS SES or SendGrid
 * Used for OTP delivery, welcome emails, and notifications
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const AWS = __importStar(require("aws-sdk"));
class EmailService {
    ses;
    fromEmail;
    useSES;
    constructor() {
        this.useSES = process.env.EMAIL_SERVICE === 'SES' || !process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.SES_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'noreply@misra-platform.com';
        if (this.useSES) {
            this.ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });
            console.log(`✅ Email Service initialized with AWS SES`);
        }
        else {
            console.log(`✅ Email Service initialized with SendGrid`);
        }
    }
    /**
     * Send OTP to user's email
     */
    async sendOTP(email, otp, userName) {
        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { text-align: center; color: #7b61ff; margin-bottom: 20px; }
            .otp-box { background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #7b61ff; letter-spacing: 5px; font-family: monospace; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔐 MISRA Platform - OTP Verification</h2>
            </div>
            
            <p>Hi ${userName},</p>
            
            <p>Your One-Time Password (OTP) for MISRA Platform is:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p><strong>⏰ This code will expire in 10 minutes.</strong></p>
            
            <p>If you didn't request this code, please ignore this email and your account will remain secure.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            
            <div class="footer">
              <p>MISRA Compliance Platform</p>
              <p>Automated Code Analysis & Compliance Verification</p>
              <p>© 2026 - All rights reserved</p>
            </div>
          </div>
        </body>
      </html>
    `;
        const textContent = `
MISRA Platform - OTP Verification

Hi ${userName},

Your One-Time Password (OTP) for MISRA Platform is:

${otp}

⏰ This code will expire in 10 minutes.

If you didn't request this code, please ignore this email and your account will remain secure.

---
MISRA Compliance Platform
Automated Code Analysis & Compliance Verification
© 2026 - All rights reserved
    `;
        try {
            if (this.useSES) {
                await this.sendViaSES(email, 'Your MISRA Platform OTP Code', htmlContent, textContent);
            }
            else {
                await this.sendViaSendGrid(email, 'Your MISRA Platform OTP Code', htmlContent, textContent);
            }
            console.log(`✅ OTP sent to ${email}`);
        }
        catch (error) {
            console.error(`❌ Failed to send OTP to ${email}:`, error);
            throw new Error(`Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Send welcome email after successful registration
     */
    async sendWelcomeEmail(email, userName) {
        const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { text-align: center; color: #7b61ff; margin-bottom: 20px; }
            .button { display: inline-block; background-color: #7b61ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { margin: 20px 0; }
            .feature { margin: 10px 0; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #7b61ff; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🎉 Welcome to MISRA Platform!</h2>
            </div>
            
            <p>Hi ${userName},</p>
            
            <p>Your account has been successfully created. You can now start analyzing your C/C++ code for MISRA compliance.</p>
            
            <div style="text-align: center;">
              <a href="https://misra-platform.com/dashboard" class="button">Go to Dashboard</a>
            </div>
            
            <h3>What you can do:</h3>
            <div class="features">
              <div class="feature">✅ Upload C/C++ files for analysis</div>
              <div class="feature">✅ Get real-time MISRA compliance reports</div>
              <div class="feature">✅ View detailed violation details</div>
              <div class="feature">✅ Download compliance reports</div>
              <div class="feature">✅ Track analysis history</div>
            </div>
            
            <p><strong>Getting Started:</strong></p>
            <ol>
              <li>Log in to your account</li>
              <li>Upload a C/C++ file</li>
              <li>Wait for analysis to complete</li>
              <li>Review the compliance report</li>
              <li>Download or share the report</li>
            </ol>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            
            <div class="footer">
              <p>MISRA Compliance Platform</p>
              <p>Automated Code Analysis & Compliance Verification</p>
              <p>© 2026 - All rights reserved</p>
            </div>
          </div>
        </body>
      </html>
    `;
        const textContent = `
Welcome to MISRA Platform!

Hi ${userName},

Your account has been successfully created. You can now start analyzing your C/C++ code for MISRA compliance.

Go to Dashboard: https://misra-platform.com/dashboard

What you can do:
- Upload C/C++ files for analysis
- Get real-time MISRA compliance reports
- View detailed violation details
- Download compliance reports
- Track analysis history

Getting Started:
1. Log in to your account
2. Upload a C/C++ file
3. Wait for analysis to complete
4. Review the compliance report
5. Download or share the report

If you have any questions, please contact our support team.

---
MISRA Compliance Platform
Automated Code Analysis & Compliance Verification
© 2026 - All rights reserved
    `;
        try {
            if (this.useSES) {
                await this.sendViaSES(email, 'Welcome to MISRA Platform', htmlContent, textContent);
            }
            else {
                await this.sendViaSendGrid(email, 'Welcome to MISRA Platform', htmlContent, textContent);
            }
            console.log(`✅ Welcome email sent to ${email}`);
        }
        catch (error) {
            console.error(`❌ Failed to send welcome email to ${email}:`, error);
            // Don't throw - welcome email is non-critical
        }
    }
    /**
     * Send email via AWS SES
     */
    async sendViaSES(toEmail, subject, htmlContent, textContent) {
        const params = {
            Source: this.fromEmail,
            Destination: {
                ToAddresses: [toEmail],
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: 'UTF-8',
                },
                Body: {
                    Html: {
                        Data: htmlContent,
                        Charset: 'UTF-8',
                    },
                    Text: {
                        Data: textContent,
                        Charset: 'UTF-8',
                    },
                },
            },
        };
        try {
            await this.ses.sendEmail(params).promise();
            console.log(`✅ Email sent via SES to ${toEmail}`);
        }
        catch (error) {
            console.error(`❌ SES error:`, error);
            throw error;
        }
    }
    /**
     * Send email via SendGrid
     */
    async sendViaSendGrid(toEmail, subject, htmlContent, textContent) {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
            to: toEmail,
            from: this.fromEmail,
            subject: subject,
            text: textContent,
            html: htmlContent,
        };
        try {
            await sgMail.send(msg);
            console.log(`✅ Email sent via SendGrid to ${toEmail}`);
        }
        catch (error) {
            console.error(`❌ SendGrid error:`, error);
            throw error;
        }
    }
}
exports.EmailService = EmailService;
// Export singleton instance
exports.emailService = new EmailService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1haWwtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVtYWlsLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsNkNBQStCO0FBRS9CLE1BQWEsWUFBWTtJQUNmLEdBQUcsQ0FBVTtJQUNiLFNBQVMsQ0FBUztJQUNsQixNQUFNLENBQVU7SUFFeEI7UUFDRSxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxLQUFLLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUM7UUFDbkYsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLDRCQUE0QixDQUFDO1FBRS9HLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1FBQzFELENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQWEsRUFBRSxHQUFXLEVBQUUsUUFBZ0I7UUFDeEQsTUFBTSxXQUFXLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7b0JBbUJKLFFBQVE7Ozs7O3NDQUtVLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7O0tBaUJwQyxDQUFDO1FBRUYsTUFBTSxXQUFXLEdBQUc7OztLQUdu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QUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDckMsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssS0FBSyxDQUFDLGVBQWUsQ0FDM0IsT0FBZSxFQUNmLE9BQWUsRUFDZixXQUFtQixFQUNuQixXQUFtQjtRQUVuQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUUvQyxNQUFNLEdBQUcsR0FBRztZQUNWLEVBQUUsRUFBRSxPQUFPO1lBQ1gsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3BCLE9BQU8sRUFBRSxPQUFPO1lBQ2hCLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFBRSxXQUFXO1NBQ2xCLENBQUM7UUFFRixJQUFJLENBQUM7WUFDSCxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUMsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBalJELG9DQWlSQztBQUVELDRCQUE0QjtBQUNmLFFBQUEsWUFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRW1haWwgU2VydmljZSAtIFNlbmRzIGVtYWlscyB2aWEgQVdTIFNFUyBvciBTZW5kR3JpZFxyXG4gKiBVc2VkIGZvciBPVFAgZGVsaXZlcnksIHdlbGNvbWUgZW1haWxzLCBhbmQgbm90aWZpY2F0aW9uc1xyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIEFXUyBmcm9tICdhd3Mtc2RrJztcclxuXHJcbmV4cG9ydCBjbGFzcyBFbWFpbFNlcnZpY2Uge1xyXG4gIHByaXZhdGUgc2VzOiBBV1MuU0VTO1xyXG4gIHByaXZhdGUgZnJvbUVtYWlsOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSB1c2VTRVM6IGJvb2xlYW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy51c2VTRVMgPSBwcm9jZXNzLmVudi5FTUFJTF9TRVJWSUNFID09PSAnU0VTJyB8fCAhcHJvY2Vzcy5lbnYuU0VOREdSSURfQVBJX0tFWTtcclxuICAgIHRoaXMuZnJvbUVtYWlsID0gcHJvY2Vzcy5lbnYuU0VTX0ZST01fRU1BSUwgfHwgcHJvY2Vzcy5lbnYuU0VOREdSSURfRlJPTV9FTUFJTCB8fCAnbm9yZXBseUBtaXNyYS1wbGF0Zm9ybS5jb20nO1xyXG4gICAgXHJcbiAgICBpZiAodGhpcy51c2VTRVMpIHtcclxuICAgICAgdGhpcy5zZXMgPSBuZXcgQVdTLlNFUyh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuICAgICAgY29uc29sZS5sb2coYOKchSBFbWFpbCBTZXJ2aWNlIGluaXRpYWxpemVkIHdpdGggQVdTIFNFU2ApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5sb2coYOKchSBFbWFpbCBTZXJ2aWNlIGluaXRpYWxpemVkIHdpdGggU2VuZEdyaWRgKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNlbmQgT1RQIHRvIHVzZXIncyBlbWFpbFxyXG4gICAqL1xyXG4gIGFzeW5jIHNlbmRPVFAoZW1haWw6IHN0cmluZywgb3RwOiBzdHJpbmcsIHVzZXJOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGh0bWxDb250ZW50ID0gYFxyXG4gICAgICA8IURPQ1RZUEUgaHRtbD5cclxuICAgICAgPGh0bWw+XHJcbiAgICAgICAgPGhlYWQ+XHJcbiAgICAgICAgICA8c3R5bGU+XHJcbiAgICAgICAgICAgIGJvZHkgeyBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7IGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7IH1cclxuICAgICAgICAgICAgLmNvbnRhaW5lciB7IG1heC13aWR0aDogNjAwcHg7IG1hcmdpbjogMCBhdXRvOyBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTsgcGFkZGluZzogMjBweDsgYm9yZGVyLXJhZGl1czogOHB4OyB9XHJcbiAgICAgICAgICAgIC5oZWFkZXIgeyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiAjN2I2MWZmOyBtYXJnaW4tYm90dG9tOiAyMHB4OyB9XHJcbiAgICAgICAgICAgIC5vdHAtYm94IHsgYmFja2dyb3VuZC1jb2xvcjogI2YwZjBmMDsgcGFkZGluZzogMjBweDsgdGV4dC1hbGlnbjogY2VudGVyOyBib3JkZXItcmFkaXVzOiA4cHg7IG1hcmdpbjogMjBweCAwOyB9XHJcbiAgICAgICAgICAgIC5vdHAtY29kZSB7IGZvbnQtc2l6ZTogMzJweDsgZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjN2I2MWZmOyBsZXR0ZXItc3BhY2luZzogNXB4OyBmb250LWZhbWlseTogbW9ub3NwYWNlOyB9XHJcbiAgICAgICAgICAgIC5mb290ZXIgeyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiAjOTk5OyBmb250LXNpemU6IDEycHg7IG1hcmdpbi10b3A6IDIwcHg7IH1cclxuICAgICAgICAgIDwvc3R5bGU+XHJcbiAgICAgICAgPC9oZWFkPlxyXG4gICAgICAgIDxib2R5PlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XHJcbiAgICAgICAgICAgICAgPGgyPvCflJAgTUlTUkEgUGxhdGZvcm0gLSBPVFAgVmVyaWZpY2F0aW9uPC9oMj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICA8cD5IaSAke3VzZXJOYW1lfSw8L3A+XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICA8cD5Zb3VyIE9uZS1UaW1lIFBhc3N3b3JkIChPVFApIGZvciBNSVNSQSBQbGF0Zm9ybSBpczo8L3A+XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwib3RwLWJveFwiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJvdHAtY29kZVwiPiR7b3RwfTwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIDxwPjxzdHJvbmc+4o+wIFRoaXMgY29kZSB3aWxsIGV4cGlyZSBpbiAxMCBtaW51dGVzLjwvc3Ryb25nPjwvcD5cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIDxwPklmIHlvdSBkaWRuJ3QgcmVxdWVzdCB0aGlzIGNvZGUsIHBsZWFzZSBpZ25vcmUgdGhpcyBlbWFpbCBhbmQgeW91ciBhY2NvdW50IHdpbGwgcmVtYWluIHNlY3VyZS48L3A+XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICA8aHIgc3R5bGU9XCJib3JkZXI6IG5vbmU7IGJvcmRlci10b3A6IDFweCBzb2xpZCAjZWVlOyBtYXJnaW46IDIwcHggMDtcIj5cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb290ZXJcIj5cclxuICAgICAgICAgICAgICA8cD5NSVNSQSBDb21wbGlhbmNlIFBsYXRmb3JtPC9wPlxyXG4gICAgICAgICAgICAgIDxwPkF1dG9tYXRlZCBDb2RlIEFuYWx5c2lzICYgQ29tcGxpYW5jZSBWZXJpZmljYXRpb248L3A+XHJcbiAgICAgICAgICAgICAgPHA+wqkgMjAyNiAtIEFsbCByaWdodHMgcmVzZXJ2ZWQ8L3A+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9ib2R5PlxyXG4gICAgICA8L2h0bWw+XHJcbiAgICBgO1xyXG5cclxuICAgIGNvbnN0IHRleHRDb250ZW50ID0gYFxyXG5NSVNSQSBQbGF0Zm9ybSAtIE9UUCBWZXJpZmljYXRpb25cclxuXHJcbkhpICR7dXNlck5hbWV9LFxyXG5cclxuWW91ciBPbmUtVGltZSBQYXNzd29yZCAoT1RQKSBmb3IgTUlTUkEgUGxhdGZvcm0gaXM6XHJcblxyXG4ke290cH1cclxuXHJcbuKPsCBUaGlzIGNvZGUgd2lsbCBleHBpcmUgaW4gMTAgbWludXRlcy5cclxuXHJcbklmIHlvdSBkaWRuJ3QgcmVxdWVzdCB0aGlzIGNvZGUsIHBsZWFzZSBpZ25vcmUgdGhpcyBlbWFpbCBhbmQgeW91ciBhY2NvdW50IHdpbGwgcmVtYWluIHNlY3VyZS5cclxuXHJcbi0tLVxyXG5NSVNSQSBDb21wbGlhbmNlIFBsYXRmb3JtXHJcbkF1dG9tYXRlZCBDb2RlIEFuYWx5c2lzICYgQ29tcGxpYW5jZSBWZXJpZmljYXRpb25cclxuwqkgMjAyNiAtIEFsbCByaWdodHMgcmVzZXJ2ZWRcclxuICAgIGA7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKHRoaXMudXNlU0VTKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5zZW5kVmlhU0VTKGVtYWlsLCAnWW91ciBNSVNSQSBQbGF0Zm9ybSBPVFAgQ29kZScsIGh0bWxDb250ZW50LCB0ZXh0Q29udGVudCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5zZW5kVmlhU2VuZEdyaWQoZW1haWwsICdZb3VyIE1JU1JBIFBsYXRmb3JtIE9UUCBDb2RlJywgaHRtbENvbnRlbnQsIHRleHRDb250ZW50KTtcclxuICAgICAgfVxyXG4gICAgICBjb25zb2xlLmxvZyhg4pyFIE9UUCBzZW50IHRvICR7ZW1haWx9YCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGDinYwgRmFpbGVkIHRvIHNlbmQgT1RQIHRvICR7ZW1haWx9OmAsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc2VuZCBPVFAgZW1haWw6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIHdlbGNvbWUgZW1haWwgYWZ0ZXIgc3VjY2Vzc2Z1bCByZWdpc3RyYXRpb25cclxuICAgKi9cclxuICBhc3luYyBzZW5kV2VsY29tZUVtYWlsKGVtYWlsOiBzdHJpbmcsIHVzZXJOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGh0bWxDb250ZW50ID0gYFxyXG4gICAgICA8IURPQ1RZUEUgaHRtbD5cclxuICAgICAgPGh0bWw+XHJcbiAgICAgICAgPGhlYWQ+XHJcbiAgICAgICAgICA8c3R5bGU+XHJcbiAgICAgICAgICAgIGJvZHkgeyBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7IGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7IH1cclxuICAgICAgICAgICAgLmNvbnRhaW5lciB7IG1heC13aWR0aDogNjAwcHg7IG1hcmdpbjogMCBhdXRvOyBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTsgcGFkZGluZzogMjBweDsgYm9yZGVyLXJhZGl1czogOHB4OyB9XHJcbiAgICAgICAgICAgIC5oZWFkZXIgeyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiAjN2I2MWZmOyBtYXJnaW4tYm90dG9tOiAyMHB4OyB9XHJcbiAgICAgICAgICAgIC5idXR0b24geyBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IGJhY2tncm91bmQtY29sb3I6ICM3YjYxZmY7IGNvbG9yOiB3aGl0ZTsgcGFkZGluZzogMTJweCAzMHB4OyB0ZXh0LWRlY29yYXRpb246IG5vbmU7IGJvcmRlci1yYWRpdXM6IDVweDsgbWFyZ2luOiAyMHB4IDA7IH1cclxuICAgICAgICAgICAgLmZlYXR1cmVzIHsgbWFyZ2luOiAyMHB4IDA7IH1cclxuICAgICAgICAgICAgLmZlYXR1cmUgeyBtYXJnaW46IDEwcHggMDsgcGFkZGluZzogMTBweDsgYmFja2dyb3VuZC1jb2xvcjogI2Y5ZjlmOTsgYm9yZGVyLWxlZnQ6IDRweCBzb2xpZCAjN2I2MWZmOyB9XHJcbiAgICAgICAgICAgIC5mb290ZXIgeyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiAjOTk5OyBmb250LXNpemU6IDEycHg7IG1hcmdpbi10b3A6IDIwcHg7IH1cclxuICAgICAgICAgIDwvc3R5bGU+XHJcbiAgICAgICAgPC9oZWFkPlxyXG4gICAgICAgIDxib2R5PlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XHJcbiAgICAgICAgICAgICAgPGgyPvCfjokgV2VsY29tZSB0byBNSVNSQSBQbGF0Zm9ybSE8L2gyPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIDxwPkhpICR7dXNlck5hbWV9LDwvcD5cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIDxwPllvdXIgYWNjb3VudCBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgY3JlYXRlZC4gWW91IGNhbiBub3cgc3RhcnQgYW5hbHl6aW5nIHlvdXIgQy9DKysgY29kZSBmb3IgTUlTUkEgY29tcGxpYW5jZS48L3A+XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjogY2VudGVyO1wiPlxyXG4gICAgICAgICAgICAgIDxhIGhyZWY9XCJodHRwczovL21pc3JhLXBsYXRmb3JtLmNvbS9kYXNoYm9hcmRcIiBjbGFzcz1cImJ1dHRvblwiPkdvIHRvIERhc2hib2FyZDwvYT5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICA8aDM+V2hhdCB5b3UgY2FuIGRvOjwvaDM+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmZWF0dXJlc1wiPlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmZWF0dXJlXCI+4pyFIFVwbG9hZCBDL0MrKyBmaWxlcyBmb3IgYW5hbHlzaXM8L2Rpdj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmVhdHVyZVwiPuKchSBHZXQgcmVhbC10aW1lIE1JU1JBIGNvbXBsaWFuY2UgcmVwb3J0czwvZGl2PlxyXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmZWF0dXJlXCI+4pyFIFZpZXcgZGV0YWlsZWQgdmlvbGF0aW9uIGRldGFpbHM8L2Rpdj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmVhdHVyZVwiPuKchSBEb3dubG9hZCBjb21wbGlhbmNlIHJlcG9ydHM8L2Rpdj5cclxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmVhdHVyZVwiPuKchSBUcmFjayBhbmFseXNpcyBoaXN0b3J5PC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgPHA+PHN0cm9uZz5HZXR0aW5nIFN0YXJ0ZWQ6PC9zdHJvbmc+PC9wPlxyXG4gICAgICAgICAgICA8b2w+XHJcbiAgICAgICAgICAgICAgPGxpPkxvZyBpbiB0byB5b3VyIGFjY291bnQ8L2xpPlxyXG4gICAgICAgICAgICAgIDxsaT5VcGxvYWQgYSBDL0MrKyBmaWxlPC9saT5cclxuICAgICAgICAgICAgICA8bGk+V2FpdCBmb3IgYW5hbHlzaXMgdG8gY29tcGxldGU8L2xpPlxyXG4gICAgICAgICAgICAgIDxsaT5SZXZpZXcgdGhlIGNvbXBsaWFuY2UgcmVwb3J0PC9saT5cclxuICAgICAgICAgICAgICA8bGk+RG93bmxvYWQgb3Igc2hhcmUgdGhlIHJlcG9ydDwvbGk+XHJcbiAgICAgICAgICAgIDwvb2w+XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICA8cD5JZiB5b3UgaGF2ZSBhbnkgcXVlc3Rpb25zLCBwbGVhc2UgY29udGFjdCBvdXIgc3VwcG9ydCB0ZWFtLjwvcD5cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIDxociBzdHlsZT1cImJvcmRlcjogbm9uZTsgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlZWU7IG1hcmdpbjogMjBweCAwO1wiPlxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZvb3RlclwiPlxyXG4gICAgICAgICAgICAgIDxwPk1JU1JBIENvbXBsaWFuY2UgUGxhdGZvcm08L3A+XHJcbiAgICAgICAgICAgICAgPHA+QXV0b21hdGVkIENvZGUgQW5hbHlzaXMgJiBDb21wbGlhbmNlIFZlcmlmaWNhdGlvbjwvcD5cclxuICAgICAgICAgICAgICA8cD7CqSAyMDI2IC0gQWxsIHJpZ2h0cyByZXNlcnZlZDwvcD5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2JvZHk+XHJcbiAgICAgIDwvaHRtbD5cclxuICAgIGA7XHJcblxyXG4gICAgY29uc3QgdGV4dENvbnRlbnQgPSBgXHJcbldlbGNvbWUgdG8gTUlTUkEgUGxhdGZvcm0hXHJcblxyXG5IaSAke3VzZXJOYW1lfSxcclxuXHJcbllvdXIgYWNjb3VudCBoYXMgYmVlbiBzdWNjZXNzZnVsbHkgY3JlYXRlZC4gWW91IGNhbiBub3cgc3RhcnQgYW5hbHl6aW5nIHlvdXIgQy9DKysgY29kZSBmb3IgTUlTUkEgY29tcGxpYW5jZS5cclxuXHJcbkdvIHRvIERhc2hib2FyZDogaHR0cHM6Ly9taXNyYS1wbGF0Zm9ybS5jb20vZGFzaGJvYXJkXHJcblxyXG5XaGF0IHlvdSBjYW4gZG86XHJcbi0gVXBsb2FkIEMvQysrIGZpbGVzIGZvciBhbmFseXNpc1xyXG4tIEdldCByZWFsLXRpbWUgTUlTUkEgY29tcGxpYW5jZSByZXBvcnRzXHJcbi0gVmlldyBkZXRhaWxlZCB2aW9sYXRpb24gZGV0YWlsc1xyXG4tIERvd25sb2FkIGNvbXBsaWFuY2UgcmVwb3J0c1xyXG4tIFRyYWNrIGFuYWx5c2lzIGhpc3RvcnlcclxuXHJcbkdldHRpbmcgU3RhcnRlZDpcclxuMS4gTG9nIGluIHRvIHlvdXIgYWNjb3VudFxyXG4yLiBVcGxvYWQgYSBDL0MrKyBmaWxlXHJcbjMuIFdhaXQgZm9yIGFuYWx5c2lzIHRvIGNvbXBsZXRlXHJcbjQuIFJldmlldyB0aGUgY29tcGxpYW5jZSByZXBvcnRcclxuNS4gRG93bmxvYWQgb3Igc2hhcmUgdGhlIHJlcG9ydFxyXG5cclxuSWYgeW91IGhhdmUgYW55IHF1ZXN0aW9ucywgcGxlYXNlIGNvbnRhY3Qgb3VyIHN1cHBvcnQgdGVhbS5cclxuXHJcbi0tLVxyXG5NSVNSQSBDb21wbGlhbmNlIFBsYXRmb3JtXHJcbkF1dG9tYXRlZCBDb2RlIEFuYWx5c2lzICYgQ29tcGxpYW5jZSBWZXJpZmljYXRpb25cclxuwqkgMjAyNiAtIEFsbCByaWdodHMgcmVzZXJ2ZWRcclxuICAgIGA7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKHRoaXMudXNlU0VTKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5zZW5kVmlhU0VTKGVtYWlsLCAnV2VsY29tZSB0byBNSVNSQSBQbGF0Zm9ybScsIGh0bWxDb250ZW50LCB0ZXh0Q29udGVudCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5zZW5kVmlhU2VuZEdyaWQoZW1haWwsICdXZWxjb21lIHRvIE1JU1JBIFBsYXRmb3JtJywgaHRtbENvbnRlbnQsIHRleHRDb250ZW50KTtcclxuICAgICAgfVxyXG4gICAgICBjb25zb2xlLmxvZyhg4pyFIFdlbGNvbWUgZW1haWwgc2VudCB0byAke2VtYWlsfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihg4p2MIEZhaWxlZCB0byBzZW5kIHdlbGNvbWUgZW1haWwgdG8gJHtlbWFpbH06YCwgZXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCB0aHJvdyAtIHdlbGNvbWUgZW1haWwgaXMgbm9uLWNyaXRpY2FsXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIGVtYWlsIHZpYSBBV1MgU0VTXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBzZW5kVmlhU0VTKFxyXG4gICAgdG9FbWFpbDogc3RyaW5nLFxyXG4gICAgc3ViamVjdDogc3RyaW5nLFxyXG4gICAgaHRtbENvbnRlbnQ6IHN0cmluZyxcclxuICAgIHRleHRDb250ZW50OiBzdHJpbmdcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IHBhcmFtcyA9IHtcclxuICAgICAgU291cmNlOiB0aGlzLmZyb21FbWFpbCxcclxuICAgICAgRGVzdGluYXRpb246IHtcclxuICAgICAgICBUb0FkZHJlc3NlczogW3RvRW1haWxdLFxyXG4gICAgICB9LFxyXG4gICAgICBNZXNzYWdlOiB7XHJcbiAgICAgICAgU3ViamVjdDoge1xyXG4gICAgICAgICAgRGF0YTogc3ViamVjdCxcclxuICAgICAgICAgIENoYXJzZXQ6ICdVVEYtOCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBCb2R5OiB7XHJcbiAgICAgICAgICBIdG1sOiB7XHJcbiAgICAgICAgICAgIERhdGE6IGh0bWxDb250ZW50LFxyXG4gICAgICAgICAgICBDaGFyc2V0OiAnVVRGLTgnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIFRleHQ6IHtcclxuICAgICAgICAgICAgRGF0YTogdGV4dENvbnRlbnQsXHJcbiAgICAgICAgICAgIENoYXJzZXQ6ICdVVEYtOCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuc2VzLnNlbmRFbWFpbChwYXJhbXMpLnByb21pc2UoKTtcclxuICAgICAgY29uc29sZS5sb2coYOKchSBFbWFpbCBzZW50IHZpYSBTRVMgdG8gJHt0b0VtYWlsfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihg4p2MIFNFUyBlcnJvcjpgLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBlbWFpbCB2aWEgU2VuZEdyaWRcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHNlbmRWaWFTZW5kR3JpZChcclxuICAgIHRvRW1haWw6IHN0cmluZyxcclxuICAgIHN1YmplY3Q6IHN0cmluZyxcclxuICAgIGh0bWxDb250ZW50OiBzdHJpbmcsXHJcbiAgICB0ZXh0Q29udGVudDogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBzZ01haWwgPSByZXF1aXJlKCdAc2VuZGdyaWQvbWFpbCcpO1xyXG4gICAgc2dNYWlsLnNldEFwaUtleShwcm9jZXNzLmVudi5TRU5ER1JJRF9BUElfS0VZKTtcclxuXHJcbiAgICBjb25zdCBtc2cgPSB7XHJcbiAgICAgIHRvOiB0b0VtYWlsLFxyXG4gICAgICBmcm9tOiB0aGlzLmZyb21FbWFpbCxcclxuICAgICAgc3ViamVjdDogc3ViamVjdCxcclxuICAgICAgdGV4dDogdGV4dENvbnRlbnQsXHJcbiAgICAgIGh0bWw6IGh0bWxDb250ZW50LFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBzZ01haWwuc2VuZChtc2cpO1xyXG4gICAgICBjb25zb2xlLmxvZyhg4pyFIEVtYWlsIHNlbnQgdmlhIFNlbmRHcmlkIHRvICR7dG9FbWFpbH1gKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYOKdjCBTZW5kR3JpZCBlcnJvcjpgLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3QgZW1haWxTZXJ2aWNlID0gbmV3IEVtYWlsU2VydmljZSgpO1xyXG4iXX0=
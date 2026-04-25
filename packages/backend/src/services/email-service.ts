/**
 * Email Service - Sends emails via AWS SES or SendGrid
 * Used for OTP delivery, welcome emails, and notifications
 */

import * as AWS from 'aws-sdk';

export class EmailService {
  private ses: AWS.SES;
  private fromEmail: string;
  private useSES: boolean;

  constructor() {
    this.useSES = process.env.EMAIL_SERVICE === 'SES' || !process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.SES_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'noreply@misra-platform.com';
    
    if (this.useSES) {
      this.ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });
      console.log(`✅ Email Service initialized with AWS SES`);
    } else {
      console.log(`✅ Email Service initialized with SendGrid`);
    }
  }

  /**
   * Send OTP to user's email
   */
  async sendOTP(email: string, otp: string, userName: string): Promise<void> {
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
      } else {
        await this.sendViaSendGrid(email, 'Your MISRA Platform OTP Code', htmlContent, textContent);
      }
      console.log(`✅ OTP sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send OTP to ${email}:`, error);
      throw new Error(`Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
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
      } else {
        await this.sendViaSendGrid(email, 'Welcome to MISRA Platform', htmlContent, textContent);
      }
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${email}:`, error);
      // Don't throw - welcome email is non-critical
    }
  }

  /**
   * Send email via AWS SES
   */
  private async sendViaSES(
    toEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<void> {
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
    } catch (error) {
      console.error(`❌ SES error:`, error);
      throw error;
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(
    toEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<void> {
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
    } catch (error) {
      console.error(`❌ SendGrid error:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

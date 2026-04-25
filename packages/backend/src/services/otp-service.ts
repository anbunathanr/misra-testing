/**
 * OTP Service
 * Handles OTP generation, storage, and verification
 * Uses DynamoDB for OTP storage with TTL expiration
 */

import { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { v4 as uuidv4 } from 'uuid';

export interface OTPData {
  email: string;
  otp: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

export class OTPService {
  private dynamoClient: DynamoDBClient;
  private sesClient: SESClient;
  private readonly OTP_TABLE = process.env.OTP_TABLE || 'OTP-dev';
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;
  private readonly SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@misra-platform.com';

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.dynamoClient = new DynamoDBClient({ region });
    this.sesClient = new SESClient({ region });
  }

  /**
   * Generate a new OTP and send it via email
   * Generates a fresh OTP every time - no reuse
   */
  async generateAndSendOTP(email: string): Promise<{ success: boolean; message: string; otpId?: string }> {
    try {
      console.log(`[OTPService] Generating OTP for email: ${email}`);

      // Generate a 6-digit OTP
      const otp = this.generateOTP();
      const otpId = uuidv4();
      const now = Date.now();
      const expiresAt = now + (this.OTP_EXPIRY_MINUTES * 60 * 1000);

      console.log(`[OTPService] Generated OTP: ${otp} (expires in ${this.OTP_EXPIRY_MINUTES} minutes)`);

      // Store OTP in DynamoDB
      const otpData: OTPData = {
        email,
        otp,
        createdAt: now,
        expiresAt,
        attempts: 0,
        verified: false
      };

      const command = new PutItemCommand({
        TableName: this.OTP_TABLE,
        Item: marshall({
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
    } catch (error) {
      console.error('[OTPService] Error generating/sending OTP:', error);
      throw new Error(`Failed to generate OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[OTPService] Verifying OTP for email: ${email}`);

      // Query DynamoDB for the OTP
      // Note: In production, you'd want a GSI on email for efficient querying
      // For now, we'll use a scan or query pattern
      
      // Get the most recent OTP for this email
      const command = new GetItemCommand({
        TableName: this.OTP_TABLE,
        Key: marshall({
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
    } catch (error) {
      console.error('[OTPService] Error verifying OTP:', error);
      throw new Error(`Failed to verify OTP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send OTP via email using AWS SES
   */
  private async sendOTPEmail(email: string, otp: string): Promise<void> {
    try {
      const emailContent = `
Your MISRA Platform OTP is: ${otp}

This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.

If you didn't request this code, please ignore this email.

---
MISRA Compliance Platform
      `;

      const command = new SendEmailCommand({
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
    } catch (error) {
      console.error('[OTPService] Error sending email:', error);
      throw new Error(`Failed to send OTP email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a random 6-digit OTP
   */
  private generateOTP(): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
  }

  /**
   * Clean up expired OTPs (can be called periodically)
   */
  async cleanupExpiredOTPs(): Promise<void> {
    console.log('[OTPService] Cleanup of expired OTPs - requires scan operation');
    // In production, this would scan the table and delete expired entries
    // For now, we rely on DynamoDB TTL to automatically delete expired items
  }
}

export const otpService = new OTPService();

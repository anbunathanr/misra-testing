/**
 * OTP Webhook Lambda Function
 * 
 * Receives OTP emails from SES and stores them in DynamoDB
 * This enables automatic OTP extraction without accessing user's email
 * 
 * Triggered by: SES receipt rule (email forwarding)
 * Stores OTP in DynamoDB with TTL for automatic cleanup
 */

import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { createLogger } from '../../utils/logger';

const logger = createLogger('OTPWebhook');
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

interface OTPEmail {
  email: string;
  otp: string;
  timestamp: number;
  ttl: number; // Unix timestamp for TTL (15 minutes from now)
}

export const handler = async (event: S3Event): Promise<void> => {
  logger.info('OTP Webhook triggered', {
    records: event.Records.length
  });

  for (const record of event.Records) {
    try {
      const bucket = record.s3.bucket.name;
      const key = record.s3.object.key;

      logger.info('Processing email from S3', { bucket, key });

      // Get email from S3
      const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await s3Client.send(getObjectCommand);
      const emailContent = await response.Body?.transformToString();

      if (!emailContent) {
        logger.warn('Empty email content', { bucket, key });
        continue;
      }

      // Extract OTP from email
      const otpData = extractOTPFromEmail(emailContent);
      if (!otpData) {
        logger.warn('No OTP found in email', { bucket, key });
        continue;
      }

      // Store OTP in DynamoDB
      await storeOTPInDynamoDB(otpData);

      logger.info('OTP stored successfully', {
        email: otpData.email,
        otp: otpData.otp.substring(0, 3) + '***'
      });

    } catch (error: any) {
      logger.error('Failed to process OTP email', {
        error: error.message,
        stack: error.stack
      });
    }
  }
};

/**
 * Extract OTP from email content
 * Looks for common OTP patterns in email body
 */
function extractOTPFromEmail(emailContent: string): OTPEmail | null {
  try {
    // Extract email address from headers
    const toMatch = emailContent.match(/^To: (.+?)$/m);
    const email = toMatch ? toMatch[1].trim() : null;

    if (!email) {
      logger.warn('Could not extract email address from headers');
      return null;
    }

    // Look for OTP patterns in email body
    // Common patterns: "Your OTP is: 123456", "Code: 123456", "Verification code: 123456"
    const otpPatterns = [
      /(?:OTP|code|verification code|passcode)[\s:]*(\d{6})/gi,
      /(\d{6})/g, // Fallback: any 6-digit number
    ];

    let otp: string | null = null;

    for (const pattern of otpPatterns) {
      const match = emailContent.match(pattern);
      if (match) {
        // Extract the 6-digit code
        const codeMatch = match[0].match(/\d{6}/);
        if (codeMatch) {
          otp = codeMatch[0];
          break;
        }
      }
    }

    if (!otp) {
      logger.warn('Could not extract OTP from email content');
      return null;
    }

    const timestamp = Date.now();
    const ttl = Math.floor(timestamp / 1000) + 900; // 15 minutes TTL

    return {
      email,
      otp,
      timestamp,
      ttl
    };

  } catch (error: any) {
    logger.error('Error extracting OTP from email', {
      error: error.message
    });
    return null;
  }
}

/**
 * Store OTP in DynamoDB
 */
async function storeOTPInDynamoDB(otpData: OTPEmail): Promise<void> {
  const tableName = process.env.OTP_STORAGE_TABLE || 'OTPStorage';

  const putCommand = new PutItemCommand({
    TableName: tableName,
    Item: {
      email: { S: otpData.email },
      timestamp: { N: otpData.timestamp.toString() },
      otp: { S: otpData.otp },
      ttl: { N: otpData.ttl.toString() }
    }
  });

  await dynamoClient.send(putCommand);
}

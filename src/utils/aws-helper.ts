import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Logger } from './logger';

const logger = new Logger('AwsHelper');

export class AwsHelper {
  private secretsClient: SecretsManagerClient;
  private s3Client: S3Client;
  private s3Bucket: string;
  private secretName: string;

  constructor() {
    this.secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    this.s3Bucket = process.env.S3_BUCKET || 'misra-reports';
    this.secretName = process.env.SECRETS_NAME || 'misra/credentials';
  }

  async getSecrets(keys: string[]): Promise<Record<string, string>> {
    try {
      logger.info(`Fetching secrets: ${keys.join(', ')}`);

      const command = new GetSecretValueCommand({
        SecretId: this.secretName,
      });

      const response = await this.secretsClient.send(command);

      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      const secretsObj = JSON.parse(response.SecretString);
      const result: Record<string, string> = {};

      for (const key of keys) {
        if (secretsObj[key]) {
          result[key] = secretsObj[key];
        } else {
          logger.warn(`Secret key not found: ${key}`);
        }
      }

      logger.info('Secrets retrieved successfully');
      return result;
    } catch (error) {
      logger.error(`Failed to fetch secrets: ${error}`);
      throw error;
    }
  }

  async saveReportToS3(
    executionId: string,
    reportData: any,
    htmlContent: string
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `reports/${executionId}/${timestamp}/report.json`;

      logger.info(`Saving report to S3: s3://${this.s3Bucket}/${key}`);

      const reportJson = {
        executionId,
        timestamp: new Date().toISOString(),
        ...reportData,
      };

      const command = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: JSON.stringify(reportJson, null, 2),
        ContentType: 'application/json',
        Metadata: {
          'execution-id': executionId,
          'compliance-score': String(reportData.score),
        },
      });

      await this.s3Client.send(command);

      // Also save HTML snapshot
      const htmlKey = `reports/${executionId}/${timestamp}/snapshot.html`;
      const htmlCommand = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: htmlKey,
        Body: htmlContent,
        ContentType: 'text/html',
      });

      await this.s3Client.send(htmlCommand);

      const reportUrl = `s3://${this.s3Bucket}/${key}`;
      logger.info(`Report saved: ${reportUrl}`);

      return reportUrl;
    } catch (error) {
      logger.error(`Failed to save report to S3: ${error}`);
      throw error;
    }
  }

  async uploadScreenshotToS3(
    executionId: string,
    imageBuffer: Buffer,
    type: 'error' | 'success' = 'error'
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `screenshots/${executionId}/${timestamp}/${type}.png`;

      logger.info(`Uploading screenshot to S3: s3://${this.s3Bucket}/${key}`);

      const command = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/png',
        Metadata: {
          'execution-id': executionId,
          'screenshot-type': type,
        },
      });

      await this.s3Client.send(command);

      const screenshotUrl = `s3://${this.s3Bucket}/${key}`;
      logger.info(`Screenshot saved: ${screenshotUrl}`);

      return screenshotUrl;
    } catch (error) {
      logger.error(`Failed to upload screenshot: ${error}`);
      throw error;
    }
  }

  async getReportFromS3(executionId: string): Promise<any> {
    try {
      logger.info(`Fetching report for execution: ${executionId}`);

      // This would require ListObjectsV2 to find the latest report
      // For now, return a placeholder
      logger.info('Report retrieval not yet implemented');

      return null;
    } catch (error) {
      logger.error(`Failed to fetch report from S3: ${error}`);
      throw error;
    }
  }
}

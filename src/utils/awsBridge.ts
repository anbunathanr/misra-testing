import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Logger } from './logger';

const logger = new Logger('AwsBridge');

export class AwsBridge {
  private secretsClient: SecretsManagerClient;
  private s3Client: S3Client;
  private s3Bucket: string;
  private secretName: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.secretsClient = new SecretsManagerClient({ region });
    this.s3Client = new S3Client({ region });
    this.s3Bucket = process.env.S3_BUCKET || 'misra-reports';
    this.secretName = process.env.SECRETS_NAME || 'misra/credentials';

    logger.info(`🔧 AwsBridge initialized | Region: ${region} | Bucket: ${this.s3Bucket}`);
  }

  async getSecrets(keys: string[]): Promise<Record<string, string>> {
    try {
      logger.info(`🔐 Fetching secrets: ${keys.join(', ')}`);

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
          logger.info(`✅ Secret retrieved: ${key}`);
        } else {
          logger.warn(`⚠️ Secret key not found: ${key}`);
        }
      }

      return result;
    } catch (error) {
      logger.error(`❌ Failed to fetch secrets: ${error}`);
      throw error;
    }
  }

  async saveReportToS3(executionId: string, reportData: any): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `reports/${executionId}/${timestamp}/report.json`;

      logger.info(`💾 Saving report to S3: s3://${this.s3Bucket}/${key}`);

      const reportJson = {
        executionId,
        timestamp: new Date().toISOString(),
        complianceScore: reportData.score,
        violationCount: reportData.violations.length,
        violations: reportData.violations,
      };

      const command = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
        Body: JSON.stringify(reportJson, null, 2),
        ContentType: 'application/json',
        Metadata: {
          'execution-id': executionId,
          'compliance-score': String(reportData.score),
          'violation-count': String(reportData.violations.length),
        },
      });

      await this.s3Client.send(command);

      const reportUrl = `s3://${this.s3Bucket}/${key}`;
      logger.info(`✅ Report saved: ${reportUrl}`);

      return reportUrl;
    } catch (error) {
      logger.error(`❌ Failed to save report to S3: ${error}`);
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

      logger.info(`📸 Uploading ${type} screenshot to S3: s3://${this.s3Bucket}/${key}`);

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
      logger.info(`✅ Screenshot saved: ${screenshotUrl}`);

      return screenshotUrl;
    } catch (error) {
      logger.error(`❌ Failed to upload screenshot: ${error}`);
      throw error;
    }
  }
}

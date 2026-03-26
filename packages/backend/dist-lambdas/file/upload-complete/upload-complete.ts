import { S3Event, S3Handler } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { FileMetadataService } from '../../services/file-metadata-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';
import { AnalysisStatus } from '../../types/file-metadata';

const sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dbClient = new DynamoDBClientWrapper(process.env.ENVIRONMENT || 'dev');
const metadataService = new FileMetadataService(dbClient);
const stateMachineArn = process.env.STATE_MACHINE_ARN || '';

export const handler: S3Handler = async (event: S3Event) => {
  console.log('S3 upload complete event received:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const bucketName = record.s3.bucket.name;
      const s3Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      const fileSize = record.s3.object.size;

      console.log(`Processing file upload: ${s3Key} (${fileSize} bytes)`);

      // Extract metadata from S3 key structure
      // Expected format: uploads/{organizationId}/{userId}/{timestamp}-{fileId}-{filename}
      const keyParts = s3Key.split('/');
      if (keyParts.length < 4 || keyParts[0] !== 'uploads') {
        console.warn(`Unexpected S3 key format: ${s3Key}`);
        continue;
      }

      const organizationId = keyParts[1];
      const userId = keyParts[2];
      const filenamePart = keyParts[3];
      
      // Extract fileId from filename part
      // Format: {timestamp}-{uuid}-{filename}
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
      const timestampEndIndex = filenamePart.indexOf('-');
      if (timestampEndIndex === -1) {
        console.warn(`Unexpected filename format: ${filenamePart}`);
        continue;
      }
      
      const afterTimestamp = filenamePart.substring(timestampEndIndex + 1);
      // UUID is 36 characters long
      const fileId = afterTimestamp.substring(0, 36);
      const originalFilename = afterTimestamp.substring(37); // Skip UUID and hyphen

      console.log(`Extracted: fileId=${fileId}, filename=${originalFilename}, userId=${userId}`);

      // Update FileMetadata status to IN_PROGRESS
      try {
        await metadataService.updateAnalysisStatus(fileId, AnalysisStatus.IN_PROGRESS);
        console.log(`Updated file metadata status to IN_PROGRESS for ${fileId}`);
      } catch (error) {
        console.error(`Failed to update file metadata for ${fileId}:`, error);
      }

      // Trigger Step Functions workflow for analysis
      const input = {
        fileId,
        fileName: originalFilename,
        s3Key,
        fileType: 'c',
        userId: userId.replace(/-/g, '').substring(0, 32), // Clean userId
        organizationId,
        userEmail: 'admin@misra-platform.com' // TODO: Get from user record
      };

      console.log(`Starting Step Functions execution with input:`, JSON.stringify(input));

      const command = new StartExecutionCommand({
        stateMachineArn,
        input: JSON.stringify(input),
        name: `analysis-${fileId}-${Date.now()}`
      });

      const result = await sfnClient.send(command);
      console.log(`Started Step Functions execution: ${result.executionArn}`);

    } catch (error) {
      console.error('Error processing S3 upload event:', error);
      // Don't throw - we want to continue processing other records
    }
  }
};
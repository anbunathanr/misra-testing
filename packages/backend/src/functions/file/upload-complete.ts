import { S3Event, S3Handler } from 'aws-lambda';
import { ProcessingQueueService } from '../../services/queue/processing-queue-service';
import { FileMetadataService } from '../../services/file-metadata-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';
import { FileType, AnalysisStatus } from '../../types/file-metadata';

const queueService = new ProcessingQueueService();
const dbClient = new DynamoDBClientWrapper(process.env.ENVIRONMENT || 'dev');
const metadataService = new FileMetadataService(dbClient);

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
      const filenameParts = filenamePart.split('-');
      if (filenameParts.length < 3) {
        console.warn(`Unexpected filename format: ${filenamePart}`);
        continue;
      }

      const uploadTimestamp = parseInt(filenameParts[0]);
      const fileId = filenameParts[1];
      const originalFilename = filenameParts.slice(2).join('-');
      const fileType = getFileType(originalFilename);

      // Create file metadata record in DynamoDB
      try {
        await metadataService.createFileMetadata({
          file_id: fileId,
          user_id: userId,
          filename: originalFilename,
          file_type: fileType,
          file_size: fileSize,
          upload_timestamp: Math.floor(uploadTimestamp / 1000), // Convert to seconds
          analysis_status: AnalysisStatus.PENDING,
          s3_key: s3Key,
          created_at: Date.now(),
          updated_at: Date.now(),
        });
        console.log(`Created file metadata for ${fileId}`);
      } catch (error) {
        console.error(`Failed to create file metadata for ${fileId}:`, error);
        // Continue to queue the job even if metadata creation fails
      }

      // Create and send processing job to queue
      const job = queueService.createJobFromUpload(
        fileId,
        originalFilename,
        fileSize,
        s3Key,
        userId,
        organizationId,
        'misra-analysis',
        'normal'
      );

      if (queueService.isConfigured()) {
        const messageId = await queueService.sendJob(job);
        console.log(`Sent processing job ${job.jobId} to queue (message ID: ${messageId})`);
      } else {
        console.log('Queue not configured - job would be sent:', job);
      }

    } catch (error) {
      console.error('Error processing S3 upload event:', error);
      // Don't throw - we want to continue processing other records
    }
  }
};

function getFileType(filename: string): FileType {
  const extension = filename.toLowerCase().split('.').pop() || '';
  
  switch (extension) {
    case 'c':
      return FileType.C;
    case 'cpp':
    case 'cc':
    case 'cxx':
      return FileType.CPP;
    case 'h':
      return FileType.H;
    case 'hpp':
    case 'hh':
    case 'hxx':
      return FileType.HPP;
    default:
      return FileType.C; // Default to C for unknown types
  }
}
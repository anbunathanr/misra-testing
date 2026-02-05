import { S3Event, S3Handler } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

// Mock AWS SDK for development
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

interface FileProcessingMessage {
  fileId: string;
  s3Key: string;
  bucketName: string;
  fileName: string;
  fileSize: number;
  userId: string;
  organizationId: string;
  uploadTimestamp: string;
}

const sqsClient = process.env.NODE_ENV === 'production' 
  ? new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
  : {} as SQSClient;

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

      const uploadTimestamp = filenameParts[0];
      const fileId = filenameParts[1];
      const originalFilename = filenameParts.slice(2).join('-');

      // Create processing message
      const processingMessage: FileProcessingMessage = {
        fileId,
        s3Key,
        bucketName,
        fileName: originalFilename,
        fileSize,
        userId,
        organizationId,
        uploadTimestamp,
      };

      // Send message to processing queue
      if (process.env.NODE_ENV === 'production') {
        const queueUrl = process.env.PROCESSING_QUEUE_URL;
        if (!queueUrl) {
          throw new Error('PROCESSING_QUEUE_URL environment variable not set');
        }

        const command = new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(processingMessage),
          MessageAttributes: {
            'file-type': {
              DataType: 'String',
              StringValue: getFileType(originalFilename),
            },
            'organization-id': {
              DataType: 'String',
              StringValue: organizationId,
            },
            'user-id': {
              DataType: 'String',
              StringValue: userId,
            },
          },
        });

        await sqsClient.send(command);
        console.log(`Sent processing message for file ${fileId} to queue`);
      } else {
        console.log('Development mode: Mock processing message sent:', processingMessage);
      }

    } catch (error) {
      console.error('Error processing S3 upload event:', error);
      // Don't throw - we want to continue processing other records
    }
  }
};

function getFileType(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop() || '';
  
  switch (extension) {
    case 'c':
      return 'C';
    case 'cpp':
    case 'cc':
    case 'cxx':
      return 'CPP';
    case 'h':
    case 'hpp':
    case 'hxx':
      return 'HEADER';
    default:
      return 'UNKNOWN';
  }
}
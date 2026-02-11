"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sfn_1 = require("@aws-sdk/client-sfn");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const file_metadata_1 = require("../../types/file-metadata");
const sfnClient = new client_sfn_1.SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(process.env.ENVIRONMENT || 'dev');
const metadataService = new file_metadata_service_1.FileMetadataService(dbClient);
const stateMachineArn = process.env.STATE_MACHINE_ARN || '';
const handler = async (event) => {
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
                await metadataService.updateAnalysisStatus(fileId, file_metadata_1.AnalysisStatus.IN_PROGRESS);
                console.log(`Updated file metadata status to IN_PROGRESS for ${fileId}`);
            }
            catch (error) {
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
            const command = new client_sfn_1.StartExecutionCommand({
                stateMachineArn,
                input: JSON.stringify(input),
                name: `analysis-${fileId}-${Date.now()}`
            });
            const result = await sfnClient.send(command);
            console.log(`Started Step Functions execution: ${result.executionArn}`);
        }
        catch (error) {
            console.error('Error processing S3 upload event:', error);
            // Don't throw - we want to continue processing other records
        }
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLWNvbXBsZXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLWNvbXBsZXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUF1RTtBQUN2RSxnRkFBMkU7QUFDM0Usb0VBQXVFO0FBQ3ZFLDZEQUEyRDtBQUUzRCxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNuRixNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFxQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxDQUFDO0FBQzdFLE1BQU0sZUFBZSxHQUFHLElBQUksMkNBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUQsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLENBQUM7QUFFckQsTUFBTSxPQUFPLEdBQWMsS0FBSyxFQUFFLEtBQWMsRUFBRSxFQUFFO0lBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbEYsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ3pDLE1BQU0sS0FBSyxHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDM0UsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENB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QyxHQUFHLENBQUMscUNBQXFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRTFFLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxRCw2REFBNkQ7UUFDL0QsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDLENBQUM7QUExRVcsUUFBQSxPQUFPLFdBMEVsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFMzRXZlbnQsIFMzSGFuZGxlciB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTRk5DbGllbnQsIFN0YXJ0RXhlY3V0aW9uQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZm4nO1xyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZmlsZS1tZXRhZGF0YS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnRXcmFwcGVyIH0gZnJvbSAnLi4vLi4vZGF0YWJhc2UvZHluYW1vZGItY2xpZW50JztcclxuaW1wb3J0IHsgQW5hbHlzaXNTdGF0dXMgfSBmcm9tICcuLi8uLi90eXBlcy9maWxlLW1ldGFkYXRhJztcclxuXHJcbmNvbnN0IHNmbkNsaWVudCA9IG5ldyBTRk5DbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbmNvbnN0IGRiQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50V3JhcHBlcihwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2Jyk7XHJcbmNvbnN0IG1ldGFkYXRhU2VydmljZSA9IG5ldyBGaWxlTWV0YWRhdGFTZXJ2aWNlKGRiQ2xpZW50KTtcclxuY29uc3Qgc3RhdGVNYWNoaW5lQXJuID0gcHJvY2Vzcy5lbnYuU1RBVEVfTUFDSElORV9BUk4gfHwgJyc7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlcjogUzNIYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBTM0V2ZW50KSA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1MzIHVwbG9hZCBjb21wbGV0ZSBldmVudCByZWNlaXZlZDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xyXG5cclxuICBmb3IgKGNvbnN0IHJlY29yZCBvZiBldmVudC5SZWNvcmRzKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBidWNrZXROYW1lID0gcmVjb3JkLnMzLmJ1Y2tldC5uYW1lO1xyXG4gICAgICBjb25zdCBzM0tleSA9IGRlY29kZVVSSUNvbXBvbmVudChyZWNvcmQuczMub2JqZWN0LmtleS5yZXBsYWNlKC9cXCsvZywgJyAnKSk7XHJcbiAgICAgIGNvbnN0IGZpbGVTaXplID0gcmVjb3JkLnMzLm9iamVjdC5zaXplO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYFByb2Nlc3NpbmcgZmlsZSB1cGxvYWQ6ICR7czNLZXl9ICgke2ZpbGVTaXplfSBieXRlcylgKTtcclxuXHJcbiAgICAgIC8vIEV4dHJhY3QgbWV0YWRhdGEgZnJvbSBTMyBrZXkgc3RydWN0dXJlXHJcbiAgICAgIC8vIEV4cGVjdGVkIGZvcm1hdDogdXBsb2Fkcy97b3JnYW5pemF0aW9uSWR9L3t1c2VySWR9L3t0aW1lc3RhbXB9LXtmaWxlSWR9LXtmaWxlbmFtZX1cclxuICAgICAgY29uc3Qga2V5UGFydHMgPSBzM0tleS5zcGxpdCgnLycpO1xyXG4gICAgICBpZiAoa2V5UGFydHMubGVuZ3RoIDwgNCB8fCBrZXlQYXJ0c1swXSAhPT0gJ3VwbG9hZHMnKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKGBVbmV4cGVjdGVkIFMzIGtleSBmb3JtYXQ6ICR7czNLZXl9YCk7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IG9yZ2FuaXphdGlvbklkID0ga2V5UGFydHNbMV07XHJcbiAgICAgIGNvbnN0IHVzZXJJZCA9IGtleVBhcnRzWzJdO1xyXG4gICAgICBjb25zdCBmaWxlbmFtZVBhcnQgPSBrZXlQYXJ0c1szXTtcclxuICAgICAgXHJcbiAgICAgIC8vIEV4dHJhY3QgZmlsZUlkIGZyb20gZmlsZW5hbWUgcGFydFxyXG4gICAgICAvLyBGb3JtYXQ6IHt0aW1lc3RhbXB9LXt1dWlkfS17ZmlsZW5hbWV9XHJcbiAgICAgIC8vIFVVSUQgZm9ybWF0OiB4eHh4eHh4eC14eHh4LXh4eHgteHh4eC14eHh4eHh4eHh4eHggKDM2IGNoYXJzIHdpdGggaHlwaGVucylcclxuICAgICAgY29uc3QgdGltZXN0YW1wRW5kSW5kZXggPSBmaWxlbmFtZVBhcnQuaW5kZXhPZignLScpO1xyXG4gICAgICBpZiAodGltZXN0YW1wRW5kSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKGBVbmV4cGVjdGVkIGZpbGVuYW1lIGZvcm1hdDogJHtmaWxlbmFtZVBhcnR9YCk7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGFmdGVyVGltZXN0YW1wID0gZmlsZW5hbWVQYXJ0LnN1YnN0cmluZyh0aW1lc3RhbXBFbmRJbmRleCArIDEpO1xyXG4gICAgICAvLyBVVUlEIGlzIDM2IGNoYXJhY3RlcnMgbG9uZ1xyXG4gICAgICBjb25zdCBmaWxlSWQgPSBhZnRlclRpbWVzdGFtcC5zdWJzdHJpbmcoMCwgMzYpO1xyXG4gICAgICBjb25zdCBvcmlnaW5hbEZpbGVuYW1lID0gYWZ0ZXJUaW1lc3RhbXAuc3Vic3RyaW5nKDM3KTsgLy8gU2tpcCBVVUlEIGFuZCBoeXBoZW5cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBFeHRyYWN0ZWQ6IGZpbGVJZD0ke2ZpbGVJZH0sIGZpbGVuYW1lPSR7b3JpZ2luYWxGaWxlbmFtZX0sIHVzZXJJZD0ke3VzZXJJZH1gKTtcclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBGaWxlTWV0YWRhdGEgc3RhdHVzIHRvIElOX1BST0dSRVNTXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgbWV0YWRhdGFTZXJ2aWNlLnVwZGF0ZUFuYWx5c2lzU3RhdHVzKGZpbGVJZCwgQW5hbHlzaXNTdGF0dXMuSU5fUFJPR1JFU1MpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBVcGRhdGVkIGZpbGUgbWV0YWRhdGEgc3RhdHVzIHRvIElOX1BST0dSRVNTIGZvciAke2ZpbGVJZH1gKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIGZpbGUgbWV0YWRhdGEgZm9yICR7ZmlsZUlkfTpgLCBlcnJvcik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFRyaWdnZXIgU3RlcCBGdW5jdGlvbnMgd29ya2Zsb3cgZm9yIGFuYWx5c2lzXHJcbiAgICAgIGNvbnN0IGlucHV0ID0ge1xyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBmaWxlTmFtZTogb3JpZ2luYWxGaWxlbmFtZSxcclxuICAgICAgICBzM0tleSxcclxuICAgICAgICBmaWxlVHlwZTogJ2MnLFxyXG4gICAgICAgIHVzZXJJZDogdXNlcklkLnJlcGxhY2UoLy0vZywgJycpLnN1YnN0cmluZygwLCAzMiksIC8vIENsZWFuIHVzZXJJZFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIHVzZXJFbWFpbDogJ2FkbWluQG1pc3JhLXBsYXRmb3JtLmNvbScgLy8gVE9ETzogR2V0IGZyb20gdXNlciByZWNvcmRcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBTdGFydGluZyBTdGVwIEZ1bmN0aW9ucyBleGVjdXRpb24gd2l0aCBpbnB1dDpgLCBKU09OLnN0cmluZ2lmeShpbnB1dCkpO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBTdGFydEV4ZWN1dGlvbkNvbW1hbmQoe1xyXG4gICAgICAgIHN0YXRlTWFjaGluZUFybixcclxuICAgICAgICBpbnB1dDogSlNPTi5zdHJpbmdpZnkoaW5wdXQpLFxyXG4gICAgICAgIG5hbWU6IGBhbmFseXNpcy0ke2ZpbGVJZH0tJHtEYXRlLm5vdygpfWBcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZm5DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgY29uc29sZS5sb2coYFN0YXJ0ZWQgU3RlcCBGdW5jdGlvbnMgZXhlY3V0aW9uOiAke3Jlc3VsdC5leGVjdXRpb25Bcm59YCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyBTMyB1cGxvYWQgZXZlbnQ6JywgZXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCB0aHJvdyAtIHdlIHdhbnQgdG8gY29udGludWUgcHJvY2Vzc2luZyBvdGhlciByZWNvcmRzXHJcbiAgICB9XHJcbiAgfVxyXG59OyJdfQ==
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const processing_queue_service_1 = require("../../services/queue/processing-queue-service");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const file_metadata_1 = require("../../types/file-metadata");
const queueService = new processing_queue_service_1.ProcessingQueueService();
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(process.env.ENVIRONMENT || 'dev');
const metadataService = new file_metadata_service_1.FileMetadataService(dbClient);
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
                    analysis_status: file_metadata_1.AnalysisStatus.PENDING,
                    s3_key: s3Key,
                    created_at: Date.now(),
                    updated_at: Date.now(),
                });
                console.log(`Created file metadata for ${fileId}`);
            }
            catch (error) {
                console.error(`Failed to create file metadata for ${fileId}:`, error);
                // Continue to queue the job even if metadata creation fails
            }
            // Create and send processing job to queue
            const job = queueService.createJobFromUpload(fileId, originalFilename, fileSize, s3Key, userId, organizationId, 'misra-analysis', 'normal');
            if (queueService.isConfigured()) {
                const messageId = await queueService.sendJob(job);
                console.log(`Sent processing job ${job.jobId} to queue (message ID: ${messageId})`);
            }
            else {
                console.log('Queue not configured - job would be sent:', job);
            }
        }
        catch (error) {
            console.error('Error processing S3 upload event:', error);
            // Don't throw - we want to continue processing other records
        }
    }
};
exports.handler = handler;
function getFileType(filename) {
    const extension = filename.toLowerCase().split('.').pop() || '';
    switch (extension) {
        case 'c':
            return file_metadata_1.FileType.C;
        case 'cpp':
        case 'cc':
        case 'cxx':
            return file_metadata_1.FileType.CPP;
        case 'h':
            return file_metadata_1.FileType.H;
        case 'hpp':
        case 'hh':
        case 'hxx':
            return file_metadata_1.FileType.HPP;
        default:
            return file_metadata_1.FileType.C; // Default to C for unknown types
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLWNvbXBsZXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLWNvbXBsZXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDRGQUF1RjtBQUN2RixnRkFBMkU7QUFDM0Usb0VBQXVFO0FBQ3ZFLDZEQUFxRTtBQUVyRSxNQUFNLFlBQVksR0FBRyxJQUFJLGlEQUFzQixFQUFFLENBQUM7QUFDbEQsTUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBcUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsQ0FBQztBQUM3RSxNQUFNLGVBQWUsR0FBRyxJQUFJLDJDQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRW5ELE1BQU0sT0FBTyxHQUFjLEtBQUssRUFBRSxLQUFjLEVBQUUsRUFBRTtJQUN6RCxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRWxGLEtBQUssTUFBTSxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQztZQUNILE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUN6QyxNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUV2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixLQUFLLEtBQUssUUFBUSxTQUFTLENBQUMsQ0FBQztZQUVwRSx5Q0FBeUM7WUFDekMscUZBQXFGO1lBQ3JGLE1BQU0sUUFBUSxHQUFH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LEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUQsNkRBQTZEO1FBQy9ELENBQUM7SUFDSCxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBL0VXLFFBQUEsT0FBTyxXQStFbEI7QUFFRixTQUFTLFdBQVcsQ0FBQyxRQUFnQjtJQUNuQyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUVoRSxRQUFRLFNBQVMsRUFBRSxDQUFDO1FBQ2xCLEtBQUssR0FBRztZQUNOLE9BQU8sd0JBQVEsQ0FBQyxDQUFDLENBQUM7UUFDcEIsS0FBSyxLQUFLLENBQUM7UUFDWCxLQUFLLElBQUksQ0FBQztRQUNWLEtBQUssS0FBSztZQUNSLE9BQU8sd0JBQVEsQ0FBQyxHQUFHLENBQUM7UUFDdEIsS0FBSyxHQUFHO1lBQ04sT0FBTyx3QkFBUSxDQUFDLENBQUMsQ0FBQztRQUNwQixLQUFLLEtBQUssQ0FBQztRQUNYLEtBQUssSUFBSSxDQUFDO1FBQ1YsS0FBSyxLQUFLO1lBQ1IsT0FBTyx3QkFBUSxDQUFDLEdBQUcsQ0FBQztRQUN0QjtZQUNFLE9BQU8sd0JBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUM7SUFDeEQsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTM0V2ZW50LCBTM0hhbmRsZXIgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgUHJvY2Vzc2luZ1F1ZXVlU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3F1ZXVlL3Byb2Nlc3NpbmctcXVldWUtc2VydmljZSc7XHJcbmltcG9ydCB7IEZpbGVNZXRhZGF0YVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9maWxlLW1ldGFkYXRhLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudFdyYXBwZXIgfSBmcm9tICcuLi8uLi9kYXRhYmFzZS9keW5hbW9kYi1jbGllbnQnO1xyXG5pbXBvcnQgeyBGaWxlVHlwZSwgQW5hbHlzaXNTdGF0dXMgfSBmcm9tICcuLi8uLi90eXBlcy9maWxlLW1ldGFkYXRhJztcclxuXHJcbmNvbnN0IHF1ZXVlU2VydmljZSA9IG5ldyBQcm9jZXNzaW5nUXVldWVTZXJ2aWNlKCk7XHJcbmNvbnN0IGRiQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50V3JhcHBlcihwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2Jyk7XHJcbmNvbnN0IG1ldGFkYXRhU2VydmljZSA9IG5ldyBGaWxlTWV0YWRhdGFTZXJ2aWNlKGRiQ2xpZW50KTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBTM0hhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IFMzRXZlbnQpID0+IHtcclxuICBjb25zb2xlLmxvZygnUzMgdXBsb2FkIGNvbXBsZXRlIGV2ZW50IHJlY2VpdmVkOicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gIGZvciAoY29uc3QgcmVjb3JkIG9mIGV2ZW50LlJlY29yZHMpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGJ1Y2tldE5hbWUgPSByZWNvcmQuczMuYnVja2V0Lm5hbWU7XHJcbiAgICAgIGNvbnN0IHMzS2V5ID0gZGVjb2RlVVJJQ29tcG9uZW50KHJlY29yZC5zMy5vYmplY3Qua2V5LnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcclxuICAgICAgY29uc3QgZmlsZVNpemUgPSByZWNvcmQuczMub2JqZWN0LnNpemU7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBmaWxlIHVwbG9hZDogJHtzM0tleX0gKCR7ZmlsZVNpemV9IGJ5dGVzKWApO1xyXG5cclxuICAgICAgLy8gRXh0cmFjdCBtZXRhZGF0YSBmcm9tIFMzIGtleSBzdHJ1Y3R1cmVcclxuICAgICAgLy8gRXhwZWN0ZWQgZm9ybWF0OiB1cGxvYWRzL3tvcmdhbml6YXRpb25JZH0ve3VzZXJJZH0ve3RpbWVzdGFtcH0te2ZpbGVJZH0te2ZpbGVuYW1lfVxyXG4gICAgICBjb25zdCBrZXlQYXJ0cyA9IHMzS2V5LnNwbGl0KCcvJyk7XHJcbiAgICAgIGlmIChrZXlQYXJ0cy5sZW5ndGggPCA0IHx8IGtleVBhcnRzWzBdICE9PSAndXBsb2FkcycpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oYFVuZXhwZWN0ZWQgUzMga2V5IGZvcm1hdDogJHtzM0tleX1gKTtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgb3JnYW5pemF0aW9uSWQgPSBrZXlQYXJ0c1sxXTtcclxuICAgICAgY29uc3QgdXNlcklkID0ga2V5UGFydHNbMl07XHJcbiAgICAgIGNvbnN0IGZpbGVuYW1lUGFydCA9IGtleVBhcnRzWzNdO1xyXG4gICAgICBcclxuICAgICAgLy8gRXh0cmFjdCBmaWxlSWQgZnJvbSBmaWxlbmFtZSBwYXJ0XHJcbiAgICAgIGNvbnN0IGZpbGVuYW1lUGFydHMgPSBmaWxlbmFtZVBhcnQuc3BsaXQoJy0nKTtcclxuICAgICAgaWYgKGZpbGVuYW1lUGFydHMubGVuZ3RoIDwgMykge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihgVW5leHBlY3RlZCBmaWxlbmFtZSBmb3JtYXQ6ICR7ZmlsZW5hbWVQYXJ0fWApO1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCB1cGxvYWRUaW1lc3RhbXAgPSBwYXJzZUludChmaWxlbmFtZVBhcnRzWzBdKTtcclxuICAgICAgY29uc3QgZmlsZUlkID0gZmlsZW5hbWVQYXJ0c1sxXTtcclxuICAgICAgY29uc3Qgb3JpZ2luYWxGaWxlbmFtZSA9IGZpbGVuYW1lUGFydHMuc2xpY2UoMikuam9pbignLScpO1xyXG4gICAgICBjb25zdCBmaWxlVHlwZSA9IGdldEZpbGVUeXBlKG9yaWdpbmFsRmlsZW5hbWUpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIGZpbGUgbWV0YWRhdGEgcmVjb3JkIGluIER5bmFtb0RCXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgbWV0YWRhdGFTZXJ2aWNlLmNyZWF0ZUZpbGVNZXRhZGF0YSh7XHJcbiAgICAgICAgICBmaWxlX2lkOiBmaWxlSWQsXHJcbiAgICAgICAgICB1c2VyX2lkOiB1c2VySWQsXHJcbiAgICAgICAgICBmaWxlbmFtZTogb3JpZ2luYWxGaWxlbmFtZSxcclxuICAgICAgICAgIGZpbGVfdHlwZTogZmlsZVR5cGUsXHJcbiAgICAgICAgICBmaWxlX3NpemU6IGZpbGVTaXplLFxyXG4gICAgICAgICAgdXBsb2FkX3RpbWVzdGFtcDogTWF0aC5mbG9vcih1cGxvYWRUaW1lc3RhbXAgLyAxMDAwKSwgLy8gQ29udmVydCB0byBzZWNvbmRzXHJcbiAgICAgICAgICBhbmFseXNpc19zdGF0dXM6IEFuYWx5c2lzU3RhdHVzLlBFTkRJTkcsXHJcbiAgICAgICAgICBzM19rZXk6IHMzS2V5LFxyXG4gICAgICAgICAgY3JlYXRlZF9hdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgIHVwZGF0ZWRfYXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYENyZWF0ZWQgZmlsZSBtZXRhZGF0YSBmb3IgJHtmaWxlSWR9YCk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGNyZWF0ZSBmaWxlIG1ldGFkYXRhIGZvciAke2ZpbGVJZH06YCwgZXJyb3IpO1xyXG4gICAgICAgIC8vIENvbnRpbnVlIHRvIHF1ZXVlIHRoZSBqb2IgZXZlbiBpZiBtZXRhZGF0YSBjcmVhdGlvbiBmYWlsc1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDcmVhdGUgYW5kIHNlbmQgcHJvY2Vzc2luZyBqb2IgdG8gcXVldWVcclxuICAgICAgY29uc3Qgam9iID0gcXVldWVTZXJ2aWNlLmNyZWF0ZUpvYkZyb21VcGxvYWQoXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIG9yaWdpbmFsRmlsZW5hbWUsXHJcbiAgICAgICAgZmlsZVNpemUsXHJcbiAgICAgICAgczNLZXksXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgICdtaXNyYS1hbmFseXNpcycsXHJcbiAgICAgICAgJ25vcm1hbCdcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmIChxdWV1ZVNlcnZpY2UuaXNDb25maWd1cmVkKCkpIHtcclxuICAgICAgICBjb25zdCBtZXNzYWdlSWQgPSBhd2FpdCBxdWV1ZVNlcnZpY2Uuc2VuZEpvYihqb2IpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBTZW50IHByb2Nlc3Npbmcgam9iICR7am9iLmpvYklkfSB0byBxdWV1ZSAobWVzc2FnZSBJRDogJHttZXNzYWdlSWR9KWApO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdRdWV1ZSBub3QgY29uZmlndXJlZCAtIGpvYiB3b3VsZCBiZSBzZW50OicsIGpvYik7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwcm9jZXNzaW5nIFMzIHVwbG9hZCBldmVudDonLCBlcnJvcik7XHJcbiAgICAgIC8vIERvbid0IHRocm93IC0gd2Ugd2FudCB0byBjb250aW51ZSBwcm9jZXNzaW5nIG90aGVyIHJlY29yZHNcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZXRGaWxlVHlwZShmaWxlbmFtZTogc3RyaW5nKTogRmlsZVR5cGUge1xyXG4gIGNvbnN0IGV4dGVuc2lvbiA9IGZpbGVuYW1lLnRvTG93ZXJDYXNlKCkuc3BsaXQoJy4nKS5wb3AoKSB8fCAnJztcclxuICBcclxuICBzd2l0Y2ggKGV4dGVuc2lvbikge1xyXG4gICAgY2FzZSAnYyc6XHJcbiAgICAgIHJldHVybiBGaWxlVHlwZS5DO1xyXG4gICAgY2FzZSAnY3BwJzpcclxuICAgIGNhc2UgJ2NjJzpcclxuICAgIGNhc2UgJ2N4eCc6XHJcbiAgICAgIHJldHVybiBGaWxlVHlwZS5DUFA7XHJcbiAgICBjYXNlICdoJzpcclxuICAgICAgcmV0dXJuIEZpbGVUeXBlLkg7XHJcbiAgICBjYXNlICdocHAnOlxyXG4gICAgY2FzZSAnaGgnOlxyXG4gICAgY2FzZSAnaHh4JzpcclxuICAgICAgcmV0dXJuIEZpbGVUeXBlLkhQUDtcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHJldHVybiBGaWxlVHlwZS5DOyAvLyBEZWZhdWx0IHRvIEMgZm9yIHVua25vd24gdHlwZXNcclxuICB9XHJcbn0iXX0=
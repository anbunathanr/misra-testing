"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const file_upload_service_1 = require("../../services/file/file-upload-service");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const file_metadata_1 = require("../../types/file-metadata");
const auth_util_1 = require("../../utils/auth-util");
const ALLOWED_EXTENSIONS = ['.c', '.cpp', '.h', '.hpp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const sqsClient = new client_sqs_1.SQSClient({});
const fileUploadService = new file_upload_service_1.FileUploadService();
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(environment);
const fileMetadataService = new file_metadata_service_1.FileMetadataService(dbClient);
const handler = async (event) => {
    try {
        // Extract user from Lambda Authorizer context
        const user = (0, auth_util_1.getUserFromContext)(event);
        if (!user.userId) {
            return errorResponse(401, 'UNAUTHORIZED', 'User not authenticated');
        }
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const uploadRequest = JSON.parse(event.body);
        // Validate input
        if (!uploadRequest.fileName || !uploadRequest.fileSize || !uploadRequest.contentType) {
            return errorResponse(400, 'INVALID_INPUT', 'fileName, fileSize, and contentType are required');
        }
        // Validate file extension (Requirements 1.1)
        const ext = uploadRequest.fileName.substring(uploadRequest.fileName.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return errorResponse(400, 'INVALID_FILE_TYPE', `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`);
        }
        // Validate file size (Requirements 1.2)
        if (uploadRequest.fileSize > MAX_FILE_SIZE) {
            return errorResponse(400, 'FILE_TOO_LARGE', `File size must not exceed 10MB (${MAX_FILE_SIZE} bytes)`);
        }
        // Create file upload request
        const fileUploadRequest = {
            fileName: uploadRequest.fileName,
            fileSize: uploadRequest.fileSize,
            contentType: uploadRequest.contentType,
            organizationId: user.organizationId,
            userId: user.userId,
        };
        // Generate presigned upload URL
        const uploadResponse = await fileUploadService.generatePresignedUploadUrl(fileUploadRequest);
        // Create FileMetadata record
        try {
            const now = Math.floor(Date.now() / 1000); // Convert to seconds
            await fileMetadataService.createFileMetadata({
                file_id: uploadResponse.fileId,
                filename: uploadRequest.fileName,
                file_type: uploadRequest.fileName.endsWith('.c') ? file_metadata_1.FileType.C : file_metadata_1.FileType.CPP,
                file_size: uploadRequest.fileSize,
                user_id: user.userId, // Use user ID as-is from context
                upload_timestamp: now,
                analysis_status: file_metadata_1.AnalysisStatus.PENDING,
                s3_key: `uploads/${user.organizationId}/${user.userId}/${Date.now()}-${uploadResponse.fileId}-${uploadRequest.fileName}`,
                created_at: now,
                updated_at: now
            });
            console.log(`FileMetadata record created for file ${uploadResponse.fileId}`);
        }
        catch (metadataError) {
            console.error('Error creating FileMetadata record:', metadataError);
            // Don't fail the upload if metadata creation fails
        }
        // Trigger MISRA analysis via SQS (Requirement 6.1)
        const analysisQueueUrl = process.env.ANALYSIS_QUEUE_URL;
        if (analysisQueueUrl) {
            const language = (ext === '.c' || ext === '.h') ? 'C' : 'CPP';
            try {
                await sqsClient.send(new client_sqs_1.SendMessageCommand({
                    QueueUrl: analysisQueueUrl,
                    MessageBody: JSON.stringify({
                        fileId: uploadResponse.fileId,
                        userId: user.userId,
                        language,
                    }),
                }));
                console.log(`Analysis queued for file ${uploadResponse.fileId}, language: ${language}`);
            }
            catch (sqsError) {
                console.error('Failed to queue analysis job:', sqsError);
                // Don't fail the upload if SQS send fails
            }
        }
        else {
            console.warn('ANALYSIS_QUEUE_URL is not set - analysis will not be triggered automatically');
        }
        const response = {
            fileId: uploadResponse.fileId,
            uploadUrl: uploadResponse.uploadUrl,
            downloadUrl: uploadResponse.downloadUrl,
            expiresIn: uploadResponse.expiresIn,
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('File upload error:', error);
        if (error instanceof Error) {
            if (error.message.includes('validation failed')) {
                return errorResponse(400, 'FILE_VALIDATION_ERROR', error.message);
            }
            if (error.message.includes('Failed to generate upload URL')) {
                return errorResponse(503, 'UPLOAD_SERVICE_UNAVAILABLE', 'File upload service temporarily unavailable');
            }
        }
        return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
    }
};
exports.handler = handler;
function errorResponse(statusCode, code, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: Math.random().toString(36).substring(7),
            },
        }),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvRTtBQUNwRSxpRkFBK0Y7QUFDL0YsZ0ZBQTJFO0FBQzNFLG9FQUF1RTtBQUN2RSw2REFBcUU7QUFDckUscURBQTJEO0FBRTNELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN4RCxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87QUFFL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBZ0JwQyxNQUFNLGlCQUFpQixHQUFHLElBQUksdUNBQWlCLEVBQUUsQ0FBQztBQUNsRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUM7QUFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN4RCxNQUFNLG1CQUFtQixHQUFHLElBQUksMkNBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFdkQsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gsOENBQThDO1FBQzlDLE1BQU0sSUFBSSxHQUFHLElBQUEsOEJBQWtCLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxj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QUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTUVNDbGllbnQsIFNlbmRNZXNzYWdlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zcXMnO1xyXG5pbXBvcnQgeyBGaWxlVXBsb2FkU2VydmljZSwgRmlsZVVwbG9hZFJlcXVlc3QgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9maWxlL2ZpbGUtdXBsb2FkLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZmlsZS1tZXRhZGF0YS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnRXcmFwcGVyIH0gZnJvbSAnLi4vLi4vZGF0YWJhc2UvZHluYW1vZGItY2xpZW50JztcclxuaW1wb3J0IHsgQW5hbHlzaXNTdGF0dXMsIEZpbGVUeXBlIH0gZnJvbSAnLi4vLi4vdHlwZXMvZmlsZS1tZXRhZGF0YSc7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcblxyXG5jb25zdCBBTExPV0VEX0VYVEVOU0lPTlMgPSBbJy5jJywgJy5jcHAnLCAnLmgnLCAnLmhwcCddO1xyXG5jb25zdCBNQVhfRklMRV9TSVpFID0gMTAgKiAxMDI0ICogMTAyNDsgLy8gMTBNQlxyXG5cclxuY29uc3Qgc3FzQ2xpZW50ID0gbmV3IFNRU0NsaWVudCh7fSk7XHJcblxyXG4vLyBMb2NhbCB0eXBlIGRlZmluaXRpb25zXHJcbmludGVyZmFjZSBVcGxvYWRSZXF1ZXN0Qm9keSB7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBmaWxlU2l6ZTogbnVtYmVyO1xyXG4gIGNvbnRlbnRUeXBlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBVcGxvYWRSZXNwb25zZSB7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgdXBsb2FkVXJsOiBzdHJpbmc7XHJcbiAgZG93bmxvYWRVcmw6IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxufVxyXG5cclxuY29uc3QgZmlsZVVwbG9hZFNlcnZpY2UgPSBuZXcgRmlsZVVwbG9hZFNlcnZpY2UoKTtcclxuY29uc3QgZW52aXJvbm1lbnQgPSBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2JztcclxuY29uc3QgZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnRXcmFwcGVyKGVudmlyb25tZW50KTtcclxuY29uc3QgZmlsZU1ldGFkYXRhU2VydmljZSA9IG5ldyBGaWxlTWV0YWRhdGFTZXJ2aWNlKGRiQ2xpZW50KTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IHVzZXIgZnJvbSBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0XHJcbiAgICBjb25zdCB1c2VyID0gZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnVU5BVVRIT1JJWkVEJywgJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdXBsb2FkUmVxdWVzdDogVXBsb2FkUmVxdWVzdEJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIGlucHV0XHJcbiAgICBpZiAoIXVwbG9hZFJlcXVlc3QuZmlsZU5hbWUgfHwgIXVwbG9hZFJlcXVlc3QuZmlsZVNpemUgfHwgIXVwbG9hZFJlcXVlc3QuY29udGVudFR5cGUpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9JTlBVVCcsICdmaWxlTmFtZSwgZmlsZVNpemUsIGFuZCBjb250ZW50VHlwZSBhcmUgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBmaWxlIGV4dGVuc2lvbiAoUmVxdWlyZW1lbnRzIDEuMSlcclxuICAgIGNvbnN0IGV4dCA9IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUuc3Vic3RyaW5nKHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUubGFzdEluZGV4T2YoJy4nKSkudG9Mb3dlckNhc2UoKTtcclxuICAgIGlmICghQUxMT1dFRF9FWFRFTlNJT05TLmluY2x1ZGVzKGV4dCkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9GSUxFX1RZUEUnLCBgT25seSAke0FMTE9XRURfRVhURU5TSU9OUy5qb2luKCcsICcpfSBmaWxlcyBhcmUgYWxsb3dlZGApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZhbGlkYXRlIGZpbGUgc2l6ZSAoUmVxdWlyZW1lbnRzIDEuMilcclxuICAgIGlmICh1cGxvYWRSZXF1ZXN0LmZpbGVTaXplID4gTUFYX0ZJTEVfU0laRSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdGSUxFX1RPT19MQVJHRScsIGBGaWxlIHNpemUgbXVzdCBub3QgZXhjZWVkIDEwTUIgKCR7TUFYX0ZJTEVfU0laRX0gYnl0ZXMpYCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIGZpbGUgdXBsb2FkIHJlcXVlc3RcclxuICAgIGNvbnN0IGZpbGVVcGxvYWRSZXF1ZXN0OiBGaWxlVXBsb2FkUmVxdWVzdCA9IHtcclxuICAgICAgZmlsZU5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsXHJcbiAgICAgIGZpbGVTaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplLFxyXG4gICAgICBjb250ZW50VHlwZTogdXBsb2FkUmVxdWVzdC5jb250ZW50VHlwZSxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIHByZXNpZ25lZCB1cGxvYWQgVVJMXHJcbiAgICBjb25zdCB1cGxvYWRSZXNwb25zZSA9IGF3YWl0IGZpbGVVcGxvYWRTZXJ2aWNlLmdlbmVyYXRlUHJlc2lnbmVkVXBsb2FkVXJsKGZpbGVVcGxvYWRSZXF1ZXN0KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgRmlsZU1ldGFkYXRhIHJlY29yZFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7IC8vIENvbnZlcnQgdG8gc2Vjb25kc1xyXG4gICAgICBhd2FpdCBmaWxlTWV0YWRhdGFTZXJ2aWNlLmNyZWF0ZUZpbGVNZXRhZGF0YSh7XHJcbiAgICAgICAgZmlsZV9pZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICAgIGZpbGVuYW1lOiB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgICAgIGZpbGVfdHlwZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZS5lbmRzV2l0aCgnLmMnKSA/IEZpbGVUeXBlLkMgOiBGaWxlVHlwZS5DUFAsXHJcbiAgICAgICAgZmlsZV9zaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplLFxyXG4gICAgICAgIHVzZXJfaWQ6IHVzZXIudXNlcklkLCAvLyBVc2UgdXNlciBJRCBhcy1pcyBmcm9tIGNvbnRleHRcclxuICAgICAgICB1cGxvYWRfdGltZXN0YW1wOiBub3csXHJcbiAgICAgICAgYW5hbHlzaXNfc3RhdHVzOiBBbmFseXNpc1N0YXR1cy5QRU5ESU5HLFxyXG4gICAgICAgIHMzX2tleTogYHVwbG9hZHMvJHt1c2VyLm9yZ2FuaXphdGlvbklkfS8ke3VzZXIudXNlcklkfS8ke0RhdGUubm93KCl9LSR7dXBsb2FkUmVzcG9uc2UuZmlsZUlkfS0ke3VwbG9hZFJlcXVlc3QuZmlsZU5hbWV9YCxcclxuICAgICAgICBjcmVhdGVkX2F0OiBub3csXHJcbiAgICAgICAgdXBkYXRlZF9hdDogbm93XHJcbiAgICAgIH0pO1xyXG4gICAgICBjb25zb2xlLmxvZyhgRmlsZU1ldGFkYXRhIHJlY29yZCBjcmVhdGVkIGZvciBmaWxlICR7dXBsb2FkUmVzcG9uc2UuZmlsZUlkfWApO1xyXG4gICAgfSBjYXRjaCAobWV0YWRhdGFFcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjcmVhdGluZyBGaWxlTWV0YWRhdGEgcmVjb3JkOicsIG1ldGFkYXRhRXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCBmYWlsIHRoZSB1cGxvYWQgaWYgbWV0YWRhdGEgY3JlYXRpb24gZmFpbHNcclxuICAgIH1cclxuXHJcbiAgICAvLyBUcmlnZ2VyIE1JU1JBIGFuYWx5c2lzIHZpYSBTUVMgKFJlcXVpcmVtZW50IDYuMSlcclxuICAgIGNvbnN0IGFuYWx5c2lzUXVldWVVcmwgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19RVUVVRV9VUkw7XHJcbiAgICBpZiAoYW5hbHlzaXNRdWV1ZVVybCkge1xyXG4gICAgICBjb25zdCBsYW5ndWFnZSA9IChleHQgPT09ICcuYycgfHwgZXh0ID09PSAnLmgnKSA/ICdDJyA6ICdDUFAnO1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHNxc0NsaWVudC5zZW5kKG5ldyBTZW5kTWVzc2FnZUNvbW1hbmQoe1xyXG4gICAgICAgICAgUXVldWVVcmw6IGFuYWx5c2lzUXVldWVVcmwsXHJcbiAgICAgICAgICBNZXNzYWdlQm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgICAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgICAgICAgbGFuZ3VhZ2UsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEFuYWx5c2lzIHF1ZXVlZCBmb3IgZmlsZSAke3VwbG9hZFJlc3BvbnNlLmZpbGVJZH0sIGxhbmd1YWdlOiAke2xhbmd1YWdlfWApO1xyXG4gICAgICB9IGNhdGNoIChzcXNFcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBxdWV1ZSBhbmFseXNpcyBqb2I6Jywgc3FzRXJyb3IpO1xyXG4gICAgICAgIC8vIERvbid0IGZhaWwgdGhlIHVwbG9hZCBpZiBTUVMgc2VuZCBmYWlsc1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0FOQUxZU0lTX1FVRVVFX1VSTCBpcyBub3Qgc2V0IC0gYW5hbHlzaXMgd2lsbCBub3QgYmUgdHJpZ2dlcmVkIGF1dG9tYXRpY2FsbHknKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogVXBsb2FkUmVzcG9uc2UgPSB7XHJcbiAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICB1cGxvYWRVcmw6IHVwbG9hZFJlc3BvbnNlLnVwbG9hZFVybCxcclxuICAgICAgZG93bmxvYWRVcmw6IHVwbG9hZFJlc3BvbnNlLmRvd25sb2FkVXJsLFxyXG4gICAgICBleHBpcmVzSW46IHVwbG9hZFJlc3BvbnNlLmV4cGlyZXNJbixcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmlsZSB1cGxvYWQgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgXHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygndmFsaWRhdGlvbiBmYWlsZWQnKSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0ZJTEVfVkFMSURBVElPTl9FUlJPUicsIGVycm9yLm1lc3NhZ2UpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdGYWlsZWQgdG8gZ2VuZXJhdGUgdXBsb2FkIFVSTCcpKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAzLCAnVVBMT0FEX1NFUlZJQ0VfVU5BVkFJTEFCTEUnLCAnRmlsZSB1cGxvYWQgc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZScpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0lOVEVSTkFMX0VSUk9SJywgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xyXG4gIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59Il19
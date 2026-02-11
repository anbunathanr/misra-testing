"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const file_upload_service_1 = require("../../services/file/file-upload-service");
const jwt_service_1 = require("../../services/auth/jwt-service");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const file_metadata_1 = require("../../types/file-metadata");
const fileUploadService = new file_upload_service_1.FileUploadService();
const jwtService = new jwt_service_1.JWTService();
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(environment);
const fileMetadataService = new file_metadata_service_1.FileMetadataService(dbClient);
const handler = async (event) => {
    try {
        // Extract and validate JWT token
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(401, 'MISSING_TOKEN', 'Authorization token is required');
        }
        const token = authHeader.substring(7);
        let tokenPayload;
        try {
            tokenPayload = await jwtService.verifyAccessToken(token);
        }
        catch (error) {
            return errorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token');
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
        // Create file upload request
        const fileUploadRequest = {
            fileName: uploadRequest.fileName,
            fileSize: uploadRequest.fileSize,
            contentType: uploadRequest.contentType,
            organizationId: tokenPayload.organizationId,
            userId: tokenPayload.userId,
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
                user_id: tokenPayload.userId, // Use user ID as-is from JWT
                upload_timestamp: now,
                analysis_status: file_metadata_1.AnalysisStatus.PENDING,
                s3_key: `uploads/${tokenPayload.organizationId}/${tokenPayload.userId}/${Date.now()}-${uploadResponse.fileId}-${uploadRequest.fileName}`,
                created_at: now,
                updated_at: now
            });
            console.log(`FileMetadata record created for file ${uploadResponse.fileId}`);
        }
        catch (metadataError) {
            console.error('Error creating FileMetadata record:', metadataError);
            // Don't fail the upload if metadata creation fails
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlGQUErRjtBQUMvRixpRUFBNkQ7QUFDN0QsZ0ZBQTJFO0FBQzNFLG9FQUF1RTtBQUN2RSw2REFBcUU7QUFnQnJFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsRUFBRSxDQUFDO0FBQ2xELE1BQU0sVUFBVSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztBQUNyRCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUV2RCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCxpQ0FBaUM7UUFDakMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7UUFDOUUsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsSUFBSSxZQUFZLENBQUM7UUFFakIsSUFBSSxDQUFDO1lBQ0gsWUFBWSxHQUFHLE1BQU0sVUFBVSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFD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QUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDbkQ7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEZpbGVVcGxvYWRTZXJ2aWNlLCBGaWxlVXBsb2FkUmVxdWVzdCB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2ZpbGUvZmlsZS11cGxvYWQtc2VydmljZSc7XHJcbmltcG9ydCB7IEpXVFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdXRoL2p3dC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRmlsZU1ldGFkYXRhU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2ZpbGUtbWV0YWRhdGEtc2VydmljZSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50V3JhcHBlciB9IGZyb20gJy4uLy4uL2RhdGFiYXNlL2R5bmFtb2RiLWNsaWVudCc7XHJcbmltcG9ydCB7IEFuYWx5c2lzU3RhdHVzLCBGaWxlVHlwZSB9IGZyb20gJy4uLy4uL3R5cGVzL2ZpbGUtbWV0YWRhdGEnO1xyXG5cclxuLy8gTG9jYWwgdHlwZSBkZWZpbml0aW9uc1xyXG5pbnRlcmZhY2UgVXBsb2FkUmVxdWVzdEJvZHkge1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgZmlsZVNpemU6IG51bWJlcjtcclxuICBjb250ZW50VHlwZTogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVXBsb2FkUmVzcG9uc2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIHVwbG9hZFVybDogc3RyaW5nO1xyXG4gIGRvd25sb2FkVXJsOiBzdHJpbmc7XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbn1cclxuXHJcbmNvbnN0IGZpbGVVcGxvYWRTZXJ2aWNlID0gbmV3IEZpbGVVcGxvYWRTZXJ2aWNlKCk7XHJcbmNvbnN0IGp3dFNlcnZpY2UgPSBuZXcgSldUU2VydmljZSgpO1xyXG5jb25zdCBlbnZpcm9ubWVudCA9IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICdkZXYnO1xyXG5jb25zdCBkYkNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudFdyYXBwZXIoZW52aXJvbm1lbnQpO1xyXG5jb25zdCBmaWxlTWV0YWRhdGFTZXJ2aWNlID0gbmV3IEZpbGVNZXRhZGF0YVNlcnZpY2UoZGJDbGllbnQpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgYW5kIHZhbGlkYXRlIEpXVCB0b2tlblxyXG4gICAgY29uc3QgYXV0aEhlYWRlciA9IGV2ZW50LmhlYWRlcnMuQXV0aG9yaXphdGlvbiB8fCBldmVudC5oZWFkZXJzLmF1dGhvcml6YXRpb247XHJcbiAgICBpZiAoIWF1dGhIZWFkZXIgfHwgIWF1dGhIZWFkZXIuc3RhcnRzV2l0aCgnQmVhcmVyICcpKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ01JU1NJTkdfVE9LRU4nLCAnQXV0aG9yaXphdGlvbiB0b2tlbiBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRva2VuID0gYXV0aEhlYWRlci5zdWJzdHJpbmcoNyk7XHJcbiAgICBsZXQgdG9rZW5QYXlsb2FkO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICB0b2tlblBheWxvYWQgPSBhd2FpdCBqd3RTZXJ2aWNlLnZlcmlmeUFjY2Vzc1Rva2VuKHRva2VuKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ0lOVkFMSURfVE9LRU4nLCAnSW52YWxpZCBvciBleHBpcmVkIHRva2VuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVwbG9hZFJlcXVlc3Q6IFVwbG9hZFJlcXVlc3RCb2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBpbnB1dFxyXG4gICAgaWYgKCF1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lIHx8ICF1cGxvYWRSZXF1ZXN0LmZpbGVTaXplIHx8ICF1cGxvYWRSZXF1ZXN0LmNvbnRlbnRUeXBlKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfSU5QVVQnLCAnZmlsZU5hbWUsIGZpbGVTaXplLCBhbmQgY29udGVudFR5cGUgYXJlIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIGZpbGUgdXBsb2FkIHJlcXVlc3RcclxuICAgIGNvbnN0IGZpbGVVcGxvYWRSZXF1ZXN0OiBGaWxlVXBsb2FkUmVxdWVzdCA9IHtcclxuICAgICAgZmlsZU5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsXHJcbiAgICAgIGZpbGVTaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplLFxyXG4gICAgICBjb250ZW50VHlwZTogdXBsb2FkUmVxdWVzdC5jb250ZW50VHlwZSxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHRva2VuUGF5bG9hZC5vcmdhbml6YXRpb25JZCxcclxuICAgICAgdXNlcklkOiB0b2tlblBheWxvYWQudXNlcklkLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSBwcmVzaWduZWQgdXBsb2FkIFVSTFxyXG4gICAgY29uc3QgdXBsb2FkUmVzcG9uc2UgPSBhd2FpdCBmaWxlVXBsb2FkU2VydmljZS5nZW5lcmF0ZVByZXNpZ25lZFVwbG9hZFVybChmaWxlVXBsb2FkUmVxdWVzdCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEZpbGVNZXRhZGF0YSByZWNvcmRcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApOyAvLyBDb252ZXJ0IHRvIHNlY29uZHNcclxuICAgICAgYXdhaXQgZmlsZU1ldGFkYXRhU2VydmljZS5jcmVhdGVGaWxlTWV0YWRhdGEoe1xyXG4gICAgICAgIGZpbGVfaWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgICAgICBmaWxlbmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgICBmaWxlX3R5cGU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUuZW5kc1dpdGgoJy5jJykgPyBGaWxlVHlwZS5DIDogRmlsZVR5cGUuQ1BQLFxyXG4gICAgICAgIGZpbGVfc2l6ZTogdXBsb2FkUmVxdWVzdC5maWxlU2l6ZSxcclxuICAgICAgICB1c2VyX2lkOiB0b2tlblBheWxvYWQudXNlcklkLCAvLyBVc2UgdXNlciBJRCBhcy1pcyBmcm9tIEpXVFxyXG4gICAgICAgIHVwbG9hZF90aW1lc3RhbXA6IG5vdyxcclxuICAgICAgICBhbmFseXNpc19zdGF0dXM6IEFuYWx5c2lzU3RhdHVzLlBFTkRJTkcsXHJcbiAgICAgICAgczNfa2V5OiBgdXBsb2Fkcy8ke3Rva2VuUGF5bG9hZC5vcmdhbml6YXRpb25JZH0vJHt0b2tlblBheWxvYWQudXNlcklkfS8ke0RhdGUubm93KCl9LSR7dXBsb2FkUmVzcG9uc2UuZmlsZUlkfS0ke3VwbG9hZFJlcXVlc3QuZmlsZU5hbWV9YCxcclxuICAgICAgICBjcmVhdGVkX2F0OiBub3csXHJcbiAgICAgICAgdXBkYXRlZF9hdDogbm93XHJcbiAgICAgIH0pO1xyXG4gICAgICBjb25zb2xlLmxvZyhgRmlsZU1ldGFkYXRhIHJlY29yZCBjcmVhdGVkIGZvciBmaWxlICR7dXBsb2FkUmVzcG9uc2UuZmlsZUlkfWApO1xyXG4gICAgfSBjYXRjaCAobWV0YWRhdGFFcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjcmVhdGluZyBGaWxlTWV0YWRhdGEgcmVjb3JkOicsIG1ldGFkYXRhRXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCBmYWlsIHRoZSB1cGxvYWQgaWYgbWV0YWRhdGEgY3JlYXRpb24gZmFpbHNcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogVXBsb2FkUmVzcG9uc2UgPSB7XHJcbiAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICB1cGxvYWRVcmw6IHVwbG9hZFJlc3BvbnNlLnVwbG9hZFVybCxcclxuICAgICAgZG93bmxvYWRVcmw6IHVwbG9hZFJlc3BvbnNlLmRvd25sb2FkVXJsLFxyXG4gICAgICBleHBpcmVzSW46IHVwbG9hZFJlc3BvbnNlLmV4cGlyZXNJbixcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmlsZSB1cGxvYWQgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgXHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygndmFsaWRhdGlvbiBmYWlsZWQnKSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0ZJTEVfVkFMSURBVElPTl9FUlJPUicsIGVycm9yLm1lc3NhZ2UpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdGYWlsZWQgdG8gZ2VuZXJhdGUgdXBsb2FkIFVSTCcpKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAzLCAnVVBMT0FEX1NFUlZJQ0VfVU5BVkFJTEFCTEUnLCAnRmlsZSB1cGxvYWQgc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZScpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0lOVEVSTkFMX0VSUk9SJywgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xyXG4gIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59Il19
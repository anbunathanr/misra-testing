"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const sample_file_service_1 = require("../../services/sample-file-service");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const file_metadata_1 = require("../../types/file-metadata");
const uuid_1 = require("uuid");
/**
 * Lambda function for automatic sample file upload
 * Randomly selects a sample file and uploads it to S3 for analysis
 */
const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
    };
    try {
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: '',
            };
        }
        if (!event.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Request body is required',
                }),
            };
        }
        const request = JSON.parse(event.body);
        if (!request.userEmail) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'User email is required',
                }),
            };
        }
        const sampleFileService = new sample_file_service_1.SampleFileService();
        const dbClient = new dynamodb_client_1.DynamoDBClientWrapper();
        const fileMetadataService = new file_metadata_service_1.FileMetadataService(dbClient);
        // Randomly select a sample file based on preferences
        const selectedSample = await sampleFileService.getRandomSampleFile(request.preferredLanguage, request.difficultyLevel);
        if (!selectedSample) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'No sample files available matching the criteria',
                }),
            };
        }
        // Get the full sample file with content
        const sampleFile = await sampleFileService.getSampleFileById(selectedSample.id);
        if (!sampleFile) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Sample file not found',
                }),
            };
        }
        // Generate unique file ID and S3 key
        const fileId = (0, uuid_1.v4)();
        const s3Key = `samples/${fileId}_${sampleFile.filename}`;
        // Upload file content to S3
        const s3Client = new client_s3_1.S3Client({});
        const bucketName = process.env.FILE_STORAGE_BUCKET || 'misra-file-storage';
        const fileContent = Buffer.from(sampleFile.file_content, 'base64');
        const uploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: fileContent,
            ContentType: sampleFile.language === 'C' ? 'text/x-c' : 'text/x-c++',
            Metadata: {
                'sample-id': sampleFile.sample_id,
                'user-email': request.userEmail,
                'language': sampleFile.language,
                'expected-violations': sampleFile.expected_violations.toString(),
            },
        });
        await s3Client.send(uploadCommand);
        // Create file metadata record
        const now = Date.now();
        await fileMetadataService.createFileMetadata({
            file_id: fileId,
            filename: sampleFile.filename,
            file_type: sampleFile.language.toLowerCase() === 'c' ? file_metadata_1.FileType.C : file_metadata_1.FileType.CPP,
            file_size: sampleFile.file_size,
            user_id: request.userEmail, // Using email as user ID for now
            upload_timestamp: now,
            analysis_status: file_metadata_1.AnalysisStatus.PENDING,
            s3_key: s3Key,
            is_sample_file: true,
            sample_id: sampleFile.sample_id,
            sample_description: sampleFile.description,
            expected_violations: sampleFile.expected_violations,
            created_at: now,
            updated_at: now,
        });
        const response = {
            fileId,
            fileName: sampleFile.filename,
            fileSize: sampleFile.file_size,
            language: sampleFile.language,
            description: sampleFile.description,
            expectedViolations: sampleFile.expected_violations,
            uploadStatus: 'completed',
            s3Key,
            sampleId: sampleFile.sample_id,
        };
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                ...response,
            }),
        };
    }
    catch (error) {
        console.error('Error uploading sample file:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to upload sample file',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
/**
 * Generate error response
 */
function errorResponse(statusCode, code, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
            success: false,
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: Math.random().toString(36).substring(7),
            },
        }),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLXNhbXBsZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLXNhbXBsZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtEQUFnRTtBQUNoRSw0RUFBdUU7QUFDdkUsZ0ZBQTJFO0FBRTNFLG9FQUF1RTtBQUN2RSw2REFBcUU7QUFFckUsK0JBQW9DO0FBR3BDOzs7R0FHRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sT0FBTyxHQUFHO1FBQ2QsY0FBYyxFQUFFLGtCQUFrQjtRQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1FBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtRQUM1RCw4QkFBOEIsRUFBRSxjQUFjO0tBQy9DLENBQUM7SUFFRixJQUFJLENBQUM7UUFDSCw0QkFBNEI7UUFDNUIsSUFBSSxLQUFLLENBQUMsVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTztnQkFDUCxJQUFJLEVBQUUsRUFBRTthQUNULENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU87Z0JBQ1AsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSxLQUFLO29CQUNkLEtBQUssRUFBRSwwQkFBMEI7aUJBQ2xDLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sT0FBTyxHQUE0QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTztnQkFDUCxJQUFJLEVB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QUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsOEJBQThCO2dCQUNyQyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUExSlcsUUFBQSxPQUFPLFdBMEpsQjtBQUVGOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlO0lBRWYsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUU7WUFDUCxjQUFjLEVBQUUsa0JBQWtCO1lBQ2xDLDZCQUE2QixFQUFFLEdBQUc7WUFDbEMsOEJBQThCLEVBQUUsNEJBQTRCO1NBQzdEO1FBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzthQUNuRDtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgUzNDbGllbnQsIFB1dE9iamVjdENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyBTYW1wbGVGaWxlU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3NhbXBsZS1maWxlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZmlsZS1tZXRhZGF0YS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVXBsb2FkUHJvZ3Jlc3NTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdXBsb2FkLXByb2dyZXNzLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudFdyYXBwZXIgfSBmcm9tICcuLi8uLi9kYXRhYmFzZS9keW5hbW9kYi1jbGllbnQnO1xyXG5pbXBvcnQgeyBGaWxlVHlwZSwgQW5hbHlzaXNTdGF0dXMgfSBmcm9tICcuLi8uLi90eXBlcy9maWxlLW1ldGFkYXRhJztcclxuaW1wb3J0IHsgU2FtcGxlRmlsZVVwbG9hZFJlcXVlc3QsIFNhbXBsZUZpbGVVcGxvYWRSZXNwb25zZSB9IGZyb20gJy4uLy4uL3R5cGVzL3NhbXBsZS1maWxlJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcblxyXG4vKipcclxuICogTGFtYmRhIGZ1bmN0aW9uIGZvciBhdXRvbWF0aWMgc2FtcGxlIGZpbGUgdXBsb2FkXHJcbiAqIFJhbmRvbWx5IHNlbGVjdHMgYSBzYW1wbGUgZmlsZSBhbmQgdXBsb2FkcyBpdCB0byBTMyBmb3IgYW5hbHlzaXNcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgaGVhZGVycyA9IHtcclxuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnUE9TVCxPUFRJT05TJyxcclxuICB9O1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gSGFuZGxlIHByZWZsaWdodCByZXF1ZXN0c1xyXG4gICAgaWYgKGV2ZW50Lmh0dHBNZXRob2QgPT09ICdPUFRJT05TJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6ICcnLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgZXJyb3I6ICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlcXVlc3Q6IFNhbXBsZUZpbGVVcGxvYWRSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuICAgIFxyXG4gICAgaWYgKCFyZXF1ZXN0LnVzZXJFbWFpbCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgZXJyb3I6ICdVc2VyIGVtYWlsIGlzIHJlcXVpcmVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzYW1wbGVGaWxlU2VydmljZSA9IG5ldyBTYW1wbGVGaWxlU2VydmljZSgpO1xyXG4gICAgY29uc3QgZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnRXcmFwcGVyKCk7XHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGFTZXJ2aWNlID0gbmV3IEZpbGVNZXRhZGF0YVNlcnZpY2UoZGJDbGllbnQpO1xyXG4gICAgXHJcbiAgICAvLyBSYW5kb21seSBzZWxlY3QgYSBzYW1wbGUgZmlsZSBiYXNlZCBvbiBwcmVmZXJlbmNlc1xyXG4gICAgY29uc3Qgc2VsZWN0ZWRTYW1wbGUgPSBhd2FpdCBzYW1wbGVGaWxlU2VydmljZS5nZXRSYW5kb21TYW1wbGVGaWxlKFxyXG4gICAgICByZXF1ZXN0LnByZWZlcnJlZExhbmd1YWdlLFxyXG4gICAgICByZXF1ZXN0LmRpZmZpY3VsdHlMZXZlbFxyXG4gICAgKTtcclxuXHJcbiAgICBpZiAoIXNlbGVjdGVkU2FtcGxlKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICBlcnJvcjogJ05vIHNhbXBsZSBmaWxlcyBhdmFpbGFibGUgbWF0Y2hpbmcgdGhlIGNyaXRlcmlhJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgdGhlIGZ1bGwgc2FtcGxlIGZpbGUgd2l0aCBjb250ZW50XHJcbiAgICBjb25zdCBzYW1wbGVGaWxlID0gYXdhaXQgc2FtcGxlRmlsZVNlcnZpY2UuZ2V0U2FtcGxlRmlsZUJ5SWQoc2VsZWN0ZWRTYW1wbGUuaWQpO1xyXG4gICAgXHJcbiAgICBpZiAoIXNhbXBsZUZpbGUpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgICAgaGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIGVycm9yOiAnU2FtcGxlIGZpbGUgbm90IGZvdW5kJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZW5lcmF0ZSB1bmlxdWUgZmlsZSBJRCBhbmQgUzMga2V5XHJcbiAgICBjb25zdCBmaWxlSWQgPSB1dWlkdjQoKTtcclxuICAgIGNvbnN0IHMzS2V5ID0gYHNhbXBsZXMvJHtmaWxlSWR9XyR7c2FtcGxlRmlsZS5maWxlbmFtZX1gO1xyXG4gICAgXHJcbiAgICAvLyBVcGxvYWQgZmlsZSBjb250ZW50IHRvIFMzXHJcbiAgICBjb25zdCBzM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7fSk7XHJcbiAgICBjb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVCB8fCAnbWlzcmEtZmlsZS1zdG9yYWdlJztcclxuICAgIFxyXG4gICAgY29uc3QgZmlsZUNvbnRlbnQgPSBCdWZmZXIuZnJvbShzYW1wbGVGaWxlLmZpbGVfY29udGVudCwgJ2Jhc2U2NCcpO1xyXG4gICAgXHJcbiAgICBjb25zdCB1cGxvYWRDb21tYW5kID0gbmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICBCdWNrZXQ6IGJ1Y2tldE5hbWUsXHJcbiAgICAgIEtleTogczNLZXksXHJcbiAgICAgIEJvZHk6IGZpbGVDb250ZW50LFxyXG4gICAgICBDb250ZW50VHlwZTogc2FtcGxlRmlsZS5sYW5ndWFnZSA9PT0gJ0MnID8gJ3RleHQveC1jJyA6ICd0ZXh0L3gtYysrJyxcclxuICAgICAgTWV0YWRhdGE6IHtcclxuICAgICAgICAnc2FtcGxlLWlkJzogc2FtcGxlRmlsZS5zYW1wbGVfaWQsXHJcbiAgICAgICAgJ3VzZXItZW1haWwnOiByZXF1ZXN0LnVzZXJFbWFpbCxcclxuICAgICAgICAnbGFuZ3VhZ2UnOiBzYW1wbGVGaWxlLmxhbmd1YWdlLFxyXG4gICAgICAgICdleHBlY3RlZC12aW9sYXRpb25zJzogc2FtcGxlRmlsZS5leHBlY3RlZF92aW9sYXRpb25zLnRvU3RyaW5nKCksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBzM0NsaWVudC5zZW5kKHVwbG9hZENvbW1hbmQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBmaWxlIG1ldGFkYXRhIHJlY29yZFxyXG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgIGF3YWl0IGZpbGVNZXRhZGF0YVNlcnZpY2UuY3JlYXRlRmlsZU1ldGFkYXRhKHtcclxuICAgICAgZmlsZV9pZDogZmlsZUlkLFxyXG4gICAgICBmaWxlbmFtZTogc2FtcGxlRmlsZS5maWxlbmFtZSxcclxuICAgICAgZmlsZV90eXBlOiBzYW1wbGVGaWxlLmxhbmd1YWdlLnRvTG93ZXJDYXNlKCkgPT09ICdjJyA/IEZpbGVUeXBlLkMgOiBGaWxlVHlwZS5DUFAsXHJcbiAgICAgIGZpbGVfc2l6ZTogc2FtcGxlRmlsZS5maWxlX3NpemUsXHJcbiAgICAgIHVzZXJfaWQ6IHJlcXVlc3QudXNlckVtYWlsLCAvLyBVc2luZyBlbWFpbCBhcyB1c2VyIElEIGZvciBub3dcclxuICAgICAgdXBsb2FkX3RpbWVzdGFtcDogbm93LFxyXG4gICAgICBhbmFseXNpc19zdGF0dXM6IEFuYWx5c2lzU3RhdHVzLlBFTkRJTkcsXHJcbiAgICAgIHMzX2tleTogczNLZXksXHJcbiAgICAgIGlzX3NhbXBsZV9maWxlOiB0cnVlLFxyXG4gICAgICBzYW1wbGVfaWQ6IHNhbXBsZUZpbGUuc2FtcGxlX2lkLFxyXG4gICAgICBzYW1wbGVfZGVzY3JpcHRpb246IHNhbXBsZUZpbGUuZGVzY3JpcHRpb24sXHJcbiAgICAgIGV4cGVjdGVkX3Zpb2xhdGlvbnM6IHNhbXBsZUZpbGUuZXhwZWN0ZWRfdmlvbGF0aW9ucyxcclxuICAgICAgY3JlYXRlZF9hdDogbm93LFxyXG4gICAgICB1cGRhdGVkX2F0OiBub3csXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogU2FtcGxlRmlsZVVwbG9hZFJlc3BvbnNlID0ge1xyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGZpbGVOYW1lOiBzYW1wbGVGaWxlLmZpbGVuYW1lLFxyXG4gICAgICBmaWxlU2l6ZTogc2FtcGxlRmlsZS5maWxlX3NpemUsXHJcbiAgICAgIGxhbmd1YWdlOiBzYW1wbGVGaWxlLmxhbmd1YWdlLFxyXG4gICAgICBkZXNjcmlwdGlvbjogc2FtcGxlRmlsZS5kZXNjcmlwdGlvbixcclxuICAgICAgZXhwZWN0ZWRWaW9sYXRpb25zOiBzYW1wbGVGaWxlLmV4cGVjdGVkX3Zpb2xhdGlvbnMsXHJcbiAgICAgIHVwbG9hZFN0YXR1czogJ2NvbXBsZXRlZCcsXHJcbiAgICAgIHMzS2V5LFxyXG4gICAgICBzYW1wbGVJZDogc2FtcGxlRmlsZS5zYW1wbGVfaWQsXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgLi4ucmVzcG9uc2UsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBsb2FkaW5nIHNhbXBsZSBmaWxlOicsIGVycm9yKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gdXBsb2FkIHNhbXBsZSBmaWxlJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59Il19
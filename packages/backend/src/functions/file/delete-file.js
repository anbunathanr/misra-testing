"use strict";
/**
 * Lambda handler for deleting files
 * DELETE /files/:fileId
 *
 * Requirements: 15.7
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const auth_util_1 = require("../../utils/auth-util");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(environment);
const fileMetadataService = new file_metadata_service_1.FileMetadataService(dbClient);
const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || `misra-platform-files-${environment}`;
/**
 * Handler for DELETE /files/:fileId
 * Deletes file from S3 and DynamoDB
 *
 * Requirements:
 * - 15.7: Support file deletion by users
 * - 15.3: Enforce user isolation (users can only delete their own files)
 * - 15.4: Enforce organization isolation
 */
const handler = async (event) => {
    console.log('DELETE /files/:fileId invoked');
    try {
        // Extract user from Lambda Authorizer context (Requirement 15.3)
        const user = await (0, auth_util_1.getUserFromContext)(event);
        if (!user.userId) {
            console.error('User not authenticated');
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required',
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        // Extract fileId from path parameters
        const fileId = event.pathParameters?.fileId;
        if (!fileId) {
            console.error('Missing fileId parameter');
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_REQUEST',
                        message: 'fileId parameter is required',
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        console.log(`Deleting file: ${fileId} for user: ${user.userId}`);
        // Get file metadata to verify ownership and get S3 key
        const fileMetadata = await fileMetadataService.getFileMetadata(fileId);
        if (!fileMetadata) {
            console.log(`File not found: ${fileId}`);
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'FILE_NOT_FOUND',
                        message: 'File not found',
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        // Verify user ownership (Requirement 15.3)
        if (fileMetadata.user_id !== user.userId) {
            // Admins can delete files in their organization (Requirement 15.4)
            if (user.role === 'admin' && fileMetadata.organization_id === user.organizationId) {
                console.log('Admin deleting file in their organization');
            }
            else {
                console.log(`Access denied: User ${user.userId} does not own file ${fileId}`);
                return {
                    statusCode: 403,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({
                        error: {
                            code: 'FORBIDDEN',
                            message: 'You do not have permission to delete this file',
                            timestamp: new Date().toISOString(),
                        },
                    }),
                };
            }
        }
        // Delete from S3 (Requirement 15.7)
        try {
            const deleteCommand = new client_s3_1.DeleteObjectCommand({
                Bucket: bucketName,
                Key: fileMetadata.s3_key,
            });
            await s3Client.send(deleteCommand);
            console.log(`Deleted file from S3: ${fileMetadata.s3_key}`);
        }
        catch (s3Error) {
            console.error('Error deleting file from S3:', s3Error);
            // Continue with DynamoDB deletion even if S3 deletion fails
            // This prevents orphaned metadata records
        }
        // Delete from DynamoDB (Requirement 15.7)
        try {
            await fileMetadataService.deleteFileMetadata(fileId, user.userId);
            console.log(`Deleted file metadata from DynamoDB: ${fileId}`);
        }
        catch (dbError) {
            console.error('Error deleting file metadata:', dbError);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to delete file metadata',
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        console.log(`Successfully deleted file: ${fileId}`);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'File deleted successfully',
                fileId,
                timestamp: new Date().toISOString(),
            }),
        };
    }
    catch (error) {
        console.error('Error deleting file:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete file',
                    timestamp: new Date().toISOString(),
                },
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZXRlLWZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkZWxldGUtZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUdILGtEQUFtRTtBQUNuRSxxREFBMkQ7QUFDM0QsZ0ZBQTJFO0FBQzNFLG9FQUF1RTtBQUV2RSxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNqRixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUM7QUFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN4RCxNQUFNLG1CQUFtQixHQUFHLElBQUksMkNBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDOUQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsSUFBSSx3QkFBd0IsV0FBVyxFQUFFLENBQUM7QUFFakc7Ozs7Ozs7O0dBUUc7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7SUFFN0MsSUFBSSxDQUFDO1FBQ0gsaUVBQWlFO1FBQ2pFLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN4QyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztn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QUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSwyQkFBMkI7Z0JBQ3BDLE1BQU07Z0JBQ04sU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2FBQ3BDLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTdDLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLEtBQUssRUFBRTtvQkFDTCxJQUFJLEVBQUUsdUJBQXVCO29CQUM3QixPQUFPLEVBQUUsdUJBQXVCO29CQUNoQyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3BDO2FBQ0YsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBbEtXLFFBQUEsT0FBTyxXQWtLbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTGFtYmRhIGhhbmRsZXIgZm9yIGRlbGV0aW5nIGZpbGVzXHJcbiAqIERFTEVURSAvZmlsZXMvOmZpbGVJZFxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiAxNS43XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTM0NsaWVudCwgRGVsZXRlT2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcbmltcG9ydCB7IEZpbGVNZXRhZGF0YVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9maWxlLW1ldGFkYXRhLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudFdyYXBwZXIgfSBmcm9tICcuLi8uLi9kYXRhYmFzZS9keW5hbW9kYi1jbGllbnQnO1xyXG5cclxuY29uc3QgczNDbGllbnQgPSBuZXcgUzNDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbmNvbnN0IGVudmlyb25tZW50ID0gcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ2Rldic7XHJcbmNvbnN0IGRiQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50V3JhcHBlcihlbnZpcm9ubWVudCk7XHJcbmNvbnN0IGZpbGVNZXRhZGF0YVNlcnZpY2UgPSBuZXcgRmlsZU1ldGFkYXRhU2VydmljZShkYkNsaWVudCk7XHJcbmNvbnN0IGJ1Y2tldE5hbWUgPSBwcm9jZXNzLmVudi5GSUxFX1NUT1JBR0VfQlVDS0VUX05BTUUgfHwgYG1pc3JhLXBsYXRmb3JtLWZpbGVzLSR7ZW52aXJvbm1lbnR9YDtcclxuXHJcbi8qKlxyXG4gKiBIYW5kbGVyIGZvciBERUxFVEUgL2ZpbGVzLzpmaWxlSWRcclxuICogRGVsZXRlcyBmaWxlIGZyb20gUzMgYW5kIER5bmFtb0RCXHJcbiAqIFxyXG4gKiBSZXF1aXJlbWVudHM6XHJcbiAqIC0gMTUuNzogU3VwcG9ydCBmaWxlIGRlbGV0aW9uIGJ5IHVzZXJzXHJcbiAqIC0gMTUuMzogRW5mb3JjZSB1c2VyIGlzb2xhdGlvbiAodXNlcnMgY2FuIG9ubHkgZGVsZXRlIHRoZWlyIG93biBmaWxlcylcclxuICogLSAxNS40OiBFbmZvcmNlIG9yZ2FuaXphdGlvbiBpc29sYXRpb25cclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdERUxFVEUgL2ZpbGVzLzpmaWxlSWQgaW52b2tlZCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gTGFtYmRhIEF1dGhvcml6ZXIgY29udGV4dCAoUmVxdWlyZW1lbnQgMTUuMylcclxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgaWYgKCF1c2VyLnVzZXJJZCkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdVc2VyIG5vdCBhdXRoZW50aWNhdGVkJyk7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ1VOQVVUSE9SSVpFRCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdBdXRoZW50aWNhdGlvbiByZXF1aXJlZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBFeHRyYWN0IGZpbGVJZCBmcm9tIHBhdGggcGFyYW1ldGVyc1xyXG4gICAgY29uc3QgZmlsZUlkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmZpbGVJZDtcclxuICAgIGlmICghZmlsZUlkKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ01pc3NpbmcgZmlsZUlkIHBhcmFtZXRlcicpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdJTlZBTElEX1JFUVVFU1QnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnZmlsZUlkIHBhcmFtZXRlciBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgRGVsZXRpbmcgZmlsZTogJHtmaWxlSWR9IGZvciB1c2VyOiAke3VzZXIudXNlcklkfWApO1xyXG5cclxuICAgIC8vIEdldCBmaWxlIG1ldGFkYXRhIHRvIHZlcmlmeSBvd25lcnNoaXAgYW5kIGdldCBTMyBrZXlcclxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YSA9IGF3YWl0IGZpbGVNZXRhZGF0YVNlcnZpY2UuZ2V0RmlsZU1ldGFkYXRhKGZpbGVJZCk7XHJcbiAgICBcclxuICAgIGlmICghZmlsZU1ldGFkYXRhKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBGaWxlIG5vdCBmb3VuZDogJHtmaWxlSWR9YCk7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0ZJTEVfTk9UX0ZPVU5EJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0ZpbGUgbm90IGZvdW5kJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZlcmlmeSB1c2VyIG93bmVyc2hpcCAoUmVxdWlyZW1lbnQgMTUuMylcclxuICAgIGlmIChmaWxlTWV0YWRhdGEudXNlcl9pZCAhPT0gdXNlci51c2VySWQpIHtcclxuICAgICAgLy8gQWRtaW5zIGNhbiBkZWxldGUgZmlsZXMgaW4gdGhlaXIgb3JnYW5pemF0aW9uIChSZXF1aXJlbWVudCAxNS40KVxyXG4gICAgICBpZiAodXNlci5yb2xlID09PSAnYWRtaW4nICYmIChmaWxlTWV0YWRhdGEgYXMgYW55KS5vcmdhbml6YXRpb25faWQgPT09IHVzZXIub3JnYW5pemF0aW9uSWQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnQWRtaW4gZGVsZXRpbmcgZmlsZSBpbiB0aGVpciBvcmdhbml6YXRpb24nKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQWNjZXNzIGRlbmllZDogVXNlciAke3VzZXIudXNlcklkfSBkb2VzIG5vdCBvd24gZmlsZSAke2ZpbGVJZH1gKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAzLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgICBjb2RlOiAnRk9SQklEREVOJyxcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gZGVsZXRlIHRoaXMgZmlsZScsXHJcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVsZXRlIGZyb20gUzMgKFJlcXVpcmVtZW50IDE1LjcpXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBkZWxldGVDb21tYW5kID0gbmV3IERlbGV0ZU9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcclxuICAgICAgICBLZXk6IGZpbGVNZXRhZGF0YS5zM19rZXksXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgYXdhaXQgczNDbGllbnQuc2VuZChkZWxldGVDb21tYW5kKTtcclxuICAgICAgY29uc29sZS5sb2coYERlbGV0ZWQgZmlsZSBmcm9tIFMzOiAke2ZpbGVNZXRhZGF0YS5zM19rZXl9YCk7XHJcbiAgICB9IGNhdGNoIChzM0Vycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRlbGV0aW5nIGZpbGUgZnJvbSBTMzonLCBzM0Vycm9yKTtcclxuICAgICAgLy8gQ29udGludWUgd2l0aCBEeW5hbW9EQiBkZWxldGlvbiBldmVuIGlmIFMzIGRlbGV0aW9uIGZhaWxzXHJcbiAgICAgIC8vIFRoaXMgcHJldmVudHMgb3JwaGFuZWQgbWV0YWRhdGEgcmVjb3Jkc1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERlbGV0ZSBmcm9tIER5bmFtb0RCIChSZXF1aXJlbWVudCAxNS43KVxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgZmlsZU1ldGFkYXRhU2VydmljZS5kZWxldGVGaWxlTWV0YWRhdGEoZmlsZUlkLCB1c2VyLnVzZXJJZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBEZWxldGVkIGZpbGUgbWV0YWRhdGEgZnJvbSBEeW5hbW9EQjogJHtmaWxlSWR9YCk7XHJcbiAgICB9IGNhdGNoIChkYkVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRlbGV0aW5nIGZpbGUgbWV0YWRhdGE6JywgZGJFcnJvcik7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0lOVEVSTkFMX1NFUlZFUl9FUlJPUicsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gZGVsZXRlIGZpbGUgbWV0YWRhdGEnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFN1Y2Nlc3NmdWxseSBkZWxldGVkIGZpbGU6ICR7ZmlsZUlkfWApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIG1lc3NhZ2U6ICdGaWxlIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZGVsZXRpbmcgZmlsZTonLCBlcnJvcik7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgIGNvZGU6ICdJTlRFUk5BTF9TRVJWRVJfRVJST1InLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkZWxldGUgZmlsZScsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=
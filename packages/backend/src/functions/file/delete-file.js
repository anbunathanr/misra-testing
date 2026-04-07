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
        const user = (0, auth_util_1.getUserFromContext)(event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZXRlLWZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkZWxldGUtZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUdILGtEQUFtRTtBQUNuRSxxREFBMkQ7QUFDM0QsZ0ZBQTJFO0FBQzNFLG9FQUF1RTtBQUV2RSxNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNqRixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUM7QUFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN4RCxNQUFNLG1CQUFtQixHQUFHLElBQUksMkNBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDOUQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsSUFBSSx3QkFBd0IsV0FBVyxFQUFFLENBQUM7QUFFakc7Ozs7Ozs7O0dBUUc7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7SUFFN0MsSUFBSSxDQUFDO1FBQ0gsaUVBQWlFO1FBQ2pFLE1BQU0sSUFBSSxHQUFHLElBQUEsOEJBQWtCLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDeEMsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0Qs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QUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsMkJBQTJCO2dCQUNwQyxNQUFNO2dCQUNOLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTthQUNwQyxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3QyxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLHVCQUF1QjtvQkFDN0IsT0FBTyxFQUFFLHVCQUF1QjtvQkFDaEMsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNwQzthQUNGLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQWxLVyxRQUFBLE9BQU8sV0FrS2xCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciBkZWxldGluZyBmaWxlc1xyXG4gKiBERUxFVEUgL2ZpbGVzLzpmaWxlSWRcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czogMTUuN1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgUzNDbGllbnQsIERlbGV0ZU9iamVjdENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZmlsZS1tZXRhZGF0YS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnRXcmFwcGVyIH0gZnJvbSAnLi4vLi4vZGF0YWJhc2UvZHluYW1vZGItY2xpZW50JztcclxuXHJcbmNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xyXG5jb25zdCBlbnZpcm9ubWVudCA9IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICdkZXYnO1xyXG5jb25zdCBkYkNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudFdyYXBwZXIoZW52aXJvbm1lbnQpO1xyXG5jb25zdCBmaWxlTWV0YWRhdGFTZXJ2aWNlID0gbmV3IEZpbGVNZXRhZGF0YVNlcnZpY2UoZGJDbGllbnQpO1xyXG5jb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8IGBtaXNyYS1wbGF0Zm9ybS1maWxlcy0ke2Vudmlyb25tZW50fWA7XHJcblxyXG4vKipcclxuICogSGFuZGxlciBmb3IgREVMRVRFIC9maWxlcy86ZmlsZUlkXHJcbiAqIERlbGV0ZXMgZmlsZSBmcm9tIFMzIGFuZCBEeW5hbW9EQlxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOlxyXG4gKiAtIDE1Ljc6IFN1cHBvcnQgZmlsZSBkZWxldGlvbiBieSB1c2Vyc1xyXG4gKiAtIDE1LjM6IEVuZm9yY2UgdXNlciBpc29sYXRpb24gKHVzZXJzIGNhbiBvbmx5IGRlbGV0ZSB0aGVpciBvd24gZmlsZXMpXHJcbiAqIC0gMTUuNDogRW5mb3JjZSBvcmdhbml6YXRpb24gaXNvbGF0aW9uXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnREVMRVRFIC9maWxlcy86ZmlsZUlkIGludm9rZWQnKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgKFJlcXVpcmVtZW50IDE1LjMpXHJcbiAgICBjb25zdCB1c2VyID0gZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignVXNlciBub3QgYXV0aGVudGljYXRlZCcpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdVTkFVVEhPUklaRUQnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnQXV0aGVudGljYXRpb24gcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXh0cmFjdCBmaWxlSWQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcclxuICAgIGNvbnN0IGZpbGVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5maWxlSWQ7XHJcbiAgICBpZiAoIWZpbGVJZCkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdNaXNzaW5nIGZpbGVJZCBwYXJhbWV0ZXInKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9SRVFVRVNUJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ2ZpbGVJZCBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYERlbGV0aW5nIGZpbGU6ICR7ZmlsZUlkfSBmb3IgdXNlcjogJHt1c2VyLnVzZXJJZH1gKTtcclxuXHJcbiAgICAvLyBHZXQgZmlsZSBtZXRhZGF0YSB0byB2ZXJpZnkgb3duZXJzaGlwIGFuZCBnZXQgUzMga2V5XHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGEgPSBhd2FpdCBmaWxlTWV0YWRhdGFTZXJ2aWNlLmdldEZpbGVNZXRhZGF0YShmaWxlSWQpO1xyXG4gICAgXHJcbiAgICBpZiAoIWZpbGVNZXRhZGF0YSkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgRmlsZSBub3QgZm91bmQ6ICR7ZmlsZUlkfWApO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwNCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdGSUxFX05PVF9GT1VORCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIG5vdCBmb3VuZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWZXJpZnkgdXNlciBvd25lcnNoaXAgKFJlcXVpcmVtZW50IDE1LjMpXHJcbiAgICBpZiAoZmlsZU1ldGFkYXRhLnVzZXJfaWQgIT09IHVzZXIudXNlcklkKSB7XHJcbiAgICAgIC8vIEFkbWlucyBjYW4gZGVsZXRlIGZpbGVzIGluIHRoZWlyIG9yZ2FuaXphdGlvbiAoUmVxdWlyZW1lbnQgMTUuNClcclxuICAgICAgaWYgKHVzZXIucm9sZSA9PT0gJ2FkbWluJyAmJiAoZmlsZU1ldGFkYXRhIGFzIGFueSkub3JnYW5pemF0aW9uX2lkID09PSB1c2VyLm9yZ2FuaXphdGlvbklkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0FkbWluIGRlbGV0aW5nIGZpbGUgaW4gdGhlaXIgb3JnYW5pemF0aW9uJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEFjY2VzcyBkZW5pZWQ6IFVzZXIgJHt1c2VyLnVzZXJJZH0gZG9lcyBub3Qgb3duIGZpbGUgJHtmaWxlSWR9YCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMyxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgICAgY29kZTogJ0ZPUkJJRERFTicsXHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdSBkbyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIGRlbGV0ZSB0aGlzIGZpbGUnLFxyXG4gICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIERlbGV0ZSBmcm9tIFMzIChSZXF1aXJlbWVudCAxNS43KVxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZGVsZXRlQ29tbWFuZCA9IG5ldyBEZWxldGVPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgS2V5OiBmaWxlTWV0YWRhdGEuczNfa2V5LFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGF3YWl0IHMzQ2xpZW50LnNlbmQoZGVsZXRlQ29tbWFuZCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBEZWxldGVkIGZpbGUgZnJvbSBTMzogJHtmaWxlTWV0YWRhdGEuczNfa2V5fWApO1xyXG4gICAgfSBjYXRjaCAoczNFcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkZWxldGluZyBmaWxlIGZyb20gUzM6JywgczNFcnJvcik7XHJcbiAgICAgIC8vIENvbnRpbnVlIHdpdGggRHluYW1vREIgZGVsZXRpb24gZXZlbiBpZiBTMyBkZWxldGlvbiBmYWlsc1xyXG4gICAgICAvLyBUaGlzIHByZXZlbnRzIG9ycGhhbmVkIG1ldGFkYXRhIHJlY29yZHNcclxuICAgIH1cclxuXHJcbiAgICAvLyBEZWxldGUgZnJvbSBEeW5hbW9EQiAoUmVxdWlyZW1lbnQgMTUuNylcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IGZpbGVNZXRhZGF0YVNlcnZpY2UuZGVsZXRlRmlsZU1ldGFkYXRhKGZpbGVJZCwgdXNlci51c2VySWQpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgRGVsZXRlZCBmaWxlIG1ldGFkYXRhIGZyb20gRHluYW1vREI6ICR7ZmlsZUlkfWApO1xyXG4gICAgfSBjYXRjaCAoZGJFcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkZWxldGluZyBmaWxlIG1ldGFkYXRhOicsIGRiRXJyb3IpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdJTlRFUk5BTF9TRVJWRVJfRVJST1InLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIGRlbGV0ZSBmaWxlIG1ldGFkYXRhJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBTdWNjZXNzZnVsbHkgZGVsZXRlZCBmaWxlOiAke2ZpbGVJZH1gKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBtZXNzYWdlOiAnRmlsZSBkZWxldGVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRlbGV0aW5nIGZpbGU6JywgZXJyb3IpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnSU5URVJOQUxfU0VSVkVSX0VSUk9SJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gZGVsZXRlIGZpbGUnLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19
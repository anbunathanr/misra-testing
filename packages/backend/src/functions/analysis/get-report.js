"use strict";
/**
 * Lambda handler for generating and retrieving MISRA analysis PDF reports
 * GET /reports/:fileId
 *
 * Requirements: 8.6, 8.7
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const auth_util_1 = require("../../utils/auth-util");
const report_generator_1 = require("../../services/misra-analysis/report-generator");
const region = process.env.AWS_REGION || 'us-east-1';
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults-dev';
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'misra-platform-file-metadata-dev';
const bucketName = process.env.FILE_STORAGE_BUCKET || 'misra-platform-files-dev';
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region });
const s3Client = new client_s3_1.S3Client({ region });
const reportGenerator = new report_generator_1.ReportGenerator();
/**
 * Handler for GET /reports/:fileId
 * Generates PDF report and returns presigned download URL
 *
 * Requirements:
 * - 8.6: Generate PDF report using ReportGenerator
 * - 8.6: Store PDF in S3 bucket
 * - 8.7: Return presigned download URL (expires in 1 hour)
 */
const handler = async (event) => {
    console.log('GET /reports/:fileId invoked');
    try {
        // Extract user from Lambda Authorizer context
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
        console.log(`Generating report for file: ${fileId}`);
        console.log(`User: ${user.userId}, Organization: ${user.organizationId}`);
        // Verify user owns the file
        const fileMetadata = await getFileMetadata(fileId);
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
        // Check ownership
        if (fileMetadata.user_id !== user.userId) {
            // Admins can access files in their organization
            if (user.role === 'admin' && fileMetadata.organization_id === user.organizationId) {
                console.log('Admin accessing file in their organization');
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
                            message: 'You do not have permission to access this file',
                            timestamp: new Date().toISOString(),
                        },
                    }),
                };
            }
        }
        // Get analysis results
        const analysisResults = await queryAnalysisResultsByFileId(fileId);
        if (!analysisResults || analysisResults.length === 0) {
            console.log(`No analysis results found for file: ${fileId}`);
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'ANALYSIS_NOT_FOUND',
                        message: 'No analysis results found for this file',
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        const latestResult = analysisResults[0];
        // Check if report already exists in S3
        const reportKey = `reports/${fileId}/${latestResult.analysisId}.pdf`;
        let reportExists = false;
        try {
            await s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: bucketName,
                Key: reportKey,
            }));
            reportExists = true;
            console.log(`Report already exists: ${reportKey}`);
        }
        catch (error) {
            if (error.name !== 'NoSuchKey') {
                console.error('Error checking report existence:', error);
            }
        }
        // Generate PDF if it doesn't exist (Requirement 8.6)
        if (!reportExists) {
            console.log('Generating new PDF report...');
            const pdfBuffer = await reportGenerator.generatePDF(latestResult, fileMetadata.filename || 'unknown.c');
            // Store PDF in S3 (Requirement 8.6)
            await s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: bucketName,
                Key: reportKey,
                Body: pdfBuffer,
                ContentType: 'application/pdf',
                Metadata: {
                    fileId: fileId,
                    analysisId: latestResult.analysisId,
                    userId: user.userId,
                    generatedAt: new Date().toISOString(),
                },
            }));
            console.log(`Report stored in S3: ${reportKey}`);
        }
        // Generate presigned URL (expires in 1 hour) (Requirement 8.7)
        const downloadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, new client_s3_1.GetObjectCommand({
            Bucket: bucketName,
            Key: reportKey,
        }), { expiresIn: 3600 } // 1 hour
        );
        console.log('Presigned URL generated successfully');
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                reportUrl: downloadUrl,
                expiresIn: 3600,
                expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
                fileId: fileId,
                analysisId: latestResult.analysisId,
                fileName: `${fileMetadata.filename || 'report'}_misra_report.pdf`,
            }),
        };
    }
    catch (error) {
        console.error('Error generating report:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to generate report',
                    timestamp: new Date().toISOString(),
                },
            }),
        };
    }
};
exports.handler = handler;
/**
 * Get file metadata from DynamoDB
 */
async function getFileMetadata(fileId) {
    try {
        const command = new client_dynamodb_1.GetItemCommand({
            TableName: fileMetadataTable,
            Key: (0, util_dynamodb_1.marshall)({ file_id: fileId }),
        });
        const response = await dynamoClient.send(command);
        if (!response.Item) {
            return null;
        }
        return (0, util_dynamodb_1.unmarshall)(response.Item);
    }
    catch (error) {
        console.error('Error getting file metadata:', error);
        throw error;
    }
}
/**
 * Query analysis results by fileId using FileIndex GSI
 */
async function queryAnalysisResultsByFileId(fileId) {
    try {
        const command = new client_dynamodb_1.QueryCommand({
            TableName: analysisResultsTable,
            IndexName: 'FileIndex',
            KeyConditionExpression: 'fileId = :fileId',
            ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                ':fileId': fileId,
            }),
            ScanIndexForward: false, // Sort by timestamp descending (most recent first)
            Limit: 1, // Only need the most recent result
        });
        const response = await dynamoClient.send(command);
        if (!response.Items || response.Items.length === 0) {
            return [];
        }
        return response.Items.map((item) => (0, util_dynamodb_1.unmarshall)(item));
    }
    catch (error) {
        console.error('Error querying analysis results:', error);
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXJlcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1yZXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUFHSCw4REFBd0Y7QUFDeEYsa0RBQWtGO0FBQ2xGLHdFQUE2RDtBQUM3RCwwREFBOEQ7QUFDOUQscURBQTJEO0FBQzNELHFGQUFpRjtBQUdqRixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUM7QUFDckQsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLHFCQUFxQixDQUFDO0FBQ3pGLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxrQ0FBa0MsQ0FBQztBQUNoRyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLDBCQUEwQixDQUFDO0FBRWpGLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDcEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUMxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGtDQUFlLEVBQUUsQ0FBQztBQUU5Qzs7Ozs7Ozs7R0FRRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztJQUU1QyxJQUFJLENBQUM7UUFDSCw4Q0FBOEM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN4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LENBQUMsRUFBRSxDQUFDO1lBQ25ELE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUEsMEJBQVUsRUFBQyxJQUFJLENBQW1CLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsTUFBTSxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBMYW1iZGEgaGFuZGxlciBmb3IgZ2VuZXJhdGluZyBhbmQgcmV0cmlldmluZyBNSVNSQSBhbmFseXNpcyBQREYgcmVwb3J0c1xyXG4gKiBHRVQgL3JlcG9ydHMvOmZpbGVJZFxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiA4LjYsIDguN1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFF1ZXJ5Q29tbWFuZCwgR2V0SXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBTM0NsaWVudCwgUHV0T2JqZWN0Q29tbWFuZCwgR2V0T2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IGdldFNpZ25lZFVybCB9IGZyb20gJ0Bhd3Mtc2RrL3MzLXJlcXVlc3QtcHJlc2lnbmVyJztcclxuaW1wb3J0IHsgdW5tYXJzaGFsbCwgbWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuaW1wb3J0IHsgUmVwb3J0R2VuZXJhdG9yIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbWlzcmEtYW5hbHlzaXMvcmVwb3J0LWdlbmVyYXRvcic7XHJcbmltcG9ydCB7IEFuYWx5c2lzUmVzdWx0IH0gZnJvbSAnLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJztcclxuY29uc3QgYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFIHx8ICdBbmFseXNpc1Jlc3VsdHMtZGV2JztcclxuY29uc3QgZmlsZU1ldGFkYXRhVGFibGUgPSBwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFIHx8ICdtaXNyYS1wbGF0Zm9ybS1maWxlLW1ldGFkYXRhLWRldic7XHJcbmNvbnN0IGJ1Y2tldE5hbWUgPSBwcm9jZXNzLmVudi5GSUxFX1NUT1JBR0VfQlVDS0VUIHx8ICdtaXNyYS1wbGF0Zm9ybS1maWxlcy1kZXYnO1xyXG5cclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5jb25zdCBzM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7IHJlZ2lvbiB9KTtcclxuY29uc3QgcmVwb3J0R2VuZXJhdG9yID0gbmV3IFJlcG9ydEdlbmVyYXRvcigpO1xyXG5cclxuLyoqXHJcbiAqIEhhbmRsZXIgZm9yIEdFVCAvcmVwb3J0cy86ZmlsZUlkXHJcbiAqIEdlbmVyYXRlcyBQREYgcmVwb3J0IGFuZCByZXR1cm5zIHByZXNpZ25lZCBkb3dubG9hZCBVUkxcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czpcclxuICogLSA4LjY6IEdlbmVyYXRlIFBERiByZXBvcnQgdXNpbmcgUmVwb3J0R2VuZXJhdG9yXHJcbiAqIC0gOC42OiBTdG9yZSBQREYgaW4gUzMgYnVja2V0XHJcbiAqIC0gOC43OiBSZXR1cm4gcHJlc2lnbmVkIGRvd25sb2FkIFVSTCAoZXhwaXJlcyBpbiAxIGhvdXIpXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnR0VUIC9yZXBvcnRzLzpmaWxlSWQgaW52b2tlZCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gTGFtYmRhIEF1dGhvcml6ZXIgY29udGV4dFxyXG4gICAgY29uc3QgdXNlciA9IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnVU5BVVRIT1JJWkVEJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0F1dGhlbnRpY2F0aW9uIHJlcXVpcmVkJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgZmlsZUlkIGZyb20gcGF0aCBwYXJhbWV0ZXJzXHJcbiAgICBjb25zdCBmaWxlSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uZmlsZUlkO1xyXG4gICAgaWYgKCFmaWxlSWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignTWlzc2luZyBmaWxlSWQgcGFyYW1ldGVyJyk7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0lOVkFMSURfUkVRVUVTVCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdmaWxlSWQgcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBHZW5lcmF0aW5nIHJlcG9ydCBmb3IgZmlsZTogJHtmaWxlSWR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgVXNlcjogJHt1c2VyLnVzZXJJZH0sIE9yZ2FuaXphdGlvbjogJHt1c2VyLm9yZ2FuaXphdGlvbklkfWApO1xyXG5cclxuICAgIC8vIFZlcmlmeSB1c2VyIG93bnMgdGhlIGZpbGVcclxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YSA9IGF3YWl0IGdldEZpbGVNZXRhZGF0YShmaWxlSWQpO1xyXG4gICAgXHJcbiAgICBpZiAoIWZpbGVNZXRhZGF0YSkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgRmlsZSBub3QgZm91bmQ6ICR7ZmlsZUlkfWApO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwNCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdGSUxFX05PVF9GT1VORCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIG5vdCBmb3VuZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBvd25lcnNoaXBcclxuICAgIGlmIChmaWxlTWV0YWRhdGEudXNlcl9pZCAhPT0gdXNlci51c2VySWQpIHtcclxuICAgICAgLy8gQWRtaW5zIGNhbiBhY2Nlc3MgZmlsZXMgaW4gdGhlaXIgb3JnYW5pemF0aW9uXHJcbiAgICAgIGlmICh1c2VyLnJvbGUgPT09ICdhZG1pbicgJiYgZmlsZU1ldGFkYXRhLm9yZ2FuaXphdGlvbl9pZCA9PT0gdXNlci5vcmdhbml6YXRpb25JZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdBZG1pbiBhY2Nlc3NpbmcgZmlsZSBpbiB0aGVpciBvcmdhbml6YXRpb24nKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQWNjZXNzIGRlbmllZDogVXNlciAke3VzZXIudXNlcklkfSBkb2VzIG5vdCBvd24gZmlsZSAke2ZpbGVJZH1gKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAzLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgICBjb2RlOiAnRk9SQklEREVOJyxcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIHRoaXMgZmlsZScsXHJcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IGFuYWx5c2lzIHJlc3VsdHNcclxuICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0cyA9IGF3YWl0IHF1ZXJ5QW5hbHlzaXNSZXN1bHRzQnlGaWxlSWQoZmlsZUlkKTtcclxuXHJcbiAgICBpZiAoIWFuYWx5c2lzUmVzdWx0cyB8fCBhbmFseXNpc1Jlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBObyBhbmFseXNpcyByZXN1bHRzIGZvdW5kIGZvciBmaWxlOiAke2ZpbGVJZH1gKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnQU5BTFlTSVNfTk9UX0ZPVU5EJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ05vIGFuYWx5c2lzIHJlc3VsdHMgZm91bmQgZm9yIHRoaXMgZmlsZScsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBsYXRlc3RSZXN1bHQgPSBhbmFseXNpc1Jlc3VsdHNbMF07XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgcmVwb3J0IGFscmVhZHkgZXhpc3RzIGluIFMzXHJcbiAgICBjb25zdCByZXBvcnRLZXkgPSBgcmVwb3J0cy8ke2ZpbGVJZH0vJHtsYXRlc3RSZXN1bHQuYW5hbHlzaXNJZH0ucGRmYDtcclxuICAgIGxldCByZXBvcnRFeGlzdHMgPSBmYWxzZTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBzM0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBHZXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcclxuICAgICAgICAgIEtleTogcmVwb3J0S2V5LFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICAgIHJlcG9ydEV4aXN0cyA9IHRydWU7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBSZXBvcnQgYWxyZWFkeSBleGlzdHM6ICR7cmVwb3J0S2V5fWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ05vU3VjaEtleScpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyByZXBvcnQgZXhpc3RlbmNlOicsIGVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyYXRlIFBERiBpZiBpdCBkb2Vzbid0IGV4aXN0IChSZXF1aXJlbWVudCA4LjYpXHJcbiAgICBpZiAoIXJlcG9ydEV4aXN0cykge1xyXG4gICAgICBjb25zb2xlLmxvZygnR2VuZXJhdGluZyBuZXcgUERGIHJlcG9ydC4uLicpO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcGRmQnVmZmVyID0gYXdhaXQgcmVwb3J0R2VuZXJhdG9yLmdlbmVyYXRlUERGKFxyXG4gICAgICAgIGxhdGVzdFJlc3VsdCxcclxuICAgICAgICBmaWxlTWV0YWRhdGEuZmlsZW5hbWUgfHwgJ3Vua25vd24uYydcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIFN0b3JlIFBERiBpbiBTMyAoUmVxdWlyZW1lbnQgOC42KVxyXG4gICAgICBhd2FpdCBzM0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBQdXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcclxuICAgICAgICAgIEtleTogcmVwb3J0S2V5LFxyXG4gICAgICAgICAgQm9keTogcGRmQnVmZmVyLFxyXG4gICAgICAgICAgQ29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9wZGYnLFxyXG4gICAgICAgICAgTWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgZmlsZUlkOiBmaWxlSWQsXHJcbiAgICAgICAgICAgIGFuYWx5c2lzSWQ6IGxhdGVzdFJlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgICAgICBnZW5lcmF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYFJlcG9ydCBzdG9yZWQgaW4gUzM6ICR7cmVwb3J0S2V5fWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyYXRlIHByZXNpZ25lZCBVUkwgKGV4cGlyZXMgaW4gMSBob3VyKSAoUmVxdWlyZW1lbnQgOC43KVxyXG4gICAgY29uc3QgZG93bmxvYWRVcmwgPSBhd2FpdCBnZXRTaWduZWRVcmwoXHJcbiAgICAgIHMzQ2xpZW50LFxyXG4gICAgICBuZXcgR2V0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgICAgQnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogcmVwb3J0S2V5LFxyXG4gICAgICB9KSxcclxuICAgICAgeyBleHBpcmVzSW46IDM2MDAgfSAvLyAxIGhvdXJcclxuICAgICk7XHJcblxyXG4gICAgY29uc29sZS5sb2coJ1ByZXNpZ25lZCBVUkwgZ2VuZXJhdGVkIHN1Y2Nlc3NmdWxseScpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHJlcG9ydFVybDogZG93bmxvYWRVcmwsXHJcbiAgICAgICAgZXhwaXJlc0luOiAzNjAwLFxyXG4gICAgICAgIGV4cGlyZXNBdDogbmV3IERhdGUoRGF0ZS5ub3coKSArIDM2MDAgKiAxMDAwKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIGZpbGVJZDogZmlsZUlkLFxyXG4gICAgICAgIGFuYWx5c2lzSWQ6IGxhdGVzdFJlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICAgIGZpbGVOYW1lOiBgJHtmaWxlTWV0YWRhdGEuZmlsZW5hbWUgfHwgJ3JlcG9ydCd9X21pc3JhX3JlcG9ydC5wZGZgLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdlbmVyYXRpbmcgcmVwb3J0OicsIGVycm9yKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgY29kZTogJ0lOVEVSTkFMX1NFUlZFUl9FUlJPUicsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIGdlbmVyYXRlIHJlcG9ydCcsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldCBmaWxlIG1ldGFkYXRhIGZyb20gRHluYW1vREJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEZpbGVNZXRhZGF0YShmaWxlSWQ6IHN0cmluZyk6IFByb21pc2U8YW55IHwgbnVsbD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldEl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBmaWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgS2V5OiBtYXJzaGFsbCh7IGZpbGVfaWQ6IGZpbGVJZCB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5JdGVtKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB1bm1hcnNoYWxsKHJlc3BvbnNlLkl0ZW0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGZpbGUgbWV0YWRhdGE6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUXVlcnkgYW5hbHlzaXMgcmVzdWx0cyBieSBmaWxlSWQgdXNpbmcgRmlsZUluZGV4IEdTSVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcXVlcnlBbmFseXNpc1Jlc3VsdHNCeUZpbGVJZChcclxuICBmaWxlSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFuYWx5c2lzUmVzdWx0W10+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICBJbmRleE5hbWU6ICdGaWxlSW5kZXgnLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZmlsZUlkID0gOmZpbGVJZCcsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IG1hcnNoYWxsKHtcclxuICAgICAgICAnOmZpbGVJZCc6IGZpbGVJZCxcclxuICAgICAgfSksXHJcbiAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLCAvLyBTb3J0IGJ5IHRpbWVzdGFtcCBkZXNjZW5kaW5nIChtb3N0IHJlY2VudCBmaXJzdClcclxuICAgICAgTGltaXQ6IDEsIC8vIE9ubHkgbmVlZCB0aGUgbW9zdCByZWNlbnQgcmVzdWx0XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgIGlmICghcmVzcG9uc2UuSXRlbXMgfHwgcmVzcG9uc2UuSXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzcG9uc2UuSXRlbXMubWFwKChpdGVtKSA9PiB1bm1hcnNoYWxsKGl0ZW0pIGFzIEFuYWx5c2lzUmVzdWx0KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgcXVlcnlpbmcgYW5hbHlzaXMgcmVzdWx0czonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuIl19
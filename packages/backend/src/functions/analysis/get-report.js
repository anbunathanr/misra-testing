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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXJlcG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1yZXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUFHSCw4REFBd0Y7QUFDeEYsa0RBQWtGO0FBQ2xGLHdFQUE2RDtBQUM3RCwwREFBOEQ7QUFDOUQscURBQTJEO0FBQzNELHFGQUFpRjtBQUdqRixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUM7QUFDckQsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLHFCQUFxQixDQUFDO0FBQ3pGLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxrQ0FBa0MsQ0FBQztBQUNoRyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLDBCQUEwQixDQUFDO0FBRWpGLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDcEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUMxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGtDQUFlLEVBQUUsQ0FBQztBQUU5Qzs7Ozs7Ozs7R0FRRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztJQUU1QyxJQUFJLENBQUM7UUFDSCw4Q0FBOEM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFD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LEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbkQsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBQSwwQkFBVSxFQUFDLElBQUksQ0FBbUIsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RCxNQUFNLEtBQUssQ0FBQztJQUNkLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciBnZW5lcmF0aW5nIGFuZCByZXRyaWV2aW5nIE1JU1JBIGFuYWx5c2lzIFBERiByZXBvcnRzXHJcbiAqIEdFVCAvcmVwb3J0cy86ZmlsZUlkXHJcbiAqIFxyXG4gKiBSZXF1aXJlbWVudHM6IDguNiwgOC43XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUXVlcnlDb21tYW5kLCBHZXRJdGVtQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IFMzQ2xpZW50LCBQdXRPYmplY3RDb21tYW5kLCBHZXRPYmplY3RDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcclxuaW1wb3J0IHsgZ2V0U2lnbmVkVXJsIH0gZnJvbSAnQGF3cy1zZGsvczMtcmVxdWVzdC1wcmVzaWduZXInO1xyXG5pbXBvcnQgeyB1bm1hcnNoYWxsLCBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5pbXBvcnQgeyBSZXBvcnRHZW5lcmF0b3IgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9taXNyYS1hbmFseXNpcy9yZXBvcnQtZ2VuZXJhdG9yJztcclxuaW1wb3J0IHsgQW5hbHlzaXNSZXN1bHQgfSBmcm9tICcuLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCBhbmFseXNpc1Jlc3VsdHNUYWJsZSA9IHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEUgfHwgJ0FuYWx5c2lzUmVzdWx0cy1kZXYnO1xyXG5jb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ21pc3JhLXBsYXRmb3JtLWZpbGUtbWV0YWRhdGEtZGV2JztcclxuY29uc3QgYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVQgfHwgJ21pc3JhLXBsYXRmb3JtLWZpbGVzLWRldic7XHJcblxyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb24gfSk7XHJcbmNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5jb25zdCByZXBvcnRHZW5lcmF0b3IgPSBuZXcgUmVwb3J0R2VuZXJhdG9yKCk7XHJcblxyXG4vKipcclxuICogSGFuZGxlciBmb3IgR0VUIC9yZXBvcnRzLzpmaWxlSWRcclxuICogR2VuZXJhdGVzIFBERiByZXBvcnQgYW5kIHJldHVybnMgcHJlc2lnbmVkIGRvd25sb2FkIFVSTFxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOlxyXG4gKiAtIDguNjogR2VuZXJhdGUgUERGIHJlcG9ydCB1c2luZyBSZXBvcnRHZW5lcmF0b3JcclxuICogLSA4LjY6IFN0b3JlIFBERiBpbiBTMyBidWNrZXRcclxuICogLSA4Ljc6IFJldHVybiBwcmVzaWduZWQgZG93bmxvYWQgVVJMIChleHBpcmVzIGluIDEgaG91cilcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdHRVQgL3JlcG9ydHMvOmZpbGVJZCBpbnZva2VkJyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IHVzZXIgZnJvbSBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0XHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignVXNlciBub3QgYXV0aGVudGljYXRlZCcpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdVTkFVVEhPUklaRUQnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnQXV0aGVudGljYXRpb24gcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXh0cmFjdCBmaWxlSWQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcclxuICAgIGNvbnN0IGZpbGVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5maWxlSWQ7XHJcbiAgICBpZiAoIWZpbGVJZCkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdNaXNzaW5nIGZpbGVJZCBwYXJhbWV0ZXInKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9SRVFVRVNUJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ2ZpbGVJZCBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYEdlbmVyYXRpbmcgcmVwb3J0IGZvciBmaWxlOiAke2ZpbGVJZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBVc2VyOiAke3VzZXIudXNlcklkfSwgT3JnYW5pemF0aW9uOiAke3VzZXIub3JnYW5pemF0aW9uSWR9YCk7XHJcblxyXG4gICAgLy8gVmVyaWZ5IHVzZXIgb3ducyB0aGUgZmlsZVxyXG4gICAgY29uc3QgZmlsZU1ldGFkYXRhID0gYXdhaXQgZ2V0RmlsZU1ldGFkYXRhKGZpbGVJZCk7XHJcbiAgICBcclxuICAgIGlmICghZmlsZU1ldGFkYXRhKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBGaWxlIG5vdCBmb3VuZDogJHtmaWxlSWR9YCk7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0ZJTEVfTk9UX0ZPVU5EJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0ZpbGUgbm90IGZvdW5kJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIG93bmVyc2hpcFxyXG4gICAgaWYgKGZpbGVNZXRhZGF0YS51c2VyX2lkICE9PSB1c2VyLnVzZXJJZCkge1xyXG4gICAgICAvLyBBZG1pbnMgY2FuIGFjY2VzcyBmaWxlcyBpbiB0aGVpciBvcmdhbml6YXRpb25cclxuICAgICAgaWYgKHVzZXIucm9sZSA9PT0gJ2FkbWluJyAmJiBmaWxlTWV0YWRhdGEub3JnYW5pemF0aW9uX2lkID09PSB1c2VyLm9yZ2FuaXphdGlvbklkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0FkbWluIGFjY2Vzc2luZyBmaWxlIGluIHRoZWlyIG9yZ2FuaXphdGlvbicpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBBY2Nlc3MgZGVuaWVkOiBVc2VyICR7dXNlci51c2VySWR9IGRvZXMgbm90IG93biBmaWxlICR7ZmlsZUlkfWApO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA0MDMsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICAgIGNvZGU6ICdGT1JCSURERU4nLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdZb3UgZG8gbm90IGhhdmUgcGVybWlzc2lvbiB0byBhY2Nlc3MgdGhpcyBmaWxlJyxcclxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgYW5hbHlzaXMgcmVzdWx0c1xyXG4gICAgY29uc3QgYW5hbHlzaXNSZXN1bHRzID0gYXdhaXQgcXVlcnlBbmFseXNpc1Jlc3VsdHNCeUZpbGVJZChmaWxlSWQpO1xyXG5cclxuICAgIGlmICghYW5hbHlzaXNSZXN1bHRzIHx8IGFuYWx5c2lzUmVzdWx0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgY29uc29sZS5sb2coYE5vIGFuYWx5c2lzIHJlc3VsdHMgZm91bmQgZm9yIGZpbGU6ICR7ZmlsZUlkfWApO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwNCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdBTkFMWVNJU19OT1RfRk9VTkQnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnTm8gYW5hbHlzaXMgcmVzdWx0cyBmb3VuZCBmb3IgdGhpcyBmaWxlJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGxhdGVzdFJlc3VsdCA9IGFuYWx5c2lzUmVzdWx0c1swXTtcclxuXHJcbiAgICAvLyBDaGVjayBpZiByZXBvcnQgYWxyZWFkeSBleGlzdHMgaW4gUzNcclxuICAgIGNvbnN0IHJlcG9ydEtleSA9IGByZXBvcnRzLyR7ZmlsZUlkfS8ke2xhdGVzdFJlc3VsdC5hbmFseXNpc0lkfS5wZGZgO1xyXG4gICAgbGV0IHJlcG9ydEV4aXN0cyA9IGZhbHNlO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHMzQ2xpZW50LnNlbmQoXHJcbiAgICAgICAgbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgICAgQnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgICAgICAgS2V5OiByZXBvcnRLZXksXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgICAgcmVwb3J0RXhpc3RzID0gdHJ1ZTtcclxuICAgICAgY29uc29sZS5sb2coYFJlcG9ydCBhbHJlYWR5IGV4aXN0czogJHtyZXBvcnRLZXl9YCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lICE9PSAnTm9TdWNoS2V5Jykge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNoZWNraW5nIHJlcG9ydCBleGlzdGVuY2U6JywgZXJyb3IpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgUERGIGlmIGl0IGRvZXNuJ3QgZXhpc3QgKFJlcXVpcmVtZW50IDguNilcclxuICAgIGlmICghcmVwb3J0RXhpc3RzKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdHZW5lcmF0aW5nIG5ldyBQREYgcmVwb3J0Li4uJyk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBwZGZCdWZmZXIgPSBhd2FpdCByZXBvcnRHZW5lcmF0b3IuZ2VuZXJhdGVQREYoXHJcbiAgICAgICAgbGF0ZXN0UmVzdWx0LFxyXG4gICAgICAgIGZpbGVNZXRhZGF0YS5maWxlbmFtZSB8fCAndW5rbm93bi5jJ1xyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gU3RvcmUgUERGIGluIFMzIChSZXF1aXJlbWVudCA4LjYpXHJcbiAgICAgIGF3YWl0IHMzQ2xpZW50LnNlbmQoXHJcbiAgICAgICAgbmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgICAgQnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgICAgICAgS2V5OiByZXBvcnRLZXksXHJcbiAgICAgICAgICBCb2R5OiBwZGZCdWZmZXIsXHJcbiAgICAgICAgICBDb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL3BkZicsXHJcbiAgICAgICAgICBNZXRhZGF0YToge1xyXG4gICAgICAgICAgICBmaWxlSWQ6IGZpbGVJZCxcclxuICAgICAgICAgICAgYW5hbHlzaXNJZDogbGF0ZXN0UmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgICAgIGdlbmVyYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgUmVwb3J0IHN0b3JlZCBpbiBTMzogJHtyZXBvcnRLZXl9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgcHJlc2lnbmVkIFVSTCAoZXhwaXJlcyBpbiAxIGhvdXIpIChSZXF1aXJlbWVudCA4LjcpXHJcbiAgICBjb25zdCBkb3dubG9hZFVybCA9IGF3YWl0IGdldFNpZ25lZFVybChcclxuICAgICAgczNDbGllbnQsXHJcbiAgICAgIG5ldyBHZXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgS2V5OiByZXBvcnRLZXksXHJcbiAgICAgIH0pLFxyXG4gICAgICB7IGV4cGlyZXNJbjogMzYwMCB9IC8vIDEgaG91clxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZygnUHJlc2lnbmVkIFVSTCBnZW5lcmF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgcmVwb3J0VXJsOiBkb3dubG9hZFVybCxcclxuICAgICAgICBleHBpcmVzSW46IDM2MDAsXHJcbiAgICAgICAgZXhwaXJlc0F0OiBuZXcgRGF0ZShEYXRlLm5vdygpICsgMzYwMCAqIDEwMDApLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgZmlsZUlkOiBmaWxlSWQsXHJcbiAgICAgICAgYW5hbHlzaXNJZDogbGF0ZXN0UmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgICAgZmlsZU5hbWU6IGAke2ZpbGVNZXRhZGF0YS5maWxlbmFtZSB8fCAncmVwb3J0J31fbWlzcmFfcmVwb3J0LnBkZmAsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2VuZXJhdGluZyByZXBvcnQ6JywgZXJyb3IpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnSU5URVJOQUxfU0VSVkVSX0VSUk9SJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gZ2VuZXJhdGUgcmVwb3J0JyxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0IGZpbGUgbWV0YWRhdGEgZnJvbSBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZ2V0RmlsZU1ldGFkYXRhKGZpbGVJZDogc3RyaW5nKTogUHJvbWlzZTxhbnkgfCBudWxsPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0SXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgICBLZXk6IG1hcnNoYWxsKHsgZmlsZV9pZDogZmlsZUlkIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLkl0ZW0pIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHVubWFyc2hhbGwocmVzcG9uc2UuSXRlbSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgZmlsZSBtZXRhZGF0YTonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBRdWVyeSBhbmFseXNpcyByZXN1bHRzIGJ5IGZpbGVJZCB1c2luZyBGaWxlSW5kZXggR1NJXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBxdWVyeUFuYWx5c2lzUmVzdWx0c0J5RmlsZUlkKFxyXG4gIGZpbGVJZDogc3RyaW5nXHJcbik6IFByb21pc2U8QW5hbHlzaXNSZXN1bHRbXT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogYW5hbHlzaXNSZXN1bHRzVGFibGUsXHJcbiAgICAgIEluZGV4TmFtZTogJ0ZpbGVJbmRleCcsXHJcbiAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdmaWxlSWQgPSA6ZmlsZUlkJyxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogbWFyc2hhbGwoe1xyXG4gICAgICAgICc6ZmlsZUlkJzogZmlsZUlkLFxyXG4gICAgICB9KSxcclxuICAgICAgU2NhbkluZGV4Rm9yd2FyZDogZmFsc2UsIC8vIFNvcnQgYnkgdGltZXN0YW1wIGRlc2NlbmRpbmcgKG1vc3QgcmVjZW50IGZpcnN0KVxyXG4gICAgICBMaW1pdDogMSwgLy8gT25seSBuZWVkIHRoZSBtb3N0IHJlY2VudCByZXN1bHRcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5JdGVtcyB8fCByZXNwb25zZS5JdGVtcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXNwb25zZS5JdGVtcy5tYXAoKGl0ZW0pID0+IHVubWFyc2hhbGwoaXRlbSkgYXMgQW5hbHlzaXNSZXN1bHQpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBxdWVyeWluZyBhbmFseXNpcyByZXN1bHRzOicsIGVycm9yKTtcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG4iXX0=
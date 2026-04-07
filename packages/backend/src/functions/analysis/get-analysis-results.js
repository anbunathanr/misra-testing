"use strict";
/**
 * Lambda handler for retrieving MISRA analysis results
 * GET /analysis/results/:fileId
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const auth_util_1 = require("../../utils/auth-util");
const region = process.env.AWS_REGION || 'us-east-1';
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults-dev';
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'misra-platform-file-metadata-dev';
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region });
/**
 * Handler for GET /analysis/results/:fileId
 * Returns analysis results for a specific file
 *
 * Requirements:
 * - 7.1: Provide GET /analysis/results/{fileId} endpoint
 * - 7.2: Return analysis results in JSON format
 * - 7.3: Include all violations with details
 * - 7.4: Include compliance percentage
 * - 7.5: Include analysis metadata
 * - 7.6: Return 404 if analysis not found
 * - 7.7: Return 403 if user doesn't own the file
 */
const handler = async (event) => {
    console.log('GET /analysis/results/:fileId invoked');
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
        // Extract fileId from path parameters (Requirement 7.1)
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
        console.log(`Retrieving analysis results for file: ${fileId}`);
        console.log(`User: ${user.userId}, Organization: ${user.organizationId}`);
        // Verify user owns the file (Requirement 7.7)
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
        // Check ownership (Requirement 7.7)
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
        // Query analysis results by fileId (Requirement 7.2)
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
        // Return the most recent analysis result
        const latestResult = analysisResults[0];
        console.log(`Returning analysis result: ${latestResult.analysisId}`);
        console.log(`Violations: ${latestResult.violations?.length || 0}`);
        console.log(`Compliance: ${latestResult.summary?.compliancePercentage || 0}%`);
        // Return analysis results in JSON format (Requirements 7.2, 7.3, 7.4, 7.5)
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                analysisId: latestResult.analysisId,
                fileId: latestResult.fileId,
                language: latestResult.language,
                violations: latestResult.violations || [], // Requirement 7.3
                summary: latestResult.summary || {
                    totalViolations: 0,
                    violationsBySeverity: {
                        mandatory: 0,
                        required: 0,
                        advisory: 0,
                    },
                    compliancePercentage: 0, // Requirement 7.4
                    rulesChecked: 0,
                },
                status: latestResult.status,
                metadata: {
                    // Requirement 7.5
                    analysisId: latestResult.analysisId,
                    timestamp: latestResult.timestamp,
                    createdAt: latestResult.createdAt,
                    userId: latestResult.userId,
                    organizationId: latestResult.organizationId,
                },
            }),
        };
    }
    catch (error) {
        console.error('Error retrieving analysis results:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to retrieve analysis results',
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
            Limit: 10, // Return up to 10 most recent results
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWFuYWx5c2lzLXJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtYW5hbHlzaXMtcmVzdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUdILDhEQUF3RjtBQUN4RiwwREFBOEQ7QUFDOUQscURBQTJEO0FBRTNELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztBQUNyRCxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUkscUJBQXFCLENBQUM7QUFDekYsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLGtDQUFrQyxDQUFDO0FBRWhHLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUF3QnBEOzs7Ozs7Ozs7Ozs7R0FZRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsQ0FBQztJQUVyRCxJQUFJLENBQUM7UUFDSCw4Q0FBOEM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN4QyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSxjQUFjO3dCQUNwQixPQUFP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SSxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbkQsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBQSwwQkFBVSxFQUFDLElBQUksQ0FBbUIsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RCxNQUFNLEtBQUssQ0FBQztJQUNkLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciByZXRyaWV2aW5nIE1JU1JBIGFuYWx5c2lzIHJlc3VsdHNcclxuICogR0VUIC9hbmFseXNpcy9yZXN1bHRzLzpmaWxlSWRcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czogNy4xLCA3LjIsIDcuMywgNy40LCA3LjUsIDcuNiwgNy43XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUXVlcnlDb21tYW5kLCBHZXRJdGVtQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IHVubWFyc2hhbGwsIG1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcblxyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCBhbmFseXNpc1Jlc3VsdHNUYWJsZSA9IHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEUgfHwgJ0FuYWx5c2lzUmVzdWx0cy1kZXYnO1xyXG5jb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ21pc3JhLXBsYXRmb3JtLWZpbGUtbWV0YWRhdGEtZGV2JztcclxuXHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbiB9KTtcclxuXHJcbmludGVyZmFjZSBBbmFseXNpc1Jlc3VsdCB7XHJcbiAgYW5hbHlzaXNJZDogc3RyaW5nO1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIG9yZ2FuaXphdGlvbklkOiBzdHJpbmc7XHJcbiAgbGFuZ3VhZ2U6IHN0cmluZztcclxuICB2aW9sYXRpb25zOiBhbnlbXTtcclxuICBzdW1tYXJ5OiB7XHJcbiAgICB0b3RhbFZpb2xhdGlvbnM6IG51bWJlcjtcclxuICAgIHZpb2xhdGlvbnNCeVNldmVyaXR5OiB7XHJcbiAgICAgIG1hbmRhdG9yeTogbnVtYmVyO1xyXG4gICAgICByZXF1aXJlZDogbnVtYmVyO1xyXG4gICAgICBhZHZpc29yeTogbnVtYmVyO1xyXG4gICAgfTtcclxuICAgIGNvbXBsaWFuY2VQZXJjZW50YWdlOiBudW1iZXI7XHJcbiAgICBydWxlc0NoZWNrZWQ6IG51bWJlcjtcclxuICB9O1xyXG4gIHN0YXR1czogc3RyaW5nO1xyXG4gIGNyZWF0ZWRBdDogbnVtYmVyO1xyXG4gIHRpbWVzdGFtcDogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlciBmb3IgR0VUIC9hbmFseXNpcy9yZXN1bHRzLzpmaWxlSWRcclxuICogUmV0dXJucyBhbmFseXNpcyByZXN1bHRzIGZvciBhIHNwZWNpZmljIGZpbGVcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czpcclxuICogLSA3LjE6IFByb3ZpZGUgR0VUIC9hbmFseXNpcy9yZXN1bHRzL3tmaWxlSWR9IGVuZHBvaW50XHJcbiAqIC0gNy4yOiBSZXR1cm4gYW5hbHlzaXMgcmVzdWx0cyBpbiBKU09OIGZvcm1hdFxyXG4gKiAtIDcuMzogSW5jbHVkZSBhbGwgdmlvbGF0aW9ucyB3aXRoIGRldGFpbHNcclxuICogLSA3LjQ6IEluY2x1ZGUgY29tcGxpYW5jZSBwZXJjZW50YWdlXHJcbiAqIC0gNy41OiBJbmNsdWRlIGFuYWx5c2lzIG1ldGFkYXRhXHJcbiAqIC0gNy42OiBSZXR1cm4gNDA0IGlmIGFuYWx5c2lzIG5vdCBmb3VuZFxyXG4gKiAtIDcuNzogUmV0dXJuIDQwMyBpZiB1c2VyIGRvZXNuJ3Qgb3duIHRoZSBmaWxlXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnR0VUIC9hbmFseXNpcy9yZXN1bHRzLzpmaWxlSWQgaW52b2tlZCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gTGFtYmRhIEF1dGhvcml6ZXIgY29udGV4dFxyXG4gICAgY29uc3QgdXNlciA9IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnVU5BVVRIT1JJWkVEJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0F1dGhlbnRpY2F0aW9uIHJlcXVpcmVkJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgZmlsZUlkIGZyb20gcGF0aCBwYXJhbWV0ZXJzIChSZXF1aXJlbWVudCA3LjEpXHJcbiAgICBjb25zdCBmaWxlSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uZmlsZUlkO1xyXG4gICAgaWYgKCFmaWxlSWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignTWlzc2luZyBmaWxlSWQgcGFyYW1ldGVyJyk7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0lOVkFMSURfUkVRVUVTVCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdmaWxlSWQgcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBSZXRyaWV2aW5nIGFuYWx5c2lzIHJlc3VsdHMgZm9yIGZpbGU6ICR7ZmlsZUlkfWApO1xyXG4gICAgY29uc29sZS5sb2coYFVzZXI6ICR7dXNlci51c2VySWR9LCBPcmdhbml6YXRpb246ICR7dXNlci5vcmdhbml6YXRpb25JZH1gKTtcclxuXHJcbiAgICAvLyBWZXJpZnkgdXNlciBvd25zIHRoZSBmaWxlIChSZXF1aXJlbWVudCA3LjcpXHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGEgPSBhd2FpdCBnZXRGaWxlTWV0YWRhdGEoZmlsZUlkKTtcclxuICAgIFxyXG4gICAgaWYgKCFmaWxlTWV0YWRhdGEpIHtcclxuICAgICAgY29uc29sZS5sb2coYEZpbGUgbm90IGZvdW5kOiAke2ZpbGVJZH1gKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnRklMRV9OT1RfRk9VTkQnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnRmlsZSBub3QgZm91bmQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgb3duZXJzaGlwIChSZXF1aXJlbWVudCA3LjcpXHJcbiAgICBpZiAoZmlsZU1ldGFkYXRhLnVzZXJfaWQgIT09IHVzZXIudXNlcklkKSB7XHJcbiAgICAgIC8vIEFkbWlucyBjYW4gYWNjZXNzIGZpbGVzIGluIHRoZWlyIG9yZ2FuaXphdGlvblxyXG4gICAgICBpZiAodXNlci5yb2xlID09PSAnYWRtaW4nICYmIGZpbGVNZXRhZGF0YS5vcmdhbml6YXRpb25faWQgPT09IHVzZXIub3JnYW5pemF0aW9uSWQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnQWRtaW4gYWNjZXNzaW5nIGZpbGUgaW4gdGhlaXIgb3JnYW5pemF0aW9uJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEFjY2VzcyBkZW5pZWQ6IFVzZXIgJHt1c2VyLnVzZXJJZH0gZG9lcyBub3Qgb3duIGZpbGUgJHtmaWxlSWR9YCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMyxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgICAgY29kZTogJ0ZPUkJJRERFTicsXHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdSBkbyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIGFjY2VzcyB0aGlzIGZpbGUnLFxyXG4gICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFF1ZXJ5IGFuYWx5c2lzIHJlc3VsdHMgYnkgZmlsZUlkIChSZXF1aXJlbWVudCA3LjIpXHJcbiAgICBjb25zdCBhbmFseXNpc1Jlc3VsdHMgPSBhd2FpdCBxdWVyeUFuYWx5c2lzUmVzdWx0c0J5RmlsZUlkKGZpbGVJZCk7XHJcblxyXG4gICAgaWYgKCFhbmFseXNpc1Jlc3VsdHMgfHwgYW5hbHlzaXNSZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgTm8gYW5hbHlzaXMgcmVzdWx0cyBmb3VuZCBmb3IgZmlsZTogJHtmaWxlSWR9YCk7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0FOQUxZU0lTX05PVF9GT1VORCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdObyBhbmFseXNpcyByZXN1bHRzIGZvdW5kIGZvciB0aGlzIGZpbGUnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmV0dXJuIHRoZSBtb3N0IHJlY2VudCBhbmFseXNpcyByZXN1bHRcclxuICAgIGNvbnN0IGxhdGVzdFJlc3VsdCA9IGFuYWx5c2lzUmVzdWx0c1swXTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgUmV0dXJuaW5nIGFuYWx5c2lzIHJlc3VsdDogJHtsYXRlc3RSZXN1bHQuYW5hbHlzaXNJZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBWaW9sYXRpb25zOiAke2xhdGVzdFJlc3VsdC52aW9sYXRpb25zPy5sZW5ndGggfHwgMH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBDb21wbGlhbmNlOiAke2xhdGVzdFJlc3VsdC5zdW1tYXJ5Py5jb21wbGlhbmNlUGVyY2VudGFnZSB8fCAwfSVgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gYW5hbHlzaXMgcmVzdWx0cyBpbiBKU09OIGZvcm1hdCAoUmVxdWlyZW1lbnRzIDcuMiwgNy4zLCA3LjQsIDcuNSlcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGFuYWx5c2lzSWQ6IGxhdGVzdFJlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICAgIGZpbGVJZDogbGF0ZXN0UmVzdWx0LmZpbGVJZCxcclxuICAgICAgICBsYW5ndWFnZTogbGF0ZXN0UmVzdWx0Lmxhbmd1YWdlLFxyXG4gICAgICAgIHZpb2xhdGlvbnM6IGxhdGVzdFJlc3VsdC52aW9sYXRpb25zIHx8IFtdLCAvLyBSZXF1aXJlbWVudCA3LjNcclxuICAgICAgICBzdW1tYXJ5OiBsYXRlc3RSZXN1bHQuc3VtbWFyeSB8fCB7XHJcbiAgICAgICAgICB0b3RhbFZpb2xhdGlvbnM6IDAsXHJcbiAgICAgICAgICB2aW9sYXRpb25zQnlTZXZlcml0eToge1xyXG4gICAgICAgICAgICBtYW5kYXRvcnk6IDAsXHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiAwLFxyXG4gICAgICAgICAgICBhZHZpc29yeTogMCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogMCwgLy8gUmVxdWlyZW1lbnQgNy40XHJcbiAgICAgICAgICBydWxlc0NoZWNrZWQ6IDAsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0dXM6IGxhdGVzdFJlc3VsdC5zdGF0dXMsXHJcbiAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIC8vIFJlcXVpcmVtZW50IDcuNVxyXG4gICAgICAgICAgYW5hbHlzaXNJZDogbGF0ZXN0UmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IGxhdGVzdFJlc3VsdC50aW1lc3RhbXAsXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IGxhdGVzdFJlc3VsdC5jcmVhdGVkQXQsXHJcbiAgICAgICAgICB1c2VySWQ6IGxhdGVzdFJlc3VsdC51c2VySWQsXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZDogbGF0ZXN0UmVzdWx0Lm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgcmV0cmlldmluZyBhbmFseXNpcyByZXN1bHRzOicsIGVycm9yKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgY29kZTogJ0lOVEVSTkFMX1NFUlZFUl9FUlJPUicsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIHJldHJpZXZlIGFuYWx5c2lzIHJlc3VsdHMnLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXQgZmlsZSBtZXRhZGF0YSBmcm9tIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZXRGaWxlTWV0YWRhdGEoZmlsZUlkOiBzdHJpbmcpOiBQcm9taXNlPGFueSB8IG51bGw+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogZmlsZU1ldGFkYXRhVGFibGUsXHJcbiAgICAgIEtleTogbWFyc2hhbGwoeyBmaWxlX2lkOiBmaWxlSWQgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgIGlmICghcmVzcG9uc2UuSXRlbSkge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdW5tYXJzaGFsbChyZXNwb25zZS5JdGVtKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBmaWxlIG1ldGFkYXRhOicsIGVycm9yKTtcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFF1ZXJ5IGFuYWx5c2lzIHJlc3VsdHMgYnkgZmlsZUlkIHVzaW5nIEZpbGVJbmRleCBHU0lcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5QW5hbHlzaXNSZXN1bHRzQnlGaWxlSWQoXHJcbiAgZmlsZUlkOiBzdHJpbmdcclxuKTogUHJvbWlzZTxBbmFseXNpc1Jlc3VsdFtdPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBhbmFseXNpc1Jlc3VsdHNUYWJsZSxcclxuICAgICAgSW5kZXhOYW1lOiAnRmlsZUluZGV4JyxcclxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ2ZpbGVJZCA9IDpmaWxlSWQnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBtYXJzaGFsbCh7XHJcbiAgICAgICAgJzpmaWxlSWQnOiBmaWxlSWQsXHJcbiAgICAgIH0pLFxyXG4gICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSwgLy8gU29ydCBieSB0aW1lc3RhbXAgZGVzY2VuZGluZyAobW9zdCByZWNlbnQgZmlyc3QpXHJcbiAgICAgIExpbWl0OiAxMCwgLy8gUmV0dXJuIHVwIHRvIDEwIG1vc3QgcmVjZW50IHJlc3VsdHNcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5JdGVtcyB8fCByZXNwb25zZS5JdGVtcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXNwb25zZS5JdGVtcy5tYXAoKGl0ZW0pID0+IHVubWFyc2hhbGwoaXRlbSkgYXMgQW5hbHlzaXNSZXN1bHQpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBxdWVyeWluZyBhbmFseXNpcyByZXN1bHRzOicsIGVycm9yKTtcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG4iXX0=
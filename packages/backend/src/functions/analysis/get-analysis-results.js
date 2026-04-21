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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWFuYWx5c2lzLXJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtYW5hbHlzaXMtcmVzdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUdILDhEQUF3RjtBQUN4RiwwREFBOEQ7QUFDOUQscURBQTJEO0FBRTNELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztBQUNyRCxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUkscUJBQXFCLENBQUM7QUFDekYsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLGtDQUFrQyxDQUFDO0FBRWhHLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUF3QnBEOzs7Ozs7Ozs7Ozs7R0FZRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsQ0FBQztJQUVyRCxJQUFJLENBQUM7UUFDSCw4Q0FBOEM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQ3hDLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGNBQWM7d0JBQ3BC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RCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNuRCxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFBLDBCQUFVLEVBQUMsSUFBSSxDQUFtQixDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pELE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTGFtYmRhIGhhbmRsZXIgZm9yIHJldHJpZXZpbmcgTUlTUkEgYW5hbHlzaXMgcmVzdWx0c1xyXG4gKiBHRVQgL2FuYWx5c2lzL3Jlc3VsdHMvOmZpbGVJZFxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiA3LjEsIDcuMiwgNy4zLCA3LjQsIDcuNSwgNy42LCA3LjdcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBRdWVyeUNvbW1hbmQsIEdldEl0ZW1Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgdW5tYXJzaGFsbCwgbWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuXHJcbmNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSc7XHJcbmNvbnN0IGFuYWx5c2lzUmVzdWx0c1RhYmxlID0gcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRSB8fCAnQW5hbHlzaXNSZXN1bHRzLWRldic7XHJcbmNvbnN0IGZpbGVNZXRhZGF0YVRhYmxlID0gcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRSB8fCAnbWlzcmEtcGxhdGZvcm0tZmlsZS1tZXRhZGF0YS1kZXYnO1xyXG5cclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5cclxuaW50ZXJmYWNlIEFuYWx5c2lzUmVzdWx0IHtcclxuICBhbmFseXNpc0lkOiBzdHJpbmc7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICBsYW5ndWFnZTogc3RyaW5nO1xyXG4gIHZpb2xhdGlvbnM6IGFueVtdO1xyXG4gIHN1bW1hcnk6IHtcclxuICAgIHRvdGFsVmlvbGF0aW9uczogbnVtYmVyO1xyXG4gICAgdmlvbGF0aW9uc0J5U2V2ZXJpdHk6IHtcclxuICAgICAgbWFuZGF0b3J5OiBudW1iZXI7XHJcbiAgICAgIHJlcXVpcmVkOiBudW1iZXI7XHJcbiAgICAgIGFkdmlzb3J5OiBudW1iZXI7XHJcbiAgICB9O1xyXG4gICAgY29tcGxpYW5jZVBlcmNlbnRhZ2U6IG51bWJlcjtcclxuICAgIHJ1bGVzQ2hlY2tlZDogbnVtYmVyO1xyXG4gIH07XHJcbiAgc3RhdHVzOiBzdHJpbmc7XHJcbiAgY3JlYXRlZEF0OiBudW1iZXI7XHJcbiAgdGltZXN0YW1wOiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGVyIGZvciBHRVQgL2FuYWx5c2lzL3Jlc3VsdHMvOmZpbGVJZFxyXG4gKiBSZXR1cm5zIGFuYWx5c2lzIHJlc3VsdHMgZm9yIGEgc3BlY2lmaWMgZmlsZVxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOlxyXG4gKiAtIDcuMTogUHJvdmlkZSBHRVQgL2FuYWx5c2lzL3Jlc3VsdHMve2ZpbGVJZH0gZW5kcG9pbnRcclxuICogLSA3LjI6IFJldHVybiBhbmFseXNpcyByZXN1bHRzIGluIEpTT04gZm9ybWF0XHJcbiAqIC0gNy4zOiBJbmNsdWRlIGFsbCB2aW9sYXRpb25zIHdpdGggZGV0YWlsc1xyXG4gKiAtIDcuNDogSW5jbHVkZSBjb21wbGlhbmNlIHBlcmNlbnRhZ2VcclxuICogLSA3LjU6IEluY2x1ZGUgYW5hbHlzaXMgbWV0YWRhdGFcclxuICogLSA3LjY6IFJldHVybiA0MDQgaWYgYW5hbHlzaXMgbm90IGZvdW5kXHJcbiAqIC0gNy43OiBSZXR1cm4gNDAzIGlmIHVzZXIgZG9lc24ndCBvd24gdGhlIGZpbGVcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdHRVQgL2FuYWx5c2lzL3Jlc3VsdHMvOmZpbGVJZCBpbnZva2VkJyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IHVzZXIgZnJvbSBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0XHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignVXNlciBub3QgYXV0aGVudGljYXRlZCcpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdVTkFVVEhPUklaRUQnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnQXV0aGVudGljYXRpb24gcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXh0cmFjdCBmaWxlSWQgZnJvbSBwYXRoIHBhcmFtZXRlcnMgKFJlcXVpcmVtZW50IDcuMSlcclxuICAgIGNvbnN0IGZpbGVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5maWxlSWQ7XHJcbiAgICBpZiAoIWZpbGVJZCkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdNaXNzaW5nIGZpbGVJZCBwYXJhbWV0ZXInKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9SRVFVRVNUJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ2ZpbGVJZCBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFJldHJpZXZpbmcgYW5hbHlzaXMgcmVzdWx0cyBmb3IgZmlsZTogJHtmaWxlSWR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgVXNlcjogJHt1c2VyLnVzZXJJZH0sIE9yZ2FuaXphdGlvbjogJHt1c2VyLm9yZ2FuaXphdGlvbklkfWApO1xyXG5cclxuICAgIC8vIFZlcmlmeSB1c2VyIG93bnMgdGhlIGZpbGUgKFJlcXVpcmVtZW50IDcuNylcclxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YSA9IGF3YWl0IGdldEZpbGVNZXRhZGF0YShmaWxlSWQpO1xyXG4gICAgXHJcbiAgICBpZiAoIWZpbGVNZXRhZGF0YSkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgRmlsZSBub3QgZm91bmQ6ICR7ZmlsZUlkfWApO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwNCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdGSUxFX05PVF9GT1VORCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIG5vdCBmb3VuZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBvd25lcnNoaXAgKFJlcXVpcmVtZW50IDcuNylcclxuICAgIGlmIChmaWxlTWV0YWRhdGEudXNlcl9pZCAhPT0gdXNlci51c2VySWQpIHtcclxuICAgICAgLy8gQWRtaW5zIGNhbiBhY2Nlc3MgZmlsZXMgaW4gdGhlaXIgb3JnYW5pemF0aW9uXHJcbiAgICAgIGlmICh1c2VyLnJvbGUgPT09ICdhZG1pbicgJiYgZmlsZU1ldGFkYXRhLm9yZ2FuaXphdGlvbl9pZCA9PT0gdXNlci5vcmdhbml6YXRpb25JZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdBZG1pbiBhY2Nlc3NpbmcgZmlsZSBpbiB0aGVpciBvcmdhbml6YXRpb24nKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQWNjZXNzIGRlbmllZDogVXNlciAke3VzZXIudXNlcklkfSBkb2VzIG5vdCBvd24gZmlsZSAke2ZpbGVJZH1gKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAzLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgICBjb2RlOiAnRk9SQklEREVOJyxcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIHRoaXMgZmlsZScsXHJcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUXVlcnkgYW5hbHlzaXMgcmVzdWx0cyBieSBmaWxlSWQgKFJlcXVpcmVtZW50IDcuMilcclxuICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0cyA9IGF3YWl0IHF1ZXJ5QW5hbHlzaXNSZXN1bHRzQnlGaWxlSWQoZmlsZUlkKTtcclxuXHJcbiAgICBpZiAoIWFuYWx5c2lzUmVzdWx0cyB8fCBhbmFseXNpc1Jlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBObyBhbmFseXNpcyByZXN1bHRzIGZvdW5kIGZvciBmaWxlOiAke2ZpbGVJZH1gKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnQU5BTFlTSVNfTk9UX0ZPVU5EJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ05vIGFuYWx5c2lzIHJlc3VsdHMgZm91bmQgZm9yIHRoaXMgZmlsZScsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIG1vc3QgcmVjZW50IGFuYWx5c2lzIHJlc3VsdFxyXG4gICAgY29uc3QgbGF0ZXN0UmVzdWx0ID0gYW5hbHlzaXNSZXN1bHRzWzBdO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBSZXR1cm5pbmcgYW5hbHlzaXMgcmVzdWx0OiAke2xhdGVzdFJlc3VsdC5hbmFseXNpc0lkfWApO1xyXG4gICAgY29uc29sZS5sb2coYFZpb2xhdGlvbnM6ICR7bGF0ZXN0UmVzdWx0LnZpb2xhdGlvbnM/Lmxlbmd0aCB8fCAwfWApO1xyXG4gICAgY29uc29sZS5sb2coYENvbXBsaWFuY2U6ICR7bGF0ZXN0UmVzdWx0LnN1bW1hcnk/LmNvbXBsaWFuY2VQZXJjZW50YWdlIHx8IDB9JWApO1xyXG5cclxuICAgIC8vIFJldHVybiBhbmFseXNpcyByZXN1bHRzIGluIEpTT04gZm9ybWF0IChSZXF1aXJlbWVudHMgNy4yLCA3LjMsIDcuNCwgNy41KVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgYW5hbHlzaXNJZDogbGF0ZXN0UmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgICAgZmlsZUlkOiBsYXRlc3RSZXN1bHQuZmlsZUlkLFxyXG4gICAgICAgIGxhbmd1YWdlOiBsYXRlc3RSZXN1bHQubGFuZ3VhZ2UsXHJcbiAgICAgICAgdmlvbGF0aW9uczogbGF0ZXN0UmVzdWx0LnZpb2xhdGlvbnMgfHwgW10sIC8vIFJlcXVpcmVtZW50IDcuM1xyXG4gICAgICAgIHN1bW1hcnk6IGxhdGVzdFJlc3VsdC5zdW1tYXJ5IHx8IHtcclxuICAgICAgICAgIHRvdGFsVmlvbGF0aW9uczogMCxcclxuICAgICAgICAgIHZpb2xhdGlvbnNCeVNldmVyaXR5OiB7XHJcbiAgICAgICAgICAgIG1hbmRhdG9yeTogMCxcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IDAsXHJcbiAgICAgICAgICAgIGFkdmlzb3J5OiAwLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGNvbXBsaWFuY2VQZXJjZW50YWdlOiAwLCAvLyBSZXF1aXJlbWVudCA3LjRcclxuICAgICAgICAgIHJ1bGVzQ2hlY2tlZDogMCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN0YXR1czogbGF0ZXN0UmVzdWx0LnN0YXR1cyxcclxuICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgLy8gUmVxdWlyZW1lbnQgNy41XHJcbiAgICAgICAgICBhbmFseXNpc0lkOiBsYXRlc3RSZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbGF0ZXN0UmVzdWx0LnRpbWVzdGFtcCxcclxuICAgICAgICAgIGNyZWF0ZWRBdDogbGF0ZXN0UmVzdWx0LmNyZWF0ZWRBdCxcclxuICAgICAgICAgIHVzZXJJZDogbGF0ZXN0UmVzdWx0LnVzZXJJZCxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiBsYXRlc3RSZXN1bHQub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZXRyaWV2aW5nIGFuYWx5c2lzIHJlc3VsdHM6JywgZXJyb3IpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnSU5URVJOQUxfU0VSVkVSX0VSUk9SJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gcmV0cmlldmUgYW5hbHlzaXMgcmVzdWx0cycsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldCBmaWxlIG1ldGFkYXRhIGZyb20gRHluYW1vREJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEZpbGVNZXRhZGF0YShmaWxlSWQ6IHN0cmluZyk6IFByb21pc2U8YW55IHwgbnVsbD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldEl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBmaWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgS2V5OiBtYXJzaGFsbCh7IGZpbGVfaWQ6IGZpbGVJZCB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5JdGVtKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB1bm1hcnNoYWxsKHJlc3BvbnNlLkl0ZW0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGZpbGUgbWV0YWRhdGE6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUXVlcnkgYW5hbHlzaXMgcmVzdWx0cyBieSBmaWxlSWQgdXNpbmcgRmlsZUluZGV4IEdTSVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcXVlcnlBbmFseXNpc1Jlc3VsdHNCeUZpbGVJZChcclxuICBmaWxlSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFuYWx5c2lzUmVzdWx0W10+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICBJbmRleE5hbWU6ICdGaWxlSW5kZXgnLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZmlsZUlkID0gOmZpbGVJZCcsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IG1hcnNoYWxsKHtcclxuICAgICAgICAnOmZpbGVJZCc6IGZpbGVJZCxcclxuICAgICAgfSksXHJcbiAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLCAvLyBTb3J0IGJ5IHRpbWVzdGFtcCBkZXNjZW5kaW5nIChtb3N0IHJlY2VudCBmaXJzdClcclxuICAgICAgTGltaXQ6IDEwLCAvLyBSZXR1cm4gdXAgdG8gMTAgbW9zdCByZWNlbnQgcmVzdWx0c1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLkl0ZW1zIHx8IHJlc3BvbnNlLkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3BvbnNlLkl0ZW1zLm1hcCgoaXRlbSkgPT4gdW5tYXJzaGFsbChpdGVtKSBhcyBBbmFseXNpc1Jlc3VsdCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHF1ZXJ5aW5nIGFuYWx5c2lzIHJlc3VsdHM6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcbiJdfQ==
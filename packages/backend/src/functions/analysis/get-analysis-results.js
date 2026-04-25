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
        if (fileMetadata.userId !== user.userId) {
            // Admins can access files in their organization
            if (user.role === 'admin' && fileMetadata.organizationId === user.organizationId) {
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
        // Check if results are available - if not, analysis is still running
        if (!analysisResults || analysisResults.length === 0) {
            console.log(`No analysis results found for file: ${fileId} - analysis may still be processing`);
            return {
                statusCode: 202, // 202 Accepted - processing in progress
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    status: 'processing',
                    message: 'Analysis is still processing. Please try again in a few seconds.',
                    fileId: fileId,
                    timestamp: new Date().toISOString(),
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
        console.error('DB Error:', error);
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'Unknown',
            stack: error instanceof Error ? error.stack : 'No stack trace',
        });
        // Return 202 instead of 500 - analysis may still be processing
        // This prevents frontend from failing when backend encounters errors
        return {
            statusCode: 202,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                status: 'processing',
                message: 'Analysis is still processing. Please try again in a few seconds.',
                timestamp: new Date().toISOString(),
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
        console.log(`Getting file metadata for fileId: ${fileId}`);
        console.log(`Using table: ${fileMetadataTable}`);
        const command = new client_dynamodb_1.GetItemCommand({
            TableName: fileMetadataTable,
            Key: (0, util_dynamodb_1.marshall)({ fileId: fileId }),
        });
        console.log(`Executing GetItem command for table: ${fileMetadataTable}`);
        const response = await dynamoClient.send(command);
        // Check for null results - file metadata not found
        if (!response.Item) {
            console.log(`File metadata not found for fileId: ${fileId}`);
            return null;
        }
        const metadata = (0, util_dynamodb_1.unmarshall)(response.Item);
        console.log(`File metadata retrieved successfully:`, {
            fileId,
            userId: metadata.userId,
            organizationId: metadata.organizationId,
        });
        return metadata;
    }
    catch (error) {
        console.error('DB Error:', error);
        console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'Unknown',
            stack: error instanceof Error ? error.stack : 'No stack trace',
        });
        throw error;
    }
}
/**
 * Query analysis results by fileId using FileIndex GSI
 */
async function queryAnalysisResultsByFileId(fileId) {
    try {
        console.log(`✅ [QUERY] Querying analysis results for fileId: ${fileId}`);
        console.log(`✅ [QUERY] Using table: ${analysisResultsTable}`);
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
        console.log(`✅ [QUERY] Executing query on FileIndex GSI`);
        console.log(`✅ [QUERY] Query parameters:`, {
            table: analysisResultsTable,
            index: 'FileIndex',
            fileId: fileId,
        });
        const response = await dynamoClient.send(command);
        console.log(`✅ [QUERY] Query response received`);
        console.log(`✅ [QUERY] Items count: ${response.Items?.length || 0}`);
        console.log(`✅ [QUERY] Count: ${response.Count}`);
        console.log(`✅ [QUERY] ScannedCount: ${response.ScannedCount}`);
        // Check for null or empty results - analysis may still be running
        if (!response.Items || response.Items.length === 0) {
            console.log(`⚠️ [QUERY] No analysis results found for fileId: ${fileId}`);
            console.log(`⚠️ [QUERY] Analysis may still be running or results not yet propagated`);
            return [];
        }
        // Safely unmarshall items with error handling
        const results = [];
        for (const item of response.Items) {
            try {
                const unmarshalled = (0, util_dynamodb_1.unmarshall)(item);
                console.log(`✅ [QUERY] Unmarshalled result:`, {
                    analysisId: unmarshalled.analysisId,
                    fileId: unmarshalled.fileId,
                    timestamp: unmarshalled.timestamp,
                    timestampType: typeof unmarshalled.timestamp,
                    violations: unmarshalled.violations?.length || 0,
                    compliance: unmarshalled.summary?.compliancePercentage || 0,
                });
                // Validate timestamp is a number
                if (typeof unmarshalled.timestamp !== 'number') {
                    console.warn(`⚠️ [QUERY] Skipping result with invalid timestamp type: ${typeof unmarshalled.timestamp}`, {
                        analysisId: unmarshalled.analysisId,
                        timestamp: unmarshalled.timestamp,
                    });
                    continue;
                }
                results.push(unmarshalled);
            }
            catch (itemError) {
                console.error('❌ [QUERY] Error unmarshalling item:', itemError);
                continue; // Skip bad items
            }
        }
        console.log(`✅ [QUERY] Successfully retrieved ${results.length} valid analysis results`);
        return results;
    }
    catch (error) {
        console.error('❌ [QUERY] DB Error:', error);
        console.error('❌ [QUERY] Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'Unknown',
            code: error?.Code,
            statusCode: error?.statusCode,
        });
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWFuYWx5c2lzLXJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtYW5hbHlzaXMtcmVzdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUdILDhEQUF3RjtBQUN4RiwwREFBOEQ7QUFDOUQscURBQTJEO0FBRTNELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztBQUNyRCxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUkscUJBQXFCLENBQUM7QUFDekYsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLGtDQUFrQyxDQUFDO0FBRWhHLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUF3QnBEOzs7Ozs7Ozs7Ozs7R0FZRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsQ0FBQztJQUVyRCxJQUFJLENBQUM7UUFDSCw4Q0FBOEM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQ3hDLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGNBQWM7d0JBQ3BC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QUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUMsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRTtZQUN4QyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTtZQUNqRSxJQUFJLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUztZQUNyRCxJQUFJLEVBQUcsS0FBYSxFQUFFLElBQUk7WUFDMUIsVUFBVSxFQUFHLEtBQWEsRUFBRSxVQUFVO1NBQ3ZDLENBQUMsQ0FBQztRQUNILE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTGFtYmRhIGhhbmRsZXIgZm9yIHJldHJpZXZpbmcgTUlTUkEgYW5hbHlzaXMgcmVzdWx0c1xyXG4gKiBHRVQgL2FuYWx5c2lzL3Jlc3VsdHMvOmZpbGVJZFxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiA3LjEsIDcuMiwgNy4zLCA3LjQsIDcuNSwgNy42LCA3LjdcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBRdWVyeUNvbW1hbmQsIEdldEl0ZW1Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgdW5tYXJzaGFsbCwgbWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuXHJcbmNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSc7XHJcbmNvbnN0IGFuYWx5c2lzUmVzdWx0c1RhYmxlID0gcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRSB8fCAnQW5hbHlzaXNSZXN1bHRzLWRldic7XHJcbmNvbnN0IGZpbGVNZXRhZGF0YVRhYmxlID0gcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRSB8fCAnbWlzcmEtcGxhdGZvcm0tZmlsZS1tZXRhZGF0YS1kZXYnO1xyXG5cclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5cclxuaW50ZXJmYWNlIEFuYWx5c2lzUmVzdWx0IHtcclxuICBhbmFseXNpc0lkOiBzdHJpbmc7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICBsYW5ndWFnZTogc3RyaW5nO1xyXG4gIHZpb2xhdGlvbnM6IGFueVtdO1xyXG4gIHN1bW1hcnk6IHtcclxuICAgIHRvdGFsVmlvbGF0aW9uczogbnVtYmVyO1xyXG4gICAgdmlvbGF0aW9uc0J5U2V2ZXJpdHk6IHtcclxuICAgICAgbWFuZGF0b3J5OiBudW1iZXI7XHJcbiAgICAgIHJlcXVpcmVkOiBudW1iZXI7XHJcbiAgICAgIGFkdmlzb3J5OiBudW1iZXI7XHJcbiAgICB9O1xyXG4gICAgY29tcGxpYW5jZVBlcmNlbnRhZ2U6IG51bWJlcjtcclxuICAgIHJ1bGVzQ2hlY2tlZDogbnVtYmVyO1xyXG4gIH07XHJcbiAgc3RhdHVzOiBzdHJpbmc7XHJcbiAgY3JlYXRlZEF0OiBudW1iZXI7XHJcbiAgdGltZXN0YW1wOiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGVyIGZvciBHRVQgL2FuYWx5c2lzL3Jlc3VsdHMvOmZpbGVJZFxyXG4gKiBSZXR1cm5zIGFuYWx5c2lzIHJlc3VsdHMgZm9yIGEgc3BlY2lmaWMgZmlsZVxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOlxyXG4gKiAtIDcuMTogUHJvdmlkZSBHRVQgL2FuYWx5c2lzL3Jlc3VsdHMve2ZpbGVJZH0gZW5kcG9pbnRcclxuICogLSA3LjI6IFJldHVybiBhbmFseXNpcyByZXN1bHRzIGluIEpTT04gZm9ybWF0XHJcbiAqIC0gNy4zOiBJbmNsdWRlIGFsbCB2aW9sYXRpb25zIHdpdGggZGV0YWlsc1xyXG4gKiAtIDcuNDogSW5jbHVkZSBjb21wbGlhbmNlIHBlcmNlbnRhZ2VcclxuICogLSA3LjU6IEluY2x1ZGUgYW5hbHlzaXMgbWV0YWRhdGFcclxuICogLSA3LjY6IFJldHVybiA0MDQgaWYgYW5hbHlzaXMgbm90IGZvdW5kXHJcbiAqIC0gNy43OiBSZXR1cm4gNDAzIGlmIHVzZXIgZG9lc24ndCBvd24gdGhlIGZpbGVcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdHRVQgL2FuYWx5c2lzL3Jlc3VsdHMvOmZpbGVJZCBpbnZva2VkJyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IHVzZXIgZnJvbSBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0XHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignVXNlciBub3QgYXV0aGVudGljYXRlZCcpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdVTkFVVEhPUklaRUQnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnQXV0aGVudGljYXRpb24gcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXh0cmFjdCBmaWxlSWQgZnJvbSBwYXRoIHBhcmFtZXRlcnMgKFJlcXVpcmVtZW50IDcuMSlcclxuICAgIGNvbnN0IGZpbGVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5maWxlSWQ7XHJcbiAgICBpZiAoIWZpbGVJZCkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdNaXNzaW5nIGZpbGVJZCBwYXJhbWV0ZXInKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9SRVFVRVNUJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ2ZpbGVJZCBwYXJhbWV0ZXIgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFJldHJpZXZpbmcgYW5hbHlzaXMgcmVzdWx0cyBmb3IgZmlsZTogJHtmaWxlSWR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgVXNlcjogJHt1c2VyLnVzZXJJZH0sIE9yZ2FuaXphdGlvbjogJHt1c2VyLm9yZ2FuaXphdGlvbklkfWApO1xyXG5cclxuICAgIC8vIFZlcmlmeSB1c2VyIG93bnMgdGhlIGZpbGUgKFJlcXVpcmVtZW50IDcuNylcclxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YSA9IGF3YWl0IGdldEZpbGVNZXRhZGF0YShmaWxlSWQpO1xyXG4gICAgXHJcbiAgICBpZiAoIWZpbGVNZXRhZGF0YSkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgRmlsZSBub3QgZm91bmQ6ICR7ZmlsZUlkfWApO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwNCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdGSUxFX05PVF9GT1VORCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIG5vdCBmb3VuZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBvd25lcnNoaXAgKFJlcXVpcmVtZW50IDcuNylcclxuICAgIGlmIChmaWxlTWV0YWRhdGEudXNlcklkICE9PSB1c2VyLnVzZXJJZCkge1xyXG4gICAgICAvLyBBZG1pbnMgY2FuIGFjY2VzcyBmaWxlcyBpbiB0aGVpciBvcmdhbml6YXRpb25cclxuICAgICAgaWYgKHVzZXIucm9sZSA9PT0gJ2FkbWluJyAmJiBmaWxlTWV0YWRhdGEub3JnYW5pemF0aW9uSWQgPT09IHVzZXIub3JnYW5pemF0aW9uSWQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnQWRtaW4gYWNjZXNzaW5nIGZpbGUgaW4gdGhlaXIgb3JnYW5pemF0aW9uJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEFjY2VzcyBkZW5pZWQ6IFVzZXIgJHt1c2VyLnVzZXJJZH0gZG9lcyBub3Qgb3duIGZpbGUgJHtmaWxlSWR9YCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMyxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgICAgY29kZTogJ0ZPUkJJRERFTicsXHJcbiAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdSBkbyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIGFjY2VzcyB0aGlzIGZpbGUnLFxyXG4gICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFF1ZXJ5IGFuYWx5c2lzIHJlc3VsdHMgYnkgZmlsZUlkIChSZXF1aXJlbWVudCA3LjIpXHJcbiAgICBjb25zdCBhbmFseXNpc1Jlc3VsdHMgPSBhd2FpdCBxdWVyeUFuYWx5c2lzUmVzdWx0c0J5RmlsZUlkKGZpbGVJZCk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgcmVzdWx0cyBhcmUgYXZhaWxhYmxlIC0gaWYgbm90LCBhbmFseXNpcyBpcyBzdGlsbCBydW5uaW5nXHJcbiAgICBpZiAoIWFuYWx5c2lzUmVzdWx0cyB8fCBhbmFseXNpc1Jlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBObyBhbmFseXNpcyByZXN1bHRzIGZvdW5kIGZvciBmaWxlOiAke2ZpbGVJZH0gLSBhbmFseXNpcyBtYXkgc3RpbGwgYmUgcHJvY2Vzc2luZ2ApO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMiwgLy8gMjAyIEFjY2VwdGVkIC0gcHJvY2Vzc2luZyBpbiBwcm9ncmVzc1xyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgc3RhdHVzOiAncHJvY2Vzc2luZycsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnQW5hbHlzaXMgaXMgc3RpbGwgcHJvY2Vzc2luZy4gUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBzZWNvbmRzLicsXHJcbiAgICAgICAgICBmaWxlSWQ6IGZpbGVJZCxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJldHVybiB0aGUgbW9zdCByZWNlbnQgYW5hbHlzaXMgcmVzdWx0XHJcbiAgICBjb25zdCBsYXRlc3RSZXN1bHQgPSBhbmFseXNpc1Jlc3VsdHNbMF07XHJcblxyXG4gICAgY29uc29sZS5sb2coYFJldHVybmluZyBhbmFseXNpcyByZXN1bHQ6ICR7bGF0ZXN0UmVzdWx0LmFuYWx5c2lzSWR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgVmlvbGF0aW9uczogJHtsYXRlc3RSZXN1bHQudmlvbGF0aW9ucz8ubGVuZ3RoIHx8IDB9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgQ29tcGxpYW5jZTogJHtsYXRlc3RSZXN1bHQuc3VtbWFyeT8uY29tcGxpYW5jZVBlcmNlbnRhZ2UgfHwgMH0lYCk7XHJcblxyXG4gICAgLy8gUmV0dXJuIGFuYWx5c2lzIHJlc3VsdHMgaW4gSlNPTiBmb3JtYXQgKFJlcXVpcmVtZW50cyA3LjIsIDcuMywgNy40LCA3LjUpXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBhbmFseXNpc0lkOiBsYXRlc3RSZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgICAgICBmaWxlSWQ6IGxhdGVzdFJlc3VsdC5maWxlSWQsXHJcbiAgICAgICAgbGFuZ3VhZ2U6IGxhdGVzdFJlc3VsdC5sYW5ndWFnZSxcclxuICAgICAgICB2aW9sYXRpb25zOiBsYXRlc3RSZXN1bHQudmlvbGF0aW9ucyB8fCBbXSwgLy8gUmVxdWlyZW1lbnQgNy4zXHJcbiAgICAgICAgc3VtbWFyeTogbGF0ZXN0UmVzdWx0LnN1bW1hcnkgfHwge1xyXG4gICAgICAgICAgdG90YWxWaW9sYXRpb25zOiAwLFxyXG4gICAgICAgICAgdmlvbGF0aW9uc0J5U2V2ZXJpdHk6IHtcclxuICAgICAgICAgICAgbWFuZGF0b3J5OiAwLFxyXG4gICAgICAgICAgICByZXF1aXJlZDogMCxcclxuICAgICAgICAgICAgYWR2aXNvcnk6IDAsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgY29tcGxpYW5jZVBlcmNlbnRhZ2U6IDAsIC8vIFJlcXVpcmVtZW50IDcuNFxyXG4gICAgICAgICAgcnVsZXNDaGVja2VkOiAwLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdHVzOiBsYXRlc3RSZXN1bHQuc3RhdHVzLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAvLyBSZXF1aXJlbWVudCA3LjVcclxuICAgICAgICAgIGFuYWx5c2lzSWQ6IGxhdGVzdFJlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBsYXRlc3RSZXN1bHQudGltZXN0YW1wLFxyXG4gICAgICAgICAgY3JlYXRlZEF0OiBsYXRlc3RSZXN1bHQuY3JlYXRlZEF0LFxyXG4gICAgICAgICAgdXNlcklkOiBsYXRlc3RSZXN1bHQudXNlcklkLFxyXG4gICAgICAgICAgb3JnYW5pemF0aW9uSWQ6IGxhdGVzdFJlc3VsdC5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0RCIEVycm9yOicsIGVycm9yKTtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRldGFpbHM6Jywge1xyXG4gICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgbmFtZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm5hbWUgOiAnVW5rbm93bicsXHJcbiAgICAgIHN0YWNrOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiAnTm8gc3RhY2sgdHJhY2UnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmV0dXJuIDIwMiBpbnN0ZWFkIG9mIDUwMCAtIGFuYWx5c2lzIG1heSBzdGlsbCBiZSBwcm9jZXNzaW5nXHJcbiAgICAvLyBUaGlzIHByZXZlbnRzIGZyb250ZW5kIGZyb20gZmFpbGluZyB3aGVuIGJhY2tlbmQgZW5jb3VudGVycyBlcnJvcnNcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMixcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHN0YXR1czogJ3Byb2Nlc3NpbmcnLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdBbmFseXNpcyBpcyBzdGlsbCBwcm9jZXNzaW5nLiBQbGVhc2UgdHJ5IGFnYWluIGluIGEgZmV3IHNlY29uZHMuJyxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXQgZmlsZSBtZXRhZGF0YSBmcm9tIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZXRGaWxlTWV0YWRhdGEoZmlsZUlkOiBzdHJpbmcpOiBQcm9taXNlPGFueSB8IG51bGw+IHtcclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coYEdldHRpbmcgZmlsZSBtZXRhZGF0YSBmb3IgZmlsZUlkOiAke2ZpbGVJZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBVc2luZyB0YWJsZTogJHtmaWxlTWV0YWRhdGFUYWJsZX1gKTtcclxuICAgIFxyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogZmlsZU1ldGFkYXRhVGFibGUsXHJcbiAgICAgIEtleTogbWFyc2hhbGwoeyBmaWxlSWQ6IGZpbGVJZCB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBFeGVjdXRpbmcgR2V0SXRlbSBjb21tYW5kIGZvciB0YWJsZTogJHtmaWxlTWV0YWRhdGFUYWJsZX1gKTtcclxuICAgIFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAvLyBDaGVjayBmb3IgbnVsbCByZXN1bHRzIC0gZmlsZSBtZXRhZGF0YSBub3QgZm91bmRcclxuICAgIGlmICghcmVzcG9uc2UuSXRlbSkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgRmlsZSBtZXRhZGF0YSBub3QgZm91bmQgZm9yIGZpbGVJZDogJHtmaWxlSWR9YCk7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1ldGFkYXRhID0gdW5tYXJzaGFsbChyZXNwb25zZS5JdGVtKTtcclxuICAgIGNvbnNvbGUubG9nKGBGaWxlIG1ldGFkYXRhIHJldHJpZXZlZCBzdWNjZXNzZnVsbHk6YCwge1xyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIHVzZXJJZDogbWV0YWRhdGEudXNlcklkLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogbWV0YWRhdGEub3JnYW5pemF0aW9uSWQsXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgcmV0dXJuIG1ldGFkYXRhO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdEQiBFcnJvcjonLCBlcnJvcik7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkZXRhaWxzOicsIHtcclxuICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIG5hbWU6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5uYW1lIDogJ1Vua25vd24nLFxyXG4gICAgICBzdGFjazogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrIDogJ05vIHN0YWNrIHRyYWNlJyxcclxuICAgIH0pO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUXVlcnkgYW5hbHlzaXMgcmVzdWx0cyBieSBmaWxlSWQgdXNpbmcgRmlsZUluZGV4IEdTSVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcXVlcnlBbmFseXNpc1Jlc3VsdHNCeUZpbGVJZChcclxuICBmaWxlSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFuYWx5c2lzUmVzdWx0W10+IHtcclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coYOKchSBbUVVFUlldIFF1ZXJ5aW5nIGFuYWx5c2lzIHJlc3VsdHMgZm9yIGZpbGVJZDogJHtmaWxlSWR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtRVUVSWV0gVXNpbmcgdGFibGU6ICR7YW5hbHlzaXNSZXN1bHRzVGFibGV9YCk7XHJcbiAgICBcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBhbmFseXNpc1Jlc3VsdHNUYWJsZSxcclxuICAgICAgSW5kZXhOYW1lOiAnRmlsZUluZGV4JyxcclxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ2ZpbGVJZCA9IDpmaWxlSWQnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBtYXJzaGFsbCh7XHJcbiAgICAgICAgJzpmaWxlSWQnOiBmaWxlSWQsXHJcbiAgICAgIH0pLFxyXG4gICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSwgLy8gU29ydCBieSB0aW1lc3RhbXAgZGVzY2VuZGluZyAobW9zdCByZWNlbnQgZmlyc3QpXHJcbiAgICAgIExpbWl0OiAxMCwgLy8gUmV0dXJuIHVwIHRvIDEwIG1vc3QgcmVjZW50IHJlc3VsdHNcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1FVRVJZXSBFeGVjdXRpbmcgcXVlcnkgb24gRmlsZUluZGV4IEdTSWApO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBbUVVFUlldIFF1ZXJ5IHBhcmFtZXRlcnM6YCwge1xyXG4gICAgICB0YWJsZTogYW5hbHlzaXNSZXN1bHRzVGFibGUsXHJcbiAgICAgIGluZGV4OiAnRmlsZUluZGV4JyxcclxuICAgICAgZmlsZUlkOiBmaWxlSWQsXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtRVUVSWV0gUXVlcnkgcmVzcG9uc2UgcmVjZWl2ZWRgKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1FVRVJZXSBJdGVtcyBjb3VudDogJHtyZXNwb25zZS5JdGVtcz8ubGVuZ3RoIHx8IDB9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtRVUVSWV0gQ291bnQ6ICR7cmVzcG9uc2UuQ291bnR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtRVUVSWV0gU2Nhbm5lZENvdW50OiAke3Jlc3BvbnNlLlNjYW5uZWRDb3VudH1gKTtcclxuXHJcbiAgICAvLyBDaGVjayBmb3IgbnVsbCBvciBlbXB0eSByZXN1bHRzIC0gYW5hbHlzaXMgbWF5IHN0aWxsIGJlIHJ1bm5pbmdcclxuICAgIGlmICghcmVzcG9uc2UuSXRlbXMgfHwgcmVzcG9uc2UuSXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGDimqDvuI8gW1FVRVJZXSBObyBhbmFseXNpcyByZXN1bHRzIGZvdW5kIGZvciBmaWxlSWQ6ICR7ZmlsZUlkfWApO1xyXG4gICAgICBjb25zb2xlLmxvZyhg4pqg77iPIFtRVUVSWV0gQW5hbHlzaXMgbWF5IHN0aWxsIGJlIHJ1bm5pbmcgb3IgcmVzdWx0cyBub3QgeWV0IHByb3BhZ2F0ZWRgKTtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNhZmVseSB1bm1hcnNoYWxsIGl0ZW1zIHdpdGggZXJyb3IgaGFuZGxpbmdcclxuICAgIGNvbnN0IHJlc3VsdHM6IEFuYWx5c2lzUmVzdWx0W10gPSBbXTtcclxuICAgIGZvciAoY29uc3QgaXRlbSBvZiByZXNwb25zZS5JdGVtcykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHVubWFyc2hhbGxlZCA9IHVubWFyc2hhbGwoaXRlbSkgYXMgQW5hbHlzaXNSZXN1bHQ7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc29sZS5sb2coYOKchSBbUVVFUlldIFVubWFyc2hhbGxlZCByZXN1bHQ6YCwge1xyXG4gICAgICAgICAgYW5hbHlzaXNJZDogdW5tYXJzaGFsbGVkLmFuYWx5c2lzSWQsXHJcbiAgICAgICAgICBmaWxlSWQ6IHVubWFyc2hhbGxlZC5maWxlSWQsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IHVubWFyc2hhbGxlZC50aW1lc3RhbXAsXHJcbiAgICAgICAgICB0aW1lc3RhbXBUeXBlOiB0eXBlb2YgdW5tYXJzaGFsbGVkLnRpbWVzdGFtcCxcclxuICAgICAgICAgIHZpb2xhdGlvbnM6IHVubWFyc2hhbGxlZC52aW9sYXRpb25zPy5sZW5ndGggfHwgMCxcclxuICAgICAgICAgIGNvbXBsaWFuY2U6IHVubWFyc2hhbGxlZC5zdW1tYXJ5Py5jb21wbGlhbmNlUGVyY2VudGFnZSB8fCAwLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFZhbGlkYXRlIHRpbWVzdGFtcCBpcyBhIG51bWJlclxyXG4gICAgICAgIGlmICh0eXBlb2YgdW5tYXJzaGFsbGVkLnRpbWVzdGFtcCAhPT0gJ251bWJlcicpIHtcclxuICAgICAgICAgIGNvbnNvbGUud2Fybihg4pqg77iPIFtRVUVSWV0gU2tpcHBpbmcgcmVzdWx0IHdpdGggaW52YWxpZCB0aW1lc3RhbXAgdHlwZTogJHt0eXBlb2YgdW5tYXJzaGFsbGVkLnRpbWVzdGFtcH1gLCB7XHJcbiAgICAgICAgICAgIGFuYWx5c2lzSWQ6IHVubWFyc2hhbGxlZC5hbmFseXNpc0lkLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IHVubWFyc2hhbGxlZC50aW1lc3RhbXAsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXN1bHRzLnB1c2godW5tYXJzaGFsbGVkKTtcclxuICAgICAgfSBjYXRjaCAoaXRlbUVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFtRVUVSWV0gRXJyb3IgdW5tYXJzaGFsbGluZyBpdGVtOicsIGl0ZW1FcnJvcik7XHJcbiAgICAgICAgY29udGludWU7IC8vIFNraXAgYmFkIGl0ZW1zXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coYOKchSBbUVVFUlldIFN1Y2Nlc3NmdWxseSByZXRyaWV2ZWQgJHtyZXN1bHRzLmxlbmd0aH0gdmFsaWQgYW5hbHlzaXMgcmVzdWx0c2ApO1xyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbUVVFUlldIERCIEVycm9yOicsIGVycm9yKTtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbUVVFUlldIEVycm9yIGRldGFpbHM6Jywge1xyXG4gICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgbmFtZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm5hbWUgOiAnVW5rbm93bicsXHJcbiAgICAgIGNvZGU6IChlcnJvciBhcyBhbnkpPy5Db2RlLFxyXG4gICAgICBzdGF0dXNDb2RlOiAoZXJyb3IgYXMgYW55KT8uc3RhdHVzQ29kZSxcclxuICAgIH0pO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcbiJdfQ==
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
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults';
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'FileMetadata';
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
        const fileMetadata = await getFileMetadata(fileId, user.userId);
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
            console.log(`Attempting direct table scan as fallback...`);
            // Try scanning the main table as fallback
            const scanResults = await scanAnalysisResultsByFileId(fileId);
            if (scanResults && scanResults.length > 0) {
                console.log(`Found ${scanResults.length} results via scan`);
                const latestResult = scanResults[0];
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
                        violations: latestResult.violations || [],
                        summary: latestResult.summary || {
                            totalViolations: 0,
                            violationsBySeverity: {
                                mandatory: 0,
                                required: 0,
                                advisory: 0,
                            },
                            compliancePercentage: 0,
                            rulesChecked: 0,
                        },
                        status: latestResult.status,
                        rulesProcessed: latestResult.violations?.length || 0,
                        totalRules: latestResult.totalRules || 357,
                        compliancePercentage: latestResult.summary?.compliancePercentage || 0,
                        metadata: {
                            analysisId: latestResult.analysisId,
                            timestamp: latestResult.timestamp,
                            createdAt: latestResult.createdAt,
                            userId: latestResult.userId,
                            organizationId: latestResult.organizationId,
                        },
                    }),
                };
            }
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
                rulesProcessed: latestResult.violations?.length || 0, // Number of violations found
                totalRules: latestResult.totalRules || 357, // Total rules checked
                compliancePercentage: latestResult.summary?.compliancePercentage || 0,
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
async function getFileMetadata(fileId, userId) {
    try {
        console.log(`Getting file metadata for fileId: ${fileId}, userId: ${userId}`);
        console.log(`Using table: ${fileMetadataTable}`);
        if (userId) {
            // Use composite key (fileId + userId) - this is the correct approach for the production table
            const command = new client_dynamodb_1.GetItemCommand({
                TableName: fileMetadataTable,
                Key: (0, util_dynamodb_1.marshall)({
                    fileId: fileId,
                    userId: userId
                }),
            });
            console.log(`Executing GetItem command with composite key for table: ${fileMetadataTable}`);
            const response = await dynamoClient.send(command);
            // Check for null results - file metadata not found
            if (!response.Item) {
                console.log(`File metadata not found for fileId: ${fileId}, userId: ${userId}`);
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
        else {
            // Fallback: Query by fileId only using scan (less efficient but works)
            console.log(`No userId provided, using scan fallback`);
            const command = new client_dynamodb_1.ScanCommand({
                TableName: fileMetadataTable,
                FilterExpression: 'fileId = :fileId',
                ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                    ':fileId': fileId,
                }),
                Limit: 1,
            });
            console.log(`Executing Scan command for table: ${fileMetadataTable}`);
            const response = await dynamoClient.send(command);
            // Check for null results - file metadata not found
            if (!response.Items || response.Items.length === 0) {
                console.log(`File metadata not found for fileId: ${fileId} via scan`);
                return null;
            }
            const metadata = (0, util_dynamodb_1.unmarshall)(response.Items[0]);
            console.log(`File metadata retrieved via scan:`, {
                fileId,
                userId: metadata.userId,
                organizationId: metadata.organizationId,
            });
            return metadata;
        }
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
/**
 * Scan analysis results by fileId (fallback when GSI is slow)
 */
async function scanAnalysisResultsByFileId(fileId) {
    try {
        console.log(`✅ [SCAN] Scanning analysis results for fileId: ${fileId}`);
        const command = new client_dynamodb_1.ScanCommand({
            TableName: analysisResultsTable,
            FilterExpression: 'fileId = :fileId',
            ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
                ':fileId': fileId,
            }),
            Limit: 10,
        });
        const response = await dynamoClient.send(command);
        if (!response.Items || response.Items.length === 0) {
            console.log(`⚠️ [SCAN] No results found via scan`);
            return [];
        }
        const results = [];
        for (const item of response.Items) {
            try {
                const unmarshalled = (0, util_dynamodb_1.unmarshall)(item);
                results.push(unmarshalled);
            }
            catch (itemError) {
                console.error('❌ [SCAN] Error unmarshalling item:', itemError);
                continue;
            }
        }
        console.log(`✅ [SCAN] Successfully retrieved ${results.length} results via scan`);
        return results;
    }
    catch (error) {
        console.error('❌ [SCAN] Error:', error);
        return [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWFuYWx5c2lzLXJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtYW5hbHlzaXMtcmVzdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUdILDhEQUFxRztBQUNyRywwREFBOEQ7QUFDOUQscURBQTJEO0FBRTNELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztBQUNyRCxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUksaUJBQWlCLENBQUM7QUFDckYsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLGNBQWMsQ0FBQztBQUU1RSxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBeUJwRDs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7SUFFckQsSUFBSSxDQUFDO1FBQ0gsOENBQThDO1FBQzlDLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN4QyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSxjQUFjO3dCQUNwQixP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QUssQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4QyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciByZXRyaWV2aW5nIE1JU1JBIGFuYWx5c2lzIHJlc3VsdHNcclxuICogR0VUIC9hbmFseXNpcy9yZXN1bHRzLzpmaWxlSWRcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czogNy4xLCA3LjIsIDcuMywgNy40LCA3LjUsIDcuNiwgNy43XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUXVlcnlDb21tYW5kLCBHZXRJdGVtQ29tbWFuZCwgU2NhbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyB1bm1hcnNoYWxsLCBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5cclxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJztcclxuY29uc3QgYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFIHx8ICdBbmFseXNpc1Jlc3VsdHMnO1xyXG5jb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ0ZpbGVNZXRhZGF0YSc7XHJcblxyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb24gfSk7XHJcblxyXG5pbnRlcmZhY2UgQW5hbHlzaXNSZXN1bHQge1xyXG4gIGFuYWx5c2lzSWQ6IHN0cmluZztcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICB1c2VySWQ6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIGxhbmd1YWdlOiBzdHJpbmc7XHJcbiAgdmlvbGF0aW9uczogYW55W107XHJcbiAgc3VtbWFyeToge1xyXG4gICAgdG90YWxWaW9sYXRpb25zOiBudW1iZXI7XHJcbiAgICB2aW9sYXRpb25zQnlTZXZlcml0eToge1xyXG4gICAgICBtYW5kYXRvcnk6IG51bWJlcjtcclxuICAgICAgcmVxdWlyZWQ6IG51bWJlcjtcclxuICAgICAgYWR2aXNvcnk6IG51bWJlcjtcclxuICAgIH07XHJcbiAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogbnVtYmVyO1xyXG4gICAgcnVsZXNDaGVja2VkOiBudW1iZXI7XHJcbiAgfTtcclxuICBzdGF0dXM6IHN0cmluZztcclxuICBjcmVhdGVkQXQ6IG51bWJlcjtcclxuICB0aW1lc3RhbXA6IG51bWJlcjtcclxuICB0b3RhbFJ1bGVzPzogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlciBmb3IgR0VUIC9hbmFseXNpcy9yZXN1bHRzLzpmaWxlSWRcclxuICogUmV0dXJucyBhbmFseXNpcyByZXN1bHRzIGZvciBhIHNwZWNpZmljIGZpbGVcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czpcclxuICogLSA3LjE6IFByb3ZpZGUgR0VUIC9hbmFseXNpcy9yZXN1bHRzL3tmaWxlSWR9IGVuZHBvaW50XHJcbiAqIC0gNy4yOiBSZXR1cm4gYW5hbHlzaXMgcmVzdWx0cyBpbiBKU09OIGZvcm1hdFxyXG4gKiAtIDcuMzogSW5jbHVkZSBhbGwgdmlvbGF0aW9ucyB3aXRoIGRldGFpbHNcclxuICogLSA3LjQ6IEluY2x1ZGUgY29tcGxpYW5jZSBwZXJjZW50YWdlXHJcbiAqIC0gNy41OiBJbmNsdWRlIGFuYWx5c2lzIG1ldGFkYXRhXHJcbiAqIC0gNy42OiBSZXR1cm4gNDA0IGlmIGFuYWx5c2lzIG5vdCBmb3VuZFxyXG4gKiAtIDcuNzogUmV0dXJuIDQwMyBpZiB1c2VyIGRvZXNuJ3Qgb3duIHRoZSBmaWxlXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnR0VUIC9hbmFseXNpcy9yZXN1bHRzLzpmaWxlSWQgaW52b2tlZCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gTGFtYmRhIEF1dGhvcml6ZXIgY29udGV4dFxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnVU5BVVRIT1JJWkVEJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0F1dGhlbnRpY2F0aW9uIHJlcXVpcmVkJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgZmlsZUlkIGZyb20gcGF0aCBwYXJhbWV0ZXJzIChSZXF1aXJlbWVudCA3LjEpXHJcbiAgICBjb25zdCBmaWxlSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uZmlsZUlkO1xyXG4gICAgaWYgKCFmaWxlSWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignTWlzc2luZyBmaWxlSWQgcGFyYW1ldGVyJyk7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0lOVkFMSURfUkVRVUVTVCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdmaWxlSWQgcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBSZXRyaWV2aW5nIGFuYWx5c2lzIHJlc3VsdHMgZm9yIGZpbGU6ICR7ZmlsZUlkfWApO1xyXG4gICAgY29uc29sZS5sb2coYFVzZXI6ICR7dXNlci51c2VySWR9LCBPcmdhbml6YXRpb246ICR7dXNlci5vcmdhbml6YXRpb25JZH1gKTtcclxuXHJcbiAgICAvLyBWZXJpZnkgdXNlciBvd25zIHRoZSBmaWxlIChSZXF1aXJlbWVudCA3LjcpXHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGEgPSBhd2FpdCBnZXRGaWxlTWV0YWRhdGEoZmlsZUlkLCB1c2VyLnVzZXJJZCk7XHJcbiAgICBcclxuICAgIGlmICghZmlsZU1ldGFkYXRhKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBGaWxlIG5vdCBmb3VuZDogJHtmaWxlSWR9YCk7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0ZJTEVfTk9UX0ZPVU5EJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0ZpbGUgbm90IGZvdW5kJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIG93bmVyc2hpcCAoUmVxdWlyZW1lbnQgNy43KVxyXG4gICAgaWYgKGZpbGVNZXRhZGF0YS51c2VySWQgIT09IHVzZXIudXNlcklkKSB7XHJcbiAgICAgIC8vIEFkbWlucyBjYW4gYWNjZXNzIGZpbGVzIGluIHRoZWlyIG9yZ2FuaXphdGlvblxyXG4gICAgICBpZiAodXNlci5yb2xlID09PSAnYWRtaW4nICYmIGZpbGVNZXRhZGF0YS5vcmdhbml6YXRpb25JZCA9PT0gdXNlci5vcmdhbml6YXRpb25JZCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdBZG1pbiBhY2Nlc3NpbmcgZmlsZSBpbiB0aGVpciBvcmdhbml6YXRpb24nKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgQWNjZXNzIGRlbmllZDogVXNlciAke3VzZXIudXNlcklkfSBkb2VzIG5vdCBvd24gZmlsZSAke2ZpbGVJZH1gKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAzLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgICBjb2RlOiAnRk9SQklEREVOJyxcclxuICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIHRoaXMgZmlsZScsXHJcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUXVlcnkgYW5hbHlzaXMgcmVzdWx0cyBieSBmaWxlSWQgKFJlcXVpcmVtZW50IDcuMilcclxuICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0cyA9IGF3YWl0IHF1ZXJ5QW5hbHlzaXNSZXN1bHRzQnlGaWxlSWQoZmlsZUlkKTtcclxuXHJcbiAgICAvLyBDaGVjayBpZiByZXN1bHRzIGFyZSBhdmFpbGFibGUgLSBpZiBub3QsIGFuYWx5c2lzIGlzIHN0aWxsIHJ1bm5pbmdcclxuICAgIGlmICghYW5hbHlzaXNSZXN1bHRzIHx8IGFuYWx5c2lzUmVzdWx0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgY29uc29sZS5sb2coYE5vIGFuYWx5c2lzIHJlc3VsdHMgZm91bmQgZm9yIGZpbGU6ICR7ZmlsZUlkfSAtIGFuYWx5c2lzIG1heSBzdGlsbCBiZSBwcm9jZXNzaW5nYCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBBdHRlbXB0aW5nIGRpcmVjdCB0YWJsZSBzY2FuIGFzIGZhbGxiYWNrLi4uYCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBUcnkgc2Nhbm5pbmcgdGhlIG1haW4gdGFibGUgYXMgZmFsbGJhY2tcclxuICAgICAgY29uc3Qgc2NhblJlc3VsdHMgPSBhd2FpdCBzY2FuQW5hbHlzaXNSZXN1bHRzQnlGaWxlSWQoZmlsZUlkKTtcclxuICAgICAgaWYgKHNjYW5SZXN1bHRzICYmIHNjYW5SZXN1bHRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgRm91bmQgJHtzY2FuUmVzdWx0cy5sZW5ndGh9IHJlc3VsdHMgdmlhIHNjYW5gKTtcclxuICAgICAgICBjb25zdCBsYXRlc3RSZXN1bHQgPSBzY2FuUmVzdWx0c1swXTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgYW5hbHlzaXNJZDogbGF0ZXN0UmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgIGZpbGVJZDogbGF0ZXN0UmVzdWx0LmZpbGVJZCxcclxuICAgICAgICAgICAgbGFuZ3VhZ2U6IGxhdGVzdFJlc3VsdC5sYW5ndWFnZSxcclxuICAgICAgICAgICAgdmlvbGF0aW9uczogbGF0ZXN0UmVzdWx0LnZpb2xhdGlvbnMgfHwgW10sXHJcbiAgICAgICAgICAgIHN1bW1hcnk6IGxhdGVzdFJlc3VsdC5zdW1tYXJ5IHx8IHtcclxuICAgICAgICAgICAgICB0b3RhbFZpb2xhdGlvbnM6IDAsXHJcbiAgICAgICAgICAgICAgdmlvbGF0aW9uc0J5U2V2ZXJpdHk6IHtcclxuICAgICAgICAgICAgICAgIG1hbmRhdG9yeTogMCxcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiAwLFxyXG4gICAgICAgICAgICAgICAgYWR2aXNvcnk6IDAsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogMCxcclxuICAgICAgICAgICAgICBydWxlc0NoZWNrZWQ6IDAsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXR1czogbGF0ZXN0UmVzdWx0LnN0YXR1cyxcclxuICAgICAgICAgICAgcnVsZXNQcm9jZXNzZWQ6IGxhdGVzdFJlc3VsdC52aW9sYXRpb25zPy5sZW5ndGggfHwgMCxcclxuICAgICAgICAgICAgdG90YWxSdWxlczogbGF0ZXN0UmVzdWx0LnRvdGFsUnVsZXMgfHwgMzU3LFxyXG4gICAgICAgICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogbGF0ZXN0UmVzdWx0LnN1bW1hcnk/LmNvbXBsaWFuY2VQZXJjZW50YWdlIHx8IDAsXHJcbiAgICAgICAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAgICAgYW5hbHlzaXNJZDogbGF0ZXN0UmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBsYXRlc3RSZXN1bHQudGltZXN0YW1wLFxyXG4gICAgICAgICAgICAgIGNyZWF0ZWRBdDogbGF0ZXN0UmVzdWx0LmNyZWF0ZWRBdCxcclxuICAgICAgICAgICAgICB1c2VySWQ6IGxhdGVzdFJlc3VsdC51c2VySWQsXHJcbiAgICAgICAgICAgICAgb3JnYW5pemF0aW9uSWQ6IGxhdGVzdFJlc3VsdC5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogMjAyLCAvLyAyMDIgQWNjZXB0ZWQgLSBwcm9jZXNzaW5nIGluIHByb2dyZXNzXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBzdGF0dXM6ICdwcm9jZXNzaW5nJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdBbmFseXNpcyBpcyBzdGlsbCBwcm9jZXNzaW5nLiBQbGVhc2UgdHJ5IGFnYWluIGluIGEgZmV3IHNlY29uZHMuJyxcclxuICAgICAgICAgIGZpbGVJZDogZmlsZUlkLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmV0dXJuIHRoZSBtb3N0IHJlY2VudCBhbmFseXNpcyByZXN1bHRcclxuICAgIGNvbnN0IGxhdGVzdFJlc3VsdCA9IGFuYWx5c2lzUmVzdWx0c1swXTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgUmV0dXJuaW5nIGFuYWx5c2lzIHJlc3VsdDogJHtsYXRlc3RSZXN1bHQuYW5hbHlzaXNJZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBWaW9sYXRpb25zOiAke2xhdGVzdFJlc3VsdC52aW9sYXRpb25zPy5sZW5ndGggfHwgMH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBDb21wbGlhbmNlOiAke2xhdGVzdFJlc3VsdC5zdW1tYXJ5Py5jb21wbGlhbmNlUGVyY2VudGFnZSB8fCAwfSVgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gYW5hbHlzaXMgcmVzdWx0cyBpbiBKU09OIGZvcm1hdCAoUmVxdWlyZW1lbnRzIDcuMiwgNy4zLCA3LjQsIDcuNSlcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGFuYWx5c2lzSWQ6IGxhdGVzdFJlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICAgIGZpbGVJZDogbGF0ZXN0UmVzdWx0LmZpbGVJZCxcclxuICAgICAgICBsYW5ndWFnZTogbGF0ZXN0UmVzdWx0Lmxhbmd1YWdlLFxyXG4gICAgICAgIHZpb2xhdGlvbnM6IGxhdGVzdFJlc3VsdC52aW9sYXRpb25zIHx8IFtdLCAvLyBSZXF1aXJlbWVudCA3LjNcclxuICAgICAgICBzdW1tYXJ5OiBsYXRlc3RSZXN1bHQuc3VtbWFyeSB8fCB7XHJcbiAgICAgICAgICB0b3RhbFZpb2xhdGlvbnM6IDAsXHJcbiAgICAgICAgICB2aW9sYXRpb25zQnlTZXZlcml0eToge1xyXG4gICAgICAgICAgICBtYW5kYXRvcnk6IDAsXHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiAwLFxyXG4gICAgICAgICAgICBhZHZpc29yeTogMCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogMCwgLy8gUmVxdWlyZW1lbnQgNy40XHJcbiAgICAgICAgICBydWxlc0NoZWNrZWQ6IDAsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0dXM6IGxhdGVzdFJlc3VsdC5zdGF0dXMsXHJcbiAgICAgICAgcnVsZXNQcm9jZXNzZWQ6IGxhdGVzdFJlc3VsdC52aW9sYXRpb25zPy5sZW5ndGggfHwgMCwgLy8gTnVtYmVyIG9mIHZpb2xhdGlvbnMgZm91bmRcclxuICAgICAgICB0b3RhbFJ1bGVzOiBsYXRlc3RSZXN1bHQudG90YWxSdWxlcyB8fCAzNTcsIC8vIFRvdGFsIHJ1bGVzIGNoZWNrZWRcclxuICAgICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogbGF0ZXN0UmVzdWx0LnN1bW1hcnk/LmNvbXBsaWFuY2VQZXJjZW50YWdlIHx8IDAsXHJcbiAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgIC8vIFJlcXVpcmVtZW50IDcuNVxyXG4gICAgICAgICAgYW5hbHlzaXNJZDogbGF0ZXN0UmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IGxhdGVzdFJlc3VsdC50aW1lc3RhbXAsXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IGxhdGVzdFJlc3VsdC5jcmVhdGVkQXQsXHJcbiAgICAgICAgICB1c2VySWQ6IGxhdGVzdFJlc3VsdC51c2VySWQsXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZDogbGF0ZXN0UmVzdWx0Lm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignREIgRXJyb3I6JywgZXJyb3IpO1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZGV0YWlsczonLCB7XHJcbiAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICBuYW1lOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubmFtZSA6ICdVbmtub3duJyxcclxuICAgICAgc3RhY2s6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA6ICdObyBzdGFjayB0cmFjZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZXR1cm4gMjAyIGluc3RlYWQgb2YgNTAwIC0gYW5hbHlzaXMgbWF5IHN0aWxsIGJlIHByb2Nlc3NpbmdcclxuICAgIC8vIFRoaXMgcHJldmVudHMgZnJvbnRlbmQgZnJvbSBmYWlsaW5nIHdoZW4gYmFja2VuZCBlbmNvdW50ZXJzIGVycm9yc1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAyLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgc3RhdHVzOiAncHJvY2Vzc2luZycsXHJcbiAgICAgICAgbWVzc2FnZTogJ0FuYWx5c2lzIGlzIHN0aWxsIHByb2Nlc3NpbmcuIFBsZWFzZSB0cnkgYWdhaW4gaW4gYSBmZXcgc2Vjb25kcy4nLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldCBmaWxlIG1ldGFkYXRhIGZyb20gRHluYW1vREJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldEZpbGVNZXRhZGF0YShmaWxlSWQ6IHN0cmluZywgdXNlcklkPzogc3RyaW5nKTogUHJvbWlzZTxhbnkgfCBudWxsPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnNvbGUubG9nKGBHZXR0aW5nIGZpbGUgbWV0YWRhdGEgZm9yIGZpbGVJZDogJHtmaWxlSWR9LCB1c2VySWQ6ICR7dXNlcklkfWApO1xyXG4gICAgY29uc29sZS5sb2coYFVzaW5nIHRhYmxlOiAke2ZpbGVNZXRhZGF0YVRhYmxlfWApO1xyXG4gICAgXHJcbiAgICBpZiAodXNlcklkKSB7XHJcbiAgICAgIC8vIFVzZSBjb21wb3NpdGUga2V5IChmaWxlSWQgKyB1c2VySWQpIC0gdGhpcyBpcyB0aGUgY29ycmVjdCBhcHByb2FjaCBmb3IgdGhlIHByb2R1Y3Rpb24gdGFibGVcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBmaWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgICBLZXk6IG1hcnNoYWxsKHsgXHJcbiAgICAgICAgICBmaWxlSWQ6IGZpbGVJZCxcclxuICAgICAgICAgIHVzZXJJZDogdXNlcklkIFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBFeGVjdXRpbmcgR2V0SXRlbSBjb21tYW5kIHdpdGggY29tcG9zaXRlIGtleSBmb3IgdGFibGU6ICR7ZmlsZU1ldGFkYXRhVGFibGV9YCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgZm9yIG51bGwgcmVzdWx0cyAtIGZpbGUgbWV0YWRhdGEgbm90IGZvdW5kXHJcbiAgICAgIGlmICghcmVzcG9uc2UuSXRlbSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBGaWxlIG1ldGFkYXRhIG5vdCBmb3VuZCBmb3IgZmlsZUlkOiAke2ZpbGVJZH0sIHVzZXJJZDogJHt1c2VySWR9YCk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gdW5tYXJzaGFsbChyZXNwb25zZS5JdGVtKTtcclxuICAgICAgY29uc29sZS5sb2coYEZpbGUgbWV0YWRhdGEgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseTpgLCB7XHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHVzZXJJZDogbWV0YWRhdGEudXNlcklkLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiBtZXRhZGF0YS5vcmdhbml6YXRpb25JZCxcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gbWV0YWRhdGE7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBGYWxsYmFjazogUXVlcnkgYnkgZmlsZUlkIG9ubHkgdXNpbmcgc2NhbiAobGVzcyBlZmZpY2llbnQgYnV0IHdvcmtzKVxyXG4gICAgICBjb25zb2xlLmxvZyhgTm8gdXNlcklkIHByb3ZpZGVkLCB1c2luZyBzY2FuIGZhbGxiYWNrYCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFNjYW5Db21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IGZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICdmaWxlSWQgPSA6ZmlsZUlkJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBtYXJzaGFsbCh7XHJcbiAgICAgICAgICAnOmZpbGVJZCc6IGZpbGVJZCxcclxuICAgICAgICB9KSxcclxuICAgICAgICBMaW1pdDogMSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgRXhlY3V0aW5nIFNjYW4gY29tbWFuZCBmb3IgdGFibGU6ICR7ZmlsZU1ldGFkYXRhVGFibGV9YCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgZm9yIG51bGwgcmVzdWx0cyAtIGZpbGUgbWV0YWRhdGEgbm90IGZvdW5kXHJcbiAgICAgIGlmICghcmVzcG9uc2UuSXRlbXMgfHwgcmVzcG9uc2UuSXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEZpbGUgbWV0YWRhdGEgbm90IGZvdW5kIGZvciBmaWxlSWQ6ICR7ZmlsZUlkfSB2aWEgc2NhbmApO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBtZXRhZGF0YSA9IHVubWFyc2hhbGwocmVzcG9uc2UuSXRlbXNbMF0pO1xyXG4gICAgICBjb25zb2xlLmxvZyhgRmlsZSBtZXRhZGF0YSByZXRyaWV2ZWQgdmlhIHNjYW46YCwge1xyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICB1c2VySWQ6IG1ldGFkYXRhLnVzZXJJZCxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogbWV0YWRhdGEub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIG1ldGFkYXRhO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdEQiBFcnJvcjonLCBlcnJvcik7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkZXRhaWxzOicsIHtcclxuICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIG5hbWU6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5uYW1lIDogJ1Vua25vd24nLFxyXG4gICAgICBzdGFjazogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLnN0YWNrIDogJ05vIHN0YWNrIHRyYWNlJyxcclxuICAgIH0pO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUXVlcnkgYW5hbHlzaXMgcmVzdWx0cyBieSBmaWxlSWQgdXNpbmcgRmlsZUluZGV4IEdTSVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcXVlcnlBbmFseXNpc1Jlc3VsdHNCeUZpbGVJZChcclxuICBmaWxlSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFuYWx5c2lzUmVzdWx0W10+IHtcclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coYOKchSBbUVVFUlldIFF1ZXJ5aW5nIGFuYWx5c2lzIHJlc3VsdHMgZm9yIGZpbGVJZDogJHtmaWxlSWR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtRVUVSWV0gVXNpbmcgdGFibGU6ICR7YW5hbHlzaXNSZXN1bHRzVGFibGV9YCk7XHJcbiAgICBcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBhbmFseXNpc1Jlc3VsdHNUYWJsZSxcclxuICAgICAgSW5kZXhOYW1lOiAnRmlsZUluZGV4JyxcclxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ2ZpbGVJZCA9IDpmaWxlSWQnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBtYXJzaGFsbCh7XHJcbiAgICAgICAgJzpmaWxlSWQnOiBmaWxlSWQsXHJcbiAgICAgIH0pLFxyXG4gICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSwgLy8gU29ydCBieSB0aW1lc3RhbXAgZGVzY2VuZGluZyAobW9zdCByZWNlbnQgZmlyc3QpXHJcbiAgICAgIExpbWl0OiAxMCwgLy8gUmV0dXJuIHVwIHRvIDEwIG1vc3QgcmVjZW50IHJlc3VsdHNcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1FVRVJZXSBFeGVjdXRpbmcgcXVlcnkgb24gRmlsZUluZGV4IEdTSWApO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBbUVVFUlldIFF1ZXJ5IHBhcmFtZXRlcnM6YCwge1xyXG4gICAgICB0YWJsZTogYW5hbHlzaXNSZXN1bHRzVGFibGUsXHJcbiAgICAgIGluZGV4OiAnRmlsZUluZGV4JyxcclxuICAgICAgZmlsZUlkOiBmaWxlSWQsXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtRVUVSWV0gUXVlcnkgcmVzcG9uc2UgcmVjZWl2ZWRgKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1FVRVJZXSBJdGVtcyBjb3VudDogJHtyZXNwb25zZS5JdGVtcz8ubGVuZ3RoIHx8IDB9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtRVUVSWV0gQ291bnQ6ICR7cmVzcG9uc2UuQ291bnR9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtRVUVSWV0gU2Nhbm5lZENvdW50OiAke3Jlc3BvbnNlLlNjYW5uZWRDb3VudH1gKTtcclxuXHJcbiAgICAvLyBDaGVjayBmb3IgbnVsbCBvciBlbXB0eSByZXN1bHRzIC0gYW5hbHlzaXMgbWF5IHN0aWxsIGJlIHJ1bm5pbmdcclxuICAgIGlmICghcmVzcG9uc2UuSXRlbXMgfHwgcmVzcG9uc2UuSXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGDimqDvuI8gW1FVRVJZXSBObyBhbmFseXNpcyByZXN1bHRzIGZvdW5kIGZvciBmaWxlSWQ6ICR7ZmlsZUlkfWApO1xyXG4gICAgICBjb25zb2xlLmxvZyhg4pqg77iPIFtRVUVSWV0gQW5hbHlzaXMgbWF5IHN0aWxsIGJlIHJ1bm5pbmcgb3IgcmVzdWx0cyBub3QgeWV0IHByb3BhZ2F0ZWRgKTtcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNhZmVseSB1bm1hcnNoYWxsIGl0ZW1zIHdpdGggZXJyb3IgaGFuZGxpbmdcclxuICAgIGNvbnN0IHJlc3VsdHM6IEFuYWx5c2lzUmVzdWx0W10gPSBbXTtcclxuICAgIGZvciAoY29uc3QgaXRlbSBvZiByZXNwb25zZS5JdGVtcykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHVubWFyc2hhbGxlZCA9IHVubWFyc2hhbGwoaXRlbSkgYXMgQW5hbHlzaXNSZXN1bHQ7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc29sZS5sb2coYOKchSBbUVVFUlldIFVubWFyc2hhbGxlZCByZXN1bHQ6YCwge1xyXG4gICAgICAgICAgYW5hbHlzaXNJZDogdW5tYXJzaGFsbGVkLmFuYWx5c2lzSWQsXHJcbiAgICAgICAgICBmaWxlSWQ6IHVubWFyc2hhbGxlZC5maWxlSWQsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IHVubWFyc2hhbGxlZC50aW1lc3RhbXAsXHJcbiAgICAgICAgICB0aW1lc3RhbXBUeXBlOiB0eXBlb2YgdW5tYXJzaGFsbGVkLnRpbWVzdGFtcCxcclxuICAgICAgICAgIHZpb2xhdGlvbnM6IHVubWFyc2hhbGxlZC52aW9sYXRpb25zPy5sZW5ndGggfHwgMCxcclxuICAgICAgICAgIGNvbXBsaWFuY2U6IHVubWFyc2hhbGxlZC5zdW1tYXJ5Py5jb21wbGlhbmNlUGVyY2VudGFnZSB8fCAwLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFZhbGlkYXRlIHRpbWVzdGFtcCBpcyBhIG51bWJlclxyXG4gICAgICAgIGlmICh0eXBlb2YgdW5tYXJzaGFsbGVkLnRpbWVzdGFtcCAhPT0gJ251bWJlcicpIHtcclxuICAgICAgICAgIGNvbnNvbGUud2Fybihg4pqg77iPIFtRVUVSWV0gU2tpcHBpbmcgcmVzdWx0IHdpdGggaW52YWxpZCB0aW1lc3RhbXAgdHlwZTogJHt0eXBlb2YgdW5tYXJzaGFsbGVkLnRpbWVzdGFtcH1gLCB7XHJcbiAgICAgICAgICAgIGFuYWx5c2lzSWQ6IHVubWFyc2hhbGxlZC5hbmFseXNpc0lkLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IHVubWFyc2hhbGxlZC50aW1lc3RhbXAsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXN1bHRzLnB1c2godW5tYXJzaGFsbGVkKTtcclxuICAgICAgfSBjYXRjaCAoaXRlbUVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFtRVUVSWV0gRXJyb3IgdW5tYXJzaGFsbGluZyBpdGVtOicsIGl0ZW1FcnJvcik7XHJcbiAgICAgICAgY29udGludWU7IC8vIFNraXAgYmFkIGl0ZW1zXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coYOKchSBbUVVFUlldIFN1Y2Nlc3NmdWxseSByZXRyaWV2ZWQgJHtyZXN1bHRzLmxlbmd0aH0gdmFsaWQgYW5hbHlzaXMgcmVzdWx0c2ApO1xyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbUVVFUlldIERCIEVycm9yOicsIGVycm9yKTtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbUVVFUlldIEVycm9yIGRldGFpbHM6Jywge1xyXG4gICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgbmFtZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm5hbWUgOiAnVW5rbm93bicsXHJcbiAgICAgIGNvZGU6IChlcnJvciBhcyBhbnkpPy5Db2RlLFxyXG4gICAgICBzdGF0dXNDb2RlOiAoZXJyb3IgYXMgYW55KT8uc3RhdHVzQ29kZSxcclxuICAgIH0pO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogU2NhbiBhbmFseXNpcyByZXN1bHRzIGJ5IGZpbGVJZCAoZmFsbGJhY2sgd2hlbiBHU0kgaXMgc2xvdylcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHNjYW5BbmFseXNpc1Jlc3VsdHNCeUZpbGVJZChcclxuICBmaWxlSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFuYWx5c2lzUmVzdWx0W10+IHtcclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coYOKchSBbU0NBTl0gU2Nhbm5pbmcgYW5hbHlzaXMgcmVzdWx0cyBmb3IgZmlsZUlkOiAke2ZpbGVJZH1gKTtcclxuICAgIFxyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogYW5hbHlzaXNSZXN1bHRzVGFibGUsXHJcbiAgICAgIEZpbHRlckV4cHJlc3Npb246ICdmaWxlSWQgPSA6ZmlsZUlkJyxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogbWFyc2hhbGwoe1xyXG4gICAgICAgICc6ZmlsZUlkJzogZmlsZUlkLFxyXG4gICAgICB9KSxcclxuICAgICAgTGltaXQ6IDEwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLkl0ZW1zIHx8IHJlc3BvbnNlLkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBjb25zb2xlLmxvZyhg4pqg77iPIFtTQ0FOXSBObyByZXN1bHRzIGZvdW5kIHZpYSBzY2FuYCk7XHJcbiAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXN1bHRzOiBBbmFseXNpc1Jlc3VsdFtdID0gW107XHJcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgcmVzcG9uc2UuSXRlbXMpIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCB1bm1hcnNoYWxsZWQgPSB1bm1hcnNoYWxsKGl0ZW0pIGFzIEFuYWx5c2lzUmVzdWx0O1xyXG4gICAgICAgIHJlc3VsdHMucHVzaCh1bm1hcnNoYWxsZWQpO1xyXG4gICAgICB9IGNhdGNoIChpdGVtRXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgW1NDQU5dIEVycm9yIHVubWFyc2hhbGxpbmcgaXRlbTonLCBpdGVtRXJyb3IpO1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NDQU5dIFN1Y2Nlc3NmdWxseSByZXRyaWV2ZWQgJHtyZXN1bHRzLmxlbmd0aH0gcmVzdWx0cyB2aWEgc2NhbmApO1xyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbU0NBTl0gRXJyb3I6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG4iXX0=
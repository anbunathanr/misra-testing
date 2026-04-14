"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const auth_util_1 = require("../../utils/auth-util");
const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
    };
    try {
        console.log('[UPLOAD-PROGRESS] Getting upload progress');
        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: '',
            };
        }
        // Extract user from Lambda Authorizer context
        const user = (0, auth_util_1.getUserFromContext)(event);
        if (!user.userId) {
            console.warn('[UPLOAD-PROGRESS] ✗ Unauthorized: No user in context');
            return errorResponse(401, 'UNAUTHORIZED', 'User not authenticated');
        }
        // Extract fileId from path parameters
        const fileId = event.pathParameters?.fileId;
        if (!fileId) {
            console.error('[UPLOAD-PROGRESS] ✗ Missing fileId parameter');
            return errorResponse(400, 'MISSING_FILE_ID', 'fileId parameter is required');
        }
        console.log(`[UPLOAD-PROGRESS] Getting progress for file: ${fileId}, user: ${user.userId}`);
        // Get upload progress from DynamoDB
        const progressData = await getUploadProgress(fileId);
        if (!progressData) {
            console.log(`[UPLOAD-PROGRESS] ✗ Upload progress not found: ${fileId}`);
            return errorResponse(404, 'PROGRESS_NOT_FOUND', 'Upload progress not found');
        }
        // Verify user owns the upload
        if (progressData.user_id !== user.userId) {
            // Admins can access uploads in their organization
            if (user.role !== 'admin') {
                console.log(`[UPLOAD-PROGRESS] ✗ Access denied: User ${user.userId} does not own upload ${fileId}`);
                return errorResponse(403, 'FORBIDDEN', 'You do not have permission to access this upload');
            }
        }
        console.log(`[UPLOAD-PROGRESS] ✓ Progress retrieved: ${progressData.progress_percentage}% - ${progressData.status}`);
        // Calculate estimated time remaining based on progress
        const estimatedTimeRemaining = calculateEstimatedTimeRemaining(progressData);
        // Return progress information
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                fileId: progressData.file_id,
                fileName: progressData.file_name,
                fileSize: progressData.file_size,
                progress: {
                    percentage: progressData.progress_percentage,
                    status: progressData.status,
                    message: progressData.message,
                    estimatedTimeRemaining,
                },
                timestamps: {
                    createdAt: progressData.created_at,
                    updatedAt: progressData.updated_at,
                },
                error: progressData.error_message ? {
                    message: progressData.error_message,
                } : undefined,
            }),
        };
    }
    catch (error) {
        console.error('[UPLOAD-PROGRESS] ✗ Error getting upload progress:', error);
        return errorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve upload progress');
    }
};
exports.handler = handler;
/**
 * Get upload progress from DynamoDB
 */
async function getUploadProgress(fileId) {
    const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
    const progressTable = process.env.UPLOAD_PROGRESS_TABLE || 'UploadProgress';
    try {
        const command = new client_dynamodb_1.GetItemCommand({
            TableName: progressTable,
            Key: (0, util_dynamodb_1.marshall)({ file_id: fileId }),
        });
        const response = await dynamoClient.send(command);
        if (!response.Item) {
            return null;
        }
        return (0, util_dynamodb_1.unmarshall)(response.Item);
    }
    catch (error) {
        console.error('[UPLOAD-PROGRESS] Error querying DynamoDB:', error);
        throw error;
    }
}
/**
 * Calculate estimated time remaining based on progress
 */
function calculateEstimatedTimeRemaining(progressData) {
    const now = Date.now();
    const elapsedTime = now - progressData.created_at;
    const progressPercentage = progressData.progress_percentage;
    // If upload is complete or failed, no time remaining
    if (progressData.status === 'completed' || progressData.status === 'failed') {
        return 0;
    }
    // If no progress yet, estimate based on file size
    if (progressPercentage <= 0) {
        // Estimate 1 second per MB for small files, longer for larger files
        const fileSizeMB = progressData.file_size / (1024 * 1024);
        return Math.max(5, Math.min(60, fileSizeMB * 2)); // Between 5-60 seconds
    }
    // Calculate based on current progress rate
    const progressRate = progressPercentage / elapsedTime; // percentage per millisecond
    const remainingPercentage = 100 - progressPercentage;
    const estimatedRemainingTime = remainingPercentage / progressRate;
    // Convert to seconds and cap at reasonable limits
    const estimatedSeconds = Math.round(estimatedRemainingTime / 1000);
    return Math.max(0, Math.min(300, estimatedSeconds)); // Cap at 5 minutes
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXVwbG9hZC1wcm9ncmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC11cGxvYWQtcHJvZ3Jlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsOERBQTBFO0FBQzFFLDBEQUE4RDtBQUM5RCxxREFBMkQ7QUEwQnBELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sT0FBTyxHQUFHO1FBQ2QsY0FBYyxFQUFFLGtCQUFrQjtRQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1FBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtRQUM1RCw4QkFBOEIsRUFBRSxhQUFhO0tBQzlDLENBQUM7SUFFRixJQUFJLENBQUM7UUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7UUFFekQsNEJBQTRCO1FBQzVCLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuQyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU87Z0JBQ1AsSUFBSSxFQUFFLEVBQUU7YUFDVCxDQUFDO1FBQ0osQ0FBQztRQUVELDhDQUE4QztRQUM5QyxNQUFNLElBQUksR0FBRyxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO1lBQ3JFLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsc0NBQXNDO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBQzVDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsOENBQThDLENBQUMsQ0FBQztZQUM5RCxPQUFP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QXVCO0lBQzNFLENBQUM7SUFFRCwyQ0FBMkM7SUFDM0MsTUFBTSxZQUFZLEdBQUcsa0JBQWtCLEdBQUcsV0FBVyxDQUFDLENBQUMsNkJBQTZCO0lBQ3BGLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxHQUFHLGtCQUFrQixDQUFDO0lBQ3JELE1BQU0sc0JBQXNCLEdBQUcsbUJBQW1CLEdBQUcsWUFBWSxDQUFDO0lBRWxFLGtEQUFrRDtJQUNsRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDbkUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUI7QUFDMUUsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlO0lBRWYsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUU7WUFDUCxjQUFjLEVBQUUsa0JBQWtCO1lBQ2xDLDZCQUE2QixFQUFFLEdBQUc7WUFDbEMsOEJBQThCLEVBQUUsNEJBQTRCO1NBQzdEO1FBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzthQUNuRDtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIEdldEl0ZW1Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgdW5tYXJzaGFsbCwgbWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgZnVuY3Rpb24gZm9yIG1vbml0b3JpbmcgZmlsZSB1cGxvYWQgcHJvZ3Jlc3NcclxuICogVGFzayA0LjI6IEJ1aWxkIGZpbGUgdXBsb2FkIHByb2dyZXNzIG1vbml0b3JpbmdcclxuICogXHJcbiAqIEZlYXR1cmVzOlxyXG4gKiAtIFJlYWwtdGltZSB1cGxvYWQgcHJvZ3Jlc3MgcGVyY2VudGFnZSBkaXNwbGF5XHJcbiAqIC0gVXBsb2FkIHN0YXR1cyB0cmFja2luZyAoc3RhcnRpbmcsIHVwbG9hZGluZywgY29tcGxldGVkLCBmYWlsZWQpXHJcbiAqIC0gRXJyb3IgaGFuZGxpbmcgZm9yIHVwbG9hZCBmYWlsdXJlc1xyXG4gKiAtIFVzZXIgYXV0aG9yaXphdGlvbiBhbmQgYWNjZXNzIGNvbnRyb2xcclxuICovXHJcblxyXG5pbnRlcmZhY2UgVXBsb2FkUHJvZ3Jlc3Mge1xyXG4gIGZpbGVfaWQ6IHN0cmluZztcclxuICB1c2VyX2lkOiBzdHJpbmc7XHJcbiAgZmlsZV9uYW1lOiBzdHJpbmc7XHJcbiAgZmlsZV9zaXplOiBudW1iZXI7XHJcbiAgcHJvZ3Jlc3NfcGVyY2VudGFnZTogbnVtYmVyO1xyXG4gIHN0YXR1czogJ3N0YXJ0aW5nJyB8ICd1cGxvYWRpbmcnIHwgJ2NvbXBsZXRlZCcgfCAnZmFpbGVkJztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgY3JlYXRlZF9hdDogbnVtYmVyO1xyXG4gIHVwZGF0ZWRfYXQ6IG51bWJlcjtcclxuICBlcnJvcl9tZXNzYWdlPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGhlYWRlcnMgPSB7XHJcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ0dFVCxPUFRJT05TJyxcclxuICB9O1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coJ1tVUExPQUQtUFJPR1JFU1NdIEdldHRpbmcgdXBsb2FkIHByb2dyZXNzJyk7XHJcblxyXG4gICAgLy8gSGFuZGxlIHByZWZsaWdodCByZXF1ZXN0c1xyXG4gICAgaWYgKGV2ZW50Lmh0dHBNZXRob2QgPT09ICdPUFRJT05TJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6ICcnLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHRcclxuICAgIGNvbnN0IHVzZXIgPSBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgaWYgKCF1c2VyLnVzZXJJZCkge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ1tVUExPQUQtUFJPR1JFU1NdIOKclyBVbmF1dGhvcml6ZWQ6IE5vIHVzZXIgaW4gY29udGV4dCcpO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdVTkFVVEhPUklaRUQnLCAnVXNlciBub3QgYXV0aGVudGljYXRlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgZmlsZUlkIGZyb20gcGF0aCBwYXJhbWV0ZXJzXHJcbiAgICBjb25zdCBmaWxlSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uZmlsZUlkO1xyXG4gICAgaWYgKCFmaWxlSWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW1VQTE9BRC1QUk9HUkVTU10g4pyXIE1pc3NpbmcgZmlsZUlkIHBhcmFtZXRlcicpO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0ZJTEVfSUQnLCAnZmlsZUlkIHBhcmFtZXRlciBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbVVBMT0FELVBST0dSRVNTXSBHZXR0aW5nIHByb2dyZXNzIGZvciBmaWxlOiAke2ZpbGVJZH0sIHVzZXI6ICR7dXNlci51c2VySWR9YCk7XHJcblxyXG4gICAgLy8gR2V0IHVwbG9hZCBwcm9ncmVzcyBmcm9tIER5bmFtb0RCXHJcbiAgICBjb25zdCBwcm9ncmVzc0RhdGEgPSBhd2FpdCBnZXRVcGxvYWRQcm9ncmVzcyhmaWxlSWQpO1xyXG5cclxuICAgIGlmICghcHJvZ3Jlc3NEYXRhKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbVVBMT0FELVBST0dSRVNTXSDinJcgVXBsb2FkIHByb2dyZXNzIG5vdCBmb3VuZDogJHtmaWxlSWR9YCk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwNCwgJ1BST0dSRVNTX05PVF9GT1VORCcsICdVcGxvYWQgcHJvZ3Jlc3Mgbm90IGZvdW5kJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmVyaWZ5IHVzZXIgb3ducyB0aGUgdXBsb2FkXHJcbiAgICBpZiAocHJvZ3Jlc3NEYXRhLnVzZXJfaWQgIT09IHVzZXIudXNlcklkKSB7XHJcbiAgICAgIC8vIEFkbWlucyBjYW4gYWNjZXNzIHVwbG9hZHMgaW4gdGhlaXIgb3JnYW5pemF0aW9uXHJcbiAgICAgIGlmICh1c2VyLnJvbGUgIT09ICdhZG1pbicpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW1VQTE9BRC1QUk9HUkVTU10g4pyXIEFjY2VzcyBkZW5pZWQ6IFVzZXIgJHt1c2VyLnVzZXJJZH0gZG9lcyBub3Qgb3duIHVwbG9hZCAke2ZpbGVJZH1gKTtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDMsICdGT1JCSURERU4nLCAnWW91IGRvIG5vdCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIHRoaXMgdXBsb2FkJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW1VQTE9BRC1QUk9HUkVTU10g4pyTIFByb2dyZXNzIHJldHJpZXZlZDogJHtwcm9ncmVzc0RhdGEucHJvZ3Jlc3NfcGVyY2VudGFnZX0lIC0gJHtwcm9ncmVzc0RhdGEuc3RhdHVzfWApO1xyXG5cclxuICAgIC8vIENhbGN1bGF0ZSBlc3RpbWF0ZWQgdGltZSByZW1haW5pbmcgYmFzZWQgb24gcHJvZ3Jlc3NcclxuICAgIGNvbnN0IGVzdGltYXRlZFRpbWVSZW1haW5pbmcgPSBjYWxjdWxhdGVFc3RpbWF0ZWRUaW1lUmVtYWluaW5nKHByb2dyZXNzRGF0YSk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHByb2dyZXNzIGluZm9ybWF0aW9uXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGZpbGVJZDogcHJvZ3Jlc3NEYXRhLmZpbGVfaWQsXHJcbiAgICAgICAgZmlsZU5hbWU6IHByb2dyZXNzRGF0YS5maWxlX25hbWUsXHJcbiAgICAgICAgZmlsZVNpemU6IHByb2dyZXNzRGF0YS5maWxlX3NpemUsXHJcbiAgICAgICAgcHJvZ3Jlc3M6IHtcclxuICAgICAgICAgIHBlcmNlbnRhZ2U6IHByb2dyZXNzRGF0YS5wcm9ncmVzc19wZXJjZW50YWdlLFxyXG4gICAgICAgICAgc3RhdHVzOiBwcm9ncmVzc0RhdGEuc3RhdHVzLFxyXG4gICAgICAgICAgbWVzc2FnZTogcHJvZ3Jlc3NEYXRhLm1lc3NhZ2UsXHJcbiAgICAgICAgICBlc3RpbWF0ZWRUaW1lUmVtYWluaW5nLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGltZXN0YW1wczoge1xyXG4gICAgICAgICAgY3JlYXRlZEF0OiBwcm9ncmVzc0RhdGEuY3JlYXRlZF9hdCxcclxuICAgICAgICAgIHVwZGF0ZWRBdDogcHJvZ3Jlc3NEYXRhLnVwZGF0ZWRfYXQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjogcHJvZ3Jlc3NEYXRhLmVycm9yX21lc3NhZ2UgPyB7XHJcbiAgICAgICAgICBtZXNzYWdlOiBwcm9ncmVzc0RhdGEuZXJyb3JfbWVzc2FnZSxcclxuICAgICAgICB9IDogdW5kZWZpbmVkLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tVUExPQUQtUFJPR1JFU1NdIOKclyBFcnJvciBnZXR0aW5nIHVwbG9hZCBwcm9ncmVzczonLCBlcnJvcik7XHJcbiAgICBcclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0lOVEVSTkFMX0VSUk9SJywgJ0ZhaWxlZCB0byByZXRyaWV2ZSB1cGxvYWQgcHJvZ3Jlc3MnKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0IHVwbG9hZCBwcm9ncmVzcyBmcm9tIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBnZXRVcGxvYWRQcm9ncmVzcyhmaWxlSWQ6IHN0cmluZyk6IFByb21pc2U8VXBsb2FkUHJvZ3Jlc3MgfCBudWxsPiB7XHJcbiAgY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcclxuICBjb25zdCBwcm9ncmVzc1RhYmxlID0gcHJvY2Vzcy5lbnYuVVBMT0FEX1BST0dSRVNTX1RBQkxFIHx8ICdVcGxvYWRQcm9ncmVzcyc7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldEl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBwcm9ncmVzc1RhYmxlLFxyXG4gICAgICBLZXk6IG1hcnNoYWxsKHsgZmlsZV9pZDogZmlsZUlkIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLkl0ZW0pIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHVubWFyc2hhbGwocmVzcG9uc2UuSXRlbSkgYXMgVXBsb2FkUHJvZ3Jlc3M7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tVUExPQUQtUFJPR1JFU1NdIEVycm9yIHF1ZXJ5aW5nIER5bmFtb0RCOicsIGVycm9yKTtcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBlc3RpbWF0ZWQgdGltZSByZW1haW5pbmcgYmFzZWQgb24gcHJvZ3Jlc3NcclxuICovXHJcbmZ1bmN0aW9uIGNhbGN1bGF0ZUVzdGltYXRlZFRpbWVSZW1haW5pbmcocHJvZ3Jlc3NEYXRhOiBVcGxvYWRQcm9ncmVzcyk6IG51bWJlciB7XHJcbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuICBjb25zdCBlbGFwc2VkVGltZSA9IG5vdyAtIHByb2dyZXNzRGF0YS5jcmVhdGVkX2F0O1xyXG4gIGNvbnN0IHByb2dyZXNzUGVyY2VudGFnZSA9IHByb2dyZXNzRGF0YS5wcm9ncmVzc19wZXJjZW50YWdlO1xyXG5cclxuICAvLyBJZiB1cGxvYWQgaXMgY29tcGxldGUgb3IgZmFpbGVkLCBubyB0aW1lIHJlbWFpbmluZ1xyXG4gIGlmIChwcm9ncmVzc0RhdGEuc3RhdHVzID09PSAnY29tcGxldGVkJyB8fCBwcm9ncmVzc0RhdGEuc3RhdHVzID09PSAnZmFpbGVkJykge1xyXG4gICAgcmV0dXJuIDA7XHJcbiAgfVxyXG5cclxuICAvLyBJZiBubyBwcm9ncmVzcyB5ZXQsIGVzdGltYXRlIGJhc2VkIG9uIGZpbGUgc2l6ZVxyXG4gIGlmIChwcm9ncmVzc1BlcmNlbnRhZ2UgPD0gMCkge1xyXG4gICAgLy8gRXN0aW1hdGUgMSBzZWNvbmQgcGVyIE1CIGZvciBzbWFsbCBmaWxlcywgbG9uZ2VyIGZvciBsYXJnZXIgZmlsZXNcclxuICAgIGNvbnN0IGZpbGVTaXplTUIgPSBwcm9ncmVzc0RhdGEuZmlsZV9zaXplIC8gKDEwMjQgKiAxMDI0KTtcclxuICAgIHJldHVybiBNYXRoLm1heCg1LCBNYXRoLm1pbig2MCwgZmlsZVNpemVNQiAqIDIpKTsgLy8gQmV0d2VlbiA1LTYwIHNlY29uZHNcclxuICB9XHJcblxyXG4gIC8vIENhbGN1bGF0ZSBiYXNlZCBvbiBjdXJyZW50IHByb2dyZXNzIHJhdGVcclxuICBjb25zdCBwcm9ncmVzc1JhdGUgPSBwcm9ncmVzc1BlcmNlbnRhZ2UgLyBlbGFwc2VkVGltZTsgLy8gcGVyY2VudGFnZSBwZXIgbWlsbGlzZWNvbmRcclxuICBjb25zdCByZW1haW5pbmdQZXJjZW50YWdlID0gMTAwIC0gcHJvZ3Jlc3NQZXJjZW50YWdlO1xyXG4gIGNvbnN0IGVzdGltYXRlZFJlbWFpbmluZ1RpbWUgPSByZW1haW5pbmdQZXJjZW50YWdlIC8gcHJvZ3Jlc3NSYXRlO1xyXG5cclxuICAvLyBDb252ZXJ0IHRvIHNlY29uZHMgYW5kIGNhcCBhdCByZWFzb25hYmxlIGxpbWl0c1xyXG4gIGNvbnN0IGVzdGltYXRlZFNlY29uZHMgPSBNYXRoLnJvdW5kKGVzdGltYXRlZFJlbWFpbmluZ1RpbWUgLyAxMDAwKTtcclxuICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5taW4oMzAwLCBlc3RpbWF0ZWRTZWNvbmRzKSk7IC8vIENhcCBhdCA1IG1pbnV0ZXNcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlIGVycm9yIHJlc3BvbnNlXHJcbiAqL1xyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIH07XHJcbn0iXX0=
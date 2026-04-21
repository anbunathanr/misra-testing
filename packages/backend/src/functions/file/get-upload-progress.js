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
        const user = await (0, auth_util_1.getUserFromContext)(event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXVwbG9hZC1wcm9ncmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC11cGxvYWQtcHJvZ3Jlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsOERBQTBFO0FBQzFFLDBEQUE4RDtBQUM5RCxxREFBMkQ7QUEwQnBELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sT0FBTyxHQUFHO1FBQ2QsY0FBYyxFQUFFLGtCQUFrQjtRQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1FBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtRQUM1RCw4QkFBOEIsRUFBRSxhQUFhO0tBQzlDLENBQUM7SUFFRixJQUFJLENBQUM7UUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7UUFFekQsNEJBQTRCO1FBQzVCLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuQyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU87Z0JBQ1AsSUFBSSxFQUFFLEVBQUU7YUFDVCxDQUFDO1FBQ0osQ0FBQztRQUVELDhDQUE4QztRQUM5QyxNQUFNLElBQUksR0FBRyxNQUFNLElBQUEsOEJBQWtCLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLHNEQUFzRCxDQUFDLENBQUM7WUFDckUsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxzQ0FBc0M7UUFDdEMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7UUFDNUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO1lBQzlE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Qyx1QkFBdUI7SUFDM0UsQ0FBQztJQUVELDJDQUEyQztJQUMzQyxNQUFNLFlBQVksR0FBRyxrQkFBa0IsR0FBRyxXQUFXLENBQUMsQ0FBQyw2QkFBNkI7SUFDcEYsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLEdBQUcsa0JBQWtCLENBQUM7SUFDckQsTUFBTSxzQkFBc0IsR0FBRyxtQkFBbUIsR0FBRyxZQUFZLENBQUM7SUFFbEUsa0RBQWtEO0lBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNuRSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtBQUMxRSxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGFBQWEsQ0FDcEIsVUFBa0IsRUFDbEIsSUFBWSxFQUNaLE9BQWU7SUFFZixPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRTtZQUNQLGNBQWMsRUFBRSxrQkFBa0I7WUFDbEMsNkJBQTZCLEVBQUUsR0FBRztZQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7U0FDN0Q7UUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgR2V0SXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyB1bm1hcnNoYWxsLCBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBmdW5jdGlvbiBmb3IgbW9uaXRvcmluZyBmaWxlIHVwbG9hZCBwcm9ncmVzc1xyXG4gKiBUYXNrIDQuMjogQnVpbGQgZmlsZSB1cGxvYWQgcHJvZ3Jlc3MgbW9uaXRvcmluZ1xyXG4gKiBcclxuICogRmVhdHVyZXM6XHJcbiAqIC0gUmVhbC10aW1lIHVwbG9hZCBwcm9ncmVzcyBwZXJjZW50YWdlIGRpc3BsYXlcclxuICogLSBVcGxvYWQgc3RhdHVzIHRyYWNraW5nIChzdGFydGluZywgdXBsb2FkaW5nLCBjb21wbGV0ZWQsIGZhaWxlZClcclxuICogLSBFcnJvciBoYW5kbGluZyBmb3IgdXBsb2FkIGZhaWx1cmVzXHJcbiAqIC0gVXNlciBhdXRob3JpemF0aW9uIGFuZCBhY2Nlc3MgY29udHJvbFxyXG4gKi9cclxuXHJcbmludGVyZmFjZSBVcGxvYWRQcm9ncmVzcyB7XHJcbiAgZmlsZV9pZDogc3RyaW5nO1xyXG4gIHVzZXJfaWQ6IHN0cmluZztcclxuICBmaWxlX25hbWU6IHN0cmluZztcclxuICBmaWxlX3NpemU6IG51bWJlcjtcclxuICBwcm9ncmVzc19wZXJjZW50YWdlOiBudW1iZXI7XHJcbiAgc3RhdHVzOiAnc3RhcnRpbmcnIHwgJ3VwbG9hZGluZycgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBjcmVhdGVkX2F0OiBudW1iZXI7XHJcbiAgdXBkYXRlZF9hdDogbnVtYmVyO1xyXG4gIGVycm9yX21lc3NhZ2U/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgaGVhZGVycyA9IHtcclxuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnR0VULE9QVElPTlMnLFxyXG4gIH07XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zb2xlLmxvZygnW1VQTE9BRC1QUk9HUkVTU10gR2V0dGluZyB1cGxvYWQgcHJvZ3Jlc3MnKTtcclxuXHJcbiAgICAvLyBIYW5kbGUgcHJlZmxpZ2h0IHJlcXVlc3RzXHJcbiAgICBpZiAoZXZlbnQuaHR0cE1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogJycsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gTGFtYmRhIEF1dGhvcml6ZXIgY29udGV4dFxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignW1VQTE9BRC1QUk9HUkVTU10g4pyXIFVuYXV0aG9yaXplZDogTm8gdXNlciBpbiBjb250ZXh0Jyk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ1VOQVVUSE9SSVpFRCcsICdVc2VyIG5vdCBhdXRoZW50aWNhdGVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXh0cmFjdCBmaWxlSWQgZnJvbSBwYXRoIHBhcmFtZXRlcnNcclxuICAgIGNvbnN0IGZpbGVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5maWxlSWQ7XHJcbiAgICBpZiAoIWZpbGVJZCkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbVVBMT0FELVBST0dSRVNTXSDinJcgTWlzc2luZyBmaWxlSWQgcGFyYW1ldGVyJyk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRklMRV9JRCcsICdmaWxlSWQgcGFyYW1ldGVyIGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtVUExPQUQtUFJPR1JFU1NdIEdldHRpbmcgcHJvZ3Jlc3MgZm9yIGZpbGU6ICR7ZmlsZUlkfSwgdXNlcjogJHt1c2VyLnVzZXJJZH1gKTtcclxuXHJcbiAgICAvLyBHZXQgdXBsb2FkIHByb2dyZXNzIGZyb20gRHluYW1vREJcclxuICAgIGNvbnN0IHByb2dyZXNzRGF0YSA9IGF3YWl0IGdldFVwbG9hZFByb2dyZXNzKGZpbGVJZCk7XHJcblxyXG4gICAgaWYgKCFwcm9ncmVzc0RhdGEpIHtcclxuICAgICAgY29uc29sZS5sb2coYFtVUExPQUQtUFJPR1JFU1NdIOKclyBVcGxvYWQgcHJvZ3Jlc3Mgbm90IGZvdW5kOiAke2ZpbGVJZH1gKTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDA0LCAnUFJPR1JFU1NfTk9UX0ZPVU5EJywgJ1VwbG9hZCBwcm9ncmVzcyBub3QgZm91bmQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWZXJpZnkgdXNlciBvd25zIHRoZSB1cGxvYWRcclxuICAgIGlmIChwcm9ncmVzc0RhdGEudXNlcl9pZCAhPT0gdXNlci51c2VySWQpIHtcclxuICAgICAgLy8gQWRtaW5zIGNhbiBhY2Nlc3MgdXBsb2FkcyBpbiB0aGVpciBvcmdhbml6YXRpb25cclxuICAgICAgaWYgKHVzZXIucm9sZSAhPT0gJ2FkbWluJykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbVVBMT0FELVBST0dSRVNTXSDinJcgQWNjZXNzIGRlbmllZDogVXNlciAke3VzZXIudXNlcklkfSBkb2VzIG5vdCBvd24gdXBsb2FkICR7ZmlsZUlkfWApO1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMywgJ0ZPUkJJRERFTicsICdZb3UgZG8gbm90IGhhdmUgcGVybWlzc2lvbiB0byBhY2Nlc3MgdGhpcyB1cGxvYWQnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbVVBMT0FELVBST0dSRVNTXSDinJMgUHJvZ3Jlc3MgcmV0cmlldmVkOiAke3Byb2dyZXNzRGF0YS5wcm9ncmVzc19wZXJjZW50YWdlfSUgLSAke3Byb2dyZXNzRGF0YS5zdGF0dXN9YCk7XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIGVzdGltYXRlZCB0aW1lIHJlbWFpbmluZyBiYXNlZCBvbiBwcm9ncmVzc1xyXG4gICAgY29uc3QgZXN0aW1hdGVkVGltZVJlbWFpbmluZyA9IGNhbGN1bGF0ZUVzdGltYXRlZFRpbWVSZW1haW5pbmcocHJvZ3Jlc3NEYXRhKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gcHJvZ3Jlc3MgaW5mb3JtYXRpb25cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgZmlsZUlkOiBwcm9ncmVzc0RhdGEuZmlsZV9pZCxcclxuICAgICAgICBmaWxlTmFtZTogcHJvZ3Jlc3NEYXRhLmZpbGVfbmFtZSxcclxuICAgICAgICBmaWxlU2l6ZTogcHJvZ3Jlc3NEYXRhLmZpbGVfc2l6ZSxcclxuICAgICAgICBwcm9ncmVzczoge1xyXG4gICAgICAgICAgcGVyY2VudGFnZTogcHJvZ3Jlc3NEYXRhLnByb2dyZXNzX3BlcmNlbnRhZ2UsXHJcbiAgICAgICAgICBzdGF0dXM6IHByb2dyZXNzRGF0YS5zdGF0dXMsXHJcbiAgICAgICAgICBtZXNzYWdlOiBwcm9ncmVzc0RhdGEubWVzc2FnZSxcclxuICAgICAgICAgIGVzdGltYXRlZFRpbWVSZW1haW5pbmcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0aW1lc3RhbXBzOiB7XHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IHByb2dyZXNzRGF0YS5jcmVhdGVkX2F0LFxyXG4gICAgICAgICAgdXBkYXRlZEF0OiBwcm9ncmVzc0RhdGEudXBkYXRlZF9hdCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBwcm9ncmVzc0RhdGEuZXJyb3JfbWVzc2FnZSA/IHtcclxuICAgICAgICAgIG1lc3NhZ2U6IHByb2dyZXNzRGF0YS5lcnJvcl9tZXNzYWdlLFxyXG4gICAgICAgIH0gOiB1bmRlZmluZWQsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignW1VQTE9BRC1QUk9HUkVTU10g4pyXIEVycm9yIGdldHRpbmcgdXBsb2FkIHByb2dyZXNzOicsIGVycm9yKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnSU5URVJOQUxfRVJST1InLCAnRmFpbGVkIHRvIHJldHJpZXZlIHVwbG9hZCBwcm9ncmVzcycpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXQgdXBsb2FkIHByb2dyZXNzIGZyb20gRHluYW1vREJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGdldFVwbG9hZFByb2dyZXNzKGZpbGVJZDogc3RyaW5nKTogUHJvbWlzZTxVcGxvYWRQcm9ncmVzcyB8IG51bGw+IHtcclxuICBjb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xyXG4gIGNvbnN0IHByb2dyZXNzVGFibGUgPSBwcm9jZXNzLmVudi5VUExPQURfUFJPR1JFU1NfVEFCTEUgfHwgJ1VwbG9hZFByb2dyZXNzJztcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0SXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IHByb2dyZXNzVGFibGUsXHJcbiAgICAgIEtleTogbWFyc2hhbGwoeyBmaWxlX2lkOiBmaWxlSWQgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgIGlmICghcmVzcG9uc2UuSXRlbSkge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdW5tYXJzaGFsbChyZXNwb25zZS5JdGVtKSBhcyBVcGxvYWRQcm9ncmVzcztcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignW1VQTE9BRC1QUk9HUkVTU10gRXJyb3IgcXVlcnlpbmcgRHluYW1vREI6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlIGVzdGltYXRlZCB0aW1lIHJlbWFpbmluZyBiYXNlZCBvbiBwcm9ncmVzc1xyXG4gKi9cclxuZnVuY3Rpb24gY2FsY3VsYXRlRXN0aW1hdGVkVGltZVJlbWFpbmluZyhwcm9ncmVzc0RhdGE6IFVwbG9hZFByb2dyZXNzKTogbnVtYmVyIHtcclxuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gIGNvbnN0IGVsYXBzZWRUaW1lID0gbm93IC0gcHJvZ3Jlc3NEYXRhLmNyZWF0ZWRfYXQ7XHJcbiAgY29uc3QgcHJvZ3Jlc3NQZXJjZW50YWdlID0gcHJvZ3Jlc3NEYXRhLnByb2dyZXNzX3BlcmNlbnRhZ2U7XHJcblxyXG4gIC8vIElmIHVwbG9hZCBpcyBjb21wbGV0ZSBvciBmYWlsZWQsIG5vIHRpbWUgcmVtYWluaW5nXHJcbiAgaWYgKHByb2dyZXNzRGF0YS5zdGF0dXMgPT09ICdjb21wbGV0ZWQnIHx8IHByb2dyZXNzRGF0YS5zdGF0dXMgPT09ICdmYWlsZWQnKSB7XHJcbiAgICByZXR1cm4gMDtcclxuICB9XHJcblxyXG4gIC8vIElmIG5vIHByb2dyZXNzIHlldCwgZXN0aW1hdGUgYmFzZWQgb24gZmlsZSBzaXplXHJcbiAgaWYgKHByb2dyZXNzUGVyY2VudGFnZSA8PSAwKSB7XHJcbiAgICAvLyBFc3RpbWF0ZSAxIHNlY29uZCBwZXIgTUIgZm9yIHNtYWxsIGZpbGVzLCBsb25nZXIgZm9yIGxhcmdlciBmaWxlc1xyXG4gICAgY29uc3QgZmlsZVNpemVNQiA9IHByb2dyZXNzRGF0YS5maWxlX3NpemUgLyAoMTAyNCAqIDEwMjQpO1xyXG4gICAgcmV0dXJuIE1hdGgubWF4KDUsIE1hdGgubWluKDYwLCBmaWxlU2l6ZU1CICogMikpOyAvLyBCZXR3ZWVuIDUtNjAgc2Vjb25kc1xyXG4gIH1cclxuXHJcbiAgLy8gQ2FsY3VsYXRlIGJhc2VkIG9uIGN1cnJlbnQgcHJvZ3Jlc3MgcmF0ZVxyXG4gIGNvbnN0IHByb2dyZXNzUmF0ZSA9IHByb2dyZXNzUGVyY2VudGFnZSAvIGVsYXBzZWRUaW1lOyAvLyBwZXJjZW50YWdlIHBlciBtaWxsaXNlY29uZFxyXG4gIGNvbnN0IHJlbWFpbmluZ1BlcmNlbnRhZ2UgPSAxMDAgLSBwcm9ncmVzc1BlcmNlbnRhZ2U7XHJcbiAgY29uc3QgZXN0aW1hdGVkUmVtYWluaW5nVGltZSA9IHJlbWFpbmluZ1BlcmNlbnRhZ2UgLyBwcm9ncmVzc1JhdGU7XHJcblxyXG4gIC8vIENvbnZlcnQgdG8gc2Vjb25kcyBhbmQgY2FwIGF0IHJlYXNvbmFibGUgbGltaXRzXHJcbiAgY29uc3QgZXN0aW1hdGVkU2Vjb25kcyA9IE1hdGgucm91bmQoZXN0aW1hdGVkUmVtYWluaW5nVGltZSAvIDEwMDApO1xyXG4gIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1pbigzMDAsIGVzdGltYXRlZFNlY29uZHMpKTsgLy8gQ2FwIGF0IDUgbWludXRlc1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgZXJyb3IgcmVzcG9uc2VcclxuICovXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgfTtcclxufSJdfQ==
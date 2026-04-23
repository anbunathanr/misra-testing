"use strict";
/**
 * Get Workflow Progress Lambda
 *
 * GET /workflow/progress/{workflowId}
 * Retrieves real-time progress of the autonomous workflow
 *
 * Response:
 * {
 *   "workflowId": "workflow-xxx",
 *   "status": "ANALYSIS_TRIGGERED",
 *   "progress": 75,
 *   "currentStep": "🧠 AI Analysis Triggered (Lambda)",
 *   "timestamp": 1234567890
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('GetProgressFunction');
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION });
const handler = async (event) => {
    try {
        logger.info('Get progress request received', { pathParameters: event.pathParameters });
        // Extract workflowId from path
        const workflowId = event.pathParameters?.workflowId;
        if (!workflowId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Workflow ID is required' }),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }
        logger.info('Fetching progress for workflow', { workflowId });
        try {
            // Get workflow progress from DynamoDB
            const getCommand = new client_dynamodb_1.GetItemCommand({
                TableName: 'AnalysisProgress',
                Key: {
                    analysisId: { S: workflowId }
                }
            });
            const response = await dynamoClient.send(getCommand);
            if (!response.Item) {
                logger.warn('Workflow not found', { workflowId });
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Workflow not found' }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                };
            }
            const progressResponse = {
                workflowId: response.Item.analysisId?.S || workflowId,
                status: response.Item.status?.S || 'UNKNOWN',
                progress: parseInt(response.Item.progress?.N || '0'),
                currentStep: response.Item.currentStep?.S || 'Processing...',
                timestamp: parseInt(response.Item.timestamp?.N || '0')
            };
            logger.info('Progress retrieved successfully', { workflowId, progress: progressResponse.progress });
            return {
                statusCode: 200,
                body: JSON.stringify(progressResponse),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }
        catch (error) {
            logger.error('Failed to fetch progress', { error: error.message, workflowId });
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Failed to fetch progress: ${error.message}` }),
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            };
        }
    }
    catch (error) {
        logger.error('Unexpected error', { error: error.message });
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXByb2dyZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXByb2dyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7R0FjRzs7O0FBR0gsOERBQTBFO0FBQzFFLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNuRCxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBVXJFLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUE2QixFQUFvQyxFQUFFO0lBQy9GLElBQUksQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFFdkYsK0JBQStCO1FBQy9CLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDO1FBRXBELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHlCQUF5QixFQUFFLENBQUM7Z0JBQzFELE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQzthQUNGLENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFOUQsSUFBSSxDQUFDO1lBQ0gsc0NBQXNDO1lBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksZ0NBQWMsQ0FBQztnQkFDcEMsU0FBUyxFQUFFLGtCQUFrQjtnQkFDN0IsR0FBRyxF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IFxyXG4gKiBHRVQgL3dvcmtmbG93L3Byb2dyZXNzL3t3b3JrZmxvd0lkfVxyXG4gKiBSZXRyaWV2ZXMgcmVhbC10aW1lIHByb2dyZXNzIG9mIHRoZSBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIFwid29ya2Zsb3dJZFwiOiBcIndvcmtmbG93LXh4eFwiLFxyXG4gKiAgIFwic3RhdHVzXCI6IFwiQU5BTFlTSVNfVFJJR0dFUkVEXCIsXHJcbiAqICAgXCJwcm9ncmVzc1wiOiA3NSxcclxuICogICBcImN1cnJlbnRTdGVwXCI6IFwi8J+noCBBSSBBbmFseXNpcyBUcmlnZ2VyZWQgKExhbWJkYSlcIixcclxuICogICBcInRpbWVzdGFtcFwiOiAxMjM0NTY3ODkwXHJcbiAqIH1cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudFYyLCBBUElHYXRld2F5UHJveHlSZXN1bHRWMiB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgR2V0SXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdHZXRQcm9ncmVzc0Z1bmN0aW9uJyk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB9KTtcclxuXHJcbmludGVyZmFjZSBQcm9ncmVzc1Jlc3BvbnNlIHtcclxuICB3b3JrZmxvd0lkOiBzdHJpbmc7XHJcbiAgc3RhdHVzOiBzdHJpbmc7XHJcbiAgcHJvZ3Jlc3M6IG51bWJlcjtcclxuICBjdXJyZW50U3RlcDogc3RyaW5nO1xyXG4gIHRpbWVzdGFtcDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRWMik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0VjI+ID0+IHtcclxuICB0cnkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ0dldCBwcm9ncmVzcyByZXF1ZXN0IHJlY2VpdmVkJywgeyBwYXRoUGFyYW1ldGVyczogZXZlbnQucGF0aFBhcmFtZXRlcnMgfSk7XHJcblxyXG4gICAgLy8gRXh0cmFjdCB3b3JrZmxvd0lkIGZyb20gcGF0aFxyXG4gICAgY29uc3Qgd29ya2Zsb3dJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy53b3JrZmxvd0lkO1xyXG5cclxuICAgIGlmICghd29ya2Zsb3dJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnV29ya2Zsb3cgSUQgaXMgcmVxdWlyZWQnIH0pLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGZXRjaGluZyBwcm9ncmVzcyBmb3Igd29ya2Zsb3cnLCB7IHdvcmtmbG93SWQgfSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gR2V0IHdvcmtmbG93IHByb2dyZXNzIGZyb20gRHluYW1vREJcclxuICAgICAgY29uc3QgZ2V0Q29tbWFuZCA9IG5ldyBHZXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiAnQW5hbHlzaXNQcm9ncmVzcycsXHJcbiAgICAgICAgS2V5OiB7XHJcbiAgICAgICAgICBhbmFseXNpc0lkOiB7IFM6IHdvcmtmbG93SWQgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGdldENvbW1hbmQpO1xyXG5cclxuICAgICAgaWYgKCFyZXNwb25zZS5JdGVtKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1dvcmtmbG93IG5vdCBmb3VuZCcsIHsgd29ya2Zsb3dJZCB9KTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1dvcmtmbG93IG5vdCBmb3VuZCcgfSksXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKidcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBwcm9ncmVzc1Jlc3BvbnNlOiBQcm9ncmVzc1Jlc3BvbnNlID0ge1xyXG4gICAgICAgIHdvcmtmbG93SWQ6IHJlc3BvbnNlLkl0ZW0uYW5hbHlzaXNJZD8uUyB8fCB3b3JrZmxvd0lkLFxyXG4gICAgICAgIHN0YXR1czogcmVzcG9uc2UuSXRlbS5zdGF0dXM/LlMgfHwgJ1VOS05PV04nLFxyXG4gICAgICAgIHByb2dyZXNzOiBwYXJzZUludChyZXNwb25zZS5JdGVtLnByb2dyZXNzPy5OIHx8ICcwJyksXHJcbiAgICAgICAgY3VycmVudFN0ZXA6IHJlc3BvbnNlLkl0ZW0uY3VycmVudFN0ZXA/LlMgfHwgJ1Byb2Nlc3NpbmcuLi4nLFxyXG4gICAgICAgIHRpbWVzdGFtcDogcGFyc2VJbnQocmVzcG9uc2UuSXRlbS50aW1lc3RhbXA/Lk4gfHwgJzAnKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1Byb2dyZXNzIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknLCB7IHdvcmtmbG93SWQsIHByb2dyZXNzOiBwcm9ncmVzc1Jlc3BvbnNlLnByb2dyZXNzIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocHJvZ3Jlc3NSZXNwb25zZSksXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKidcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGZldGNoIHByb2dyZXNzJywgeyBlcnJvcjogZXJyb3IubWVzc2FnZSwgd29ya2Zsb3dJZCB9KTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogYEZhaWxlZCB0byBmZXRjaCBwcm9ncmVzczogJHtlcnJvci5tZXNzYWdlfWAgfSksXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKidcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdVbmV4cGVjdGVkIGVycm9yJywgeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSksXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKidcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==
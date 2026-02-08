"use strict";
/**
 * Lambda function to generate AI-powered insights and recommendations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const ai_insights_service_1 = require("../../services/ai/ai-insights-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const jwt_service_1 = require("../../services/auth/jwt-service");
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(process.env.ENVIRONMENT || 'dev');
const aiService = new ai_insights_service_1.AIInsightsService(dbClient);
const jwtService = new jwt_service_1.JWTService();
const handler = async (event) => {
    try {
        // Extract and validate JWT token
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(401, 'MISSING_TOKEN', 'Authorization token is required');
        }
        const token = authHeader.substring(7);
        let tokenPayload;
        try {
            tokenPayload = await jwtService.verifyAccessToken(token);
        }
        catch (error) {
            return errorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token');
        }
        // Parse request body
        const requestBody = event.body ? JSON.parse(event.body) : {};
        const request = {
            user_id: tokenPayload.userId,
            analysis_ids: requestBody.analysis_ids,
            time_range_days: requestBody.time_range_days || 30,
            include_baseline: requestBody.include_baseline !== false
        };
        // Generate insights
        const insights = await aiService.generateInsights(request);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(insights),
        };
    }
    catch (error) {
        console.error('Generate insights error:', error);
        if (error instanceof Error) {
            return errorResponse(500, 'INTERNAL_ERROR', error.message);
        }
        return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
    }
};
exports.handler = handler;
function errorResponse(statusCode, code, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: Math.random().toString(36).substring(7),
            },
        }),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtaW5zaWdodHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW5lcmF0ZS1pbnNpZ2h0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7OztBQUdILCtFQUF5RTtBQUN6RSxvRUFBc0U7QUFDdEUsaUVBQTREO0FBRzVELE1BQU0sUUFBUSxHQUFHLElBQUksdUNBQXFCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLENBQUE7QUFDNUUsTUFBTSxTQUFTLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUNqRCxNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQTtBQUU1QixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCxpQ0FBaUM7UUFDakMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUE7UUFDN0UsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLGlDQUFpQyxDQUFDLENBQUE7UUFDL0UsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckMsSUFBSSxZQUFZLENBQUE7UUFFaEIsSUFBSSxDQUFDO1lBQ0gsWUFBWSxHQUFHLE1BQU0sVUFBVSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ3hFLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUU1RCxNQUFNLE9BQU8sR0FBNkI7WUFDeEMsT0FBTyxFQUFFLFlBQVksQ0FBQyxNQUFNO1lBQzVCLFlBQVksRUFBRSxXQUFXLENBQUMsWUFBWTtZQUN0QyxlQUFlLEVBQUUsV0FBVyxDQUFDLGVBQWUsSUFBSSxFQUFFO1lBQ2xELGdCQUFnQixFQUFFLFdBQVcsQ0FBQyxnQkFBZ0IsS0FBSyxLQUFLO1NBQ3pELENBQUE7UUFFRCxvQkFBb0I7UUFDcEIsTUFBTSxRQUFRLEdBQUcsTUFBTSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFMUQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7Z0JBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjthQUM3RDtZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztTQUMvQixDQUFBO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWhELElBQUksS0FBSyxZQUFZLEtBQUssRUFBRSxDQUFDO1lBQzNCLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUVELE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7QUFDSCxDQUFDLENBQUE7QUFsRFksUUFBQSxPQUFPLFdBa0RuQjtBQUVELFNBQVMsYUFBYSxDQUNwQixVQUFrQixFQUNsQixJQUFZLEVBQ1osT0FBZTtJQUVmLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFO1lBQ1AsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1lBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtTQUM3RDtRQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUE7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIExhbWJkYSBmdW5jdGlvbiB0byBnZW5lcmF0ZSBBSS1wb3dlcmVkIGluc2lnaHRzIGFuZCByZWNvbW1lbmRhdGlvbnNcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSdcclxuaW1wb3J0IHsgQUlJbnNpZ2h0c1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS9haS1pbnNpZ2h0cy1zZXJ2aWNlJ1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudFdyYXBwZXIgfSBmcm9tICcuLi8uLi9kYXRhYmFzZS9keW5hbW9kYi1jbGllbnQnXHJcbmltcG9ydCB7IEpXVFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdXRoL2p3dC1zZXJ2aWNlJ1xyXG5pbXBvcnQgeyBJbnNpZ2h0R2VuZXJhdGlvblJlcXVlc3QgfSBmcm9tICcuLi8uLi90eXBlcy9haS1pbnNpZ2h0cydcclxuXHJcbmNvbnN0IGRiQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50V3JhcHBlcihwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2JylcclxuY29uc3QgYWlTZXJ2aWNlID0gbmV3IEFJSW5zaWdodHNTZXJ2aWNlKGRiQ2xpZW50KVxyXG5jb25zdCBqd3RTZXJ2aWNlID0gbmV3IEpXVFNlcnZpY2UoKVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgYW5kIHZhbGlkYXRlIEpXVCB0b2tlblxyXG4gICAgY29uc3QgYXV0aEhlYWRlciA9IGV2ZW50LmhlYWRlcnMuQXV0aG9yaXphdGlvbiB8fCBldmVudC5oZWFkZXJzLmF1dGhvcml6YXRpb25cclxuICAgIGlmICghYXV0aEhlYWRlciB8fCAhYXV0aEhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnTUlTU0lOR19UT0tFTicsICdBdXRob3JpemF0aW9uIHRva2VuIGlzIHJlcXVpcmVkJylcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0b2tlbiA9IGF1dGhIZWFkZXIuc3Vic3RyaW5nKDcpXHJcbiAgICBsZXQgdG9rZW5QYXlsb2FkXHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgdG9rZW5QYXlsb2FkID0gYXdhaXQgand0U2VydmljZS52ZXJpZnlBY2Nlc3NUb2tlbih0b2tlbilcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ0lOVkFMSURfVE9LRU4nLCAnSW52YWxpZCBvciBleHBpcmVkIHRva2VuJylcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGNvbnN0IHJlcXVlc3RCb2R5ID0gZXZlbnQuYm9keSA/IEpTT04ucGFyc2UoZXZlbnQuYm9keSkgOiB7fVxyXG5cclxuICAgIGNvbnN0IHJlcXVlc3Q6IEluc2lnaHRHZW5lcmF0aW9uUmVxdWVzdCA9IHtcclxuICAgICAgdXNlcl9pZDogdG9rZW5QYXlsb2FkLnVzZXJJZCxcclxuICAgICAgYW5hbHlzaXNfaWRzOiByZXF1ZXN0Qm9keS5hbmFseXNpc19pZHMsXHJcbiAgICAgIHRpbWVfcmFuZ2VfZGF5czogcmVxdWVzdEJvZHkudGltZV9yYW5nZV9kYXlzIHx8IDMwLFxyXG4gICAgICBpbmNsdWRlX2Jhc2VsaW5lOiByZXF1ZXN0Qm9keS5pbmNsdWRlX2Jhc2VsaW5lICE9PSBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyYXRlIGluc2lnaHRzXHJcbiAgICBjb25zdCBpbnNpZ2h0cyA9IGF3YWl0IGFpU2VydmljZS5nZW5lcmF0ZUluc2lnaHRzKHJlcXVlc3QpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoaW5zaWdodHMpLFxyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdHZW5lcmF0ZSBpbnNpZ2h0cyBlcnJvcjonLCBlcnJvcilcclxuXHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdJTlRFUk5BTF9FUlJPUicsIGVycm9yLm1lc3NhZ2UpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnSU5URVJOQUxfRVJST1InLCAnSW50ZXJuYWwgc2VydmVyIGVycm9yJylcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9XHJcbn1cclxuIl19
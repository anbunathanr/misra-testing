"use strict";
/**
 * Lambda function to submit user feedback on AI insights
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const uuid_1 = require("uuid");
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
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const request = JSON.parse(event.body);
        // Validate input
        if (!request.insight_id || request.rating === undefined || request.helpful === undefined) {
            return errorResponse(400, 'INVALID_INPUT', 'insight_id, rating, and helpful are required');
        }
        if (request.rating < 1 || request.rating > 5) {
            return errorResponse(400, 'INVALID_RATING', 'Rating must be between 1 and 5');
        }
        // Create feedback object
        const feedback = {
            feedback_id: (0, uuid_1.v4)(),
            insight_id: request.insight_id,
            user_id: tokenPayload.userId,
            rating: request.rating,
            helpful: request.helpful,
            comment: request.comment,
            created_at: Date.now()
        };
        // Store feedback
        await aiService.storeFeedback(feedback);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify({
                message: 'Feedback submitted successfully',
                feedback_id: feedback.feedback_id
            })
        };
    }
    catch (error) {
        console.error('Submit feedback error:', error);
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
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        },
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: Math.random().toString(36).substring(7)
            }
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VibWl0LWZlZWRiYWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3VibWl0LWZlZWRiYWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7O0FBR0gsK0JBQW1DO0FBRW5DLCtFQUF5RTtBQUN6RSxvRUFBc0U7QUFDdEUsaUVBQTREO0FBRTVELE1BQU0sUUFBUSxHQUFHLElBQUksdUNBQXFCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLENBQUE7QUFDNUUsTUFBTSxTQUFTLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUNqRCxNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQTtBQVM1QixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCxpQ0FBaUM7UUFDakMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUE7UUFDN0UsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLGlDQUFpQyxDQUFDLENBQUE7UUFDL0UsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckMsSUFBSSxZQUFZLENBQUE7UUFFaEIsSUFBSSxDQUFDO1lBQ0gsWUFBWSxHQUFHLE1BQU0sVUFBVSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQ3hFLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFDdkUsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFvQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV2RCxpQkFBaUI7UUFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6RixPQUFPLGFBQWEsQ0FDbEIsR0FBRyxFQUNILGVBQWUsRUFDZiw4Q0FBOEMsQ0FDL0MsQ0FBQTtRQUNILENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFLGdDQUFnQyxDQUFDLENBQUE7UUFDL0UsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixNQUFNLFFBQVEsR0FBaUI7WUFDN0IsV0FBVyxFQUFFLElBQUEsU0FBTSxHQUFFO1lBQ3JCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixPQUFPLEVBQUUsWUFBWSxDQUFDLE1BQU07WUFDNUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3RCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDeEIsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7U0FDdkIsQ0FBQTtRQUVELGlCQUFpQjtRQUNqQixNQUFNLFNBQVMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFdkMsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7Z0JBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjthQUM3RDtZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsaUNBQWlDO2dCQUMxQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVc7YUFDbEMsQ0FBQztTQUNILENBQUE7SUFDSCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFOUMsSUFBSSxLQUFLLFlBQVksS0FBSyxFQUFFLENBQUM7WUFDM0IsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUE7SUFDdEUsQ0FBQztBQUNILENBQUMsQ0FBQTtBQTFFWSxRQUFBLE9BQU8sV0EwRW5CO0FBRUQsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlO0lBRWYsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUU7WUFDUCxjQUFjLEVBQUUsa0JBQWtCO1lBQ2xDLDZCQUE2QixFQUFFLEdBQUc7WUFDbEMsOEJBQThCLEVBQUUsNEJBQTRCO1NBQzdEO1FBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDbkQ7U0FDRixDQUFDO0tBQ0gsQ0FBQTtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTGFtYmRhIGZ1bmN0aW9uIHRvIHN1Ym1pdCB1c2VyIGZlZWRiYWNrIG9uIEFJIGluc2lnaHRzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnXHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnXHJcbmltcG9ydCB7IFVzZXJGZWVkYmFjayB9IGZyb20gJy4uLy4uL3R5cGVzL2FpLWluc2lnaHRzJ1xyXG5pbXBvcnQgeyBBSUluc2lnaHRzU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpL2FpLWluc2lnaHRzLXNlcnZpY2UnXHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50V3JhcHBlciB9IGZyb20gJy4uLy4uL2RhdGFiYXNlL2R5bmFtb2RiLWNsaWVudCdcclxuaW1wb3J0IHsgSldUU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1dGgvand0LXNlcnZpY2UnXHJcblxyXG5jb25zdCBkYkNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudFdyYXBwZXIocHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ2RldicpXHJcbmNvbnN0IGFpU2VydmljZSA9IG5ldyBBSUluc2lnaHRzU2VydmljZShkYkNsaWVudClcclxuY29uc3Qgand0U2VydmljZSA9IG5ldyBKV1RTZXJ2aWNlKClcclxuXHJcbmludGVyZmFjZSBGZWVkYmFja1JlcXVlc3Qge1xyXG4gIGluc2lnaHRfaWQ6IHN0cmluZ1xyXG4gIHJhdGluZzogbnVtYmVyXHJcbiAgaGVscGZ1bDogYm9vbGVhblxyXG4gIGNvbW1lbnQ/OiBzdHJpbmdcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgYW5kIHZhbGlkYXRlIEpXVCB0b2tlblxyXG4gICAgY29uc3QgYXV0aEhlYWRlciA9IGV2ZW50LmhlYWRlcnMuQXV0aG9yaXphdGlvbiB8fCBldmVudC5oZWFkZXJzLmF1dGhvcml6YXRpb25cclxuICAgIGlmICghYXV0aEhlYWRlciB8fCAhYXV0aEhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnTUlTU0lOR19UT0tFTicsICdBdXRob3JpemF0aW9uIHRva2VuIGlzIHJlcXVpcmVkJylcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0b2tlbiA9IGF1dGhIZWFkZXIuc3Vic3RyaW5nKDcpXHJcbiAgICBsZXQgdG9rZW5QYXlsb2FkXHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgdG9rZW5QYXlsb2FkID0gYXdhaXQgand0U2VydmljZS52ZXJpZnlBY2Nlc3NUb2tlbih0b2tlbilcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ0lOVkFMSURfVE9LRU4nLCAnSW52YWxpZCBvciBleHBpcmVkIHRva2VuJylcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJylcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBGZWVkYmFja1JlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpXHJcblxyXG4gICAgLy8gVmFsaWRhdGUgaW5wdXRcclxuICAgIGlmICghcmVxdWVzdC5pbnNpZ2h0X2lkIHx8IHJlcXVlc3QucmF0aW5nID09PSB1bmRlZmluZWQgfHwgcmVxdWVzdC5oZWxwZnVsID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXHJcbiAgICAgICAgNDAwLFxyXG4gICAgICAgICdJTlZBTElEX0lOUFVUJyxcclxuICAgICAgICAnaW5zaWdodF9pZCwgcmF0aW5nLCBhbmQgaGVscGZ1bCBhcmUgcmVxdWlyZWQnXHJcbiAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmVxdWVzdC5yYXRpbmcgPCAxIHx8IHJlcXVlc3QucmF0aW5nID4gNSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdJTlZBTElEX1JBVElORycsICdSYXRpbmcgbXVzdCBiZSBiZXR3ZWVuIDEgYW5kIDUnKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBmZWVkYmFjayBvYmplY3RcclxuICAgIGNvbnN0IGZlZWRiYWNrOiBVc2VyRmVlZGJhY2sgPSB7XHJcbiAgICAgIGZlZWRiYWNrX2lkOiB1dWlkdjQoKSxcclxuICAgICAgaW5zaWdodF9pZDogcmVxdWVzdC5pbnNpZ2h0X2lkLFxyXG4gICAgICB1c2VyX2lkOiB0b2tlblBheWxvYWQudXNlcklkLFxyXG4gICAgICByYXRpbmc6IHJlcXVlc3QucmF0aW5nLFxyXG4gICAgICBoZWxwZnVsOiByZXF1ZXN0LmhlbHBmdWwsXHJcbiAgICAgIGNvbW1lbnQ6IHJlcXVlc3QuY29tbWVudCxcclxuICAgICAgY3JlYXRlZF9hdDogRGF0ZS5ub3coKVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0b3JlIGZlZWRiYWNrXHJcbiAgICBhd2FpdCBhaVNlcnZpY2Uuc3RvcmVGZWVkYmFjayhmZWVkYmFjaylcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBtZXNzYWdlOiAnRmVlZGJhY2sgc3VibWl0dGVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgZmVlZGJhY2tfaWQ6IGZlZWRiYWNrLmZlZWRiYWNrX2lkXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1N1Ym1pdCBmZWVkYmFjayBlcnJvcjonLCBlcnJvcilcclxuXHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdJTlRFUk5BTF9FUlJPUicsIGVycm9yLm1lc3NhZ2UpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnSU5URVJOQUxfRVJST1InLCAnSW50ZXJuYWwgc2VydmVyIGVycm9yJylcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG4iXX0=
"use strict";
/**
 * Fetch OTP Lambda Function
 *
 * Retrieves OTP from DynamoDB (stored by webhook)
 * This enables automatic OTP extraction from user's email
 *
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "otp": "123456",
 *   "message": "OTP fetched successfully"
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('FetchOTP');
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION });
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    logger.info('Fetch OTP request received', {
        correlationId,
        path: event.path,
        method: event.httpMethod
    });
    try {
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.email) {
            return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
        }
        logger.info('Fetching OTP for email', {
            correlationId,
            email: request.email
        });
        const tableName = process.env.OTP_STORAGE_TABLE || 'OTPStorage';
        // Query DynamoDB for most recent OTP for this email
        const queryCommand = new client_dynamodb_1.QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: {
                ':email': { S: request.email }
            },
            ScanIndexForward: false, // Sort by timestamp descending (most recent first)
            Limit: 1
        });
        const result = await dynamoClient.send(queryCommand);
        if (!result.Items || result.Items.length === 0) {
            logger.warn('No OTP found for email', {
                correlationId,
                email: request.email
            });
            // For testing/development: generate mock OTP if none found
            // In production, this would indicate the email wasn't received
            const mockOTP = generateMockOTP();
            logger.info('Generated mock OTP for testing', {
                correlationId,
                email: request.email
            });
            const response = {
                otp: mockOTP,
                message: 'OTP generated (no email received yet - using mock for testing)'
            };
            return {
                statusCode: 200,
                headers: cors_1.corsHeaders,
                body: JSON.stringify(response)
            };
        }
        // Extract OTP from DynamoDB item
        const otpItem = result.Items[0];
        const otp = otpItem.otp?.S;
        if (!otp) {
            return errorResponse(500, 'INVALID_OTP_DATA', 'Invalid OTP data in storage', correlationId);
        }
        logger.info('OTP fetched successfully from storage', {
            correlationId,
            email: request.email,
            otp: otp.substring(0, 3) + '***'
        });
        const response = {
            otp,
            message: 'OTP fetched successfully from email'
        };
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        logger.error('Fetch OTP failed', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
        return errorResponse(500, 'FETCH_OTP_FAILED', 'Failed to fetch OTP', correlationId);
    }
};
exports.handler = handler;
/**
 * Generate mock OTP for testing (fallback)
 * Used when email hasn't been received yet
 */
function generateMockOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
/**
 * Standard error response
 */
function errorResponse(statusCode, code, message, correlationId) {
    return {
        statusCode,
        headers: cors_1.corsHeaders,
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: correlationId
            }
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2gtb3RwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmV0Y2gtb3RwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRzs7O0FBR0gsOERBQXdFO0FBQ3hFLDJDQUErQztBQUMvQywrQ0FBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7QUFXckUsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5HLE1BQU0sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEVBQUU7UUFDeEMsYUFBYTtRQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtRQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7S0FDekIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2RixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQW9CLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXhELDJCQUEyQjtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLE9BQU8sYUFB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LEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxxQkFBcUIsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN0RixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBdEdXLFFBQUEsT0FBTyxXQXNHbEI7QUFFRjs7O0dBR0c7QUFDSCxTQUFTLGVBQWU7SUFDdEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDaEUsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlLEVBQ2YsYUFBcUI7SUFFckIsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUUsa0JBQVc7UUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxhQUFhO2FBQ3pCO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEZldGNoIE9UUCBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIFJldHJpZXZlcyBPVFAgZnJvbSBEeW5hbW9EQiAoc3RvcmVkIGJ5IHdlYmhvb2spXHJcbiAqIFRoaXMgZW5hYmxlcyBhdXRvbWF0aWMgT1RQIGV4dHJhY3Rpb24gZnJvbSB1c2VyJ3MgZW1haWxcclxuICogXHJcbiAqIFJlcXVlc3Q6XHJcbiAqIHtcclxuICogICBcImVtYWlsXCI6IFwidXNlckBleGFtcGxlLmNvbVwiXHJcbiAqIH1cclxuICogXHJcbiAqIFJlc3BvbnNlOlxyXG4gKiB7XHJcbiAqICAgXCJvdHBcIjogXCIxMjM0NTZcIixcclxuICogICBcIm1lc3NhZ2VcIjogXCJPVFAgZmV0Y2hlZCBzdWNjZXNzZnVsbHlcIlxyXG4gKiB9XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUXVlcnlDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignRmV0Y2hPVFAnKTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIH0pO1xyXG5cclxuaW50ZXJmYWNlIEZldGNoT1RQUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIEZldGNoT1RQUmVzcG9uc2Uge1xyXG4gIG90cDogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBjb3JyZWxhdGlvbklkID0gZXZlbnQuaGVhZGVyc1snWC1Db3JyZWxhdGlvbi1JRCddIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICBcclxuICBsb2dnZXIuaW5mbygnRmV0Y2ggT1RQIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlcXVlc3Q6IEZldGNoT1RQUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIXJlcXVlc3QuZW1haWwpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19FTUFJTCcsICdFbWFpbCBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGZXRjaGluZyBPVFAgZm9yIGVtYWlsJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuT1RQX1NUT1JBR0VfVEFCTEUgfHwgJ09UUFN0b3JhZ2UnO1xyXG5cclxuICAgIC8vIFF1ZXJ5IER5bmFtb0RCIGZvciBtb3N0IHJlY2VudCBPVFAgZm9yIHRoaXMgZW1haWxcclxuICAgIGNvbnN0IHF1ZXJ5Q29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcclxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ2VtYWlsID0gOmVtYWlsJyxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICc6ZW1haWwnOiB7IFM6IHJlcXVlc3QuZW1haWwgfVxyXG4gICAgICB9LFxyXG4gICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSwgLy8gU29ydCBieSB0aW1lc3RhbXAgZGVzY2VuZGluZyAobW9zdCByZWNlbnQgZmlyc3QpXHJcbiAgICAgIExpbWl0OiAxXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChxdWVyeUNvbW1hbmQpO1xyXG5cclxuICAgIGlmICghcmVzdWx0Lkl0ZW1zIHx8IHJlc3VsdC5JdGVtcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ05vIE9UUCBmb3VuZCBmb3IgZW1haWwnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEZvciB0ZXN0aW5nL2RldmVsb3BtZW50OiBnZW5lcmF0ZSBtb2NrIE9UUCBpZiBub25lIGZvdW5kXHJcbiAgICAgIC8vIEluIHByb2R1Y3Rpb24sIHRoaXMgd291bGQgaW5kaWNhdGUgdGhlIGVtYWlsIHdhc24ndCByZWNlaXZlZFxyXG4gICAgICBjb25zdCBtb2NrT1RQID0gZ2VuZXJhdGVNb2NrT1RQKCk7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdHZW5lcmF0ZWQgbW9jayBPVFAgZm9yIHRlc3RpbmcnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlOiBGZXRjaE9UUFJlc3BvbnNlID0ge1xyXG4gICAgICAgIG90cDogbW9ja09UUCxcclxuICAgICAgICBtZXNzYWdlOiAnT1RQIGdlbmVyYXRlZCAobm8gZW1haWwgcmVjZWl2ZWQgeWV0IC0gdXNpbmcgbW9jayBmb3IgdGVzdGluZyknXHJcbiAgICAgIH07XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBFeHRyYWN0IE9UUCBmcm9tIER5bmFtb0RCIGl0ZW1cclxuICAgIGNvbnN0IG90cEl0ZW0gPSByZXN1bHQuSXRlbXNbMF07XHJcbiAgICBjb25zdCBvdHAgPSBvdHBJdGVtLm90cD8uUztcclxuXHJcbiAgICBpZiAoIW90cCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdJTlZBTElEX09UUF9EQVRBJywgJ0ludmFsaWQgT1RQIGRhdGEgaW4gc3RvcmFnZScsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdPVFAgZmV0Y2hlZCBzdWNjZXNzZnVsbHkgZnJvbSBzdG9yYWdlJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgb3RwOiBvdHAuc3Vic3RyaW5nKDAsIDMpICsgJyoqKidcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBGZXRjaE9UUFJlc3BvbnNlID0ge1xyXG4gICAgICBvdHAsXHJcbiAgICAgIG1lc3NhZ2U6ICdPVFAgZmV0Y2hlZCBzdWNjZXNzZnVsbHkgZnJvbSBlbWFpbCdcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0ZldGNoIE9UUCBmYWlsZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBzdGFjazogZXJyb3Iuc3RhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0ZFVENIX09UUF9GQUlMRUQnLCAnRmFpbGVkIHRvIGZldGNoIE9UUCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBtb2NrIE9UUCBmb3IgdGVzdGluZyAoZmFsbGJhY2spXHJcbiAqIFVzZWQgd2hlbiBlbWFpbCBoYXNuJ3QgYmVlbiByZWNlaXZlZCB5ZXRcclxuICovXHJcbmZ1bmN0aW9uIGdlbmVyYXRlTW9ja09UUCgpOiBzdHJpbmcge1xyXG4gIHJldHVybiBNYXRoLmZsb29yKDEwMDAwMCArIE1hdGgucmFuZG9tKCkgKiA5MDAwMDApLnRvU3RyaW5nKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZyxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59XHJcbiJdfQ==
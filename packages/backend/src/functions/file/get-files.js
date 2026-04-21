"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const auth_util_1 = require("../../utils/auth-util");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(environment);
const fileMetadataService = new file_metadata_service_1.FileMetadataService(dbClient);
const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };
    try {
        const user = await (0, auth_util_1.getUserFromContext)(event);
        if (!user.userId) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'User not authenticated' }),
            };
        }
        const result = await fileMetadataService.getUserFiles(user.userId, { limit: 100 });
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result.items),
        };
    }
    catch (error) {
        console.error('Error getting files:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify([]),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWZpbGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFEQUEyRDtBQUMzRCxnRkFBMkU7QUFDM0Usb0VBQXVFO0FBRXZFLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztBQUNyRCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUV2RCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxNQUFNLE9BQU8sR0FBRztRQUNkLGNBQWMsRUFBRSxrQkFBa0I7UUFDbEMsNkJBQTZCLEVBQUUsR0FBRztLQUNuQyxDQUFDO0lBRUYsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPO2dCQUNQLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHdCQUF3QixFQUFFLENBQUM7YUFDMUQsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFbkYsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTztZQUNQLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7U0FDbkMsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3QyxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPO1lBQ1AsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1NBQ3pCLENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBakNXLFFBQUEsT0FBTyxXQWlDbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcbmltcG9ydCB7IEZpbGVNZXRhZGF0YVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9maWxlLW1ldGFkYXRhLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudFdyYXBwZXIgfSBmcm9tICcuLi8uLi9kYXRhYmFzZS9keW5hbW9kYi1jbGllbnQnO1xyXG5cclxuY29uc3QgZW52aXJvbm1lbnQgPSBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2JztcclxuY29uc3QgZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnRXcmFwcGVyKGVudmlyb25tZW50KTtcclxuY29uc3QgZmlsZU1ldGFkYXRhU2VydmljZSA9IG5ldyBGaWxlTWV0YWRhdGFTZXJ2aWNlKGRiQ2xpZW50KTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGhlYWRlcnMgPSB7XHJcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICB9O1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZpbGVNZXRhZGF0YVNlcnZpY2UuZ2V0VXNlckZpbGVzKHVzZXIudXNlcklkLCB7IGxpbWl0OiAxMDAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXN1bHQuaXRlbXMpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBmaWxlczonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KFtdKSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=
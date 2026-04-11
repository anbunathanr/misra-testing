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
        const user = (0, auth_util_1.getUserFromContext)(event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWZpbGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFEQUEyRDtBQUMzRCxnRkFBMkU7QUFDM0Usb0VBQXVFO0FBRXZFLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztBQUNyRCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUV2RCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxNQUFNLE9BQU8sR0FBRztRQUNkLGNBQWMsRUFBRSxrQkFBa0I7UUFDbEMsNkJBQTZCLEVBQUUsR0FBRztLQUNuQyxDQUFDO0lBRUYsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTztnQkFDUCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSx3QkFBd0IsRUFBRSxDQUFDO2FBQzFELENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRW5GLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU87WUFDUCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1NBQ25DLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0MsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTztZQUNQLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztTQUN6QixDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQWpDVyxRQUFBLE9BQU8sV0FpQ2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZmlsZS1tZXRhZGF0YS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnRXcmFwcGVyIH0gZnJvbSAnLi4vLi4vZGF0YWJhc2UvZHluYW1vZGItY2xpZW50JztcclxuXHJcbmNvbnN0IGVudmlyb25tZW50ID0gcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ2Rldic7XHJcbmNvbnN0IGRiQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50V3JhcHBlcihlbnZpcm9ubWVudCk7XHJcbmNvbnN0IGZpbGVNZXRhZGF0YVNlcnZpY2UgPSBuZXcgRmlsZU1ldGFkYXRhU2VydmljZShkYkNsaWVudCk7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBoZWFkZXJzID0ge1xyXG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgfTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHVzZXIgPSBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgaWYgKCF1c2VyLnVzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdVc2VyIG5vdCBhdXRoZW50aWNhdGVkJyB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmaWxlTWV0YWRhdGFTZXJ2aWNlLmdldFVzZXJGaWxlcyh1c2VyLnVzZXJJZCwgeyBsaW1pdDogMTAwIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzdWx0Lml0ZW1zKSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgZmlsZXM6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShbXSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19
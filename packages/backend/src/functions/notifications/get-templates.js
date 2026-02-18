"use strict";
/**
 * Get Notification Templates Lambda
 *
 * List all templates with optional filtering by event type or channel.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const tableName = process.env.NOTIFICATION_TEMPLATES_TABLE || 'NotificationTemplates';
const handler = async (event) => {
    console.log('Get templates request', { path: event.path });
    try {
        const params = event.queryStringParameters || {};
        const eventType = params.eventType;
        const channel = params.channel;
        let templates;
        // If eventType is provided, use GSI to query
        if (eventType) {
            const keyConditionExpression = channel
                ? 'eventType = :eventType AND channel = :channel'
                : 'eventType = :eventType';
            const expressionAttributeValues = {
                ':eventType': eventType,
            };
            if (channel) {
                expressionAttributeValues[':channel'] = channel;
            }
            const command = new lib_dynamodb_1.QueryCommand({
                TableName: tableName,
                IndexName: 'EventTypeChannelIndex',
                KeyConditionExpression: keyConditionExpression,
                ExpressionAttributeValues: expressionAttributeValues,
            });
            const response = await docClient.send(command);
            templates = (response.Items || []);
        }
        else {
            // Otherwise, scan the table
            const filterExpression = channel ? 'channel = :channel' : undefined;
            const expressionAttributeValues = channel ? { ':channel': channel } : undefined;
            const command = new lib_dynamodb_1.ScanCommand({
                TableName: tableName,
                FilterExpression: filterExpression,
                ExpressionAttributeValues: expressionAttributeValues,
            });
            const response = await docClient.send(command);
            templates = (response.Items || []);
        }
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templates }),
        };
    }
    catch (error) {
        console.error('Error getting templates', { error });
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to get templates' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXRlbXBsYXRlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC10ZW1wbGF0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7OztBQUdILDhEQUEwRDtBQUMxRCx3REFBMEY7QUFHMUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDckYsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQWEsQ0FBQyxDQUFDO0FBQzdELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLElBQUksdUJBQXVCLENBQUM7QUFFL0UsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUUzRCxJQUFJLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFDO1FBQ2pELE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFDbkMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUUvQixJQUFJLFNBQWlDLENBQUM7UUFFdEMsNkNBQTZDO1FBQzdDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxNQUFNLHNCQUFzQixHQUFHLE9BQU87Z0JBQ3BDLENBQUMsQ0FBQywrQ0FBK0M7Z0JBQ2pELENBQUMsQ0FBQyx3QkFBd0IsQ0FBQztZQUU3QixNQUFNLHlCQUF5QixHQUF3QjtnQkFDckQsWUFBWSxFQUFFLFNBQVM7YUFDeEIsQ0FBQztZQUVGLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ1oseUJBQXlCLENBQUMsVUFBVSxDQUFDLEdBQUcsT0FBTyxDQUFDO1lBQ2xELENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLDJCQUFZLENBQUM7Z0JBQy9CLFNBQVMsRUFBRSxTQUFTO2dCQUNwQixTQUFTLEVBQUUsdUJBQXVCO2dCQUNsQyxzQkFBc0IsRUFBRSxzQkFBc0I7Z0JBQzlDLHlCQUF5QixFQUFFLHlCQUF5QjthQUNyRCxDQUFDLENBQUM7WUFFSCxNQUFNLFFBQVEsR0FBRyxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0MsU0FBUyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQTJCLENBQUM7UUFDL0QsQ0FBQzthQUFNLENBQUM7WUFDTiw0QkFBNEI7WUFDNUIsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFDcEUsTUFBTSx5QkFBeUIsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFFaEYsTUFBTSxPQUFPLEdBQUcsSUFBSSwwQkFBVyxDQUFDO2dCQUM5QixTQUFTLEVBQUUsU0FBUztnQkFDcEIsZ0JBQWdCLEVBQUUsZ0JBQWdCO2dCQUNsQyx5QkFBeUIsRUFBRSx5QkFBeUI7YUFDckQsQ0FBQyxDQUFDO1lBRUgsTUFBTSxRQUFRLEdBQUcsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9DLFNBQVMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUEyQixDQUFDO1FBQy9ELENBQUM7UUFFRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQztTQUNwQyxDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNwRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUseUJBQXlCLEVBQUUsQ0FBQztTQUMzRCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTdEVyxRQUFBLE9BQU8sV0E2RGxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEdldCBOb3RpZmljYXRpb24gVGVtcGxhdGVzIExhbWJkYVxyXG4gKiBcclxuICogTGlzdCBhbGwgdGVtcGxhdGVzIHdpdGggb3B0aW9uYWwgZmlsdGVyaW5nIGJ5IGV2ZW50IHR5cGUgb3IgY2hhbm5lbC5cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgU2NhbkNvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblRlbXBsYXRlIH0gZnJvbSAnLi4vLi4vdHlwZXMvbm90aWZpY2F0aW9uJztcclxuXHJcbmNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCBhcyBhbnkpO1xyXG5jb25zdCB0YWJsZU5hbWUgPSBwcm9jZXNzLmVudi5OT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFIHx8ICdOb3RpZmljYXRpb25UZW1wbGF0ZXMnO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnR2V0IHRlbXBsYXRlcyByZXF1ZXN0JywgeyBwYXRoOiBldmVudC5wYXRoIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgcGFyYW1zID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzIHx8IHt9O1xyXG4gICAgY29uc3QgZXZlbnRUeXBlID0gcGFyYW1zLmV2ZW50VHlwZTtcclxuICAgIGNvbnN0IGNoYW5uZWwgPSBwYXJhbXMuY2hhbm5lbDtcclxuXHJcbiAgICBsZXQgdGVtcGxhdGVzOiBOb3RpZmljYXRpb25UZW1wbGF0ZVtdO1xyXG5cclxuICAgIC8vIElmIGV2ZW50VHlwZSBpcyBwcm92aWRlZCwgdXNlIEdTSSB0byBxdWVyeVxyXG4gICAgaWYgKGV2ZW50VHlwZSkge1xyXG4gICAgICBjb25zdCBrZXlDb25kaXRpb25FeHByZXNzaW9uID0gY2hhbm5lbFxyXG4gICAgICAgID8gJ2V2ZW50VHlwZSA9IDpldmVudFR5cGUgQU5EIGNoYW5uZWwgPSA6Y2hhbm5lbCdcclxuICAgICAgICA6ICdldmVudFR5cGUgPSA6ZXZlbnRUeXBlJztcclxuXHJcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICAgJzpldmVudFR5cGUnOiBldmVudFR5cGUsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBpZiAoY2hhbm5lbCkge1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpjaGFubmVsJ10gPSBjaGFubmVsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnRXZlbnRUeXBlQ2hhbm5lbEluZGV4JyxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiBrZXlDb25kaXRpb25FeHByZXNzaW9uLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgdGVtcGxhdGVzID0gKHJlc3BvbnNlLkl0ZW1zIHx8IFtdKSBhcyBOb3RpZmljYXRpb25UZW1wbGF0ZVtdO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gT3RoZXJ3aXNlLCBzY2FuIHRoZSB0YWJsZVxyXG4gICAgICBjb25zdCBmaWx0ZXJFeHByZXNzaW9uID0gY2hhbm5lbCA/ICdjaGFubmVsID0gOmNoYW5uZWwnIDogdW5kZWZpbmVkO1xyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzID0gY2hhbm5lbCA/IHsgJzpjaGFubmVsJzogY2hhbm5lbCB9IDogdW5kZWZpbmVkO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWUsXHJcbiAgICAgICAgRmlsdGVyRXhwcmVzc2lvbjogZmlsdGVyRXhwcmVzc2lvbixcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHRlbXBsYXRlcyA9IChyZXNwb25zZS5JdGVtcyB8fCBbXSkgYXMgTm90aWZpY2F0aW9uVGVtcGxhdGVbXTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHRlbXBsYXRlcyB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgdGVtcGxhdGVzJywgeyBlcnJvciB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdGYWlsZWQgdG8gZ2V0IHRlbXBsYXRlcycgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19
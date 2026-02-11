"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.PROJECTS_TABLE_NAME || 'TestProjects';
class ProjectService {
    async createProject(userId, input) {
        const now = Math.floor(Date.now() / 1000);
        const project = {
            projectId: (0, uuid_1.v4)(),
            userId,
            name: input.name,
            description: input.description,
            targetUrl: input.targetUrl,
            environment: input.environment,
            createdAt: now,
            updatedAt: now,
        };
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: TABLE_NAME,
            Item: project,
        }));
        return project;
    }
    async getProject(projectId) {
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: TABLE_NAME,
            Key: { projectId },
        }));
        return result.Item || null;
    }
    async getUserProjects(userId) {
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'UserIndex',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
        }));
        return result.Items || [];
    }
    async updateProject(input) {
        const now = Math.floor(Date.now() / 1000);
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        if (input.name) {
            updateExpressions.push('#name = :name');
            expressionAttributeNames['#name'] = 'name';
            expressionAttributeValues[':name'] = input.name;
        }
        if (input.description) {
            updateExpressions.push('#description = :description');
            expressionAttributeNames['#description'] = 'description';
            expressionAttributeValues[':description'] = input.description;
        }
        if (input.targetUrl) {
            updateExpressions.push('#targetUrl = :targetUrl');
            expressionAttributeNames['#targetUrl'] = 'targetUrl';
            expressionAttributeValues[':targetUrl'] = input.targetUrl;
        }
        if (input.environment) {
            updateExpressions.push('#environment = :environment');
            expressionAttributeNames['#environment'] = 'environment';
            expressionAttributeValues[':environment'] = input.environment;
        }
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = now;
        const result = await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: TABLE_NAME,
            Key: { projectId: input.projectId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes;
    }
    async deleteProject(projectId) {
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: TABLE_NAME,
            Key: { projectId },
            UpdateExpression: 'SET #deleted = :deleted, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#deleted': 'deleted',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':deleted': true,
                ':updatedAt': Math.floor(Date.now() / 1000),
            },
        }));
    }
}
exports.ProjectService = ProjectService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJvamVjdC1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUEwRDtBQUMxRCx3REFBb0g7QUFFcEgsK0JBQW9DO0FBRXBDLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFdEQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxjQUFjLENBQUM7QUFFckUsTUFBYSxjQUFjO0lBQ3pCLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBYyxFQUFFLEtBQXlCO1FBQzNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQzFDLE1BQU0sT0FBTyxHQUFnQjtZQUMzQixTQUFTLEVBQUUsSUFBQSxTQUFNLEdBQUU7WUFDbkIsTUFBTTtZQUNOLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDOUIsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTO1lBQzFCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztZQUM5QixTQUFTLEVBQUUsR0FBRztZQUNkLFNBQVMsRUFBRSxHQUFHO1NBQ2YsQ0FBQztRQUVGLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FDbEIsSUFBSSx5QkFBVSxDQUFDO1lBQ2IsU0FBUyxFQUFFLFVBQVU7WUFDckIsSUFBSSxFQUFFLE9BQU87U0FDZCxDQUFDLENBQ0gsQ0FBQztRQUVGLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQWlCO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLE1BQU0s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QUFDLENBQ0gsQ0FBQztRQUVGLE9BQU8sTUFBTSxDQUFDLFVBQXlCLENBQUM7SUFDMUMsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBaUI7UUFDbkMsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLDRCQUFhLENBQUM7WUFDaEIsU0FBUyxFQUFFLFVBQVU7WUFDckIsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFO1lBQ2xCLGdCQUFnQixFQUFFLGtEQUFrRDtZQUNwRSx3QkFBd0IsRUFBRTtnQkFDeEIsVUFBVSxFQUFFLFNBQVM7Z0JBQ3JCLFlBQVksRUFBRSxXQUFXO2FBQzFCO1lBQ0QseUJBQXlCLEVBQUU7Z0JBQ3pCLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixZQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO2FBQzVDO1NBQ0YsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFwSEQsd0NBb0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kLCBHZXRDb21tYW5kLCBRdWVyeUNvbW1hbmQsIFVwZGF0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBUZXN0UHJvamVjdCwgQ3JlYXRlUHJvamVjdElucHV0LCBVcGRhdGVQcm9qZWN0SW5wdXQgfSBmcm9tICcuLi90eXBlcy90ZXN0LXByb2plY3QnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuXHJcbmNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XHJcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xyXG5cclxuY29uc3QgVEFCTEVfTkFNRSA9IHByb2Nlc3MuZW52LlBST0pFQ1RTX1RBQkxFX05BTUUgfHwgJ1Rlc3RQcm9qZWN0cyc7XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvamVjdFNlcnZpY2Uge1xyXG4gIGFzeW5jIGNyZWF0ZVByb2plY3QodXNlcklkOiBzdHJpbmcsIGlucHV0OiBDcmVhdGVQcm9qZWN0SW5wdXQpOiBQcm9taXNlPFRlc3RQcm9qZWN0PiB7XHJcbiAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcclxuICAgIGNvbnN0IHByb2plY3Q6IFRlc3RQcm9qZWN0ID0ge1xyXG4gICAgICBwcm9qZWN0SWQ6IHV1aWR2NCgpLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIG5hbWU6IGlucHV0Lm5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBpbnB1dC5kZXNjcmlwdGlvbixcclxuICAgICAgdGFyZ2V0VXJsOiBpbnB1dC50YXJnZXRVcmwsXHJcbiAgICAgIGVudmlyb25tZW50OiBpbnB1dC5lbnZpcm9ubWVudCxcclxuICAgICAgY3JlYXRlZEF0OiBub3csXHJcbiAgICAgIHVwZGF0ZWRBdDogbm93LFxyXG4gICAgfTtcclxuXHJcbiAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChcclxuICAgICAgbmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogVEFCTEVfTkFNRSxcclxuICAgICAgICBJdGVtOiBwcm9qZWN0LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4gcHJvamVjdDtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdldFByb2plY3QocHJvamVjdElkOiBzdHJpbmcpOiBQcm9taXNlPFRlc3RQcm9qZWN0IHwgbnVsbD4ge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoXHJcbiAgICAgIG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXHJcbiAgICAgICAgS2V5OiB7IHByb2plY3RJZCB9LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4gKHJlc3VsdC5JdGVtIGFzIFRlc3RQcm9qZWN0KSB8fCBudWxsO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VXNlclByb2plY3RzKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxUZXN0UHJvamVjdFtdPiB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChcclxuICAgICAgbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ1VzZXJJbmRleCcsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3VzZXJJZCA9IDp1c2VySWQnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6dXNlcklkJzogdXNlcklkLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiAocmVzdWx0Lkl0ZW1zIGFzIFRlc3RQcm9qZWN0W10pIHx8IFtdO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgdXBkYXRlUHJvamVjdChpbnB1dDogVXBkYXRlUHJvamVjdElucHV0KTogUHJvbWlzZTxUZXN0UHJvamVjdD4ge1xyXG4gICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XHJcbiAgICBcclxuICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb25zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcblxyXG4gICAgaWYgKGlucHV0Lm5hbWUpIHtcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgnI25hbWUgPSA6bmFtZScpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNuYW1lJ10gPSAnbmFtZSc7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpuYW1lJ10gPSBpbnB1dC5uYW1lO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpbnB1dC5kZXNjcmlwdGlvbikge1xyXG4gICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjZGVzY3JpcHRpb24gPSA6ZGVzY3JpcHRpb24nKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjZGVzY3JpcHRpb24nXSA9ICdkZXNjcmlwdGlvbic7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpkZXNjcmlwdGlvbiddID0gaW5wdXQuZGVzY3JpcHRpb247XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlucHV0LnRhcmdldFVybCkge1xyXG4gICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjdGFyZ2V0VXJsID0gOnRhcmdldFVybCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyN0YXJnZXRVcmwnXSA9ICd0YXJnZXRVcmwnO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6dGFyZ2V0VXJsJ10gPSBpbnB1dC50YXJnZXRVcmw7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlucHV0LmVudmlyb25tZW50KSB7XHJcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb25zLnB1c2goJyNlbnZpcm9ubWVudCA9IDplbnZpcm9ubWVudCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNlbnZpcm9ubWVudCddID0gJ2Vudmlyb25tZW50JztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVudmlyb25tZW50J10gPSBpbnB1dC5lbnZpcm9ubWVudDtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcpO1xyXG4gICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdXBkYXRlZEF0J10gPSAndXBkYXRlZEF0JztcclxuICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp1cGRhdGVkQXQnXSA9IG5vdztcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChcclxuICAgICAgbmV3IFVwZGF0ZUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogVEFCTEVfTkFNRSxcclxuICAgICAgICBLZXk6IHsgcHJvamVjdElkOiBpbnB1dC5wcm9qZWN0SWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiBgU0VUICR7dXBkYXRlRXhwcmVzc2lvbnMuam9pbignLCAnKX1gLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICAgICAgUmV0dXJuVmFsdWVzOiAnQUxMX05FVycsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiByZXN1bHQuQXR0cmlidXRlcyBhcyBUZXN0UHJvamVjdDtcclxuICB9XHJcblxyXG4gIGFzeW5jIGRlbGV0ZVByb2plY3QocHJvamVjdElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKFxyXG4gICAgICBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxyXG4gICAgICAgIEtleTogeyBwcm9qZWN0SWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUICNkZWxldGVkID0gOmRlbGV0ZWQsICN1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICcjZGVsZXRlZCc6ICdkZWxldGVkJyxcclxuICAgICAgICAgICcjdXBkYXRlZEF0JzogJ3VwZGF0ZWRBdCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmRlbGV0ZWQnOiB0cnVlLFxyXG4gICAgICAgICAgJzp1cGRhdGVkQXQnOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuIl19
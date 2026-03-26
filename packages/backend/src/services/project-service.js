"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
// Use environment variable for table name with fallback
const TABLE_NAME = process.env.PROJECTS_TABLE_NAME || 'TestProjects';
// Create DynamoDB client with proper configuration for Lambda environment
const client = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
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
        try {
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
        catch (error) {
            console.error('Error querying projects:', error);
            // Return empty array on error to prevent 503
            return [];
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJvamVjdC1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUEwRDtBQUMxRCx3REFBb0g7QUFFcEgsK0JBQW9DO0FBRXBDLHdEQUF3RDtBQUN4RCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLGNBQWMsQ0FBQztBQUVyRSwwRUFBMEU7QUFDMUUsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO0lBQ2hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQUVILE1BQU0sU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUV0RCxNQUFhLGNBQWM7SUFDekIsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFjLEVBQUUsS0FBeUI7UUFDM0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSxPQUFPLEdBQWdCO1lBQzNCLFNBQVMsRUFBRSxJQUFBLFNBQU0sR0FBRTtZQUNuQixNQUFNO1lBQ04sSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztZQUM5QixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO1lBQzlCLFNBQVMsRUFBRSxHQUFHO1lBQ2QsU0FBUyxFQUFFLEdBQUc7U0FDZixDQUFDO1FBRUYsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLHlCQUFVLENBQUM7WUFDYixTQUFTLEVBQUUsVUFBVTtZQUNyQixJQUFJLEVBQUUsT0FBTztTQUNkLENBQUMsQ0FDSCxDQUFDO1FBRUYsT0FBTyxP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QyxJQUFJLDRCQUFhLENBQUM7WUFDaEIsU0FBUyxFQUFFLFVBQVU7WUFDckIsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUU7WUFDbkMsZ0JBQWdCLEVBQUUsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdkQsd0JBQXdCLEVBQUUsd0JBQXdCO1lBQ2xELHlCQUF5QixFQUFFLHlCQUF5QjtZQUNwRCxZQUFZLEVBQUUsU0FBUztTQUN4QixDQUFDLENBQ0gsQ0FBQztRQUVGLE9BQU8sTUFBTSxDQUFDLFVBQXlCLENBQUM7SUFDMUMsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBaUI7UUFDbkMsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUNsQixJQUFJLDRCQUFhLENBQUM7WUFDaEIsU0FBUyxFQUFFLFVBQVU7WUFDckIsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFO1lBQ2xCLGdCQUFnQixFQUFFLGtEQUFrRDtZQUNwRSx3QkFBd0IsRUFBRTtnQkFDeEIsVUFBVSxFQUFFLFNBQVM7Z0JBQ3JCLFlBQVksRUFBRSxXQUFXO2FBQzFCO1lBQ0QseUJBQXlCLEVBQUU7Z0JBQ3pCLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixZQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO2FBQzVDO1NBQ0YsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0NBQ0Y7QUExSEQsd0NBMEhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kLCBHZXRDb21tYW5kLCBRdWVyeUNvbW1hbmQsIFVwZGF0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBUZXN0UHJvamVjdCwgQ3JlYXRlUHJvamVjdElucHV0LCBVcGRhdGVQcm9qZWN0SW5wdXQgfSBmcm9tICcuLi90eXBlcy90ZXN0LXByb2plY3QnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuXHJcbi8vIFVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgdGFibGUgbmFtZSB3aXRoIGZhbGxiYWNrXHJcbmNvbnN0IFRBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5QUk9KRUNUU19UQUJMRV9OQU1FIHx8ICdUZXN0UHJvamVjdHMnO1xyXG5cclxuLy8gQ3JlYXRlIER5bmFtb0RCIGNsaWVudCB3aXRoIHByb3BlciBjb25maWd1cmF0aW9uIGZvciBMYW1iZGEgZW52aXJvbm1lbnRcclxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHtcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbn0pO1xyXG5cclxuY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCk7XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvamVjdFNlcnZpY2Uge1xyXG4gIGFzeW5jIGNyZWF0ZVByb2plY3QodXNlcklkOiBzdHJpbmcsIGlucHV0OiBDcmVhdGVQcm9qZWN0SW5wdXQpOiBQcm9taXNlPFRlc3RQcm9qZWN0PiB7XHJcbiAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcclxuICAgIGNvbnN0IHByb2plY3Q6IFRlc3RQcm9qZWN0ID0ge1xyXG4gICAgICBwcm9qZWN0SWQ6IHV1aWR2NCgpLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIG5hbWU6IGlucHV0Lm5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBpbnB1dC5kZXNjcmlwdGlvbixcclxuICAgICAgdGFyZ2V0VXJsOiBpbnB1dC50YXJnZXRVcmwsXHJcbiAgICAgIGVudmlyb25tZW50OiBpbnB1dC5lbnZpcm9ubWVudCxcclxuICAgICAgY3JlYXRlZEF0OiBub3csXHJcbiAgICAgIHVwZGF0ZWRBdDogbm93LFxyXG4gICAgfTtcclxuXHJcbiAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChcclxuICAgICAgbmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogVEFCTEVfTkFNRSxcclxuICAgICAgICBJdGVtOiBwcm9qZWN0LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4gcHJvamVjdDtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdldFByb2plY3QocHJvamVjdElkOiBzdHJpbmcpOiBQcm9taXNlPFRlc3RQcm9qZWN0IHwgbnVsbD4ge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoXHJcbiAgICAgIG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXHJcbiAgICAgICAgS2V5OiB7IHByb2plY3RJZCB9LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4gKHJlc3VsdC5JdGVtIGFzIFRlc3RQcm9qZWN0KSB8fCBudWxsO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VXNlclByb2plY3RzKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTxUZXN0UHJvamVjdFtdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChcclxuICAgICAgICBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogVEFCTEVfTkFNRSxcclxuICAgICAgICAgIEluZGV4TmFtZTogJ1VzZXJJbmRleCcsXHJcbiAgICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndXNlcklkID0gOnVzZXJJZCcsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6dXNlcklkJzogdXNlcklkLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgcmV0dXJuIChyZXN1bHQuSXRlbXMgYXMgVGVzdFByb2plY3RbXSkgfHwgW107XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBxdWVyeWluZyBwcm9qZWN0czonLCBlcnJvcik7XHJcbiAgICAgIC8vIFJldHVybiBlbXB0eSBhcnJheSBvbiBlcnJvciB0byBwcmV2ZW50IDUwM1xyXG4gICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyB1cGRhdGVQcm9qZWN0KGlucHV0OiBVcGRhdGVQcm9qZWN0SW5wdXQpOiBQcm9taXNlPFRlc3RQcm9qZWN0PiB7XHJcbiAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcclxuICAgIFxyXG4gICAgY29uc3QgdXBkYXRlRXhwcmVzc2lvbnM6IHN0cmluZ1tdID0gW107XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuXHJcbiAgICBpZiAoaW5wdXQubmFtZSkge1xyXG4gICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjbmFtZSA9IDpuYW1lJyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI25hbWUnXSA9ICduYW1lJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOm5hbWUnXSA9IGlucHV0Lm5hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlucHV0LmRlc2NyaXB0aW9uKSB7XHJcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb25zLnB1c2goJyNkZXNjcmlwdGlvbiA9IDpkZXNjcmlwdGlvbicpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNkZXNjcmlwdGlvbiddID0gJ2Rlc2NyaXB0aW9uJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmRlc2NyaXB0aW9uJ10gPSBpbnB1dC5kZXNjcmlwdGlvbjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaW5wdXQudGFyZ2V0VXJsKSB7XHJcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb25zLnB1c2goJyN0YXJnZXRVcmwgPSA6dGFyZ2V0VXJsJyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI3RhcmdldFVybCddID0gJ3RhcmdldFVybCc7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp0YXJnZXRVcmwnXSA9IGlucHV0LnRhcmdldFVybDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaW5wdXQuZW52aXJvbm1lbnQpIHtcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgnI2Vudmlyb25tZW50ID0gOmVudmlyb25tZW50Jyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI2Vudmlyb25tZW50J10gPSAnZW52aXJvbm1lbnQnO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZW52aXJvbm1lbnQnXSA9IGlucHV0LmVudmlyb25tZW50O1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZUV4cHJlc3Npb25zLnB1c2goJyN1cGRhdGVkQXQgPSA6dXBkYXRlZEF0Jyk7XHJcbiAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyN1cGRhdGVkQXQnXSA9ICd1cGRhdGVkQXQnO1xyXG4gICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnVwZGF0ZWRBdCddID0gbm93O1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKFxyXG4gICAgICBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxyXG4gICAgICAgIEtleTogeyBwcm9qZWN0SWQ6IGlucHV0LnByb2plY3RJZCB9LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGBTRVQgJHt1cGRhdGVFeHByZXNzaW9ucy5qb2luKCcsICcpfWAsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBleHByZXNzaW9uQXR0cmlidXRlTmFtZXMsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgICAgICBSZXR1cm5WYWx1ZXM6ICdBTExfTkVXJyxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdC5BdHRyaWJ1dGVzIGFzIFRlc3RQcm9qZWN0O1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZGVsZXRlUHJvamVjdChwcm9qZWN0SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgZG9jQ2xpZW50LnNlbmQoXHJcbiAgICAgIG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXHJcbiAgICAgICAgS2V5OiB7IHByb2plY3RJZCB9LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgI2RlbGV0ZWQgPSA6ZGVsZXRlZCwgI3VwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICAgJyNkZWxldGVkJzogJ2RlbGV0ZWQnLFxyXG4gICAgICAgICAgJyN1cGRhdGVkQXQnOiAndXBkYXRlZEF0JyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6ZGVsZXRlZCc6IHRydWUsXHJcbiAgICAgICAgICAnOnVwZGF0ZWRBdCc6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxufVxyXG4iXX0=
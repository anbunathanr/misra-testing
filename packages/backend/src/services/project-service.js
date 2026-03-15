"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
// Use environment variable for table name with fallback
const TABLE_NAME = process.env.PROJECTS_TABLE_NAME || 'misra-platform-projects';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJvamVjdC1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUEwRDtBQUMxRCx3REFBb0g7QUFFcEgsK0JBQW9DO0FBRXBDLHdEQUF3RDtBQUN4RCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLHlCQUF5QixDQUFDO0FBRWhGLDBFQUEwRTtBQUMxRSxNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUM7SUFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7Q0FDOUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXRELE1BQWEsY0FBYztJQUN6QixLQUFLLENBQUMsYUFBYSxDQUFDLE1BQWMsRUFBRSxLQUF5QjtRQUMzRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUMxQyxNQUFNLE9BQU8sR0FBZ0I7WUFDM0IsU0FBUyxFQUFFLElBQUEsU0FBTSxHQUFFO1lBQ25CLE1BQU07WUFDTixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO1lBQzlCLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUztZQUMxQixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDOUIsU0FBUyxFQUFFLEdBQUc7WUFDZCxTQUFTLEVBQUUsR0FBRztTQUNmLENBQUM7UUFFRixNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQ2xCLElBQUkseUJBQVUsQ0FBQztZQUNiLFNBQVMsRUFBRSxVQUFVO1lBQ3JCLElBQUksRUFBRSxPQUFPO1NBQ2QsQ0FBQyxDQUNILENBQUM7UUFFRixPQUFP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Q2pDLElBQUksNEJBQWEsQ0FBQztZQUNoQixTQUFTLEVBQUUsVUFBVTtZQUNyQixHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRTtZQUNuQyxnQkFBZ0IsRUFBRSxPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN2RCx3QkFBd0IsRUFBRSx3QkFBd0I7WUFDbEQseUJBQXlCLEVBQUUseUJBQXlCO1lBQ3BELFlBQVksRUFBRSxTQUFTO1NBQ3hCLENBQUMsQ0FDSCxDQUFDO1FBRUYsT0FBTyxNQUFNLENBQUMsVUFBeUIsQ0FBQztJQUMxQyxDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFpQjtRQUNuQyxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQ2xCLElBQUksNEJBQWEsQ0FBQztZQUNoQixTQUFTLEVBQUUsVUFBVTtZQUNyQixHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUU7WUFDbEIsZ0JBQWdCLEVBQUUsa0RBQWtEO1lBQ3BFLHdCQUF3QixFQUFFO2dCQUN4QixVQUFVLEVBQUUsU0FBUztnQkFDckIsWUFBWSxFQUFFLFdBQVc7YUFDMUI7WUFDRCx5QkFBeUIsRUFBRTtnQkFDekIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7YUFDNUM7U0FDRixDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTFIRCx3Q0EwSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIEdldENvbW1hbmQsIFF1ZXJ5Q29tbWFuZCwgVXBkYXRlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFRlc3RQcm9qZWN0LCBDcmVhdGVQcm9qZWN0SW5wdXQsIFVwZGF0ZVByb2plY3RJbnB1dCB9IGZyb20gJy4uL3R5cGVzL3Rlc3QtcHJvamVjdCc7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5cclxuLy8gVXNlIGVudmlyb25tZW50IHZhcmlhYmxlIGZvciB0YWJsZSBuYW1lIHdpdGggZmFsbGJhY2tcclxuY29uc3QgVEFCTEVfTkFNRSA9IHByb2Nlc3MuZW52LlBST0pFQ1RTX1RBQkxFX05BTUUgfHwgJ21pc3JhLXBsYXRmb3JtLXByb2plY3RzJztcclxuXHJcbi8vIENyZWF0ZSBEeW5hbW9EQiBjbGllbnQgd2l0aCBwcm9wZXIgY29uZmlndXJhdGlvbiBmb3IgTGFtYmRhIGVudmlyb25tZW50XHJcbmNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7XHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG59KTtcclxuXHJcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xyXG5cclxuZXhwb3J0IGNsYXNzIFByb2plY3RTZXJ2aWNlIHtcclxuICBhc3luYyBjcmVhdGVQcm9qZWN0KHVzZXJJZDogc3RyaW5nLCBpbnB1dDogQ3JlYXRlUHJvamVjdElucHV0KTogUHJvbWlzZTxUZXN0UHJvamVjdD4ge1xyXG4gICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XHJcbiAgICBjb25zdCBwcm9qZWN0OiBUZXN0UHJvamVjdCA9IHtcclxuICAgICAgcHJvamVjdElkOiB1dWlkdjQoKSxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBuYW1lOiBpbnB1dC5uYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogaW5wdXQuZGVzY3JpcHRpb24sXHJcbiAgICAgIHRhcmdldFVybDogaW5wdXQudGFyZ2V0VXJsLFxyXG4gICAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXHJcbiAgICAgIGNyZWF0ZWRBdDogbm93LFxyXG4gICAgICB1cGRhdGVkQXQ6IG5vdyxcclxuICAgIH07XHJcblxyXG4gICAgYXdhaXQgZG9jQ2xpZW50LnNlbmQoXHJcbiAgICAgIG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXHJcbiAgICAgICAgSXRlbTogcHJvamVjdCxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIHByb2plY3Q7XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRQcm9qZWN0KHByb2plY3RJZDogc3RyaW5nKTogUHJvbWlzZTxUZXN0UHJvamVjdCB8IG51bGw+IHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKFxyXG4gICAgICBuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxyXG4gICAgICAgIEtleTogeyBwcm9qZWN0SWQgfSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIChyZXN1bHQuSXRlbSBhcyBUZXN0UHJvamVjdCkgfHwgbnVsbDtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdldFVzZXJQcm9qZWN0cyh1c2VySWQ6IHN0cmluZyk6IFByb21pc2U8VGVzdFByb2plY3RbXT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoXHJcbiAgICAgICAgbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdVc2VySW5kZXgnLFxyXG4gICAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3VzZXJJZCA9IDp1c2VySWQnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgICAnOnVzZXJJZCc6IHVzZXJJZCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIHJldHVybiAocmVzdWx0Lkl0ZW1zIGFzIFRlc3RQcm9qZWN0W10pIHx8IFtdO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcXVlcnlpbmcgcHJvamVjdHM6JywgZXJyb3IpO1xyXG4gICAgICAvLyBSZXR1cm4gZW1wdHkgYXJyYXkgb24gZXJyb3IgdG8gcHJldmVudCA1MDNcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgdXBkYXRlUHJvamVjdChpbnB1dDogVXBkYXRlUHJvamVjdElucHV0KTogUHJvbWlzZTxUZXN0UHJvamVjdD4ge1xyXG4gICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XHJcbiAgICBcclxuICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb25zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcblxyXG4gICAgaWYgKGlucHV0Lm5hbWUpIHtcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgnI25hbWUgPSA6bmFtZScpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNuYW1lJ10gPSAnbmFtZSc7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpuYW1lJ10gPSBpbnB1dC5uYW1lO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpbnB1dC5kZXNjcmlwdGlvbikge1xyXG4gICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjZGVzY3JpcHRpb24gPSA6ZGVzY3JpcHRpb24nKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjZGVzY3JpcHRpb24nXSA9ICdkZXNjcmlwdGlvbic7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpkZXNjcmlwdGlvbiddID0gaW5wdXQuZGVzY3JpcHRpb247XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlucHV0LnRhcmdldFVybCkge1xyXG4gICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjdGFyZ2V0VXJsID0gOnRhcmdldFVybCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyN0YXJnZXRVcmwnXSA9ICd0YXJnZXRVcmwnO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6dGFyZ2V0VXJsJ10gPSBpbnB1dC50YXJnZXRVcmw7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlucHV0LmVudmlyb25tZW50KSB7XHJcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb25zLnB1c2goJyNlbnZpcm9ubWVudCA9IDplbnZpcm9ubWVudCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNlbnZpcm9ubWVudCddID0gJ2Vudmlyb25tZW50JztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVudmlyb25tZW50J10gPSBpbnB1dC5lbnZpcm9ubWVudDtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcpO1xyXG4gICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdXBkYXRlZEF0J10gPSAndXBkYXRlZEF0JztcclxuICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp1cGRhdGVkQXQnXSA9IG5vdztcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChcclxuICAgICAgbmV3IFVwZGF0ZUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogVEFCTEVfTkFNRSxcclxuICAgICAgICBLZXk6IHsgcHJvamVjdElkOiBpbnB1dC5wcm9qZWN0SWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiBgU0VUICR7dXBkYXRlRXhwcmVzc2lvbnMuam9pbignLCAnKX1gLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICAgICAgUmV0dXJuVmFsdWVzOiAnQUxMX05FVycsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiByZXN1bHQuQXR0cmlidXRlcyBhcyBUZXN0UHJvamVjdDtcclxuICB9XHJcblxyXG4gIGFzeW5jIGRlbGV0ZVByb2plY3QocHJvamVjdElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKFxyXG4gICAgICBuZXcgVXBkYXRlQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxyXG4gICAgICAgIEtleTogeyBwcm9qZWN0SWQgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUICNkZWxldGVkID0gOmRlbGV0ZWQsICN1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICcjZGVsZXRlZCc6ICdkZWxldGVkJyxcclxuICAgICAgICAgICcjdXBkYXRlZEF0JzogJ3VwZGF0ZWRBdCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmRlbGV0ZWQnOiB0cnVlLFxyXG4gICAgICAgICAgJzp1cGRhdGVkQXQnOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuIl19
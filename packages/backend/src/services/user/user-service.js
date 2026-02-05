"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
// Mock AWS SDK for development
class MockDynamoDBClient {
    constructor(config) { }
}
class MockDynamoDBDocumentClient {
    static from(client) {
        return new MockDynamoDBDocumentClient();
    }
    async send(command) {
        // Mock implementation for development
        console.error('Mock DynamoDB operation - replace with real AWS SDK in production');
        return { Item: null, Items: [] };
    }
}
class MockGetCommand {
    constructor(params) { }
}
class MockPutCommand {
    constructor(params) { }
}
class MockUpdateCommand {
    constructor(params) { }
}
class MockQueryCommand {
    constructor(params) { }
}
// Mock UUID function
const mockUuidv4 = () => `mock-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
// Use mocks for development
const DynamoDBClient = MockDynamoDBClient;
const DynamoDBDocumentClient = MockDynamoDBDocumentClient;
const GetCommand = MockGetCommand;
const PutCommand = MockPutCommand;
const UpdateCommand = MockUpdateCommand;
const QueryCommand = MockQueryCommand;
const uuidv4 = mockUuidv4;
class UserService {
    docClient;
    tableName;
    constructor() {
        const client = new DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.docClient = DynamoDBDocumentClient.from(client);
        this.tableName = process.env.USERS_TABLE_NAME || 'misra-platform-users';
    }
    async createUser(userData) {
        const now = new Date();
        const user = {
            userId: uuidv4(),
            email: userData.email,
            organizationId: userData.organizationId,
            role: userData.role,
            preferences: userData.preferences,
            createdAt: now,
            lastLoginAt: now,
        };
        try {
            await this.docClient.send(new PutCommand({
                TableName: this.tableName,
                Item: {
                    ...user,
                    createdAt: now.getTime(),
                    lastLoginAt: now.getTime(),
                },
                ConditionExpression: 'attribute_not_exists(userId)',
            }));
            return user;
        }
        catch (error) {
            console.error('Error creating user:', error);
            throw new Error('Failed to create user');
        }
    }
    async getUserById(userId) {
        try {
            const result = await this.docClient.send(new GetCommand({
                TableName: this.tableName,
                Key: { userId },
            }));
            if (!result.Item) {
                return null;
            }
            return this.mapDynamoItemToUser(result.Item);
        }
        catch (error) {
            console.error('Error getting user by ID:', error);
            throw new Error('Failed to get user');
        }
    }
    async getUserByEmail(email) {
        try {
            // Note: This requires a GSI on email field
            const result = await this.docClient.send(new QueryCommand({
                TableName: this.tableName,
                IndexName: 'email-index',
                KeyConditionExpression: 'email = :email',
                ExpressionAttributeValues: {
                    ':email': email,
                },
                Limit: 1,
            }));
            if (!result.Items || result.Items.length === 0) {
                return null;
            }
            return this.mapDynamoItemToUser(result.Items[0]);
        }
        catch (error) {
            console.error('Error getting user by email:', error);
            // If GSI doesn't exist yet, return null for now
            return null;
        }
    }
    async updateLastLogin(userId) {
        try {
            await this.docClient.send(new UpdateCommand({
                TableName: this.tableName,
                Key: { userId },
                UpdateExpression: 'SET lastLoginAt = :timestamp',
                ExpressionAttributeValues: {
                    ':timestamp': Date.now(),
                },
            }));
        }
        catch (error) {
            console.error('Error updating last login:', error);
            // Don't throw error for this non-critical operation
        }
    }
    async updateUserPreferences(userId, preferences) {
        try {
            const updateExpressions = [];
            const expressionAttributeValues = {};
            if (preferences.theme) {
                updateExpressions.push('preferences.theme = :theme');
                expressionAttributeValues[':theme'] = preferences.theme;
            }
            if (preferences.notifications) {
                updateExpressions.push('preferences.notifications = :notifications');
                expressionAttributeValues[':notifications'] = preferences.notifications;
            }
            if (preferences.defaultMisraRuleSet) {
                updateExpressions.push('preferences.defaultMisraRuleSet = :defaultMisraRuleSet');
                expressionAttributeValues[':defaultMisraRuleSet'] = preferences.defaultMisraRuleSet;
            }
            if (updateExpressions.length === 0) {
                return;
            }
            await this.docClient.send(new UpdateCommand({
                TableName: this.tableName,
                Key: { userId },
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeValues: expressionAttributeValues,
            }));
        }
        catch (error) {
            console.error('Error updating user preferences:', error);
            throw new Error('Failed to update user preferences');
        }
    }
    async getUsersByOrganization(organizationId) {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: this.tableName,
                IndexName: 'organizationId-index',
                KeyConditionExpression: 'organizationId = :organizationId',
                ExpressionAttributeValues: {
                    ':organizationId': organizationId,
                },
            }));
            if (!result.Items) {
                return [];
            }
            return result.Items.map((item) => this.mapDynamoItemToUser(item));
        }
        catch (error) {
            console.error('Error getting users by organization:', error);
            throw new Error('Failed to get organization users');
        }
    }
    mapDynamoItemToUser(item) {
        return {
            userId: item.userId,
            email: item.email,
            organizationId: item.organizationId,
            role: item.role,
            preferences: item.preferences,
            createdAt: new Date(item.createdAt),
            lastLoginAt: new Date(item.lastLoginAt),
        };
    }
}
exports.UserService = UserService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNlci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQWdDQSwrQkFBK0I7QUFDL0IsTUFBTSxrQkFBa0I7SUFDdEIsWUFBWSxNQUFXLElBQUcsQ0FBQztDQUM1QjtBQUVELE1BQU0sMEJBQTBCO0lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBVztRQUNyQixPQUFPLElBQUksMEJBQTBCLEVBQUUsQ0FBQztJQUMxQyxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFZO1FBQ3JCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsS0FBSyxDQUFDLG1FQUFtRSxDQUFDLENBQUM7UUFDbkYsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDO0lBQ25DLENBQUM7Q0FDRjtBQUVELE1BQU0sY0FBYztJQUNsQixZQUFZLE1BQVcsSUFBRyxDQUFDO0NBQzVCO0FBRUQsTUFBTSxjQUFjO0lBQ2xCLFlBQVksTUFBVyxJQUFHLENBQUM7Q0FDNUI7QUFFRCxNQUFNLGlCQUFpQjtJQUNyQixZQUFZLE1BQVcsSUFBRyxDQUFDO0NBQzVCO0FBRUQsTUFBTSxnQkFBZ0I7SUFDcEIsWUFBWSxNQUFXLElBQUcsQ0FBQztDQUM1QjtBQUVELHFCQUFxQjtBQUNyQixNQUFNLFVBQVUsR0FBRyxHQUFXLEVBQUUsQ0FBQyxhQUFhLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUV0Ryw0QkFBNEI7QUFDNUIsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQUM7QUFDMUMsTUFBTSxzQkFBc0IsR0FBRywwQkFBMEIsQ0FBQztBQUMxRCxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUM7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QUMsU0FBUyxDQUFDO1lBQ25DLFdBQVcsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1NBQ3hDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF0TEQsa0NBc0xDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gRGVjbGFyZSBOb2RlLmpzIGdsb2JhbHMgZm9yIExhbWJkYSBlbnZpcm9ubWVudFxyXG5kZWNsYXJlIGNvbnN0IHByb2Nlc3M6IHtcclxuICBlbnY6IHtcclxuICAgIEFXU19SRUdJT04/OiBzdHJpbmc7XHJcbiAgICBVU0VSU19UQUJMRV9OQU1FPzogc3RyaW5nO1xyXG4gIH07XHJcbn07XHJcblxyXG5kZWNsYXJlIGNvbnN0IGNvbnNvbGU6IHtcclxuICBlcnJvcjogKG1lc3NhZ2U6IHN0cmluZywgLi4uYXJnczogYW55W10pID0+IHZvaWQ7XHJcbn07XHJcblxyXG4vLyBMb2NhbCB0eXBlIGRlY2xhcmF0aW9ucyBmb3IgZGV2ZWxvcG1lbnRcclxuaW50ZXJmYWNlIFVzZXIge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICByb2xlOiAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJztcclxuICBwcmVmZXJlbmNlczogVXNlclByZWZlcmVuY2VzO1xyXG4gIGNyZWF0ZWRBdDogRGF0ZTtcclxuICBsYXN0TG9naW5BdDogRGF0ZTtcclxufVxyXG5cclxuaW50ZXJmYWNlIFVzZXJQcmVmZXJlbmNlcyB7XHJcbiAgdGhlbWU6ICdsaWdodCcgfCAnZGFyayc7XHJcbiAgbm90aWZpY2F0aW9uczoge1xyXG4gICAgZW1haWw6IGJvb2xlYW47XHJcbiAgICB3ZWJob29rOiBib29sZWFuO1xyXG4gIH07XHJcbiAgZGVmYXVsdE1pc3JhUnVsZVNldDogJ01JU1JBX0NfMjAwNCcgfCAnTUlTUkFfQ18yMDEyJyB8ICdNSVNSQV9DUFBfMjAwOCc7XHJcbn1cclxuXHJcbi8vIE1vY2sgQVdTIFNESyBmb3IgZGV2ZWxvcG1lbnRcclxuY2xhc3MgTW9ja0R5bmFtb0RCQ2xpZW50IHtcclxuICBjb25zdHJ1Y3Rvcihjb25maWc6IGFueSkge31cclxufVxyXG5cclxuY2xhc3MgTW9ja0R5bmFtb0RCRG9jdW1lbnRDbGllbnQge1xyXG4gIHN0YXRpYyBmcm9tKGNsaWVudDogYW55KSB7XHJcbiAgICByZXR1cm4gbmV3IE1vY2tEeW5hbW9EQkRvY3VtZW50Q2xpZW50KCk7XHJcbiAgfVxyXG4gIFxyXG4gIGFzeW5jIHNlbmQoY29tbWFuZDogYW55KTogUHJvbWlzZTxhbnk+IHtcclxuICAgIC8vIE1vY2sgaW1wbGVtZW50YXRpb24gZm9yIGRldmVsb3BtZW50XHJcbiAgICBjb25zb2xlLmVycm9yKCdNb2NrIER5bmFtb0RCIG9wZXJhdGlvbiAtIHJlcGxhY2Ugd2l0aCByZWFsIEFXUyBTREsgaW4gcHJvZHVjdGlvbicpO1xyXG4gICAgcmV0dXJuIHsgSXRlbTogbnVsbCwgSXRlbXM6IFtdIH07XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBNb2NrR2V0Q29tbWFuZCB7XHJcbiAgY29uc3RydWN0b3IocGFyYW1zOiBhbnkpIHt9XHJcbn1cclxuXHJcbmNsYXNzIE1vY2tQdXRDb21tYW5kIHtcclxuICBjb25zdHJ1Y3RvcihwYXJhbXM6IGFueSkge31cclxufVxyXG5cclxuY2xhc3MgTW9ja1VwZGF0ZUNvbW1hbmQge1xyXG4gIGNvbnN0cnVjdG9yKHBhcmFtczogYW55KSB7fVxyXG59XHJcblxyXG5jbGFzcyBNb2NrUXVlcnlDb21tYW5kIHtcclxuICBjb25zdHJ1Y3RvcihwYXJhbXM6IGFueSkge31cclxufVxyXG5cclxuLy8gTW9jayBVVUlEIGZ1bmN0aW9uXHJcbmNvbnN0IG1vY2tVdWlkdjQgPSAoKTogc3RyaW5nID0+IGBtb2NrLXV1aWQtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xyXG5cclxuLy8gVXNlIG1vY2tzIGZvciBkZXZlbG9wbWVudFxyXG5jb25zdCBEeW5hbW9EQkNsaWVudCA9IE1vY2tEeW5hbW9EQkNsaWVudDtcclxuY29uc3QgRHluYW1vREJEb2N1bWVudENsaWVudCA9IE1vY2tEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG5jb25zdCBHZXRDb21tYW5kID0gTW9ja0dldENvbW1hbmQ7XHJcbmNvbnN0IFB1dENvbW1hbmQgPSBNb2NrUHV0Q29tbWFuZDtcclxuY29uc3QgVXBkYXRlQ29tbWFuZCA9IE1vY2tVcGRhdGVDb21tYW5kO1xyXG5jb25zdCBRdWVyeUNvbW1hbmQgPSBNb2NrUXVlcnlDb21tYW5kO1xyXG5jb25zdCB1dWlkdjQgPSBtb2NrVXVpZHY0O1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVVc2VyUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIHJvbGU6ICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInO1xyXG4gIHByZWZlcmVuY2VzOiBVc2VyUHJlZmVyZW5jZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBVc2VyU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBkb2NDbGllbnQ6IE1vY2tEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG4gIHByaXZhdGUgdGFibGVOYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xyXG4gICAgdGhpcy50YWJsZU5hbWUgPSBwcm9jZXNzLmVudi5VU0VSU19UQUJMRV9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS11c2Vycyc7XHJcbiAgfVxyXG5cclxuICBhc3luYyBjcmVhdGVVc2VyKHVzZXJEYXRhOiBDcmVhdGVVc2VyUmVxdWVzdCk6IFByb21pc2U8VXNlcj4ge1xyXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuICAgIGNvbnN0IHVzZXI6IFVzZXIgPSB7XHJcbiAgICAgIHVzZXJJZDogdXVpZHY0KCksXHJcbiAgICAgIGVtYWlsOiB1c2VyRGF0YS5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXJEYXRhLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICByb2xlOiB1c2VyRGF0YS5yb2xlLFxyXG4gICAgICBwcmVmZXJlbmNlczogdXNlckRhdGEucHJlZmVyZW5jZXMsXHJcbiAgICAgIGNyZWF0ZWRBdDogbm93LFxyXG4gICAgICBsYXN0TG9naW5BdDogbm93LFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJdGVtOiB7XHJcbiAgICAgICAgICAgIC4uLnVzZXIsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93LmdldFRpbWUoKSxcclxuICAgICAgICAgICAgbGFzdExvZ2luQXQ6IG5vdy5nZXRUaW1lKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgQ29uZGl0aW9uRXhwcmVzc2lvbjogJ2F0dHJpYnV0ZV9ub3RfZXhpc3RzKHVzZXJJZCknLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICByZXR1cm4gdXNlcjtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNyZWF0aW5nIHVzZXI6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdXNlcicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VXNlckJ5SWQodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPFVzZXIgfCBudWxsPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBLZXk6IHsgdXNlcklkIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmICghcmVzdWx0Lkl0ZW0pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHRoaXMubWFwRHluYW1vSXRlbVRvVXNlcihyZXN1bHQuSXRlbSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHVzZXIgYnkgSUQ6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZXQgdXNlcicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VXNlckJ5RW1haWwoZW1haWw6IHN0cmluZyk6IFByb21pc2U8VXNlciB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIE5vdGU6IFRoaXMgcmVxdWlyZXMgYSBHU0kgb24gZW1haWwgZmllbGRcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChcclxuICAgICAgICBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdlbWFpbC1pbmRleCcsXHJcbiAgICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZW1haWwgPSA6ZW1haWwnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgICAnOmVtYWlsJzogZW1haWwsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgTGltaXQ6IDEsXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmICghcmVzdWx0Lkl0ZW1zIHx8IHJlc3VsdC5JdGVtcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHRoaXMubWFwRHluYW1vSXRlbVRvVXNlcihyZXN1bHQuSXRlbXNbMF0pO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB1c2VyIGJ5IGVtYWlsOicsIGVycm9yKTtcclxuICAgICAgLy8gSWYgR1NJIGRvZXNuJ3QgZXhpc3QgeWV0LCByZXR1cm4gbnVsbCBmb3Igbm93XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgdXBkYXRlTGFzdExvZ2luKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBLZXk6IHsgdXNlcklkIH0sXHJcbiAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIGxhc3RMb2dpbkF0ID0gOnRpbWVzdGFtcCcsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6dGltZXN0YW1wJzogRGF0ZS5ub3coKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGxhc3QgbG9naW46JywgZXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCB0aHJvdyBlcnJvciBmb3IgdGhpcyBub24tY3JpdGljYWwgb3BlcmF0aW9uXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyB1cGRhdGVVc2VyUHJlZmVyZW5jZXModXNlcklkOiBzdHJpbmcsIHByZWZlcmVuY2VzOiBQYXJ0aWFsPFVzZXJQcmVmZXJlbmNlcz4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb25zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcblxyXG4gICAgICBpZiAocHJlZmVyZW5jZXMudGhlbWUpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCdwcmVmZXJlbmNlcy50aGVtZSA9IDp0aGVtZScpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp0aGVtZSddID0gcHJlZmVyZW5jZXMudGhlbWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChwcmVmZXJlbmNlcy5ub3RpZmljYXRpb25zKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgncHJlZmVyZW5jZXMubm90aWZpY2F0aW9ucyA9IDpub3RpZmljYXRpb25zJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOm5vdGlmaWNhdGlvbnMnXSA9IHByZWZlcmVuY2VzLm5vdGlmaWNhdGlvbnM7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChwcmVmZXJlbmNlcy5kZWZhdWx0TWlzcmFSdWxlU2V0KSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgncHJlZmVyZW5jZXMuZGVmYXVsdE1pc3JhUnVsZVNldCA9IDpkZWZhdWx0TWlzcmFSdWxlU2V0Jyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmRlZmF1bHRNaXNyYVJ1bGVTZXQnXSA9IHByZWZlcmVuY2VzLmRlZmF1bHRNaXNyYVJ1bGVTZXQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh1cGRhdGVFeHByZXNzaW9ucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoXHJcbiAgICAgICAgbmV3IFVwZGF0ZUNvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICAgIEtleTogeyB1c2VySWQgfSxcclxuICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGBTRVQgJHt1cGRhdGVFeHByZXNzaW9ucy5qb2luKCcsICcpfWAsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyB1c2VyIHByZWZlcmVuY2VzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gdXBkYXRlIHVzZXIgcHJlZmVyZW5jZXMnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGdldFVzZXJzQnlPcmdhbml6YXRpb24ob3JnYW5pemF0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8VXNlcltdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICAgIEluZGV4TmFtZTogJ29yZ2FuaXphdGlvbklkLWluZGV4JyxcclxuICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdvcmdhbml6YXRpb25JZCA9IDpvcmdhbml6YXRpb25JZCcsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6b3JnYW5pemF0aW9uSWQnOiBvcmdhbml6YXRpb25JZCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmICghcmVzdWx0Lkl0ZW1zKSB7XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zLm1hcCgoaXRlbTogYW55KSA9PiB0aGlzLm1hcER5bmFtb0l0ZW1Ub1VzZXIoaXRlbSkpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB1c2VycyBieSBvcmdhbml6YXRpb246JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZXQgb3JnYW5pemF0aW9uIHVzZXJzJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIG1hcER5bmFtb0l0ZW1Ub1VzZXIoaXRlbTogYW55KTogVXNlciB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB1c2VySWQ6IGl0ZW0udXNlcklkLFxyXG4gICAgICBlbWFpbDogaXRlbS5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IGl0ZW0ub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIHJvbGU6IGl0ZW0ucm9sZSxcclxuICAgICAgcHJlZmVyZW5jZXM6IGl0ZW0ucHJlZmVyZW5jZXMsXHJcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoaXRlbS5jcmVhdGVkQXQpLFxyXG4gICAgICBsYXN0TG9naW5BdDogbmV3IERhdGUoaXRlbS5sYXN0TG9naW5BdCksXHJcbiAgICB9O1xyXG4gIH1cclxufSJdfQ==
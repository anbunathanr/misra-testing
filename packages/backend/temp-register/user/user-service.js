"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
class UserService {
    docClient;
    tableName;
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        this.tableName = process.env.USERS_TABLE_NAME || 'misra-platform-users';
    }
    async createUser(userData) {
        const now = new Date();
        const user = {
            userId: (0, uuid_1.v4)(),
            email: userData.email,
            organizationId: userData.organizationId,
            role: userData.role,
            preferences: userData.preferences,
            createdAt: now,
            lastLoginAt: now,
        };
        try {
            await this.docClient.send(new lib_dynamodb_1.PutCommand({
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
            const result = await this.docClient.send(new lib_dynamodb_1.GetCommand({
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
            const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
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
            await this.docClient.send(new lib_dynamodb_1.UpdateCommand({
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
            await this.docClient.send(new lib_dynamodb_1.UpdateCommand({
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
            const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNlci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUEwRDtBQUMxRCx3REFNK0I7QUFDL0IsK0JBQW9DO0FBNkJwQyxNQUFhLFdBQVc7SUFDZCxTQUFTLENBQXlCO0lBQ2xDLFNBQVMsQ0FBUztJQUUxQjtRQUNFLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQztZQUNoQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksc0JBQXNCLENBQUM7SUFDMUUsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsUUFBMkI7UUFDMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixNQUFNLElBQUksR0FBUztZQUNqQixNQUFNLEVBQUUsSUFBQSxTQUFNLEdBQUU7WUFDaEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO1lBQ3JCLGNBQWMsRUFBRSxRQUFRLENBQUMsY0FBYztZQUN2QyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXO1lBQ2pDLFNBQVMsRUFBRSxHQUFHO1lBQ2QsV0FBVyxFQUFFLEdBQUc7U0FDakIsQ0FBQztRQUVGLElBQUksQ0FBQztZQUNILE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQ3ZCLElBQUkseUJBQVUsQ0FBQztnQkFDYixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLElBQUksRUFBRTtvQkFDSixHQUFHLElBQUk7b0JBQ1AsU0FBUyxFQUFF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LFNBQVMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25DLFdBQVcsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO1NBQ3hDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF0TEQsa0NBc0xDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQge1xyXG4gIER5bmFtb0RCRG9jdW1lbnRDbGllbnQsXHJcbiAgR2V0Q29tbWFuZCxcclxuICBQdXRDb21tYW5kLFxyXG4gIFVwZGF0ZUNvbW1hbmQsXHJcbiAgUXVlcnlDb21tYW5kLFxyXG59IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5cclxuLy8gTG9jYWwgdHlwZSBkZWNsYXJhdGlvbnNcclxuaW50ZXJmYWNlIFVzZXIge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICByb2xlOiAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJztcclxuICBwcmVmZXJlbmNlczogVXNlclByZWZlcmVuY2VzO1xyXG4gIGNyZWF0ZWRBdDogRGF0ZTtcclxuICBsYXN0TG9naW5BdDogRGF0ZTtcclxufVxyXG5cclxuaW50ZXJmYWNlIFVzZXJQcmVmZXJlbmNlcyB7XHJcbiAgdGhlbWU6ICdsaWdodCcgfCAnZGFyayc7XHJcbiAgbm90aWZpY2F0aW9uczoge1xyXG4gICAgZW1haWw6IGJvb2xlYW47XHJcbiAgICB3ZWJob29rOiBib29sZWFuO1xyXG4gIH07XHJcbiAgZGVmYXVsdE1pc3JhUnVsZVNldDogJ01JU1JBX0NfMjAwNCcgfCAnTUlTUkFfQ18yMDEyJyB8ICdNSVNSQV9DUFBfMjAwOCc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlVXNlclJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICByb2xlOiAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJztcclxuICBwcmVmZXJlbmNlczogVXNlclByZWZlcmVuY2VzO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVXNlclNlcnZpY2Uge1xyXG4gIHByaXZhdGUgZG9jQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG4gIHByaXZhdGUgdGFibGVOYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xyXG4gICAgdGhpcy50YWJsZU5hbWUgPSBwcm9jZXNzLmVudi5VU0VSU19UQUJMRV9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS11c2Vycyc7XHJcbiAgfVxyXG5cclxuICBhc3luYyBjcmVhdGVVc2VyKHVzZXJEYXRhOiBDcmVhdGVVc2VyUmVxdWVzdCk6IFByb21pc2U8VXNlcj4ge1xyXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuICAgIGNvbnN0IHVzZXI6IFVzZXIgPSB7XHJcbiAgICAgIHVzZXJJZDogdXVpZHY0KCksXHJcbiAgICAgIGVtYWlsOiB1c2VyRGF0YS5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXJEYXRhLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICByb2xlOiB1c2VyRGF0YS5yb2xlLFxyXG4gICAgICBwcmVmZXJlbmNlczogdXNlckRhdGEucHJlZmVyZW5jZXMsXHJcbiAgICAgIGNyZWF0ZWRBdDogbm93LFxyXG4gICAgICBsYXN0TG9naW5BdDogbm93LFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJdGVtOiB7XHJcbiAgICAgICAgICAgIC4uLnVzZXIsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93LmdldFRpbWUoKSxcclxuICAgICAgICAgICAgbGFzdExvZ2luQXQ6IG5vdy5nZXRUaW1lKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgQ29uZGl0aW9uRXhwcmVzc2lvbjogJ2F0dHJpYnV0ZV9ub3RfZXhpc3RzKHVzZXJJZCknLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICByZXR1cm4gdXNlcjtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNyZWF0aW5nIHVzZXI6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdXNlcicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VXNlckJ5SWQodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPFVzZXIgfCBudWxsPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBLZXk6IHsgdXNlcklkIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmICghcmVzdWx0Lkl0ZW0pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHRoaXMubWFwRHluYW1vSXRlbVRvVXNlcihyZXN1bHQuSXRlbSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHVzZXIgYnkgSUQ6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZXQgdXNlcicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0VXNlckJ5RW1haWwoZW1haWw6IHN0cmluZyk6IFByb21pc2U8VXNlciB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIE5vdGU6IFRoaXMgcmVxdWlyZXMgYSBHU0kgb24gZW1haWwgZmllbGRcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChcclxuICAgICAgICBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdlbWFpbC1pbmRleCcsXHJcbiAgICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZW1haWwgPSA6ZW1haWwnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgICAnOmVtYWlsJzogZW1haWwsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgTGltaXQ6IDEsXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmICghcmVzdWx0Lkl0ZW1zIHx8IHJlc3VsdC5JdGVtcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHRoaXMubWFwRHluYW1vSXRlbVRvVXNlcihyZXN1bHQuSXRlbXNbMF0pO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB1c2VyIGJ5IGVtYWlsOicsIGVycm9yKTtcclxuICAgICAgLy8gSWYgR1NJIGRvZXNuJ3QgZXhpc3QgeWV0LCByZXR1cm4gbnVsbCBmb3Igbm93XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgdXBkYXRlTGFzdExvZ2luKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBLZXk6IHsgdXNlcklkIH0sXHJcbiAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIGxhc3RMb2dpbkF0ID0gOnRpbWVzdGFtcCcsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6dGltZXN0YW1wJzogRGF0ZS5ub3coKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGxhc3QgbG9naW46JywgZXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCB0aHJvdyBlcnJvciBmb3IgdGhpcyBub24tY3JpdGljYWwgb3BlcmF0aW9uXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyB1cGRhdGVVc2VyUHJlZmVyZW5jZXModXNlcklkOiBzdHJpbmcsIHByZWZlcmVuY2VzOiBQYXJ0aWFsPFVzZXJQcmVmZXJlbmNlcz4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb25zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcblxyXG4gICAgICBpZiAocHJlZmVyZW5jZXMudGhlbWUpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCdwcmVmZXJlbmNlcy50aGVtZSA9IDp0aGVtZScpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp0aGVtZSddID0gcHJlZmVyZW5jZXMudGhlbWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChwcmVmZXJlbmNlcy5ub3RpZmljYXRpb25zKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgncHJlZmVyZW5jZXMubm90aWZpY2F0aW9ucyA9IDpub3RpZmljYXRpb25zJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOm5vdGlmaWNhdGlvbnMnXSA9IHByZWZlcmVuY2VzLm5vdGlmaWNhdGlvbnM7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChwcmVmZXJlbmNlcy5kZWZhdWx0TWlzcmFSdWxlU2V0KSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgncHJlZmVyZW5jZXMuZGVmYXVsdE1pc3JhUnVsZVNldCA9IDpkZWZhdWx0TWlzcmFSdWxlU2V0Jyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmRlZmF1bHRNaXNyYVJ1bGVTZXQnXSA9IHByZWZlcmVuY2VzLmRlZmF1bHRNaXNyYVJ1bGVTZXQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh1cGRhdGVFeHByZXNzaW9ucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoXHJcbiAgICAgICAgbmV3IFVwZGF0ZUNvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICAgIEtleTogeyB1c2VySWQgfSxcclxuICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGBTRVQgJHt1cGRhdGVFeHByZXNzaW9ucy5qb2luKCcsICcpfWAsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyB1c2VyIHByZWZlcmVuY2VzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gdXBkYXRlIHVzZXIgcHJlZmVyZW5jZXMnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGdldFVzZXJzQnlPcmdhbml6YXRpb24ob3JnYW5pemF0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8VXNlcltdPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICAgIEluZGV4TmFtZTogJ29yZ2FuaXphdGlvbklkLWluZGV4JyxcclxuICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdvcmdhbml6YXRpb25JZCA9IDpvcmdhbml6YXRpb25JZCcsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6b3JnYW5pemF0aW9uSWQnOiBvcmdhbml6YXRpb25JZCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmICghcmVzdWx0Lkl0ZW1zKSB7XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zLm1hcCgoaXRlbTogYW55KSA9PiB0aGlzLm1hcER5bmFtb0l0ZW1Ub1VzZXIoaXRlbSkpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB1c2VycyBieSBvcmdhbml6YXRpb246JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZXQgb3JnYW5pemF0aW9uIHVzZXJzJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIG1hcER5bmFtb0l0ZW1Ub1VzZXIoaXRlbTogYW55KTogVXNlciB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB1c2VySWQ6IGl0ZW0udXNlcklkLFxyXG4gICAgICBlbWFpbDogaXRlbS5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IGl0ZW0ub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgIHJvbGU6IGl0ZW0ucm9sZSxcclxuICAgICAgcHJlZmVyZW5jZXM6IGl0ZW0ucHJlZmVyZW5jZXMsXHJcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoaXRlbS5jcmVhdGVkQXQpLFxyXG4gICAgICBsYXN0TG9naW5BdDogbmV3IERhdGUoaXRlbS5sYXN0TG9naW5BdCksXHJcbiAgICB9O1xyXG4gIH1cclxufSJdfQ==
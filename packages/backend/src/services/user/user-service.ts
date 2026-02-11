import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// Local type declarations
interface User {
  userId: string;
  email: string;
  organizationId: string;
  role: 'admin' | 'developer' | 'viewer';
  preferences: UserPreferences;
  createdAt: Date;
  lastLoginAt: Date;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: {
    email: boolean;
    webhook: boolean;
  };
  defaultMisraRuleSet: 'MISRA_C_2004' | 'MISRA_C_2012' | 'MISRA_CPP_2008';
}

export interface CreateUserRequest {
  email: string;
  organizationId: string;
  role: 'admin' | 'developer' | 'viewer';
  preferences: UserPreferences;
}

export class UserService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.USERS_TABLE_NAME || 'misra-platform-users';
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const now = new Date();
    const user: User = {
      userId: uuidv4(),
      email: userData.email,
      organizationId: userData.organizationId,
      role: userData.role,
      preferences: userData.preferences,
      createdAt: now,
      lastLoginAt: now,
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            ...user,
            createdAt: now.getTime(),
            lastLoginAt: now.getTime(),
          },
          ConditionExpression: 'attribute_not_exists(userId)',
        })
      );

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.docClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { userId },
        })
      );

      if (!result.Item) {
        return null;
      }

      return this.mapDynamoItemToUser(result.Item);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error('Failed to get user');
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Note: This requires a GSI on email field
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': email,
          },
          Limit: 1,
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return this.mapDynamoItemToUser(result.Items[0]);
    } catch (error) {
      console.error('Error getting user by email:', error);
      // If GSI doesn't exist yet, return null for now
      return null;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { userId },
          UpdateExpression: 'SET lastLoginAt = :timestamp',
          ExpressionAttributeValues: {
            ':timestamp': Date.now(),
          },
        })
      );
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw error for this non-critical operation
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};

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

      await this.docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { userId },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    try {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'organizationId-index',
          KeyConditionExpression: 'organizationId = :organizationId',
          ExpressionAttributeValues: {
            ':organizationId': organizationId,
          },
        })
      );

      if (!result.Items) {
        return [];
      }

      return result.Items.map((item: any) => this.mapDynamoItemToUser(item));
    } catch (error) {
      console.error('Error getting users by organization:', error);
      throw new Error('Failed to get organization users');
    }
  }

  private mapDynamoItemToUser(item: any): User {
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
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TestSuite, CreateTestSuiteInput, UpdateTestSuiteInput } from '../types/test-suite';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TEST_SUITES_TABLE_NAME || 'TestSuites';

export class TestSuiteService {
  async createTestSuite(userId: string, input: CreateTestSuiteInput): Promise<TestSuite> {
    const now = Math.floor(Date.now() / 1000);
    const suite: TestSuite = {
      suiteId: uuidv4(),
      projectId: input.projectId,
      userId,
      name: input.name,
      description: input.description,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: suite,
      })
    );

    return suite;
  }

  async getTestSuite(suiteId: string): Promise<TestSuite | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { suiteId },
      })
    );

    return (result.Item as TestSuite) || null;
  }

  async getProjectTestSuites(projectId: string): Promise<TestSuite[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'ProjectIndex',
        KeyConditionExpression: 'projectId = :projectId',
        ExpressionAttributeValues: {
          ':projectId': projectId,
        },
      })
    );

    return (result.Items as TestSuite[]) || [];
  }

  async getUserTestSuites(userId: string): Promise<TestSuite[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    return (result.Items as TestSuite[]) || [];
  }

  async updateTestSuite(input: UpdateTestSuiteInput): Promise<TestSuite> {
    const now = Math.floor(Date.now() / 1000);
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

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

    if (input.tags) {
      updateExpressions.push('#tags = :tags');
      expressionAttributeNames['#tags'] = 'tags';
      expressionAttributeValues[':tags'] = input.tags;
    }

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { suiteId: input.suiteId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as TestSuite;
  }

  async deleteTestSuite(suiteId: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { suiteId },
        UpdateExpression: 'SET #deleted = :deleted, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#deleted': 'deleted',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':deleted': true,
          ':updatedAt': Math.floor(Date.now() / 1000),
        },
      })
    );
  }
}

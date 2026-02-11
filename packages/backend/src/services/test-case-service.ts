import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TestCase, CreateTestCaseInput, UpdateTestCaseInput } from '../types/test-case';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TEST_CASES_TABLE_NAME || 'TestCases';

export class TestCaseService {
  async createTestCase(userId: string, input: CreateTestCaseInput): Promise<TestCase> {
    const now = Math.floor(Date.now() / 1000);
    const testCase: TestCase = {
      testCaseId: uuidv4(),
      suiteId: input.suiteId,
      projectId: input.projectId,
      userId,
      name: input.name,
      description: input.description,
      type: input.type,
      steps: input.steps,
      priority: input.priority || 'medium',
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: testCase,
      })
    );

    return testCase;
  }

  async getTestCase(testCaseId: string): Promise<TestCase | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { testCaseId },
      })
    );

    return (result.Item as TestCase) || null;
  }

  async getSuiteTestCases(suiteId: string): Promise<TestCase[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'SuiteIndex',
        KeyConditionExpression: 'suiteId = :suiteId',
        ExpressionAttributeValues: {
          ':suiteId': suiteId,
        },
      })
    );

    return (result.Items as TestCase[]) || [];
  }

  async getProjectTestCases(projectId: string): Promise<TestCase[]> {
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

    return (result.Items as TestCase[]) || [];
  }

  async updateTestCase(input: UpdateTestCaseInput): Promise<TestCase> {
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

    if (input.type) {
      updateExpressions.push('#type = :type');
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = input.type;
    }

    if (input.steps) {
      updateExpressions.push('#steps = :steps');
      expressionAttributeNames['#steps'] = 'steps';
      expressionAttributeValues[':steps'] = input.steps;
    }

    if (input.priority) {
      updateExpressions.push('#priority = :priority');
      expressionAttributeNames['#priority'] = 'priority';
      expressionAttributeValues[':priority'] = input.priority;
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
        Key: { testCaseId: input.testCaseId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as TestCase;
  }

  async deleteTestCase(testCaseId: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { testCaseId },
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

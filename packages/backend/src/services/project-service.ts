import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TestProject, CreateProjectInput, UpdateProjectInput } from '../types/test-project';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.PROJECTS_TABLE_NAME || 'TestProjects';

export class ProjectService {
  async createProject(userId: string, input: CreateProjectInput): Promise<TestProject> {
    const now = Math.floor(Date.now() / 1000);
    const project: TestProject = {
      projectId: uuidv4(),
      userId,
      name: input.name,
      description: input.description,
      targetUrl: input.targetUrl,
      environment: input.environment,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: project,
      })
    );

    return project;
  }

  async getProject(projectId: string): Promise<TestProject | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { projectId },
      })
    );

    return (result.Item as TestProject) || null;
  }

  async getUserProjects(userId: string): Promise<TestProject[]> {
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

    return (result.Items as TestProject[]) || [];
  }

  async updateProject(input: UpdateProjectInput): Promise<TestProject> {
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

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { projectId: input.projectId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as TestProject;
  }

  async deleteProject(projectId: string): Promise<void> {
    await docClient.send(
      new UpdateCommand({
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
      })
    );
  }
}

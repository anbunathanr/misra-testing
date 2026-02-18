/**
 * Get Notification Templates Lambda
 * 
 * List all templates with optional filtering by event type or channel.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { NotificationTemplate } from '../../types/notification';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client as any);
const tableName = process.env.NOTIFICATION_TEMPLATES_TABLE || 'NotificationTemplates';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get templates request', { path: event.path });

  try {
    const params = event.queryStringParameters || {};
    const eventType = params.eventType;
    const channel = params.channel;

    let templates: NotificationTemplate[];

    // If eventType is provided, use GSI to query
    if (eventType) {
      const keyConditionExpression = channel
        ? 'eventType = :eventType AND channel = :channel'
        : 'eventType = :eventType';

      const expressionAttributeValues: Record<string, any> = {
        ':eventType': eventType,
      };

      if (channel) {
        expressionAttributeValues[':channel'] = channel;
      }

      const command = new QueryCommand({
        TableName: tableName,
        IndexName: 'EventTypeChannelIndex',
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      const response = await docClient.send(command);
      templates = (response.Items || []) as NotificationTemplate[];
    } else {
      // Otherwise, scan the table
      const filterExpression = channel ? 'channel = :channel' : undefined;
      const expressionAttributeValues = channel ? { ':channel': channel } : undefined;

      const command = new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      const response = await docClient.send(command);
      templates = (response.Items || []) as NotificationTemplate[];
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates }),
    };
  } catch (error) {
    console.error('Error getting templates', { error });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get templates' }),
    };
  }
};

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getUserFromContext } from '../../utils/auth-util';
import { FileMetadataService } from '../../services/file-metadata-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';

const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new DynamoDBClientWrapper(environment);
const fileMetadataService = new FileMetadataService(dbClient);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const user = getUserFromContext(event);
    if (!user.userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User not authenticated' }),
      };
    }

    const result = await fileMetadataService.getUserFiles(user.userId, { limit: 100 });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.items),
    };
  } catch (error) {
    console.error('Error getting files:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify([]),
    };
  }
};

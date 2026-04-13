import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { initializeSampleFilesLibrary } from '../../data/sample-files-library';

/**
 * Lambda function to initialize the sample files library
 * This should be called once during deployment to populate the DynamoDB table
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };

  try {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    console.log('Starting sample files library initialization...');
    
    await initializeSampleFilesLibrary();
    
    console.log('Sample files library initialization completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Sample files library initialized successfully',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error initializing sample files library:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to initialize sample files library',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
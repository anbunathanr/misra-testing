import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SampleFileService } from '../../services/sample-file-service';

/**
 * Lambda function to get sample files from the library
 * Supports filtering by language and difficulty level
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
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

    const sampleFileService = new SampleFileService();
    const queryParams = event.queryStringParameters || {};
    
    const language = queryParams.language as 'C' | 'CPP' | undefined;
    const difficultyLevel = queryParams.difficulty as 'basic' | 'intermediate' | 'advanced' | undefined;

    let sampleFiles;

    if (language && difficultyLevel) {
      // Get files matching both criteria
      const allByLanguage = await sampleFileService.getSampleFilesByLanguage(language);
      sampleFiles = allByLanguage.filter(file => file.difficultyLevel === difficultyLevel);
    } else if (language) {
      sampleFiles = await sampleFileService.getSampleFilesByLanguage(language);
    } else if (difficultyLevel) {
      sampleFiles = await sampleFileService.getSampleFilesByDifficulty(difficultyLevel);
    } else {
      sampleFiles = await sampleFileService.getAllSampleFiles();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        samples: sampleFiles,
        count: sampleFiles.length,
      }),
    };
  } catch (error) {
    console.error('Error getting sample files:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to retrieve sample files',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
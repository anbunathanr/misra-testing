import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SampleFile, SampleFileResponse } from '../types/sample-file';

export class SampleFileService {
  private readonly dynamoClient: DynamoDBDocumentClient;
  private readonly tableName = 'SampleFiles';

  constructor() {
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);
  }

  /**
   * Get all sample files from the library
   */
  async getAllSampleFiles(): Promise<SampleFileResponse[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Items) {
        return [];
      }

      return result.Items.map(item => this.mapToResponse(item as SampleFile));
    } catch (error) {
      console.error('Error getting sample files:', error);
      throw new Error('Failed to retrieve sample files');
    }
  }

  /**
   * Get sample files by language
   */
  async getSampleFilesByLanguage(language: 'C' | 'CPP'): Promise<SampleFileResponse[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'LanguageIndex',
        KeyConditionExpression: '#language = :language',
        ExpressionAttributeNames: {
          '#language': 'language',
        },
        ExpressionAttributeValues: {
          ':language': language,
        },
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Items) {
        return [];
      }

      return result.Items.map(item => this.mapToResponse(item as SampleFile));
    } catch (error) {
      console.error('Error getting sample files by language:', error);
      throw new Error(`Failed to retrieve ${language} sample files`);
    }
  }

  /**
   * Get sample files by difficulty level
   */
  async getSampleFilesByDifficulty(difficultyLevel: 'basic' | 'intermediate' | 'advanced'): Promise<SampleFileResponse[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'DifficultyIndex',
        KeyConditionExpression: 'difficulty_level = :difficulty',
        ExpressionAttributeValues: {
          ':difficulty': difficultyLevel,
        },
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Items) {
        return [];
      }

      return result.Items.map(item => this.mapToResponse(item as SampleFile));
    } catch (error) {
      console.error('Error getting sample files by difficulty:', error);
      throw new Error(`Failed to retrieve ${difficultyLevel} sample files`);
    }
  }

  /**
   * Get a specific sample file by ID
   */
  async getSampleFileById(sampleId: string): Promise<SampleFile | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          sample_id: sampleId,
        },
      });

      const result = await this.dynamoClient.send(command);
      
      if (!result.Item) {
        return null;
      }

      return result.Item as SampleFile;
    } catch (error) {
      console.error('Error getting sample file by ID:', error);
      throw new Error(`Failed to retrieve sample file: ${sampleId}`);
    }
  }

  /**
   * Randomly select a sample file based on criteria
   */
  async getRandomSampleFile(
    language?: 'C' | 'CPP',
    difficultyLevel?: 'basic' | 'intermediate' | 'advanced'
  ): Promise<SampleFileResponse | null> {
    try {
      let sampleFiles: SampleFileResponse[];

      if (language && difficultyLevel) {
        // Get files matching both criteria
        const allByLanguage = await this.getSampleFilesByLanguage(language);
        sampleFiles = allByLanguage.filter(file => file.difficultyLevel === difficultyLevel);
      } else if (language) {
        sampleFiles = await this.getSampleFilesByLanguage(language);
      } else if (difficultyLevel) {
        sampleFiles = await this.getSampleFilesByDifficulty(difficultyLevel);
      } else {
        sampleFiles = await this.getAllSampleFiles();
      }

      if (sampleFiles.length === 0) {
        return null;
      }

      // Randomly select one file
      const randomIndex = Math.floor(Math.random() * sampleFiles.length);
      return sampleFiles[randomIndex];
    } catch (error) {
      console.error('Error getting random sample file:', error);
      throw new Error('Failed to select random sample file');
    }
  }

  /**
   * Add a new sample file to the library
   */
  async addSampleFile(sampleFile: Omit<SampleFile, 'created_at' | 'updated_at'>): Promise<void> {
    try {
      const now = Date.now();
      const fileWithTimestamps: SampleFile = {
        ...sampleFile,
        created_at: now,
        updated_at: now,
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: fileWithTimestamps,
      });

      await this.dynamoClient.send(command);
    } catch (error) {
      console.error('Error adding sample file:', error);
      throw new Error('Failed to add sample file');
    }
  }

  /**
   * Map internal SampleFile to public SampleFileResponse
   */
  private mapToResponse(sampleFile: SampleFile): SampleFileResponse {
    return {
      id: sampleFile.sample_id,
      name: sampleFile.filename,
      language: sampleFile.language,
      description: sampleFile.description,
      expectedViolations: sampleFile.expected_violations,
      size: sampleFile.file_size,
      difficultyLevel: sampleFile.difficulty_level,
      violationCategories: sampleFile.violation_categories,
      learningObjectives: sampleFile.learning_objectives,
      estimatedAnalysisTime: sampleFile.estimated_analysis_time,
    };
  }
}
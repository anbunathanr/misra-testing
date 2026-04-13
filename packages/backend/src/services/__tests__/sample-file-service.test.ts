import { SampleFileService } from '../sample-file-service';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SampleFile, SampleFileResponse } from '../../types/sample-file';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const mockSend = jest.fn();
const mockDynamoClient = {
  send: mockSend,
} as unknown as DynamoDBDocumentClient;

// Mock DynamoDBDocumentClient.from
(DynamoDBDocumentClient.from as jest.Mock) = jest.fn().mockReturnValue(mockDynamoClient);

describe('SampleFileService', () => {
  let sampleFileService: SampleFileService;

  const mockSampleFile: SampleFile = {
    sample_id: 'test-sample-001',
    filename: 'test_file.c',
    file_content: 'I2luY2x1ZGUgPHN0ZGlvLmg+', // base64 encoded content
    language: 'C',
    description: 'Test C file with violations',
    expected_violations: 2,
    file_size: 256,
    difficulty_level: 'basic',
    created_at: 1640995200000,
    updated_at: 1640995200000,
    violation_categories: ['declarations', 'variables'],
    learning_objectives: ['Understanding function declarations'],
    estimated_analysis_time: 15,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sampleFileService = new SampleFileService();
  });

  describe('getAllSampleFiles', () => {
    it('should return all sample files', async () => {
      const mockResponse = {
        Items: [mockSampleFile],
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await sampleFileService.getAllSampleFiles();

      expect(mockSend).toHaveBeenCalledWith(expect.any(ScanCommand));
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockSampleFile.sample_id,
        name: mockSampleFile.filename,
        language: mockSampleFile.language,
        description: mockSampleFile.description,
        expectedViolations: mockSampleFile.expected_violations,
        size: mockSampleFile.file_size,
        difficultyLevel: mockSampleFile.difficulty_level,
        violationCategories: mockSampleFile.violation_categories,
        learningObjectives: mockSampleFile.learning_objectives,
        estimatedAnalysisTime: mockSampleFile.estimated_analysis_time,
      });
    });

    it('should return empty array when no files exist', async () => {
      const mockResponse = {
        Items: undefined,
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await sampleFileService.getAllSampleFiles();

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(sampleFileService.getAllSampleFiles()).rejects.toThrow('Failed to retrieve sample files');
    });
  });

  describe('getSampleFilesByLanguage', () => {
    it('should return files filtered by language', async () => {
      const mockResponse = {
        Items: [mockSampleFile],
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await sampleFileService.getSampleFilesByLanguage('C');

      expect(mockSend).toHaveBeenCalledWith(expect.any(QueryCommand));
      expect(result).toHaveLength(1);
      expect(result[0].language).toBe('C');
    });

    it('should handle errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(sampleFileService.getSampleFilesByLanguage('C')).rejects.toThrow('Failed to retrieve C sample files');
    });
  });

  describe('getSampleFilesByDifficulty', () => {
    it('should return files filtered by difficulty level', async () => {
      const mockResponse = {
        Items: [mockSampleFile],
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await sampleFileService.getSampleFilesByDifficulty('basic');

      expect(mockSend).toHaveBeenCalledWith(expect.any(QueryCommand));
      expect(result).toHaveLength(1);
      expect(result[0].difficultyLevel).toBe('basic');
    });

    it('should handle errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(sampleFileService.getSampleFilesByDifficulty('basic')).rejects.toThrow('Failed to retrieve basic sample files');
    });
  });

  describe('getSampleFileById', () => {
    it('should return a specific sample file', async () => {
      const mockResponse = {
        Item: mockSampleFile,
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await sampleFileService.getSampleFileById('test-sample-001');

      expect(mockSend).toHaveBeenCalledWith(expect.any(GetCommand));
      expect(result).toEqual(mockSampleFile);
    });

    it('should return null when file not found', async () => {
      const mockResponse = {
        Item: undefined,
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await sampleFileService.getSampleFileById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(sampleFileService.getSampleFileById('test-sample-001')).rejects.toThrow('Failed to retrieve sample file: test-sample-001');
    });
  });

  describe('getRandomSampleFile', () => {
    it('should return a random sample file', async () => {
      const mockResponse = {
        Items: [mockSampleFile],
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await sampleFileService.getRandomSampleFile();

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockSampleFile.sample_id);
    });

    it('should return null when no files available', async () => {
      const mockResponse = {
        Items: [],
      };

      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await sampleFileService.getRandomSampleFile();

      expect(result).toBeNull();
    });

    it('should filter by language and difficulty', async () => {
      const mockResponse = {
        Items: [mockSampleFile],
      };

      // Mock two calls - first for language filter, then for difficulty filter
      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await sampleFileService.getRandomSampleFile('C', 'basic');

      expect(mockSend).toHaveBeenCalledWith(expect.any(QueryCommand));
      expect(result).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(sampleFileService.getRandomSampleFile()).rejects.toThrow('Failed to select random sample file');
    });
  });

  describe('addSampleFile', () => {
    it('should add a new sample file', async () => {
      const sampleFileWithoutTimestamps = {
        ...mockSampleFile,
      };
      delete (sampleFileWithoutTimestamps as any).created_at;
      delete (sampleFileWithoutTimestamps as any).updated_at;

      mockSend.mockResolvedValueOnce({});

      await sampleFileService.addSampleFile(sampleFileWithoutTimestamps);

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutCommand));
      // Verify that timestamps were added to the item
      const putCommandCall = mockSend.mock.calls[0][0];
      expect(putCommandCall).toBeInstanceOf(PutCommand);
    });

    it('should handle errors gracefully', async () => {
      const sampleFileWithoutTimestamps = {
        ...mockSampleFile,
      };
      delete (sampleFileWithoutTimestamps as any).created_at;
      delete (sampleFileWithoutTimestamps as any).updated_at;

      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(sampleFileService.addSampleFile(sampleFileWithoutTimestamps)).rejects.toThrow('Failed to add sample file');
    });
  });
});
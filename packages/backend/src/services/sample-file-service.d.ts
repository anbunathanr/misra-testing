import { SampleFile, SampleFileResponse } from '../types/sample-file';
export declare class SampleFileService {
    private readonly dynamoClient;
    private readonly tableName;
    constructor();
    /**
     * Get all sample files from the library
     */
    getAllSampleFiles(): Promise<SampleFileResponse[]>;
    /**
     * Get sample files by language
     */
    getSampleFilesByLanguage(language: 'C' | 'CPP'): Promise<SampleFileResponse[]>;
    /**
     * Get sample files by difficulty level
     */
    getSampleFilesByDifficulty(difficultyLevel: 'basic' | 'intermediate' | 'advanced'): Promise<SampleFileResponse[]>;
    /**
     * Get a specific sample file by ID
     */
    getSampleFileById(sampleId: string): Promise<SampleFile | null>;
    /**
     * Randomly select a sample file based on criteria
     */
    getRandomSampleFile(language?: 'C' | 'CPP', difficultyLevel?: 'basic' | 'intermediate' | 'advanced'): Promise<SampleFileResponse | null>;
    /**
     * Add a new sample file to the library
     */
    addSampleFile(sampleFile: Omit<SampleFile, 'created_at' | 'updated_at'>): Promise<void>;
    /**
     * Map internal SampleFile to public SampleFileResponse
     */
    private mapToResponse;
}

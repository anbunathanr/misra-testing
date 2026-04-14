import { SampleFile } from '../types/sample-file';
/**
 * Curated library of sample C/C++ files with known MISRA violations
 * These files are used for automatic file selection in the production SaaS platform
 */
export declare const SAMPLE_FILES_LIBRARY: Omit<SampleFile, 'created_at' | 'updated_at'>[];
/**
 * Initialize the sample files library in DynamoDB
 */
export declare function initializeSampleFilesLibrary(): Promise<void>;

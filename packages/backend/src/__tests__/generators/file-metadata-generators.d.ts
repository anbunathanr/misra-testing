/**
 * Fast-check generators for property-based testing
 * Generates realistic test data for FileMetadata and related types
 */
import * as fc from 'fast-check';
import { FileMetadata, FileType, AnalysisStatus, AnalysisResults } from '../../types/file-metadata';
export declare const uuidGenerator: () => fc.Arbitrary<string>;
export declare const fileTypeGenerator: () => fc.Arbitrary<FileType>;
export declare const analysisStatusGenerator: () => fc.Arbitrary<AnalysisStatus>;
export declare const filenameGenerator: () => fc.Arbitrary<string>;
export declare const fileSizeGenerator: () => fc.Arbitrary<number>;
export declare const timestampGenerator: () => fc.Arbitrary<number>;
export declare const userIdGenerator: () => fc.Arbitrary<string>;
export declare const s3KeyGenerator: () => fc.Arbitrary<string>;
export declare const analysisResultsGenerator: () => fc.Arbitrary<AnalysisResults>;
export declare const fileMetadataGenerator: () => fc.Arbitrary<FileMetadata>;
export declare const partialFileMetadataGenerator: () => fc.Arbitrary<Partial<FileMetadata>>;
export declare const invalidFileIdGenerator: () => fc.Arbitrary<string>;
export declare const invalidFileTypeGenerator: () => fc.Arbitrary<string>;
export declare const invalidFileSizeGenerator: () => fc.Arbitrary<number>;

#!/usr/bin/env node
/**
 * DynamoDB Table Configuration Validation Script
 *
 * This script validates that the DynamoDB table configurations in the production
 * CDK stack meet all requirements specified in the design document.
 *
 * Requirements validated:
 * - Users table with proper indexing for email lookup
 * - FileMetadata table with user and timestamp indexing
 * - AnalysisResults table with multiple access patterns
 * - SampleFiles table with language and difficulty filtering
 * - Progress table for real-time updates
 * - KMS encryption for all tables
 * - Proper GSI configuration
 * - Point-in-time recovery for production
 * - TTL configuration where appropriate
 */
interface TableValidationResult {
    tableName: string;
    valid: boolean;
    issues: string[];
    requirements: {
        hasKmsEncryption: boolean;
        hasPointInTimeRecovery: boolean;
        hasRequiredGSIs: boolean;
        hasTTLWhenRequired: boolean;
        hasCorrectBillingMode: boolean;
    };
}
interface ValidationReport {
    overall: boolean;
    tables: TableValidationResult[];
    summary: {
        totalTables: number;
        validTables: number;
        totalIssues: number;
    };
}
declare class DynamoDBTableValidator {
    private app;
    private stack;
    constructor(environment?: 'dev' | 'staging' | 'production');
    /**
     * Validate all DynamoDB tables against spec requirements
     */
    validateTables(): ValidationReport;
    /**
     * Validate Users Table configuration
     */
    private validateUsersTable;
    /**
     * Validate File Metadata Table configuration
     */
    private validateFileMetadataTable;
    /**
     * Validate Analysis Results Table configuration
     */
    private validateAnalysisResultsTable;
    /**
     * Validate Sample Files Table configuration
     */
    private validateSampleFilesTable;
    /**
     * Validate Progress Table configuration
     */
    private validateProgressTable;
    /**
     * Generate a detailed validation report
     */
    generateReport(): string;
}
export { DynamoDBTableValidator, ValidationReport, TableValidationResult };

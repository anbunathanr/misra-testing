#!/usr/bin/env node
/**
 * DynamoDB Table Configuration Verification Script
 *
 * This script verifies that the DynamoDB table configurations in the production
 * CDK stack meet all requirements by analyzing the source code directly.
 */
declare class TableConfigVerifier {
    private stackFilePath;
    private stackContent;
    constructor();
    /**
     * Verify all table configurations
     */
    verifyAllTables(): boolean;
    /**
     * Verify a single table configuration
     */
    private verifyTable;
    /**
     * Generate a summary report
     */
    generateSummaryReport(): void;
}
export { TableConfigVerifier };

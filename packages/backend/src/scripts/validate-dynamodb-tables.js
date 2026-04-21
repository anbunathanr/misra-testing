#!/usr/bin/env node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBTableValidator = void 0;
const production_misra_stack_1 = require("../infrastructure/production-misra-stack");
const cdk = __importStar(require("aws-cdk-lib"));
class DynamoDBTableValidator {
    app;
    stack;
    constructor(environment = 'dev') {
        this.app = new cdk.App();
        this.stack = new production_misra_stack_1.ProductionMisraStack(this.app, 'ValidationStack', {
            environment,
            env: {
                account: '123456789012', // Dummy account for validation
                region: 'us-east-1',
            },
        });
    }
    /**
     * Validate all DynamoDB tables against spec requirements
     */
    validateTables() {
        const results = [
            this.validateUsersTable(),
            this.validateFileMetadataTable(),
            this.validateAnalysisResultsTable(),
            this.validateSampleFilesTable(),
            this.validateProgressTable(),
        ];
        const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
        const validTables = results.filter(result => result.valid).length;
        return {
            overall: totalIssues === 0,
            tables: results,
            summary: {
                totalTables: results.length,
                validTables,
                totalIssues,
            },
        };
    }
    /**
     * Validate Users Table configuration
     */
    validateUsersTable() {
        const table = this.stack.usersTable;
        const issues = [];
        const requirements = {
            hasKmsEncryption: false,
            hasPointInTimeRecovery: false,
            hasRequiredGSIs: false,
            hasTTLWhenRequired: true, // Not required for users table
            hasCorrectBillingMode: false,
        };
        // Check table name
        const expectedTableName = /^misra-platform-users-(dev|staging|production)$/;
        if (!expectedTableName.test(table.tableName)) {
            issues.push(`Invalid table name: ${table.tableName}. Expected format: misra-platform-users-{environment}`);
        }
        // Check partition key
        const partitionKey = table.schema?.partitionKey;
        if (!partitionKey || partitionKey.name !== 'userId' || partitionKey.type !== 'S') {
            issues.push('Partition key must be "userId" of type STRING');
        }
        // Check encryption (KMS)
        const encryption = table.encryption;
        if (encryption === 'CUSTOMER_MANAGED') {
            requirements.hasKmsEncryption = true;
        }
        else {
            issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
        }
        // Check billing mode
        const billingMode = table.billingMode;
        if (billingMode === 'PAY_PER_REQUEST') {
            requirements.hasCorrectBillingMode = true;
        }
        else {
            issues.push('Table must use PAY_PER_REQUEST billing mode');
        }
        // Check point-in-time recovery (production only)
        const pitr = table.pointInTimeRecoveryEnabled;
        if (this.stack.node.tryGetContext('environment') === 'production') {
            if (pitr) {
                requirements.hasPointInTimeRecovery = true;
            }
            else {
                issues.push('Point-in-time recovery must be enabled for production');
            }
        }
        else {
            requirements.hasPointInTimeRecovery = true; // Not required for non-prod
        }
        // Check required GSIs
        const gsis = table.globalSecondaryIndexes || [];
        const requiredGSIs = ['email-index'];
        const existingGSIs = gsis.map((gsi) => gsi.indexName);
        for (const requiredGSI of requiredGSIs) {
            if (!existingGSIs.includes(requiredGSI)) {
                issues.push(`Missing required GSI: ${requiredGSI}`);
            }
        }
        if (requiredGSIs.every(gsi => existingGSIs.includes(gsi))) {
            requirements.hasRequiredGSIs = true;
        }
        return {
            tableName: 'Users',
            valid: issues.length === 0,
            issues,
            requirements,
        };
    }
    /**
     * Validate File Metadata Table configuration
     */
    validateFileMetadataTable() {
        const table = this.stack.fileMetadataTable;
        const issues = [];
        const requirements = {
            hasKmsEncryption: false,
            hasPointInTimeRecovery: false,
            hasRequiredGSIs: false,
            hasTTLWhenRequired: true, // Not required for file metadata
            hasCorrectBillingMode: false,
        };
        // Check table name
        const expectedTableName = /^misra-platform-file-metadata-(dev|staging|production)$/;
        if (!expectedTableName.test(table.tableName)) {
            issues.push(`Invalid table name: ${table.tableName}. Expected format: misra-platform-file-metadata-{environment}`);
        }
        // Check partition key
        const partitionKey = table.schema?.partitionKey;
        if (!partitionKey || partitionKey.name !== 'fileId' || partitionKey.type !== 'S') {
            issues.push('Partition key must be "fileId" of type STRING');
        }
        // Check encryption
        const encryption = table.encryption;
        if (encryption === 'CUSTOMER_MANAGED') {
            requirements.hasKmsEncryption = true;
        }
        else {
            issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
        }
        // Check billing mode
        const billingMode = table.billingMode;
        if (billingMode === 'PAY_PER_REQUEST') {
            requirements.hasCorrectBillingMode = true;
        }
        else {
            issues.push('Table must use PAY_PER_REQUEST billing mode');
        }
        // Check point-in-time recovery
        const pitr = table.pointInTimeRecoveryEnabled;
        if (this.stack.node.tryGetContext('environment') === 'production') {
            if (pitr) {
                requirements.hasPointInTimeRecovery = true;
            }
            else {
                issues.push('Point-in-time recovery must be enabled for production');
            }
        }
        else {
            requirements.hasPointInTimeRecovery = true;
        }
        // Check required GSIs
        const gsis = table.globalSecondaryIndexes || [];
        const requiredGSIs = ['userId-uploadTimestamp-index', 'contentHash-index'];
        const existingGSIs = gsis.map((gsi) => gsi.indexName);
        for (const requiredGSI of requiredGSIs) {
            if (!existingGSIs.includes(requiredGSI)) {
                issues.push(`Missing required GSI: ${requiredGSI}`);
            }
        }
        if (requiredGSIs.every(gsi => existingGSIs.includes(gsi))) {
            requirements.hasRequiredGSIs = true;
        }
        return {
            tableName: 'FileMetadata',
            valid: issues.length === 0,
            issues,
            requirements,
        };
    }
    /**
     * Validate Analysis Results Table configuration
     */
    validateAnalysisResultsTable() {
        const table = this.stack.analysisResultsTable;
        const issues = [];
        const requirements = {
            hasKmsEncryption: false,
            hasPointInTimeRecovery: false,
            hasRequiredGSIs: false,
            hasTTLWhenRequired: false,
            hasCorrectBillingMode: false,
        };
        // Check table name
        const expectedTableName = /^misra-platform-analysis-results-(dev|staging|production)$/;
        if (!expectedTableName.test(table.tableName)) {
            issues.push(`Invalid table name: ${table.tableName}. Expected format: misra-platform-analysis-results-{environment}`);
        }
        // Check partition key and sort key
        const partitionKey = table.schema?.partitionKey;
        const sortKey = table.schema?.sortKey;
        if (!partitionKey || partitionKey.name !== 'analysisId' || partitionKey.type !== 'S') {
            issues.push('Partition key must be "analysisId" of type STRING');
        }
        if (!sortKey || sortKey.name !== 'timestamp' || sortKey.type !== 'N') {
            issues.push('Sort key must be "timestamp" of type NUMBER');
        }
        // Check encryption
        const encryption = table.encryption;
        if (encryption === 'CUSTOMER_MANAGED') {
            requirements.hasKmsEncryption = true;
        }
        else {
            issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
        }
        // Check billing mode
        const billingMode = table.billingMode;
        if (billingMode === 'PAY_PER_REQUEST') {
            requirements.hasCorrectBillingMode = true;
        }
        else {
            issues.push('Table must use PAY_PER_REQUEST billing mode');
        }
        // Check point-in-time recovery
        const pitr = table.pointInTimeRecoveryEnabled;
        if (this.stack.node.tryGetContext('environment') === 'production') {
            if (pitr) {
                requirements.hasPointInTimeRecovery = true;
            }
            else {
                issues.push('Point-in-time recovery must be enabled for production');
            }
        }
        else {
            requirements.hasPointInTimeRecovery = true;
        }
        // Check TTL configuration for non-production
        const ttlAttribute = table.timeToLiveAttribute;
        if (this.stack.node.tryGetContext('environment') !== 'production') {
            if (ttlAttribute === 'ttl') {
                requirements.hasTTLWhenRequired = true;
            }
            else {
                issues.push('TTL attribute "ttl" must be configured for non-production environments');
            }
        }
        else {
            requirements.hasTTLWhenRequired = true; // Not required for production
        }
        // Check required GSIs
        const gsis = table.globalSecondaryIndexes || [];
        const requiredGSIs = [
            'fileId-timestamp-index',
            'userId-timestamp-index',
            'contentHash-timestamp-index'
        ];
        const existingGSIs = gsis.map((gsi) => gsi.indexName);
        for (const requiredGSI of requiredGSIs) {
            if (!existingGSIs.includes(requiredGSI)) {
                issues.push(`Missing required GSI: ${requiredGSI}`);
            }
        }
        if (requiredGSIs.every(gsi => existingGSIs.includes(gsi))) {
            requirements.hasRequiredGSIs = true;
        }
        return {
            tableName: 'AnalysisResults',
            valid: issues.length === 0,
            issues,
            requirements,
        };
    }
    /**
     * Validate Sample Files Table configuration
     */
    validateSampleFilesTable() {
        const table = this.stack.sampleFilesTable;
        const issues = [];
        const requirements = {
            hasKmsEncryption: false,
            hasPointInTimeRecovery: true, // Not required for sample files
            hasRequiredGSIs: false,
            hasTTLWhenRequired: true, // Not required for sample files
            hasCorrectBillingMode: false,
        };
        // Check table name
        const expectedTableName = /^misra-platform-sample-files-(dev|staging|production)$/;
        if (!expectedTableName.test(table.tableName)) {
            issues.push(`Invalid table name: ${table.tableName}. Expected format: misra-platform-sample-files-{environment}`);
        }
        // Check partition key
        const partitionKey = table.schema?.partitionKey;
        if (!partitionKey || partitionKey.name !== 'sampleId' || partitionKey.type !== 'S') {
            issues.push('Partition key must be "sampleId" of type STRING');
        }
        // Check encryption
        const encryption = table.encryption;
        if (encryption === 'CUSTOMER_MANAGED') {
            requirements.hasKmsEncryption = true;
        }
        else {
            issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
        }
        // Check billing mode
        const billingMode = table.billingMode;
        if (billingMode === 'PAY_PER_REQUEST') {
            requirements.hasCorrectBillingMode = true;
        }
        else {
            issues.push('Table must use PAY_PER_REQUEST billing mode');
        }
        // Check required GSIs for sample file filtering
        const gsis = table.globalSecondaryIndexes || [];
        const requiredGSIs = [
            'language-difficultyLevel-index',
            'language-expectedCompliance-index',
            'usageCount-createdAt-index'
        ];
        const existingGSIs = gsis.map((gsi) => gsi.indexName);
        for (const requiredGSI of requiredGSIs) {
            if (!existingGSIs.includes(requiredGSI)) {
                issues.push(`Missing required GSI: ${requiredGSI}`);
            }
        }
        if (requiredGSIs.every(gsi => existingGSIs.includes(gsi))) {
            requirements.hasRequiredGSIs = true;
        }
        return {
            tableName: 'SampleFiles',
            valid: issues.length === 0,
            issues,
            requirements,
        };
    }
    /**
     * Validate Progress Table configuration
     */
    validateProgressTable() {
        const table = this.stack.progressTable;
        const issues = [];
        const requirements = {
            hasKmsEncryption: false,
            hasPointInTimeRecovery: true, // Not required for progress table
            hasRequiredGSIs: false,
            hasTTLWhenRequired: false,
            hasCorrectBillingMode: false,
        };
        // Check table name
        const expectedTableName = /^misra-platform-progress-(dev|staging|production)$/;
        if (!expectedTableName.test(table.tableName)) {
            issues.push(`Invalid table name: ${table.tableName}. Expected format: misra-platform-progress-{environment}`);
        }
        // Check partition key
        const partitionKey = table.schema?.partitionKey;
        if (!partitionKey || partitionKey.name !== 'analysisId' || partitionKey.type !== 'S') {
            issues.push('Partition key must be "analysisId" of type STRING');
        }
        // Check encryption
        const encryption = table.encryption;
        if (encryption === 'CUSTOMER_MANAGED') {
            requirements.hasKmsEncryption = true;
        }
        else {
            issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
        }
        // Check billing mode
        const billingMode = table.billingMode;
        if (billingMode === 'PAY_PER_REQUEST') {
            requirements.hasCorrectBillingMode = true;
        }
        else {
            issues.push('Table must use PAY_PER_REQUEST billing mode');
        }
        // Check TTL configuration (required for progress table)
        const ttlAttribute = table.timeToLiveAttribute;
        if (ttlAttribute === 'ttl') {
            requirements.hasTTLWhenRequired = true;
        }
        else {
            issues.push('TTL attribute "ttl" must be configured for progress table auto-cleanup');
        }
        // Check required GSIs
        const gsis = table.globalSecondaryIndexes || [];
        const requiredGSIs = ['userId-updatedAt-index'];
        const existingGSIs = gsis.map((gsi) => gsi.indexName);
        for (const requiredGSI of requiredGSIs) {
            if (!existingGSIs.includes(requiredGSI)) {
                issues.push(`Missing required GSI: ${requiredGSI}`);
            }
        }
        if (requiredGSIs.every(gsi => existingGSIs.includes(gsi))) {
            requirements.hasRequiredGSIs = true;
        }
        return {
            tableName: 'Progress',
            valid: issues.length === 0,
            issues,
            requirements,
        };
    }
    /**
     * Generate a detailed validation report
     */
    generateReport() {
        const report = this.validateTables();
        let output = '\n=== DynamoDB Table Configuration Validation Report ===\n\n';
        // Overall status
        output += `Overall Status: ${report.overall ? '✅ PASS' : '❌ FAIL'}\n`;
        output += `Tables: ${report.summary.validTables}/${report.summary.totalTables} valid\n`;
        output += `Total Issues: ${report.summary.totalIssues}\n\n`;
        // Individual table results
        for (const table of report.tables) {
            output += `--- ${table.tableName} Table ---\n`;
            output += `Status: ${table.valid ? '✅ PASS' : '❌ FAIL'}\n`;
            // Requirements checklist
            output += 'Requirements:\n';
            output += `  KMS Encryption: ${table.requirements.hasKmsEncryption ? '✅' : '❌'}\n`;
            output += `  Point-in-Time Recovery: ${table.requirements.hasPointInTimeRecovery ? '✅' : '❌'}\n`;
            output += `  Required GSIs: ${table.requirements.hasRequiredGSIs ? '✅' : '❌'}\n`;
            output += `  TTL Configuration: ${table.requirements.hasTTLWhenRequired ? '✅' : '❌'}\n`;
            output += `  Billing Mode: ${table.requirements.hasCorrectBillingMode ? '✅' : '❌'}\n`;
            // Issues
            if (table.issues.length > 0) {
                output += 'Issues:\n';
                for (const issue of table.issues) {
                    output += `  ❌ ${issue}\n`;
                }
            }
            output += '\n';
        }
        return output;
    }
}
exports.DynamoDBTableValidator = DynamoDBTableValidator;
// Main execution
if (require.main === module) {
    const environment = process.argv[2] || 'dev';
    console.log(`Validating DynamoDB tables for environment: ${environment}`);
    const validator = new DynamoDBTableValidator(environment);
    const report = validator.generateReport();
    console.log(report);
    // Exit with error code if validation fails
    const validation = validator.validateTables();
    process.exit(validation.overall ? 0 : 1);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGUtZHluYW1vZGItdGFibGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmFsaWRhdGUtZHluYW1vZGItdGFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHFGQUFnRjtBQUNoRixpREFBbUM7QUF5Qm5DLE1BQU0sc0JBQXNCO0lBQ2xCLEdBQUcsQ0FBVTtJQUNiLEtBQUssQ0FBdUI7SUFFcEMsWUFBWSxjQUFnRCxLQUFLO1FBQy9ELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLDZDQUFvQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLEVBQUU7WUFDakUsV0FBVztZQUNYLEdBQUcsRUFBRTtnQkFDSCxPQUFPLEVBQUUsY0FBYyxFQUFFLCtCQUErQjtnQkFDeEQsTUFBTSxFQUFFLFdBQVc7YUFDcEI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjO1FBQ25CLE1BQU0sT0FBTyxHQUE0QjtZQUN2QyxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDekIsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1lBQ2hDLElBQUksQ0FBQyw0QkFBNEIsRUFBRTtZQUNuQyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDL0IsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1NBQzdCLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMs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QUM1QixNQUFNLElBQUksV0FBVyxDQUFDO2dCQUN0QixLQUFLLE1BQU0sS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDakMsTUFBTSxJQUFJLE9BQU8sS0FBSyxJQUFJLENBQUM7Z0JBQzdCLENBQUM7WUFDSCxDQUFDO1lBRUQsTUFBTSxJQUFJLElBQUksQ0FBQztRQUNqQixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUNGO0FBa0JRLHdEQUFzQjtBQWhCL0IsaUJBQWlCO0FBQ2pCLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztJQUM1QixNQUFNLFdBQVcsR0FBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBc0MsSUFBSSxLQUFLLENBQUM7SUFFbkYsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsV0FBVyxFQUFFLENBQUMsQ0FBQztJQUUxRSxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzFELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUUxQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXBCLDJDQUEyQztJQUMzQyxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDOUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcblxyXG4vKipcclxuICogRHluYW1vREIgVGFibGUgQ29uZmlndXJhdGlvbiBWYWxpZGF0aW9uIFNjcmlwdFxyXG4gKiBcclxuICogVGhpcyBzY3JpcHQgdmFsaWRhdGVzIHRoYXQgdGhlIER5bmFtb0RCIHRhYmxlIGNvbmZpZ3VyYXRpb25zIGluIHRoZSBwcm9kdWN0aW9uXHJcbiAqIENESyBzdGFjayBtZWV0IGFsbCByZXF1aXJlbWVudHMgc3BlY2lmaWVkIGluIHRoZSBkZXNpZ24gZG9jdW1lbnQuXHJcbiAqIFxyXG4gKiBSZXF1aXJlbWVudHMgdmFsaWRhdGVkOlxyXG4gKiAtIFVzZXJzIHRhYmxlIHdpdGggcHJvcGVyIGluZGV4aW5nIGZvciBlbWFpbCBsb29rdXBcclxuICogLSBGaWxlTWV0YWRhdGEgdGFibGUgd2l0aCB1c2VyIGFuZCB0aW1lc3RhbXAgaW5kZXhpbmdcclxuICogLSBBbmFseXNpc1Jlc3VsdHMgdGFibGUgd2l0aCBtdWx0aXBsZSBhY2Nlc3MgcGF0dGVybnNcclxuICogLSBTYW1wbGVGaWxlcyB0YWJsZSB3aXRoIGxhbmd1YWdlIGFuZCBkaWZmaWN1bHR5IGZpbHRlcmluZ1xyXG4gKiAtIFByb2dyZXNzIHRhYmxlIGZvciByZWFsLXRpbWUgdXBkYXRlc1xyXG4gKiAtIEtNUyBlbmNyeXB0aW9uIGZvciBhbGwgdGFibGVzXHJcbiAqIC0gUHJvcGVyIEdTSSBjb25maWd1cmF0aW9uXHJcbiAqIC0gUG9pbnQtaW4tdGltZSByZWNvdmVyeSBmb3IgcHJvZHVjdGlvblxyXG4gKiAtIFRUTCBjb25maWd1cmF0aW9uIHdoZXJlIGFwcHJvcHJpYXRlXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgUHJvZHVjdGlvbk1pc3JhU3RhY2sgfSBmcm9tICcuLi9pbmZyYXN0cnVjdHVyZS9wcm9kdWN0aW9uLW1pc3JhLXN0YWNrJztcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuXHJcbmludGVyZmFjZSBUYWJsZVZhbGlkYXRpb25SZXN1bHQge1xyXG4gIHRhYmxlTmFtZTogc3RyaW5nO1xyXG4gIHZhbGlkOiBib29sZWFuO1xyXG4gIGlzc3Vlczogc3RyaW5nW107XHJcbiAgcmVxdWlyZW1lbnRzOiB7XHJcbiAgICBoYXNLbXNFbmNyeXB0aW9uOiBib29sZWFuO1xyXG4gICAgaGFzUG9pbnRJblRpbWVSZWNvdmVyeTogYm9vbGVhbjtcclxuICAgIGhhc1JlcXVpcmVkR1NJczogYm9vbGVhbjtcclxuICAgIGhhc1RUTFdoZW5SZXF1aXJlZDogYm9vbGVhbjtcclxuICAgIGhhc0NvcnJlY3RCaWxsaW5nTW9kZTogYm9vbGVhbjtcclxuICB9O1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVmFsaWRhdGlvblJlcG9ydCB7XHJcbiAgb3ZlcmFsbDogYm9vbGVhbjtcclxuICB0YWJsZXM6IFRhYmxlVmFsaWRhdGlvblJlc3VsdFtdO1xyXG4gIHN1bW1hcnk6IHtcclxuICAgIHRvdGFsVGFibGVzOiBudW1iZXI7XHJcbiAgICB2YWxpZFRhYmxlczogbnVtYmVyO1xyXG4gICAgdG90YWxJc3N1ZXM6IG51bWJlcjtcclxuICB9O1xyXG59XHJcblxyXG5jbGFzcyBEeW5hbW9EQlRhYmxlVmFsaWRhdG9yIHtcclxuICBwcml2YXRlIGFwcDogY2RrLkFwcDtcclxuICBwcml2YXRlIHN0YWNrOiBQcm9kdWN0aW9uTWlzcmFTdGFjaztcclxuXHJcbiAgY29uc3RydWN0b3IoZW52aXJvbm1lbnQ6ICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nID0gJ2RldicpIHtcclxuICAgIHRoaXMuYXBwID0gbmV3IGNkay5BcHAoKTtcclxuICAgIHRoaXMuc3RhY2sgPSBuZXcgUHJvZHVjdGlvbk1pc3JhU3RhY2sodGhpcy5hcHAsICdWYWxpZGF0aW9uU3RhY2snLCB7XHJcbiAgICAgIGVudmlyb25tZW50LFxyXG4gICAgICBlbnY6IHtcclxuICAgICAgICBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJywgLy8gRHVtbXkgYWNjb3VudCBmb3IgdmFsaWRhdGlvblxyXG4gICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIGFsbCBEeW5hbW9EQiB0YWJsZXMgYWdhaW5zdCBzcGVjIHJlcXVpcmVtZW50c1xyXG4gICAqL1xyXG4gIHB1YmxpYyB2YWxpZGF0ZVRhYmxlcygpOiBWYWxpZGF0aW9uUmVwb3J0IHtcclxuICAgIGNvbnN0IHJlc3VsdHM6IFRhYmxlVmFsaWRhdGlvblJlc3VsdFtdID0gW1xyXG4gICAgICB0aGlzLnZhbGlkYXRlVXNlcnNUYWJsZSgpLFxyXG4gICAgICB0aGlzLnZhbGlkYXRlRmlsZU1ldGFkYXRhVGFibGUoKSxcclxuICAgICAgdGhpcy52YWxpZGF0ZUFuYWx5c2lzUmVzdWx0c1RhYmxlKCksXHJcbiAgICAgIHRoaXMudmFsaWRhdGVTYW1wbGVGaWxlc1RhYmxlKCksXHJcbiAgICAgIHRoaXMudmFsaWRhdGVQcm9ncmVzc1RhYmxlKCksXHJcbiAgICBdO1xyXG5cclxuICAgIGNvbnN0IHRvdGFsSXNzdWVzID0gcmVzdWx0cy5yZWR1Y2UoKHN1bSwgcmVzdWx0KSA9PiBzdW0gKyByZXN1bHQuaXNzdWVzLmxlbmd0aCwgMCk7XHJcbiAgICBjb25zdCB2YWxpZFRhYmxlcyA9IHJlc3VsdHMuZmlsdGVyKHJlc3VsdCA9PiByZXN1bHQudmFsaWQpLmxlbmd0aDtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBvdmVyYWxsOiB0b3RhbElzc3VlcyA9PT0gMCxcclxuICAgICAgdGFibGVzOiByZXN1bHRzLFxyXG4gICAgICBzdW1tYXJ5OiB7XHJcbiAgICAgICAgdG90YWxUYWJsZXM6IHJlc3VsdHMubGVuZ3RoLFxyXG4gICAgICAgIHZhbGlkVGFibGVzLFxyXG4gICAgICAgIHRvdGFsSXNzdWVzLFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIFVzZXJzIFRhYmxlIGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlVXNlcnNUYWJsZSgpOiBUYWJsZVZhbGlkYXRpb25SZXN1bHQge1xyXG4gICAgY29uc3QgdGFibGUgPSB0aGlzLnN0YWNrLnVzZXJzVGFibGU7XHJcbiAgICBjb25zdCBpc3N1ZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICBjb25zdCByZXF1aXJlbWVudHMgPSB7XHJcbiAgICAgIGhhc0ttc0VuY3J5cHRpb246IGZhbHNlLFxyXG4gICAgICBoYXNQb2ludEluVGltZVJlY292ZXJ5OiBmYWxzZSxcclxuICAgICAgaGFzUmVxdWlyZWRHU0lzOiBmYWxzZSxcclxuICAgICAgaGFzVFRMV2hlblJlcXVpcmVkOiB0cnVlLCAvLyBOb3QgcmVxdWlyZWQgZm9yIHVzZXJzIHRhYmxlXHJcbiAgICAgIGhhc0NvcnJlY3RCaWxsaW5nTW9kZTogZmFsc2UsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENoZWNrIHRhYmxlIG5hbWVcclxuICAgIGNvbnN0IGV4cGVjdGVkVGFibGVOYW1lID0gL15taXNyYS1wbGF0Zm9ybS11c2Vycy0oZGV2fHN0YWdpbmd8cHJvZHVjdGlvbikkLztcclxuICAgIGlmICghZXhwZWN0ZWRUYWJsZU5hbWUudGVzdCh0YWJsZS50YWJsZU5hbWUpKSB7XHJcbiAgICAgIGlzc3Vlcy5wdXNoKGBJbnZhbGlkIHRhYmxlIG5hbWU6ICR7dGFibGUudGFibGVOYW1lfS4gRXhwZWN0ZWQgZm9ybWF0OiBtaXNyYS1wbGF0Zm9ybS11c2Vycy17ZW52aXJvbm1lbnR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgcGFydGl0aW9uIGtleVxyXG4gICAgY29uc3QgcGFydGl0aW9uS2V5ID0gKHRhYmxlIGFzIGFueSkuc2NoZW1hPy5wYXJ0aXRpb25LZXk7XHJcbiAgICBpZiAoIXBhcnRpdGlvbktleSB8fCBwYXJ0aXRpb25LZXkubmFtZSAhPT0gJ3VzZXJJZCcgfHwgcGFydGl0aW9uS2V5LnR5cGUgIT09ICdTJykge1xyXG4gICAgICBpc3N1ZXMucHVzaCgnUGFydGl0aW9uIGtleSBtdXN0IGJlIFwidXNlcklkXCIgb2YgdHlwZSBTVFJJTkcnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBlbmNyeXB0aW9uIChLTVMpXHJcbiAgICBjb25zdCBlbmNyeXB0aW9uID0gKHRhYmxlIGFzIGFueSkuZW5jcnlwdGlvbjtcclxuICAgIGlmIChlbmNyeXB0aW9uID09PSAnQ1VTVE9NRVJfTUFOQUdFRCcpIHtcclxuICAgICAgcmVxdWlyZW1lbnRzLmhhc0ttc0VuY3J5cHRpb24gPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaXNzdWVzLnB1c2goJ1RhYmxlIG11c3QgdXNlIEtNUyBlbmNyeXB0aW9uIChDVVNUT01FUl9NQU5BR0VEKScpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGJpbGxpbmcgbW9kZVxyXG4gICAgY29uc3QgYmlsbGluZ01vZGUgPSAodGFibGUgYXMgYW55KS5iaWxsaW5nTW9kZTtcclxuICAgIGlmIChiaWxsaW5nTW9kZSA9PT0gJ1BBWV9QRVJfUkVRVUVTVCcpIHtcclxuICAgICAgcmVxdWlyZW1lbnRzLmhhc0NvcnJlY3RCaWxsaW5nTW9kZSA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpc3N1ZXMucHVzaCgnVGFibGUgbXVzdCB1c2UgUEFZX1BFUl9SRVFVRVNUIGJpbGxpbmcgbW9kZScpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIHBvaW50LWluLXRpbWUgcmVjb3ZlcnkgKHByb2R1Y3Rpb24gb25seSlcclxuICAgIGNvbnN0IHBpdHIgPSAodGFibGUgYXMgYW55KS5wb2ludEluVGltZVJlY292ZXJ5RW5hYmxlZDtcclxuICAgIGlmICh0aGlzLnN0YWNrLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSA9PT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICAgIGlmIChwaXRyKSB7XHJcbiAgICAgICAgcmVxdWlyZW1lbnRzLmhhc1BvaW50SW5UaW1lUmVjb3ZlcnkgPSB0cnVlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlzc3Vlcy5wdXNoKCdQb2ludC1pbi10aW1lIHJlY292ZXJ5IG11c3QgYmUgZW5hYmxlZCBmb3IgcHJvZHVjdGlvbicpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXF1aXJlbWVudHMuaGFzUG9pbnRJblRpbWVSZWNvdmVyeSA9IHRydWU7IC8vIE5vdCByZXF1aXJlZCBmb3Igbm9uLXByb2RcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayByZXF1aXJlZCBHU0lzXHJcbiAgICBjb25zdCBnc2lzID0gKHRhYmxlIGFzIGFueSkuZ2xvYmFsU2Vjb25kYXJ5SW5kZXhlcyB8fCBbXTtcclxuICAgIGNvbnN0IHJlcXVpcmVkR1NJcyA9IFsnZW1haWwtaW5kZXgnXTtcclxuICAgIGNvbnN0IGV4aXN0aW5nR1NJcyA9IGdzaXMubWFwKChnc2k6IGFueSkgPT4gZ3NpLmluZGV4TmFtZSk7XHJcbiAgICBcclxuICAgIGZvciAoY29uc3QgcmVxdWlyZWRHU0kgb2YgcmVxdWlyZWRHU0lzKSB7XHJcbiAgICAgIGlmICghZXhpc3RpbmdHU0lzLmluY2x1ZGVzKHJlcXVpcmVkR1NJKSkge1xyXG4gICAgICAgIGlzc3Vlcy5wdXNoKGBNaXNzaW5nIHJlcXVpcmVkIEdTSTogJHtyZXF1aXJlZEdTSX1gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXF1aXJlZEdTSXMuZXZlcnkoZ3NpID0+IGV4aXN0aW5nR1NJcy5pbmNsdWRlcyhnc2kpKSkge1xyXG4gICAgICByZXF1aXJlbWVudHMuaGFzUmVxdWlyZWRHU0lzID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0YWJsZU5hbWU6ICdVc2VycycsXHJcbiAgICAgIHZhbGlkOiBpc3N1ZXMubGVuZ3RoID09PSAwLFxyXG4gICAgICBpc3N1ZXMsXHJcbiAgICAgIHJlcXVpcmVtZW50cyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBGaWxlIE1ldGFkYXRhIFRhYmxlIGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlRmlsZU1ldGFkYXRhVGFibGUoKTogVGFibGVWYWxpZGF0aW9uUmVzdWx0IHtcclxuICAgIGNvbnN0IHRhYmxlID0gdGhpcy5zdGFjay5maWxlTWV0YWRhdGFUYWJsZTtcclxuICAgIGNvbnN0IGlzc3Vlczogc3RyaW5nW10gPSBbXTtcclxuICAgIGNvbnN0IHJlcXVpcmVtZW50cyA9IHtcclxuICAgICAgaGFzS21zRW5jcnlwdGlvbjogZmFsc2UsXHJcbiAgICAgIGhhc1BvaW50SW5UaW1lUmVjb3Zlcnk6IGZhbHNlLFxyXG4gICAgICBoYXNSZXF1aXJlZEdTSXM6IGZhbHNlLFxyXG4gICAgICBoYXNUVExXaGVuUmVxdWlyZWQ6IHRydWUsIC8vIE5vdCByZXF1aXJlZCBmb3IgZmlsZSBtZXRhZGF0YVxyXG4gICAgICBoYXNDb3JyZWN0QmlsbGluZ01vZGU6IGZhbHNlLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBDaGVjayB0YWJsZSBuYW1lXHJcbiAgICBjb25zdCBleHBlY3RlZFRhYmxlTmFtZSA9IC9ebWlzcmEtcGxhdGZvcm0tZmlsZS1tZXRhZGF0YS0oZGV2fHN0YWdpbmd8cHJvZHVjdGlvbikkLztcclxuICAgIGlmICghZXhwZWN0ZWRUYWJsZU5hbWUudGVzdCh0YWJsZS50YWJsZU5hbWUpKSB7XHJcbiAgICAgIGlzc3Vlcy5wdXNoKGBJbnZhbGlkIHRhYmxlIG5hbWU6ICR7dGFibGUudGFibGVOYW1lfS4gRXhwZWN0ZWQgZm9ybWF0OiBtaXNyYS1wbGF0Zm9ybS1maWxlLW1ldGFkYXRhLXtlbnZpcm9ubWVudH1gKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBwYXJ0aXRpb24ga2V5XHJcbiAgICBjb25zdCBwYXJ0aXRpb25LZXkgPSAodGFibGUgYXMgYW55KS5zY2hlbWE/LnBhcnRpdGlvbktleTtcclxuICAgIGlmICghcGFydGl0aW9uS2V5IHx8IHBhcnRpdGlvbktleS5uYW1lICE9PSAnZmlsZUlkJyB8fCBwYXJ0aXRpb25LZXkudHlwZSAhPT0gJ1MnKSB7XHJcbiAgICAgIGlzc3Vlcy5wdXNoKCdQYXJ0aXRpb24ga2V5IG11c3QgYmUgXCJmaWxlSWRcIiBvZiB0eXBlIFNUUklORycpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGVuY3J5cHRpb25cclxuICAgIGNvbnN0IGVuY3J5cHRpb24gPSAodGFibGUgYXMgYW55KS5lbmNyeXB0aW9uO1xyXG4gICAgaWYgKGVuY3J5cHRpb24gPT09ICdDVVNUT01FUl9NQU5BR0VEJykge1xyXG4gICAgICByZXF1aXJlbWVudHMuaGFzS21zRW5jcnlwdGlvbiA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpc3N1ZXMucHVzaCgnVGFibGUgbXVzdCB1c2UgS01TIGVuY3J5cHRpb24gKENVU1RPTUVSX01BTkFHRUQpJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgYmlsbGluZyBtb2RlXHJcbiAgICBjb25zdCBiaWxsaW5nTW9kZSA9ICh0YWJsZSBhcyBhbnkpLmJpbGxpbmdNb2RlO1xyXG4gICAgaWYgKGJpbGxpbmdNb2RlID09PSAnUEFZX1BFUl9SRVFVRVNUJykge1xyXG4gICAgICByZXF1aXJlbWVudHMuaGFzQ29ycmVjdEJpbGxpbmdNb2RlID0gdHJ1ZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlzc3Vlcy5wdXNoKCdUYWJsZSBtdXN0IHVzZSBQQVlfUEVSX1JFUVVFU1QgYmlsbGluZyBtb2RlJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgcG9pbnQtaW4tdGltZSByZWNvdmVyeVxyXG4gICAgY29uc3QgcGl0ciA9ICh0YWJsZSBhcyBhbnkpLnBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkO1xyXG4gICAgaWYgKHRoaXMuc3RhY2subm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpID09PSAncHJvZHVjdGlvbicpIHtcclxuICAgICAgaWYgKHBpdHIpIHtcclxuICAgICAgICByZXF1aXJlbWVudHMuaGFzUG9pbnRJblRpbWVSZWNvdmVyeSA9IHRydWU7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaXNzdWVzLnB1c2goJ1BvaW50LWluLXRpbWUgcmVjb3ZlcnkgbXVzdCBiZSBlbmFibGVkIGZvciBwcm9kdWN0aW9uJyk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJlcXVpcmVtZW50cy5oYXNQb2ludEluVGltZVJlY292ZXJ5ID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayByZXF1aXJlZCBHU0lzXHJcbiAgICBjb25zdCBnc2lzID0gKHRhYmxlIGFzIGFueSkuZ2xvYmFsU2Vjb25kYXJ5SW5kZXhlcyB8fCBbXTtcclxuICAgIGNvbnN0IHJlcXVpcmVkR1NJcyA9IFsndXNlcklkLXVwbG9hZFRpbWVzdGFtcC1pbmRleCcsICdjb250ZW50SGFzaC1pbmRleCddO1xyXG4gICAgY29uc3QgZXhpc3RpbmdHU0lzID0gZ3Npcy5tYXAoKGdzaTogYW55KSA9PiBnc2kuaW5kZXhOYW1lKTtcclxuICAgIFxyXG4gICAgZm9yIChjb25zdCByZXF1aXJlZEdTSSBvZiByZXF1aXJlZEdTSXMpIHtcclxuICAgICAgaWYgKCFleGlzdGluZ0dTSXMuaW5jbHVkZXMocmVxdWlyZWRHU0kpKSB7XHJcbiAgICAgICAgaXNzdWVzLnB1c2goYE1pc3NpbmcgcmVxdWlyZWQgR1NJOiAke3JlcXVpcmVkR1NJfWApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHJlcXVpcmVkR1NJcy5ldmVyeShnc2kgPT4gZXhpc3RpbmdHU0lzLmluY2x1ZGVzKGdzaSkpKSB7XHJcbiAgICAgIHJlcXVpcmVtZW50cy5oYXNSZXF1aXJlZEdTSXMgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ0ZpbGVNZXRhZGF0YScsXHJcbiAgICAgIHZhbGlkOiBpc3N1ZXMubGVuZ3RoID09PSAwLFxyXG4gICAgICBpc3N1ZXMsXHJcbiAgICAgIHJlcXVpcmVtZW50cyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBBbmFseXNpcyBSZXN1bHRzIFRhYmxlIGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlQW5hbHlzaXNSZXN1bHRzVGFibGUoKTogVGFibGVWYWxpZGF0aW9uUmVzdWx0IHtcclxuICAgIGNvbnN0IHRhYmxlID0gdGhpcy5zdGFjay5hbmFseXNpc1Jlc3VsdHNUYWJsZTtcclxuICAgIGNvbnN0IGlzc3Vlczogc3RyaW5nW10gPSBbXTtcclxuICAgIGNvbnN0IHJlcXVpcmVtZW50cyA9IHtcclxuICAgICAgaGFzS21zRW5jcnlwdGlvbjogZmFsc2UsXHJcbiAgICAgIGhhc1BvaW50SW5UaW1lUmVjb3Zlcnk6IGZhbHNlLFxyXG4gICAgICBoYXNSZXF1aXJlZEdTSXM6IGZhbHNlLFxyXG4gICAgICBoYXNUVExXaGVuUmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgICBoYXNDb3JyZWN0QmlsbGluZ01vZGU6IGZhbHNlLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBDaGVjayB0YWJsZSBuYW1lXHJcbiAgICBjb25zdCBleHBlY3RlZFRhYmxlTmFtZSA9IC9ebWlzcmEtcGxhdGZvcm0tYW5hbHlzaXMtcmVzdWx0cy0oZGV2fHN0YWdpbmd8cHJvZHVjdGlvbikkLztcclxuICAgIGlmICghZXhwZWN0ZWRUYWJsZU5hbWUudGVzdCh0YWJsZS50YWJsZU5hbWUpKSB7XHJcbiAgICAgIGlzc3Vlcy5wdXNoKGBJbnZhbGlkIHRhYmxlIG5hbWU6ICR7dGFibGUudGFibGVOYW1lfS4gRXhwZWN0ZWQgZm9ybWF0OiBtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcy1yZXN1bHRzLXtlbnZpcm9ubWVudH1gKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBwYXJ0aXRpb24ga2V5IGFuZCBzb3J0IGtleVxyXG4gICAgY29uc3QgcGFydGl0aW9uS2V5ID0gKHRhYmxlIGFzIGFueSkuc2NoZW1hPy5wYXJ0aXRpb25LZXk7XHJcbiAgICBjb25zdCBzb3J0S2V5ID0gKHRhYmxlIGFzIGFueSkuc2NoZW1hPy5zb3J0S2V5O1xyXG4gICAgXHJcbiAgICBpZiAoIXBhcnRpdGlvbktleSB8fCBwYXJ0aXRpb25LZXkubmFtZSAhPT0gJ2FuYWx5c2lzSWQnIHx8IHBhcnRpdGlvbktleS50eXBlICE9PSAnUycpIHtcclxuICAgICAgaXNzdWVzLnB1c2goJ1BhcnRpdGlvbiBrZXkgbXVzdCBiZSBcImFuYWx5c2lzSWRcIiBvZiB0eXBlIFNUUklORycpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiAoIXNvcnRLZXkgfHwgc29ydEtleS5uYW1lICE9PSAndGltZXN0YW1wJyB8fCBzb3J0S2V5LnR5cGUgIT09ICdOJykge1xyXG4gICAgICBpc3N1ZXMucHVzaCgnU29ydCBrZXkgbXVzdCBiZSBcInRpbWVzdGFtcFwiIG9mIHR5cGUgTlVNQkVSJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZW5jcnlwdGlvblxyXG4gICAgY29uc3QgZW5jcnlwdGlvbiA9ICh0YWJsZSBhcyBhbnkpLmVuY3J5cHRpb247XHJcbiAgICBpZiAoZW5jcnlwdGlvbiA9PT0gJ0NVU1RPTUVSX01BTkFHRUQnKSB7XHJcbiAgICAgIHJlcXVpcmVtZW50cy5oYXNLbXNFbmNyeXB0aW9uID0gdHJ1ZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlzc3Vlcy5wdXNoKCdUYWJsZSBtdXN0IHVzZSBLTVMgZW5jcnlwdGlvbiAoQ1VTVE9NRVJfTUFOQUdFRCknKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBiaWxsaW5nIG1vZGVcclxuICAgIGNvbnN0IGJpbGxpbmdNb2RlID0gKHRhYmxlIGFzIGFueSkuYmlsbGluZ01vZGU7XHJcbiAgICBpZiAoYmlsbGluZ01vZGUgPT09ICdQQVlfUEVSX1JFUVVFU1QnKSB7XHJcbiAgICAgIHJlcXVpcmVtZW50cy5oYXNDb3JyZWN0QmlsbGluZ01vZGUgPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaXNzdWVzLnB1c2goJ1RhYmxlIG11c3QgdXNlIFBBWV9QRVJfUkVRVUVTVCBiaWxsaW5nIG1vZGUnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBwb2ludC1pbi10aW1lIHJlY292ZXJ5XHJcbiAgICBjb25zdCBwaXRyID0gKHRhYmxlIGFzIGFueSkucG9pbnRJblRpbWVSZWNvdmVyeUVuYWJsZWQ7XHJcbiAgICBpZiAodGhpcy5zdGFjay5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgPT09ICdwcm9kdWN0aW9uJykge1xyXG4gICAgICBpZiAocGl0cikge1xyXG4gICAgICAgIHJlcXVpcmVtZW50cy5oYXNQb2ludEluVGltZVJlY292ZXJ5ID0gdHJ1ZTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBpc3N1ZXMucHVzaCgnUG9pbnQtaW4tdGltZSByZWNvdmVyeSBtdXN0IGJlIGVuYWJsZWQgZm9yIHByb2R1Y3Rpb24nKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmVxdWlyZW1lbnRzLmhhc1BvaW50SW5UaW1lUmVjb3ZlcnkgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIFRUTCBjb25maWd1cmF0aW9uIGZvciBub24tcHJvZHVjdGlvblxyXG4gICAgY29uc3QgdHRsQXR0cmlidXRlID0gKHRhYmxlIGFzIGFueSkudGltZVRvTGl2ZUF0dHJpYnV0ZTtcclxuICAgIGlmICh0aGlzLnN0YWNrLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSAhPT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICAgIGlmICh0dGxBdHRyaWJ1dGUgPT09ICd0dGwnKSB7XHJcbiAgICAgICAgcmVxdWlyZW1lbnRzLmhhc1RUTFdoZW5SZXF1aXJlZCA9IHRydWU7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaXNzdWVzLnB1c2goJ1RUTCBhdHRyaWJ1dGUgXCJ0dGxcIiBtdXN0IGJlIGNvbmZpZ3VyZWQgZm9yIG5vbi1wcm9kdWN0aW9uIGVudmlyb25tZW50cycpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXF1aXJlbWVudHMuaGFzVFRMV2hlblJlcXVpcmVkID0gdHJ1ZTsgLy8gTm90IHJlcXVpcmVkIGZvciBwcm9kdWN0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgcmVxdWlyZWQgR1NJc1xyXG4gICAgY29uc3QgZ3NpcyA9ICh0YWJsZSBhcyBhbnkpLmdsb2JhbFNlY29uZGFyeUluZGV4ZXMgfHwgW107XHJcbiAgICBjb25zdCByZXF1aXJlZEdTSXMgPSBbXHJcbiAgICAgICdmaWxlSWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgJ3VzZXJJZC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICAnY29udGVudEhhc2gtdGltZXN0YW1wLWluZGV4J1xyXG4gICAgXTtcclxuICAgIGNvbnN0IGV4aXN0aW5nR1NJcyA9IGdzaXMubWFwKChnc2k6IGFueSkgPT4gZ3NpLmluZGV4TmFtZSk7XHJcbiAgICBcclxuICAgIGZvciAoY29uc3QgcmVxdWlyZWRHU0kgb2YgcmVxdWlyZWRHU0lzKSB7XHJcbiAgICAgIGlmICghZXhpc3RpbmdHU0lzLmluY2x1ZGVzKHJlcXVpcmVkR1NJKSkge1xyXG4gICAgICAgIGlzc3Vlcy5wdXNoKGBNaXNzaW5nIHJlcXVpcmVkIEdTSTogJHtyZXF1aXJlZEdTSX1gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXF1aXJlZEdTSXMuZXZlcnkoZ3NpID0+IGV4aXN0aW5nR1NJcy5pbmNsdWRlcyhnc2kpKSkge1xyXG4gICAgICByZXF1aXJlbWVudHMuaGFzUmVxdWlyZWRHU0lzID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0YWJsZU5hbWU6ICdBbmFseXNpc1Jlc3VsdHMnLFxyXG4gICAgICB2YWxpZDogaXNzdWVzLmxlbmd0aCA9PT0gMCxcclxuICAgICAgaXNzdWVzLFxyXG4gICAgICByZXF1aXJlbWVudHMsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgU2FtcGxlIEZpbGVzIFRhYmxlIGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlU2FtcGxlRmlsZXNUYWJsZSgpOiBUYWJsZVZhbGlkYXRpb25SZXN1bHQge1xyXG4gICAgY29uc3QgdGFibGUgPSB0aGlzLnN0YWNrLnNhbXBsZUZpbGVzVGFibGU7XHJcbiAgICBjb25zdCBpc3N1ZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICBjb25zdCByZXF1aXJlbWVudHMgPSB7XHJcbiAgICAgIGhhc0ttc0VuY3J5cHRpb246IGZhbHNlLFxyXG4gICAgICBoYXNQb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLCAvLyBOb3QgcmVxdWlyZWQgZm9yIHNhbXBsZSBmaWxlc1xyXG4gICAgICBoYXNSZXF1aXJlZEdTSXM6IGZhbHNlLFxyXG4gICAgICBoYXNUVExXaGVuUmVxdWlyZWQ6IHRydWUsIC8vIE5vdCByZXF1aXJlZCBmb3Igc2FtcGxlIGZpbGVzXHJcbiAgICAgIGhhc0NvcnJlY3RCaWxsaW5nTW9kZTogZmFsc2UsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENoZWNrIHRhYmxlIG5hbWVcclxuICAgIGNvbnN0IGV4cGVjdGVkVGFibGVOYW1lID0gL15taXNyYS1wbGF0Zm9ybS1zYW1wbGUtZmlsZXMtKGRldnxzdGFnaW5nfHByb2R1Y3Rpb24pJC87XHJcbiAgICBpZiAoIWV4cGVjdGVkVGFibGVOYW1lLnRlc3QodGFibGUudGFibGVOYW1lKSkge1xyXG4gICAgICBpc3N1ZXMucHVzaChgSW52YWxpZCB0YWJsZSBuYW1lOiAke3RhYmxlLnRhYmxlTmFtZX0uIEV4cGVjdGVkIGZvcm1hdDogbWlzcmEtcGxhdGZvcm0tc2FtcGxlLWZpbGVzLXtlbnZpcm9ubWVudH1gKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBwYXJ0aXRpb24ga2V5XHJcbiAgICBjb25zdCBwYXJ0aXRpb25LZXkgPSAodGFibGUgYXMgYW55KS5zY2hlbWE/LnBhcnRpdGlvbktleTtcclxuICAgIGlmICghcGFydGl0aW9uS2V5IHx8IHBhcnRpdGlvbktleS5uYW1lICE9PSAnc2FtcGxlSWQnIHx8IHBhcnRpdGlvbktleS50eXBlICE9PSAnUycpIHtcclxuICAgICAgaXNzdWVzLnB1c2goJ1BhcnRpdGlvbiBrZXkgbXVzdCBiZSBcInNhbXBsZUlkXCIgb2YgdHlwZSBTVFJJTkcnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBlbmNyeXB0aW9uXHJcbiAgICBjb25zdCBlbmNyeXB0aW9uID0gKHRhYmxlIGFzIGFueSkuZW5jcnlwdGlvbjtcclxuICAgIGlmIChlbmNyeXB0aW9uID09PSAnQ1VTVE9NRVJfTUFOQUdFRCcpIHtcclxuICAgICAgcmVxdWlyZW1lbnRzLmhhc0ttc0VuY3J5cHRpb24gPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaXNzdWVzLnB1c2goJ1RhYmxlIG11c3QgdXNlIEtNUyBlbmNyeXB0aW9uIChDVVNUT01FUl9NQU5BR0VEKScpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGJpbGxpbmcgbW9kZVxyXG4gICAgY29uc3QgYmlsbGluZ01vZGUgPSAodGFibGUgYXMgYW55KS5iaWxsaW5nTW9kZTtcclxuICAgIGlmIChiaWxsaW5nTW9kZSA9PT0gJ1BBWV9QRVJfUkVRVUVTVCcpIHtcclxuICAgICAgcmVxdWlyZW1lbnRzLmhhc0NvcnJlY3RCaWxsaW5nTW9kZSA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpc3N1ZXMucHVzaCgnVGFibGUgbXVzdCB1c2UgUEFZX1BFUl9SRVFVRVNUIGJpbGxpbmcgbW9kZScpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIHJlcXVpcmVkIEdTSXMgZm9yIHNhbXBsZSBmaWxlIGZpbHRlcmluZ1xyXG4gICAgY29uc3QgZ3NpcyA9ICh0YWJsZSBhcyBhbnkpLmdsb2JhbFNlY29uZGFyeUluZGV4ZXMgfHwgW107XHJcbiAgICBjb25zdCByZXF1aXJlZEdTSXMgPSBbXHJcbiAgICAgICdsYW5ndWFnZS1kaWZmaWN1bHR5TGV2ZWwtaW5kZXgnLFxyXG4gICAgICAnbGFuZ3VhZ2UtZXhwZWN0ZWRDb21wbGlhbmNlLWluZGV4JyxcclxuICAgICAgJ3VzYWdlQ291bnQtY3JlYXRlZEF0LWluZGV4J1xyXG4gICAgXTtcclxuICAgIGNvbnN0IGV4aXN0aW5nR1NJcyA9IGdzaXMubWFwKChnc2k6IGFueSkgPT4gZ3NpLmluZGV4TmFtZSk7XHJcbiAgICBcclxuICAgIGZvciAoY29uc3QgcmVxdWlyZWRHU0kgb2YgcmVxdWlyZWRHU0lzKSB7XHJcbiAgICAgIGlmICghZXhpc3RpbmdHU0lzLmluY2x1ZGVzKHJlcXVpcmVkR1NJKSkge1xyXG4gICAgICAgIGlzc3Vlcy5wdXNoKGBNaXNzaW5nIHJlcXVpcmVkIEdTSTogJHtyZXF1aXJlZEdTSX1gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXF1aXJlZEdTSXMuZXZlcnkoZ3NpID0+IGV4aXN0aW5nR1NJcy5pbmNsdWRlcyhnc2kpKSkge1xyXG4gICAgICByZXF1aXJlbWVudHMuaGFzUmVxdWlyZWRHU0lzID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0YWJsZU5hbWU6ICdTYW1wbGVGaWxlcycsXHJcbiAgICAgIHZhbGlkOiBpc3N1ZXMubGVuZ3RoID09PSAwLFxyXG4gICAgICBpc3N1ZXMsXHJcbiAgICAgIHJlcXVpcmVtZW50cyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBQcm9ncmVzcyBUYWJsZSBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSB2YWxpZGF0ZVByb2dyZXNzVGFibGUoKTogVGFibGVWYWxpZGF0aW9uUmVzdWx0IHtcclxuICAgIGNvbnN0IHRhYmxlID0gdGhpcy5zdGFjay5wcm9ncmVzc1RhYmxlO1xyXG4gICAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgY29uc3QgcmVxdWlyZW1lbnRzID0ge1xyXG4gICAgICBoYXNLbXNFbmNyeXB0aW9uOiBmYWxzZSxcclxuICAgICAgaGFzUG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSwgLy8gTm90IHJlcXVpcmVkIGZvciBwcm9ncmVzcyB0YWJsZVxyXG4gICAgICBoYXNSZXF1aXJlZEdTSXM6IGZhbHNlLFxyXG4gICAgICBoYXNUVExXaGVuUmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgICBoYXNDb3JyZWN0QmlsbGluZ01vZGU6IGZhbHNlLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBDaGVjayB0YWJsZSBuYW1lXHJcbiAgICBjb25zdCBleHBlY3RlZFRhYmxlTmFtZSA9IC9ebWlzcmEtcGxhdGZvcm0tcHJvZ3Jlc3MtKGRldnxzdGFnaW5nfHByb2R1Y3Rpb24pJC87XHJcbiAgICBpZiAoIWV4cGVjdGVkVGFibGVOYW1lLnRlc3QodGFibGUudGFibGVOYW1lKSkge1xyXG4gICAgICBpc3N1ZXMucHVzaChgSW52YWxpZCB0YWJsZSBuYW1lOiAke3RhYmxlLnRhYmxlTmFtZX0uIEV4cGVjdGVkIGZvcm1hdDogbWlzcmEtcGxhdGZvcm0tcHJvZ3Jlc3Mte2Vudmlyb25tZW50fWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIHBhcnRpdGlvbiBrZXlcclxuICAgIGNvbnN0IHBhcnRpdGlvbktleSA9ICh0YWJsZSBhcyBhbnkpLnNjaGVtYT8ucGFydGl0aW9uS2V5O1xyXG4gICAgaWYgKCFwYXJ0aXRpb25LZXkgfHwgcGFydGl0aW9uS2V5Lm5hbWUgIT09ICdhbmFseXNpc0lkJyB8fCBwYXJ0aXRpb25LZXkudHlwZSAhPT0gJ1MnKSB7XHJcbiAgICAgIGlzc3Vlcy5wdXNoKCdQYXJ0aXRpb24ga2V5IG11c3QgYmUgXCJhbmFseXNpc0lkXCIgb2YgdHlwZSBTVFJJTkcnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBlbmNyeXB0aW9uXHJcbiAgICBjb25zdCBlbmNyeXB0aW9uID0gKHRhYmxlIGFzIGFueSkuZW5jcnlwdGlvbjtcclxuICAgIGlmIChlbmNyeXB0aW9uID09PSAnQ1VTVE9NRVJfTUFOQUdFRCcpIHtcclxuICAgICAgcmVxdWlyZW1lbnRzLmhhc0ttc0VuY3J5cHRpb24gPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaXNzdWVzLnB1c2goJ1RhYmxlIG11c3QgdXNlIEtNUyBlbmNyeXB0aW9uIChDVVNUT01FUl9NQU5BR0VEKScpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGJpbGxpbmcgbW9kZVxyXG4gICAgY29uc3QgYmlsbGluZ01vZGUgPSAodGFibGUgYXMgYW55KS5iaWxsaW5nTW9kZTtcclxuICAgIGlmIChiaWxsaW5nTW9kZSA9PT0gJ1BBWV9QRVJfUkVRVUVTVCcpIHtcclxuICAgICAgcmVxdWlyZW1lbnRzLmhhc0NvcnJlY3RCaWxsaW5nTW9kZSA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpc3N1ZXMucHVzaCgnVGFibGUgbXVzdCB1c2UgUEFZX1BFUl9SRVFVRVNUIGJpbGxpbmcgbW9kZScpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIFRUTCBjb25maWd1cmF0aW9uIChyZXF1aXJlZCBmb3IgcHJvZ3Jlc3MgdGFibGUpXHJcbiAgICBjb25zdCB0dGxBdHRyaWJ1dGUgPSAodGFibGUgYXMgYW55KS50aW1lVG9MaXZlQXR0cmlidXRlO1xyXG4gICAgaWYgKHR0bEF0dHJpYnV0ZSA9PT0gJ3R0bCcpIHtcclxuICAgICAgcmVxdWlyZW1lbnRzLmhhc1RUTFdoZW5SZXF1aXJlZCA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpc3N1ZXMucHVzaCgnVFRMIGF0dHJpYnV0ZSBcInR0bFwiIG11c3QgYmUgY29uZmlndXJlZCBmb3IgcHJvZ3Jlc3MgdGFibGUgYXV0by1jbGVhbnVwJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgcmVxdWlyZWQgR1NJc1xyXG4gICAgY29uc3QgZ3NpcyA9ICh0YWJsZSBhcyBhbnkpLmdsb2JhbFNlY29uZGFyeUluZGV4ZXMgfHwgW107XHJcbiAgICBjb25zdCByZXF1aXJlZEdTSXMgPSBbJ3VzZXJJZC11cGRhdGVkQXQtaW5kZXgnXTtcclxuICAgIGNvbnN0IGV4aXN0aW5nR1NJcyA9IGdzaXMubWFwKChnc2k6IGFueSkgPT4gZ3NpLmluZGV4TmFtZSk7XHJcbiAgICBcclxuICAgIGZvciAoY29uc3QgcmVxdWlyZWRHU0kgb2YgcmVxdWlyZWRHU0lzKSB7XHJcbiAgICAgIGlmICghZXhpc3RpbmdHU0lzLmluY2x1ZGVzKHJlcXVpcmVkR1NJKSkge1xyXG4gICAgICAgIGlzc3Vlcy5wdXNoKGBNaXNzaW5nIHJlcXVpcmVkIEdTSTogJHtyZXF1aXJlZEdTSX1gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXF1aXJlZEdTSXMuZXZlcnkoZ3NpID0+IGV4aXN0aW5nR1NJcy5pbmNsdWRlcyhnc2kpKSkge1xyXG4gICAgICByZXF1aXJlbWVudHMuaGFzUmVxdWlyZWRHU0lzID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0YWJsZU5hbWU6ICdQcm9ncmVzcycsXHJcbiAgICAgIHZhbGlkOiBpc3N1ZXMubGVuZ3RoID09PSAwLFxyXG4gICAgICBpc3N1ZXMsXHJcbiAgICAgIHJlcXVpcmVtZW50cyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBhIGRldGFpbGVkIHZhbGlkYXRpb24gcmVwb3J0XHJcbiAgICovXHJcbiAgcHVibGljIGdlbmVyYXRlUmVwb3J0KCk6IHN0cmluZyB7XHJcbiAgICBjb25zdCByZXBvcnQgPSB0aGlzLnZhbGlkYXRlVGFibGVzKCk7XHJcbiAgICBcclxuICAgIGxldCBvdXRwdXQgPSAnXFxuPT09IER5bmFtb0RCIFRhYmxlIENvbmZpZ3VyYXRpb24gVmFsaWRhdGlvbiBSZXBvcnQgPT09XFxuXFxuJztcclxuICAgIFxyXG4gICAgLy8gT3ZlcmFsbCBzdGF0dXNcclxuICAgIG91dHB1dCArPSBgT3ZlcmFsbCBTdGF0dXM6ICR7cmVwb3J0Lm92ZXJhbGwgPyAn4pyFIFBBU1MnIDogJ+KdjCBGQUlMJ31cXG5gO1xyXG4gICAgb3V0cHV0ICs9IGBUYWJsZXM6ICR7cmVwb3J0LnN1bW1hcnkudmFsaWRUYWJsZXN9LyR7cmVwb3J0LnN1bW1hcnkudG90YWxUYWJsZXN9IHZhbGlkXFxuYDtcclxuICAgIG91dHB1dCArPSBgVG90YWwgSXNzdWVzOiAke3JlcG9ydC5zdW1tYXJ5LnRvdGFsSXNzdWVzfVxcblxcbmA7XHJcbiAgICBcclxuICAgIC8vIEluZGl2aWR1YWwgdGFibGUgcmVzdWx0c1xyXG4gICAgZm9yIChjb25zdCB0YWJsZSBvZiByZXBvcnQudGFibGVzKSB7XHJcbiAgICAgIG91dHB1dCArPSBgLS0tICR7dGFibGUudGFibGVOYW1lfSBUYWJsZSAtLS1cXG5gO1xyXG4gICAgICBvdXRwdXQgKz0gYFN0YXR1czogJHt0YWJsZS52YWxpZCA/ICfinIUgUEFTUycgOiAn4p2MIEZBSUwnfVxcbmA7XHJcbiAgICAgIFxyXG4gICAgICAvLyBSZXF1aXJlbWVudHMgY2hlY2tsaXN0XHJcbiAgICAgIG91dHB1dCArPSAnUmVxdWlyZW1lbnRzOlxcbic7XHJcbiAgICAgIG91dHB1dCArPSBgICBLTVMgRW5jcnlwdGlvbjogJHt0YWJsZS5yZXF1aXJlbWVudHMuaGFzS21zRW5jcnlwdGlvbiA/ICfinIUnIDogJ+KdjCd9XFxuYDtcclxuICAgICAgb3V0cHV0ICs9IGAgIFBvaW50LWluLVRpbWUgUmVjb3Zlcnk6ICR7dGFibGUucmVxdWlyZW1lbnRzLmhhc1BvaW50SW5UaW1lUmVjb3ZlcnkgPyAn4pyFJyA6ICfinYwnfVxcbmA7XHJcbiAgICAgIG91dHB1dCArPSBgICBSZXF1aXJlZCBHU0lzOiAke3RhYmxlLnJlcXVpcmVtZW50cy5oYXNSZXF1aXJlZEdTSXMgPyAn4pyFJyA6ICfinYwnfVxcbmA7XHJcbiAgICAgIG91dHB1dCArPSBgICBUVEwgQ29uZmlndXJhdGlvbjogJHt0YWJsZS5yZXF1aXJlbWVudHMuaGFzVFRMV2hlblJlcXVpcmVkID8gJ+KchScgOiAn4p2MJ31cXG5gO1xyXG4gICAgICBvdXRwdXQgKz0gYCAgQmlsbGluZyBNb2RlOiAke3RhYmxlLnJlcXVpcmVtZW50cy5oYXNDb3JyZWN0QmlsbGluZ01vZGUgPyAn4pyFJyA6ICfinYwnfVxcbmA7XHJcbiAgICAgIFxyXG4gICAgICAvLyBJc3N1ZXNcclxuICAgICAgaWYgKHRhYmxlLmlzc3Vlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgb3V0cHV0ICs9ICdJc3N1ZXM6XFxuJztcclxuICAgICAgICBmb3IgKGNvbnN0IGlzc3VlIG9mIHRhYmxlLmlzc3Vlcykge1xyXG4gICAgICAgICAgb3V0cHV0ICs9IGAgIOKdjCAke2lzc3VlfVxcbmA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBvdXRwdXQgKz0gJ1xcbic7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBvdXRwdXQ7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBNYWluIGV4ZWN1dGlvblxyXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcclxuICBjb25zdCBlbnZpcm9ubWVudCA9IChwcm9jZXNzLmFyZ3ZbMl0gYXMgJ2RldicgfCAnc3RhZ2luZycgfCAncHJvZHVjdGlvbicpIHx8ICdkZXYnO1xyXG4gIFxyXG4gIGNvbnNvbGUubG9nKGBWYWxpZGF0aW5nIER5bmFtb0RCIHRhYmxlcyBmb3IgZW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XHJcbiAgXHJcbiAgY29uc3QgdmFsaWRhdG9yID0gbmV3IER5bmFtb0RCVGFibGVWYWxpZGF0b3IoZW52aXJvbm1lbnQpO1xyXG4gIGNvbnN0IHJlcG9ydCA9IHZhbGlkYXRvci5nZW5lcmF0ZVJlcG9ydCgpO1xyXG4gIFxyXG4gIGNvbnNvbGUubG9nKHJlcG9ydCk7XHJcbiAgXHJcbiAgLy8gRXhpdCB3aXRoIGVycm9yIGNvZGUgaWYgdmFsaWRhdGlvbiBmYWlsc1xyXG4gIGNvbnN0IHZhbGlkYXRpb24gPSB2YWxpZGF0b3IudmFsaWRhdGVUYWJsZXMoKTtcclxuICBwcm9jZXNzLmV4aXQodmFsaWRhdGlvbi5vdmVyYWxsID8gMCA6IDEpO1xyXG59XHJcblxyXG5leHBvcnQgeyBEeW5hbW9EQlRhYmxlVmFsaWRhdG9yLCBWYWxpZGF0aW9uUmVwb3J0LCBUYWJsZVZhbGlkYXRpb25SZXN1bHQgfTsiXX0=
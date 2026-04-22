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

import { MisraPlatformMVPStack } from '../infrastructure/app';
import * as cdk from 'aws-cdk-lib';

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

class DynamoDBTableValidator {
  private app: cdk.App;
  private stack: MisraPlatformMVPStack;

  constructor(environment: 'dev' | 'staging' | 'production' = 'dev') {
    this.app = new cdk.App();
    this.stack = new MisraPlatformMVPStack(this.app, 'ValidationStack', {
      env: {
        account: '123456789012', // Dummy account for validation
        region: 'us-east-1',
      },
    });
  }

  /**
   * Validate all DynamoDB tables against spec requirements
   */
  public validateTables(): ValidationReport {
    const results: TableValidationResult[] = [
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
  private validateUsersTable(): TableValidationResult {
    const table = (this.stack as any).usersTable;
    const issues: string[] = [];
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
    const partitionKey = (table as any).schema?.partitionKey;
    if (!partitionKey || partitionKey.name !== 'userId' || partitionKey.type !== 'S') {
      issues.push('Partition key must be "userId" of type STRING');
    }

    // Check encryption (KMS)
    const encryption = (table as any).encryption;
    if (encryption === 'CUSTOMER_MANAGED') {
      requirements.hasKmsEncryption = true;
    } else {
      issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
    }

    // Check billing mode
    const billingMode = (table as any).billingMode;
    if (billingMode === 'PAY_PER_REQUEST') {
      requirements.hasCorrectBillingMode = true;
    } else {
      issues.push('Table must use PAY_PER_REQUEST billing mode');
    }

    // Check point-in-time recovery (production only)
    const pitr = (table as any).pointInTimeRecoveryEnabled;
    if (this.stack.node.tryGetContext('environment') === 'production') {
      if (pitr) {
        requirements.hasPointInTimeRecovery = true;
      } else {
        issues.push('Point-in-time recovery must be enabled for production');
      }
    } else {
      requirements.hasPointInTimeRecovery = true; // Not required for non-prod
    }

    // Check required GSIs
    const gsis = (table as any).globalSecondaryIndexes || [];
    const requiredGSIs = ['email-index'];
    const existingGSIs = gsis.map((gsi: any) => gsi.indexName);
    
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
  private validateFileMetadataTable(): TableValidationResult {
    const table = (this.stack as any).fileMetadataTable;
    const issues: string[] = [];
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
    const partitionKey = (table as any).schema?.partitionKey;
    if (!partitionKey || partitionKey.name !== 'fileId' || partitionKey.type !== 'S') {
      issues.push('Partition key must be "fileId" of type STRING');
    }

    // Check encryption
    const encryption = (table as any).encryption;
    if (encryption === 'CUSTOMER_MANAGED') {
      requirements.hasKmsEncryption = true;
    } else {
      issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
    }

    // Check billing mode
    const billingMode = (table as any).billingMode;
    if (billingMode === 'PAY_PER_REQUEST') {
      requirements.hasCorrectBillingMode = true;
    } else {
      issues.push('Table must use PAY_PER_REQUEST billing mode');
    }

    // Check point-in-time recovery
    const pitr = (table as any).pointInTimeRecoveryEnabled;
    if (this.stack.node.tryGetContext('environment') === 'production') {
      if (pitr) {
        requirements.hasPointInTimeRecovery = true;
      } else {
        issues.push('Point-in-time recovery must be enabled for production');
      }
    } else {
      requirements.hasPointInTimeRecovery = true;
    }

    // Check required GSIs
    const gsis = (table as any).globalSecondaryIndexes || [];
    const requiredGSIs = ['userId-uploadTimestamp-index', 'contentHash-index'];
    const existingGSIs = gsis.map((gsi: any) => gsi.indexName);
    
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
  private validateAnalysisResultsTable(): TableValidationResult {
    const table = (this.stack as any).analysisResultsTable;
    const issues: string[] = [];
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
    const partitionKey = (table as any).schema?.partitionKey;
    const sortKey = (table as any).schema?.sortKey;
    
    if (!partitionKey || partitionKey.name !== 'analysisId' || partitionKey.type !== 'S') {
      issues.push('Partition key must be "analysisId" of type STRING');
    }
    
    if (!sortKey || sortKey.name !== 'timestamp' || sortKey.type !== 'N') {
      issues.push('Sort key must be "timestamp" of type NUMBER');
    }

    // Check encryption
    const encryption = (table as any).encryption;
    if (encryption === 'CUSTOMER_MANAGED') {
      requirements.hasKmsEncryption = true;
    } else {
      issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
    }

    // Check billing mode
    const billingMode = (table as any).billingMode;
    if (billingMode === 'PAY_PER_REQUEST') {
      requirements.hasCorrectBillingMode = true;
    } else {
      issues.push('Table must use PAY_PER_REQUEST billing mode');
    }

    // Check point-in-time recovery
    const pitr = (table as any).pointInTimeRecoveryEnabled;
    if (this.stack.node.tryGetContext('environment') === 'production') {
      if (pitr) {
        requirements.hasPointInTimeRecovery = true;
      } else {
        issues.push('Point-in-time recovery must be enabled for production');
      }
    } else {
      requirements.hasPointInTimeRecovery = true;
    }

    // Check TTL configuration for non-production
    const ttlAttribute = (table as any).timeToLiveAttribute;
    if (this.stack.node.tryGetContext('environment') !== 'production') {
      if (ttlAttribute === 'ttl') {
        requirements.hasTTLWhenRequired = true;
      } else {
        issues.push('TTL attribute "ttl" must be configured for non-production environments');
      }
    } else {
      requirements.hasTTLWhenRequired = true; // Not required for production
    }

    // Check required GSIs
    const gsis = (table as any).globalSecondaryIndexes || [];
    const requiredGSIs = [
      'fileId-timestamp-index',
      'userId-timestamp-index',
      'contentHash-timestamp-index'
    ];
    const existingGSIs = gsis.map((gsi: any) => gsi.indexName);
    
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
  private validateSampleFilesTable(): TableValidationResult {
    const table = (this.stack as any).sampleFilesTable;
    const issues: string[] = [];
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
    const partitionKey = (table as any).schema?.partitionKey;
    if (!partitionKey || partitionKey.name !== 'sampleId' || partitionKey.type !== 'S') {
      issues.push('Partition key must be "sampleId" of type STRING');
    }

    // Check encryption
    const encryption = (table as any).encryption;
    if (encryption === 'CUSTOMER_MANAGED') {
      requirements.hasKmsEncryption = true;
    } else {
      issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
    }

    // Check billing mode
    const billingMode = (table as any).billingMode;
    if (billingMode === 'PAY_PER_REQUEST') {
      requirements.hasCorrectBillingMode = true;
    } else {
      issues.push('Table must use PAY_PER_REQUEST billing mode');
    }

    // Check required GSIs for sample file filtering
    const gsis = (table as any).globalSecondaryIndexes || [];
    const requiredGSIs = [
      'language-difficultyLevel-index',
      'language-expectedCompliance-index',
      'usageCount-createdAt-index'
    ];
    const existingGSIs = gsis.map((gsi: any) => gsi.indexName);
    
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
  private validateProgressTable(): TableValidationResult {
    const table = (this.stack as any).progressTable;
    const issues: string[] = [];
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
    const partitionKey = (table as any).schema?.partitionKey;
    if (!partitionKey || partitionKey.name !== 'analysisId' || partitionKey.type !== 'S') {
      issues.push('Partition key must be "analysisId" of type STRING');
    }

    // Check encryption
    const encryption = (table as any).encryption;
    if (encryption === 'CUSTOMER_MANAGED') {
      requirements.hasKmsEncryption = true;
    } else {
      issues.push('Table must use KMS encryption (CUSTOMER_MANAGED)');
    }

    // Check billing mode
    const billingMode = (table as any).billingMode;
    if (billingMode === 'PAY_PER_REQUEST') {
      requirements.hasCorrectBillingMode = true;
    } else {
      issues.push('Table must use PAY_PER_REQUEST billing mode');
    }

    // Check TTL configuration (required for progress table)
    const ttlAttribute = (table as any).timeToLiveAttribute;
    if (ttlAttribute === 'ttl') {
      requirements.hasTTLWhenRequired = true;
    } else {
      issues.push('TTL attribute "ttl" must be configured for progress table auto-cleanup');
    }

    // Check required GSIs
    const gsis = (table as any).globalSecondaryIndexes || [];
    const requiredGSIs = ['userId-updatedAt-index'];
    const existingGSIs = gsis.map((gsi: any) => gsi.indexName);
    
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
  public generateReport(): string {
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

// Main execution
if (require.main === module) {
  const environment = (process.argv[2] as 'dev' | 'staging' | 'production') || 'dev';
  
  console.log(`Validating DynamoDB tables for environment: ${environment}`);
  
  const validator = new DynamoDBTableValidator(environment);
  const report = validator.generateReport();
  
  console.log(report);
  
  // Exit with error code if validation fails
  const validation = validator.validateTables();
  process.exit(validation.overall ? 0 : 1);
}

export { DynamoDBTableValidator, ValidationReport, TableValidationResult };
#!/usr/bin/env node

/**
 * DynamoDB Table Configuration Verification Script
 * 
 * This script verifies that the DynamoDB table configurations in the production
 * CDK stack meet all requirements by analyzing the source code directly.
 */

import * as fs from 'fs';
import * as path from 'path';

interface TableRequirement {
  name: string;
  partitionKey: string;
  sortKey?: string;
  requiredGSIs: string[];
  needsKMSEncryption: boolean;
  needsPITR: boolean;
  needsTTL: boolean;
  description: string;
}

const REQUIRED_TABLES: TableRequirement[] = [
  {
    name: 'Users',
    partitionKey: 'userId',
    requiredGSIs: ['email-index'],
    needsKMSEncryption: true,
    needsPITR: true,
    needsTTL: false,
    description: 'User profiles and authentication data'
  },
  {
    name: 'FileMetadata',
    partitionKey: 'fileId',
    requiredGSIs: ['userId-uploadTimestamp-index', 'contentHash-index'],
    needsKMSEncryption: true,
    needsPITR: true,
    needsTTL: false,
    description: 'File upload metadata and S3 references'
  },
  {
    name: 'AnalysisResults',
    partitionKey: 'analysisId',
    sortKey: 'timestamp',
    requiredGSIs: ['fileId-timestamp-index', 'userId-timestamp-index', 'contentHash-timestamp-index'],
    needsKMSEncryption: true,
    needsPITR: true,
    needsTTL: true,
    description: 'MISRA analysis results and violations'
  },
  {
    name: 'SampleFiles',
    partitionKey: 'sampleId',
    requiredGSIs: ['language-difficultyLevel-index', 'language-expectedCompliance-index', 'usageCount-createdAt-index'],
    needsKMSEncryption: true,
    needsPITR: false,
    needsTTL: false,
    description: 'Curated sample files library'
  },
  {
    name: 'Progress',
    partitionKey: 'analysisId',
    requiredGSIs: ['userId-updatedAt-index'],
    needsKMSEncryption: true,
    needsPITR: false,
    needsTTL: true,
    description: 'Real-time analysis progress tracking'
  }
];

class TableConfigVerifier {
  private stackFilePath: string;
  private stackContent: string;

  constructor() {
    this.stackFilePath = path.join(__dirname, '../infrastructure/production-misra-stack.ts');
    this.stackContent = fs.readFileSync(this.stackFilePath, 'utf-8');
  }

  /**
   * Verify all table configurations
   */
  public verifyAllTables(): boolean {
    console.log('🔍 Verifying DynamoDB Table Configurations...\n');
    
    let allValid = true;
    
    for (const requirement of REQUIRED_TABLES) {
      const isValid = this.verifyTable(requirement);
      if (!isValid) {
        allValid = false;
      }
      console.log(''); // Add spacing between tables
    }
    
    console.log('='.repeat(60));
    console.log(`Overall Result: ${allValid ? '✅ ALL TABLES VALID' : '❌ SOME TABLES NEED FIXES'}`);
    
    return allValid;
  }

  /**
   * Verify a single table configuration
   */
  private verifyTable(requirement: TableRequirement): boolean {
    console.log(`📋 Checking ${requirement.name} Table`);
    console.log(`   ${requirement.description}`);
    
    let isValid = true;
    const issues: string[] = [];
    
    // Map requirement names to actual property names in the stack
    const tablePropertyMap: { [key: string]: string } = {
      'Users': 'usersTable',
      'FileMetadata': 'fileMetadataTable', 
      'AnalysisResults': 'analysisResultsTable',
      'SampleFiles': 'sampleFilesTable',
      'Progress': 'progressTable'
    };
    
    const propertyName = tablePropertyMap[requirement.name];
    
    // Check if table is defined
    const tablePattern = new RegExp(`this\\.${propertyName}\\s*=\\s*new\\s+dynamodb\\.Table`);
    if (!tablePattern.test(this.stackContent)) {
      issues.push(`Table definition not found (looking for ${propertyName})`);
      isValid = false;
    }
    
    // Check table name pattern - handle different naming conventions
    let expectedTableName = '';
    switch (requirement.name) {
      case 'Users':
        expectedTableName = 'misra-platform-users';
        break;
      case 'FileMetadata':
        expectedTableName = 'misra-platform-file-metadata';
        break;
      case 'AnalysisResults':
        expectedTableName = 'misra-platform-analysis-results';
        break;
      case 'SampleFiles':
        expectedTableName = 'misra-platform-sample-files';
        break;
      case 'Progress':
        expectedTableName = 'misra-platform-progress';
        break;
    }
    
    const tableNamePattern = new RegExp(`tableName:\\s*\`${expectedTableName}-\\$\\{environment\\}\``);
    if (!tableNamePattern.test(this.stackContent)) {
      issues.push(`Table name pattern incorrect (expected: ${expectedTableName}-\${environment})`);
      isValid = false;
    }
    
    // Check partition key
    const partitionKeyPattern = new RegExp(`partitionKey:\\s*\\{\\s*name:\\s*['"]${requirement.partitionKey}['"]\\s*,\\s*type:\\s*dynamodb\\.AttributeType\\.STRING\\s*\\}`);
    if (!partitionKeyPattern.test(this.stackContent)) {
      issues.push(`Partition key '${requirement.partitionKey}' not configured correctly`);
      isValid = false;
    }
    
    // Check sort key if required
    if (requirement.sortKey) {
      const sortKeyPattern = new RegExp(`sortKey:\\s*\\{\\s*name:\\s*['"]${requirement.sortKey}['"]\\s*,\\s*type:\\s*dynamodb\\.AttributeType\\.NUMBER\\s*\\}`);
      if (!sortKeyPattern.test(this.stackContent)) {
        issues.push(`Sort key '${requirement.sortKey}' not configured correctly`);
        isValid = false;
      }
    }
    
    // Check KMS encryption
    if (requirement.needsKMSEncryption) {
      const kmsPattern = /encryption:\s*dynamodb\.TableEncryption\.CUSTOMER_MANAGED/;
      if (!kmsPattern.test(this.stackContent)) {
        issues.push(`KMS encryption not configured`);
        isValid = false;
      }
    }
    
    // Check billing mode
    const billingModePattern = /billingMode:\s*dynamodb\.BillingMode\.PAY_PER_REQUEST/;
    if (!billingModePattern.test(this.stackContent)) {
      issues.push(`Pay-per-request billing mode not configured`);
      isValid = false;
    }
    
    // Check point-in-time recovery
    if (requirement.needsPITR) {
      const pitrPattern = /pointInTimeRecovery:\s*environment\s*===\s*['"]production['"]/;
      if (!pitrPattern.test(this.stackContent)) {
        issues.push(`Point-in-time recovery not configured for production`);
        isValid = false;
      }
    }
    
    // Check TTL configuration
    if (requirement.needsTTL) {
      const ttlPattern = /timeToLiveAttribute:\s*['"]ttl['"]/;
      if (!ttlPattern.test(this.stackContent)) {
        issues.push(`TTL attribute not configured`);
        isValid = false;
      }
    }
    
    // Check required GSIs
    for (const gsiName of requirement.requiredGSIs) {
      const gsiPattern = new RegExp(`indexName:\\s*['"]${gsiName}['"]`);
      if (!gsiPattern.test(this.stackContent)) {
        issues.push(`Required GSI '${gsiName}' not found`);
        isValid = false;
      }
    }
    
    // Report results
    if (isValid) {
      console.log(`   ✅ Valid - All requirements met`);
    } else {
      console.log(`   ❌ Issues found:`);
      for (const issue of issues) {
        console.log(`      • ${issue}`);
      }
    }
    
    return isValid;
  }

  /**
   * Generate a summary report
   */
  public generateSummaryReport(): void {
    console.log('\n📊 DynamoDB Tables Summary Report\n');
    
    console.log('Required Tables:');
    for (const requirement of REQUIRED_TABLES) {
      console.log(`• ${requirement.name} - ${requirement.description}`);
      console.log(`  Primary Key: ${requirement.partitionKey}${requirement.sortKey ? ` + ${requirement.sortKey}` : ''}`);
      console.log(`  GSIs: ${requirement.requiredGSIs.length} (${requirement.requiredGSIs.join(', ')})`);
      console.log(`  Features: ${[
        requirement.needsKMSEncryption ? 'KMS' : '',
        requirement.needsPITR ? 'PITR' : '',
        requirement.needsTTL ? 'TTL' : ''
      ].filter(Boolean).join(', ') || 'Basic'}`);
      console.log('');
    }
    
    console.log('Security Features:');
    console.log('• KMS encryption for all tables');
    console.log('• Point-in-time recovery for production');
    console.log('• Pay-per-request billing for cost optimization');
    console.log('• TTL for automatic cleanup where appropriate');
    console.log('');
    
    console.log('Access Patterns Supported:');
    console.log('• User lookup by email (Users.email-index)');
    console.log('• File listing by user and time (FileMetadata.userId-uploadTimestamp-index)');
    console.log('• Analysis history by file/user (AnalysisResults GSIs)');
    console.log('• Sample file filtering by language/difficulty (SampleFiles GSIs)');
    console.log('• Real-time progress tracking (Progress.userId-updatedAt-index)');
    console.log('• Content-based caching (contentHash indexes)');
  }
}

// Main execution
if (require.main === module) {
  const verifier = new TableConfigVerifier();
  
  // Generate summary report
  verifier.generateSummaryReport();
  
  // Verify configurations
  const isValid = verifier.verifyAllTables();
  
  // Exit with appropriate code
  process.exit(isValid ? 0 : 1);
}

export { TableConfigVerifier };
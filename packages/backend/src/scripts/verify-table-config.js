#!/usr/bin/env node
"use strict";
/**
 * DynamoDB Table Configuration Verification Script
 *
 * This script verifies that the DynamoDB table configurations in the production
 * CDK stack meet all requirements by analyzing the source code directly.
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
exports.TableConfigVerifier = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const REQUIRED_TABLES = [
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
    stackFilePath;
    stackContent;
    constructor() {
        this.stackFilePath = path.join(__dirname, '../infrastructure/production-misra-stack.ts');
        this.stackContent = fs.readFileSync(this.stackFilePath, 'utf-8');
    }
    /**
     * Verify all table configurations
     */
    verifyAllTables() {
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
    verifyTable(requirement) {
        console.log(`📋 Checking ${requirement.name} Table`);
        console.log(`   ${requirement.description}`);
        let isValid = true;
        const issues = [];
        // Map requirement names to actual property names in the stack
        const tablePropertyMap = {
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
        }
        else {
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
    generateSummaryReport() {
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
exports.TableConfigVerifier = TableConfigVerifier;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LXRhYmxlLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZlcmlmeS10YWJsZS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFFQTs7Ozs7R0FLRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQWE3QixNQUFNLGVBQWUsR0FBdUI7SUFDMUM7UUFDRSxJQUFJLEVBQUUsT0FBTztRQUNiLFlBQVksRUFBRSxRQUFRO1FBQ3RCLFlBQVksRUFBRSxDQUFDLGFBQWEsQ0FBQztRQUM3QixrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLFNBQVMsRUFBRSxJQUFJO1FBQ2YsUUFBUSxFQUFFLEtBQUs7UUFDZixXQUFXLEVBQUUsdUNBQXVDO0tBQ3JEO0lBQ0Q7UUFDRSxJQUFJLEVBQUUsY0FBYztRQUNwQixZQUFZLEVBQUUsUUFBUTtRQUN0QixZQUFZLEVBQUUsQ0FBQyw4QkFBOEIsRUFBRSxtQkFBbUIsQ0FBQztRQUNuRSxrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLFNBQVMsRUFBRSxJQUFJO1FBQ2YsUUFBUSxFQUFFLEtBQUs7UUFDZixXQUFXLEVBQUUsd0NBQXdDO0tBQ3REO0lBQ0Q7UUFDRSxJQUFJLEVBQUUsaUJBQWlCO1FBQ3ZCLFlBQVksRUFBRSxZQUFZO1FBQzFCLE9BQU8sRUFBRSxXQUFXO1FBQ3BCLFlBQVksRUFBRSxDQUFDLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLDZCQUE2QixDQUFDO1FBQ2pHLGtCQUFrQixFQUFFLElBQUk7UUFDeEIsU0FBUyxFQUFFLElBQUk7UUFDZixRQUFRLEVBQUUsSUFBSTtRQUNkLFdBQVcsRUFBRSx1Q0FBdUM7S0FDckQ7SUFDRDtRQUNFLElBQUksRUFBRSxhQUFhO1FBQ25CLFlBQVksRUFBRSxVQUFVO1FBQ3hCLFlBQVksRUFBRSxDQUFDLGdDQUFnQyxFQUFFLG1DQUFtQyxFQUFFLDRCQUE0QixDQUFDO1FBQ25ILGtC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QU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUMsQ0FBQztRQUMxRCxPQUFPLENBQUMsR0FBRyxDQUFDLDZFQUE2RSxDQUFDLENBQUM7UUFDM0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO1FBQ3RFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUVBQW1FLENBQUMsQ0FBQztRQUNqRixPQUFPLENBQUMsR0FBRyxDQUFDLGlFQUFpRSxDQUFDLENBQUM7UUFDL0UsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO0lBQy9ELENBQUM7Q0FDRjtBQWdCUSxrREFBbUI7QUFkNUIsaUJBQWlCO0FBQ2pCLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztJQUM1QixNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFFM0MsMEJBQTBCO0lBQzFCLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO0lBRWpDLHdCQUF3QjtJQUN4QixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUM7SUFFM0MsNkJBQTZCO0lBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcblxyXG4vKipcclxuICogRHluYW1vREIgVGFibGUgQ29uZmlndXJhdGlvbiBWZXJpZmljYXRpb24gU2NyaXB0XHJcbiAqIFxyXG4gKiBUaGlzIHNjcmlwdCB2ZXJpZmllcyB0aGF0IHRoZSBEeW5hbW9EQiB0YWJsZSBjb25maWd1cmF0aW9ucyBpbiB0aGUgcHJvZHVjdGlvblxyXG4gKiBDREsgc3RhY2sgbWVldCBhbGwgcmVxdWlyZW1lbnRzIGJ5IGFuYWx5emluZyB0aGUgc291cmNlIGNvZGUgZGlyZWN0bHkuXHJcbiAqL1xyXG5cclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuaW50ZXJmYWNlIFRhYmxlUmVxdWlyZW1lbnQge1xyXG4gIG5hbWU6IHN0cmluZztcclxuICBwYXJ0aXRpb25LZXk6IHN0cmluZztcclxuICBzb3J0S2V5Pzogc3RyaW5nO1xyXG4gIHJlcXVpcmVkR1NJczogc3RyaW5nW107XHJcbiAgbmVlZHNLTVNFbmNyeXB0aW9uOiBib29sZWFuO1xyXG4gIG5lZWRzUElUUjogYm9vbGVhbjtcclxuICBuZWVkc1RUTDogYm9vbGVhbjtcclxuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG59XHJcblxyXG5jb25zdCBSRVFVSVJFRF9UQUJMRVM6IFRhYmxlUmVxdWlyZW1lbnRbXSA9IFtcclxuICB7XHJcbiAgICBuYW1lOiAnVXNlcnMnLFxyXG4gICAgcGFydGl0aW9uS2V5OiAndXNlcklkJyxcclxuICAgIHJlcXVpcmVkR1NJczogWydlbWFpbC1pbmRleCddLFxyXG4gICAgbmVlZHNLTVNFbmNyeXB0aW9uOiB0cnVlLFxyXG4gICAgbmVlZHNQSVRSOiB0cnVlLFxyXG4gICAgbmVlZHNUVEw6IGZhbHNlLFxyXG4gICAgZGVzY3JpcHRpb246ICdVc2VyIHByb2ZpbGVzIGFuZCBhdXRoZW50aWNhdGlvbiBkYXRhJ1xyXG4gIH0sXHJcbiAge1xyXG4gICAgbmFtZTogJ0ZpbGVNZXRhZGF0YScsXHJcbiAgICBwYXJ0aXRpb25LZXk6ICdmaWxlSWQnLFxyXG4gICAgcmVxdWlyZWRHU0lzOiBbJ3VzZXJJZC11cGxvYWRUaW1lc3RhbXAtaW5kZXgnLCAnY29udGVudEhhc2gtaW5kZXgnXSxcclxuICAgIG5lZWRzS01TRW5jcnlwdGlvbjogdHJ1ZSxcclxuICAgIG5lZWRzUElUUjogdHJ1ZSxcclxuICAgIG5lZWRzVFRMOiBmYWxzZSxcclxuICAgIGRlc2NyaXB0aW9uOiAnRmlsZSB1cGxvYWQgbWV0YWRhdGEgYW5kIFMzIHJlZmVyZW5jZXMnXHJcbiAgfSxcclxuICB7XHJcbiAgICBuYW1lOiAnQW5hbHlzaXNSZXN1bHRzJyxcclxuICAgIHBhcnRpdGlvbktleTogJ2FuYWx5c2lzSWQnLFxyXG4gICAgc29ydEtleTogJ3RpbWVzdGFtcCcsXHJcbiAgICByZXF1aXJlZEdTSXM6IFsnZmlsZUlkLXRpbWVzdGFtcC1pbmRleCcsICd1c2VySWQtdGltZXN0YW1wLWluZGV4JywgJ2NvbnRlbnRIYXNoLXRpbWVzdGFtcC1pbmRleCddLFxyXG4gICAgbmVlZHNLTVNFbmNyeXB0aW9uOiB0cnVlLFxyXG4gICAgbmVlZHNQSVRSOiB0cnVlLFxyXG4gICAgbmVlZHNUVEw6IHRydWUsXHJcbiAgICBkZXNjcmlwdGlvbjogJ01JU1JBIGFuYWx5c2lzIHJlc3VsdHMgYW5kIHZpb2xhdGlvbnMnXHJcbiAgfSxcclxuICB7XHJcbiAgICBuYW1lOiAnU2FtcGxlRmlsZXMnLFxyXG4gICAgcGFydGl0aW9uS2V5OiAnc2FtcGxlSWQnLFxyXG4gICAgcmVxdWlyZWRHU0lzOiBbJ2xhbmd1YWdlLWRpZmZpY3VsdHlMZXZlbC1pbmRleCcsICdsYW5ndWFnZS1leHBlY3RlZENvbXBsaWFuY2UtaW5kZXgnLCAndXNhZ2VDb3VudC1jcmVhdGVkQXQtaW5kZXgnXSxcclxuICAgIG5lZWRzS01TRW5jcnlwdGlvbjogdHJ1ZSxcclxuICAgIG5lZWRzUElUUjogZmFsc2UsXHJcbiAgICBuZWVkc1RUTDogZmFsc2UsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0N1cmF0ZWQgc2FtcGxlIGZpbGVzIGxpYnJhcnknXHJcbiAgfSxcclxuICB7XHJcbiAgICBuYW1lOiAnUHJvZ3Jlc3MnLFxyXG4gICAgcGFydGl0aW9uS2V5OiAnYW5hbHlzaXNJZCcsXHJcbiAgICByZXF1aXJlZEdTSXM6IFsndXNlcklkLXVwZGF0ZWRBdC1pbmRleCddLFxyXG4gICAgbmVlZHNLTVNFbmNyeXB0aW9uOiB0cnVlLFxyXG4gICAgbmVlZHNQSVRSOiBmYWxzZSxcclxuICAgIG5lZWRzVFRMOiB0cnVlLFxyXG4gICAgZGVzY3JpcHRpb246ICdSZWFsLXRpbWUgYW5hbHlzaXMgcHJvZ3Jlc3MgdHJhY2tpbmcnXHJcbiAgfVxyXG5dO1xyXG5cclxuY2xhc3MgVGFibGVDb25maWdWZXJpZmllciB7XHJcbiAgcHJpdmF0ZSBzdGFja0ZpbGVQYXRoOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBzdGFja0NvbnRlbnQ6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnN0YWNrRmlsZVBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vaW5mcmFzdHJ1Y3R1cmUvcHJvZHVjdGlvbi1taXNyYS1zdGFjay50cycpO1xyXG4gICAgdGhpcy5zdGFja0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmModGhpcy5zdGFja0ZpbGVQYXRoLCAndXRmLTgnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZlcmlmeSBhbGwgdGFibGUgY29uZmlndXJhdGlvbnNcclxuICAgKi9cclxuICBwdWJsaWMgdmVyaWZ5QWxsVGFibGVzKCk6IGJvb2xlYW4ge1xyXG4gICAgY29uc29sZS5sb2coJ/CflI0gVmVyaWZ5aW5nIER5bmFtb0RCIFRhYmxlIENvbmZpZ3VyYXRpb25zLi4uXFxuJyk7XHJcbiAgICBcclxuICAgIGxldCBhbGxWYWxpZCA9IHRydWU7XHJcbiAgICBcclxuICAgIGZvciAoY29uc3QgcmVxdWlyZW1lbnQgb2YgUkVRVUlSRURfVEFCTEVTKSB7XHJcbiAgICAgIGNvbnN0IGlzVmFsaWQgPSB0aGlzLnZlcmlmeVRhYmxlKHJlcXVpcmVtZW50KTtcclxuICAgICAgaWYgKCFpc1ZhbGlkKSB7XHJcbiAgICAgICAgYWxsVmFsaWQgPSBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgICBjb25zb2xlLmxvZygnJyk7IC8vIEFkZCBzcGFjaW5nIGJldHdlZW4gdGFibGVzXHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKCc9Jy5yZXBlYXQoNjApKTtcclxuICAgIGNvbnNvbGUubG9nKGBPdmVyYWxsIFJlc3VsdDogJHthbGxWYWxpZCA/ICfinIUgQUxMIFRBQkxFUyBWQUxJRCcgOiAn4p2MIFNPTUUgVEFCTEVTIE5FRUQgRklYRVMnfWApO1xyXG4gICAgXHJcbiAgICByZXR1cm4gYWxsVmFsaWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgYSBzaW5nbGUgdGFibGUgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgdmVyaWZ5VGFibGUocmVxdWlyZW1lbnQ6IFRhYmxlUmVxdWlyZW1lbnQpOiBib29sZWFuIHtcclxuICAgIGNvbnNvbGUubG9nKGDwn5OLIENoZWNraW5nICR7cmVxdWlyZW1lbnQubmFtZX0gVGFibGVgKTtcclxuICAgIGNvbnNvbGUubG9nKGAgICAke3JlcXVpcmVtZW50LmRlc2NyaXB0aW9ufWApO1xyXG4gICAgXHJcbiAgICBsZXQgaXNWYWxpZCA9IHRydWU7XHJcbiAgICBjb25zdCBpc3N1ZXM6IHN0cmluZ1tdID0gW107XHJcbiAgICBcclxuICAgIC8vIE1hcCByZXF1aXJlbWVudCBuYW1lcyB0byBhY3R1YWwgcHJvcGVydHkgbmFtZXMgaW4gdGhlIHN0YWNrXHJcbiAgICBjb25zdCB0YWJsZVByb3BlcnR5TWFwOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9ID0ge1xyXG4gICAgICAnVXNlcnMnOiAndXNlcnNUYWJsZScsXHJcbiAgICAgICdGaWxlTWV0YWRhdGEnOiAnZmlsZU1ldGFkYXRhVGFibGUnLCBcclxuICAgICAgJ0FuYWx5c2lzUmVzdWx0cyc6ICdhbmFseXNpc1Jlc3VsdHNUYWJsZScsXHJcbiAgICAgICdTYW1wbGVGaWxlcyc6ICdzYW1wbGVGaWxlc1RhYmxlJyxcclxuICAgICAgJ1Byb2dyZXNzJzogJ3Byb2dyZXNzVGFibGUnXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBjb25zdCBwcm9wZXJ0eU5hbWUgPSB0YWJsZVByb3BlcnR5TWFwW3JlcXVpcmVtZW50Lm5hbWVdO1xyXG4gICAgXHJcbiAgICAvLyBDaGVjayBpZiB0YWJsZSBpcyBkZWZpbmVkXHJcbiAgICBjb25zdCB0YWJsZVBhdHRlcm4gPSBuZXcgUmVnRXhwKGB0aGlzXFxcXC4ke3Byb3BlcnR5TmFtZX1cXFxccyo9XFxcXHMqbmV3XFxcXHMrZHluYW1vZGJcXFxcLlRhYmxlYCk7XHJcbiAgICBpZiAoIXRhYmxlUGF0dGVybi50ZXN0KHRoaXMuc3RhY2tDb250ZW50KSkge1xyXG4gICAgICBpc3N1ZXMucHVzaChgVGFibGUgZGVmaW5pdGlvbiBub3QgZm91bmQgKGxvb2tpbmcgZm9yICR7cHJvcGVydHlOYW1lfSlgKTtcclxuICAgICAgaXNWYWxpZCA9IGZhbHNlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBDaGVjayB0YWJsZSBuYW1lIHBhdHRlcm4gLSBoYW5kbGUgZGlmZmVyZW50IG5hbWluZyBjb252ZW50aW9uc1xyXG4gICAgbGV0IGV4cGVjdGVkVGFibGVOYW1lID0gJyc7XHJcbiAgICBzd2l0Y2ggKHJlcXVpcmVtZW50Lm5hbWUpIHtcclxuICAgICAgY2FzZSAnVXNlcnMnOlxyXG4gICAgICAgIGV4cGVjdGVkVGFibGVOYW1lID0gJ21pc3JhLXBsYXRmb3JtLXVzZXJzJztcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnRmlsZU1ldGFkYXRhJzpcclxuICAgICAgICBleHBlY3RlZFRhYmxlTmFtZSA9ICdtaXNyYS1wbGF0Zm9ybS1maWxlLW1ldGFkYXRhJztcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnQW5hbHlzaXNSZXN1bHRzJzpcclxuICAgICAgICBleHBlY3RlZFRhYmxlTmFtZSA9ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcy1yZXN1bHRzJztcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnU2FtcGxlRmlsZXMnOlxyXG4gICAgICAgIGV4cGVjdGVkVGFibGVOYW1lID0gJ21pc3JhLXBsYXRmb3JtLXNhbXBsZS1maWxlcyc7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ1Byb2dyZXNzJzpcclxuICAgICAgICBleHBlY3RlZFRhYmxlTmFtZSA9ICdtaXNyYS1wbGF0Zm9ybS1wcm9ncmVzcyc7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnN0IHRhYmxlTmFtZVBhdHRlcm4gPSBuZXcgUmVnRXhwKGB0YWJsZU5hbWU6XFxcXHMqXFxgJHtleHBlY3RlZFRhYmxlTmFtZX0tXFxcXCRcXFxce2Vudmlyb25tZW50XFxcXH1cXGBgKTtcclxuICAgIGlmICghdGFibGVOYW1lUGF0dGVybi50ZXN0KHRoaXMuc3RhY2tDb250ZW50KSkge1xyXG4gICAgICBpc3N1ZXMucHVzaChgVGFibGUgbmFtZSBwYXR0ZXJuIGluY29ycmVjdCAoZXhwZWN0ZWQ6ICR7ZXhwZWN0ZWRUYWJsZU5hbWV9LVxcJHtlbnZpcm9ubWVudH0pYCk7XHJcbiAgICAgIGlzVmFsaWQgPSBmYWxzZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgcGFydGl0aW9uIGtleVxyXG4gICAgY29uc3QgcGFydGl0aW9uS2V5UGF0dGVybiA9IG5ldyBSZWdFeHAoYHBhcnRpdGlvbktleTpcXFxccypcXFxce1xcXFxzKm5hbWU6XFxcXHMqWydcIl0ke3JlcXVpcmVtZW50LnBhcnRpdGlvbktleX1bJ1wiXVxcXFxzKixcXFxccyp0eXBlOlxcXFxzKmR5bmFtb2RiXFxcXC5BdHRyaWJ1dGVUeXBlXFxcXC5TVFJJTkdcXFxccypcXFxcfWApO1xyXG4gICAgaWYgKCFwYXJ0aXRpb25LZXlQYXR0ZXJuLnRlc3QodGhpcy5zdGFja0NvbnRlbnQpKSB7XHJcbiAgICAgIGlzc3Vlcy5wdXNoKGBQYXJ0aXRpb24ga2V5ICcke3JlcXVpcmVtZW50LnBhcnRpdGlvbktleX0nIG5vdCBjb25maWd1cmVkIGNvcnJlY3RseWApO1xyXG4gICAgICBpc1ZhbGlkID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIENoZWNrIHNvcnQga2V5IGlmIHJlcXVpcmVkXHJcbiAgICBpZiAocmVxdWlyZW1lbnQuc29ydEtleSkge1xyXG4gICAgICBjb25zdCBzb3J0S2V5UGF0dGVybiA9IG5ldyBSZWdFeHAoYHNvcnRLZXk6XFxcXHMqXFxcXHtcXFxccypuYW1lOlxcXFxzKlsnXCJdJHtyZXF1aXJlbWVudC5zb3J0S2V5fVsnXCJdXFxcXHMqLFxcXFxzKnR5cGU6XFxcXHMqZHluYW1vZGJcXFxcLkF0dHJpYnV0ZVR5cGVcXFxcLk5VTUJFUlxcXFxzKlxcXFx9YCk7XHJcbiAgICAgIGlmICghc29ydEtleVBhdHRlcm4udGVzdCh0aGlzLnN0YWNrQ29udGVudCkpIHtcclxuICAgICAgICBpc3N1ZXMucHVzaChgU29ydCBrZXkgJyR7cmVxdWlyZW1lbnQuc29ydEtleX0nIG5vdCBjb25maWd1cmVkIGNvcnJlY3RseWApO1xyXG4gICAgICAgIGlzVmFsaWQgPSBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBDaGVjayBLTVMgZW5jcnlwdGlvblxyXG4gICAgaWYgKHJlcXVpcmVtZW50Lm5lZWRzS01TRW5jcnlwdGlvbikge1xyXG4gICAgICBjb25zdCBrbXNQYXR0ZXJuID0gL2VuY3J5cHRpb246XFxzKmR5bmFtb2RiXFwuVGFibGVFbmNyeXB0aW9uXFwuQ1VTVE9NRVJfTUFOQUdFRC87XHJcbiAgICAgIGlmICgha21zUGF0dGVybi50ZXN0KHRoaXMuc3RhY2tDb250ZW50KSkge1xyXG4gICAgICAgIGlzc3Vlcy5wdXNoKGBLTVMgZW5jcnlwdGlvbiBub3QgY29uZmlndXJlZGApO1xyXG4gICAgICAgIGlzVmFsaWQgPSBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBDaGVjayBiaWxsaW5nIG1vZGVcclxuICAgIGNvbnN0IGJpbGxpbmdNb2RlUGF0dGVybiA9IC9iaWxsaW5nTW9kZTpcXHMqZHluYW1vZGJcXC5CaWxsaW5nTW9kZVxcLlBBWV9QRVJfUkVRVUVTVC87XHJcbiAgICBpZiAoIWJpbGxpbmdNb2RlUGF0dGVybi50ZXN0KHRoaXMuc3RhY2tDb250ZW50KSkge1xyXG4gICAgICBpc3N1ZXMucHVzaChgUGF5LXBlci1yZXF1ZXN0IGJpbGxpbmcgbW9kZSBub3QgY29uZmlndXJlZGApO1xyXG4gICAgICBpc1ZhbGlkID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIENoZWNrIHBvaW50LWluLXRpbWUgcmVjb3ZlcnlcclxuICAgIGlmIChyZXF1aXJlbWVudC5uZWVkc1BJVFIpIHtcclxuICAgICAgY29uc3QgcGl0clBhdHRlcm4gPSAvcG9pbnRJblRpbWVSZWNvdmVyeTpcXHMqZW52aXJvbm1lbnRcXHMqPT09XFxzKlsnXCJdcHJvZHVjdGlvblsnXCJdLztcclxuICAgICAgaWYgKCFwaXRyUGF0dGVybi50ZXN0KHRoaXMuc3RhY2tDb250ZW50KSkge1xyXG4gICAgICAgIGlzc3Vlcy5wdXNoKGBQb2ludC1pbi10aW1lIHJlY292ZXJ5IG5vdCBjb25maWd1cmVkIGZvciBwcm9kdWN0aW9uYCk7XHJcbiAgICAgICAgaXNWYWxpZCA9IGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIENoZWNrIFRUTCBjb25maWd1cmF0aW9uXHJcbiAgICBpZiAocmVxdWlyZW1lbnQubmVlZHNUVEwpIHtcclxuICAgICAgY29uc3QgdHRsUGF0dGVybiA9IC90aW1lVG9MaXZlQXR0cmlidXRlOlxccypbJ1wiXXR0bFsnXCJdLztcclxuICAgICAgaWYgKCF0dGxQYXR0ZXJuLnRlc3QodGhpcy5zdGFja0NvbnRlbnQpKSB7XHJcbiAgICAgICAgaXNzdWVzLnB1c2goYFRUTCBhdHRyaWJ1dGUgbm90IGNvbmZpZ3VyZWRgKTtcclxuICAgICAgICBpc1ZhbGlkID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgcmVxdWlyZWQgR1NJc1xyXG4gICAgZm9yIChjb25zdCBnc2lOYW1lIG9mIHJlcXVpcmVtZW50LnJlcXVpcmVkR1NJcykge1xyXG4gICAgICBjb25zdCBnc2lQYXR0ZXJuID0gbmV3IFJlZ0V4cChgaW5kZXhOYW1lOlxcXFxzKlsnXCJdJHtnc2lOYW1lfVsnXCJdYCk7XHJcbiAgICAgIGlmICghZ3NpUGF0dGVybi50ZXN0KHRoaXMuc3RhY2tDb250ZW50KSkge1xyXG4gICAgICAgIGlzc3Vlcy5wdXNoKGBSZXF1aXJlZCBHU0kgJyR7Z3NpTmFtZX0nIG5vdCBmb3VuZGApO1xyXG4gICAgICAgIGlzVmFsaWQgPSBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBSZXBvcnQgcmVzdWx0c1xyXG4gICAgaWYgKGlzVmFsaWQpIHtcclxuICAgICAgY29uc29sZS5sb2coYCAgIOKchSBWYWxpZCAtIEFsbCByZXF1aXJlbWVudHMgbWV0YCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmxvZyhgICAg4p2MIElzc3VlcyBmb3VuZDpgKTtcclxuICAgICAgZm9yIChjb25zdCBpc3N1ZSBvZiBpc3N1ZXMpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgICAgICAg4oCiICR7aXNzdWV9YCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGlzVmFsaWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBhIHN1bW1hcnkgcmVwb3J0XHJcbiAgICovXHJcbiAgcHVibGljIGdlbmVyYXRlU3VtbWFyeVJlcG9ydCgpOiB2b2lkIHtcclxuICAgIGNvbnNvbGUubG9nKCdcXG7wn5OKIER5bmFtb0RCIFRhYmxlcyBTdW1tYXJ5IFJlcG9ydFxcbicpO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygnUmVxdWlyZWQgVGFibGVzOicpO1xyXG4gICAgZm9yIChjb25zdCByZXF1aXJlbWVudCBvZiBSRVFVSVJFRF9UQUJMRVMpIHtcclxuICAgICAgY29uc29sZS5sb2coYOKAoiAke3JlcXVpcmVtZW50Lm5hbWV9IC0gJHtyZXF1aXJlbWVudC5kZXNjcmlwdGlvbn1gKTtcclxuICAgICAgY29uc29sZS5sb2coYCAgUHJpbWFyeSBLZXk6ICR7cmVxdWlyZW1lbnQucGFydGl0aW9uS2V5fSR7cmVxdWlyZW1lbnQuc29ydEtleSA/IGAgKyAke3JlcXVpcmVtZW50LnNvcnRLZXl9YCA6ICcnfWApO1xyXG4gICAgICBjb25zb2xlLmxvZyhgICBHU0lzOiAke3JlcXVpcmVtZW50LnJlcXVpcmVkR1NJcy5sZW5ndGh9ICgke3JlcXVpcmVtZW50LnJlcXVpcmVkR1NJcy5qb2luKCcsICcpfSlgKTtcclxuICAgICAgY29uc29sZS5sb2coYCAgRmVhdHVyZXM6ICR7W1xyXG4gICAgICAgIHJlcXVpcmVtZW50Lm5lZWRzS01TRW5jcnlwdGlvbiA/ICdLTVMnIDogJycsXHJcbiAgICAgICAgcmVxdWlyZW1lbnQubmVlZHNQSVRSID8gJ1BJVFInIDogJycsXHJcbiAgICAgICAgcmVxdWlyZW1lbnQubmVlZHNUVEwgPyAnVFRMJyA6ICcnXHJcbiAgICAgIF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJywgJykgfHwgJ0Jhc2ljJ31gKTtcclxuICAgICAgY29uc29sZS5sb2coJycpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZygnU2VjdXJpdHkgRmVhdHVyZXM6Jyk7XHJcbiAgICBjb25zb2xlLmxvZygn4oCiIEtNUyBlbmNyeXB0aW9uIGZvciBhbGwgdGFibGVzJyk7XHJcbiAgICBjb25zb2xlLmxvZygn4oCiIFBvaW50LWluLXRpbWUgcmVjb3ZlcnkgZm9yIHByb2R1Y3Rpb24nKTtcclxuICAgIGNvbnNvbGUubG9nKCfigKIgUGF5LXBlci1yZXF1ZXN0IGJpbGxpbmcgZm9yIGNvc3Qgb3B0aW1pemF0aW9uJyk7XHJcbiAgICBjb25zb2xlLmxvZygn4oCiIFRUTCBmb3IgYXV0b21hdGljIGNsZWFudXAgd2hlcmUgYXBwcm9wcmlhdGUnKTtcclxuICAgIGNvbnNvbGUubG9nKCcnKTtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coJ0FjY2VzcyBQYXR0ZXJucyBTdXBwb3J0ZWQ6Jyk7XHJcbiAgICBjb25zb2xlLmxvZygn4oCiIFVzZXIgbG9va3VwIGJ5IGVtYWlsIChVc2Vycy5lbWFpbC1pbmRleCknKTtcclxuICAgIGNvbnNvbGUubG9nKCfigKIgRmlsZSBsaXN0aW5nIGJ5IHVzZXIgYW5kIHRpbWUgKEZpbGVNZXRhZGF0YS51c2VySWQtdXBsb2FkVGltZXN0YW1wLWluZGV4KScpO1xyXG4gICAgY29uc29sZS5sb2coJ+KAoiBBbmFseXNpcyBoaXN0b3J5IGJ5IGZpbGUvdXNlciAoQW5hbHlzaXNSZXN1bHRzIEdTSXMpJyk7XHJcbiAgICBjb25zb2xlLmxvZygn4oCiIFNhbXBsZSBmaWxlIGZpbHRlcmluZyBieSBsYW5ndWFnZS9kaWZmaWN1bHR5IChTYW1wbGVGaWxlcyBHU0lzKScpO1xyXG4gICAgY29uc29sZS5sb2coJ+KAoiBSZWFsLXRpbWUgcHJvZ3Jlc3MgdHJhY2tpbmcgKFByb2dyZXNzLnVzZXJJZC11cGRhdGVkQXQtaW5kZXgpJyk7XHJcbiAgICBjb25zb2xlLmxvZygn4oCiIENvbnRlbnQtYmFzZWQgY2FjaGluZyAoY29udGVudEhhc2ggaW5kZXhlcyknKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIE1haW4gZXhlY3V0aW9uXHJcbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xyXG4gIGNvbnN0IHZlcmlmaWVyID0gbmV3IFRhYmxlQ29uZmlnVmVyaWZpZXIoKTtcclxuICBcclxuICAvLyBHZW5lcmF0ZSBzdW1tYXJ5IHJlcG9ydFxyXG4gIHZlcmlmaWVyLmdlbmVyYXRlU3VtbWFyeVJlcG9ydCgpO1xyXG4gIFxyXG4gIC8vIFZlcmlmeSBjb25maWd1cmF0aW9uc1xyXG4gIGNvbnN0IGlzVmFsaWQgPSB2ZXJpZmllci52ZXJpZnlBbGxUYWJsZXMoKTtcclxuICBcclxuICAvLyBFeGl0IHdpdGggYXBwcm9wcmlhdGUgY29kZVxyXG4gIHByb2Nlc3MuZXhpdChpc1ZhbGlkID8gMCA6IDEpO1xyXG59XHJcblxyXG5leHBvcnQgeyBUYWJsZUNvbmZpZ1ZlcmlmaWVyIH07Il19
# DynamoDB Tables Specification

## Overview

This document provides a comprehensive specification of all DynamoDB tables used in the Production-Ready MISRA Compliance Platform. All tables are configured with KMS encryption, proper indexing for efficient queries, and follow AWS best practices for security and performance.

## Table Configurations Summary

| Table Name | Purpose | Partition Key | Sort Key | GSIs | TTL | PITR |
|------------|---------|---------------|----------|------|-----|------|
| Users | User profiles and auth data | userId (S) | - | email-index, organizationId-createdAt-index | No | Prod only |
| FileMetadata | File upload metadata | fileId (S) | - | userId-uploadTimestamp-index, contentHash-index | No | Prod only |
| AnalysisResults | MISRA analysis results | analysisId (S) | timestamp (N) | fileId-timestamp-index, userId-timestamp-index, contentHash-timestamp-index | Non-prod only | Prod only |
| SampleFiles | Curated sample files library | sampleId (S) | - | language-difficultyLevel-index, language-expectedCompliance-index, usageCount-createdAt-index | No | No |
| Progress | Real-time analysis progress | analysisId (S) | - | userId-updatedAt-index | Yes (24h) | No |

## Detailed Table Specifications

### 1. Users Table

**Table Name**: `misra-platform-users-{environment}`

**Purpose**: Stores user profiles, authentication metadata, and preferences for the MISRA platform.

**Primary Key**:
- Partition Key: `userId` (String) - UUID v4

**Attributes**:
```typescript
interface UserRecord {
  userId: string;              // UUID v4 - Primary key
  email: string;               // Unique email address (indexed)
  name: string;                // Full name
  cognitoUsername: string;     // Cognito sub identifier
  role: 'admin' | 'user' | 'viewer';
  organizationId?: string;     // Optional organization ID
  createdAt: string;           // ISO 8601 timestamp
  lastLoginAt?: string;        // ISO 8601 timestamp
  analysisCount: number;       // Total analyses performed
  storageUsed: number;         // Storage used in bytes
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    autoSelectSamples: boolean;
  };
}
```

**Global Secondary Indexes**:
1. **email-index**
   - Partition Key: `email` (String)
   - Purpose: User lookup by email during login
   - Projection: ALL

2. **organizationId-createdAt-index**
   - Partition Key: `organizationId` (String)
   - Sort Key: `createdAt` (String)
   - Purpose: Organization user management
   - Projection: ALL

**Access Patterns**:
- Get user by userId (primary key)
- Get user by email (GSI)
- List users by organization (GSI)
- Update user preferences
- Track analysis count and storage usage

### 2. FileMetadata Table

**Table Name**: `misra-platform-file-metadata-{environment}`

**Purpose**: Stores metadata for uploaded files including S3 references and analysis status.

**Primary Key**:
- Partition Key: `fileId` (String) - UUID v4

**Attributes**:
```typescript
interface FileMetadataRecord {
  fileId: string;              // UUID v4 - Primary key
  userId: string;              // File owner
  fileName: string;            // Original filename
  s3Key: string;               // S3 object key
  s3Bucket: string;            // S3 bucket name
  fileSize: number;            // File size in bytes
  language: 'c' | 'cpp';       // Programming language
  uploadTimestamp: number;     // Unix timestamp (ms)
  uploadedAt: string;          // ISO 8601 timestamp
  isSample: boolean;           // True for sample files
  sampleId?: string;           // Reference to sample library
  contentHash: string;         // SHA-256 hash for caching
  analysisCount: number;       // Times analyzed
  lastAnalyzedAt?: string;     // ISO 8601 timestamp
  tags?: string[];             // User-defined tags
}
```

**Global Secondary Indexes**:
1. **userId-uploadTimestamp-index**
   - Partition Key: `userId` (String)
   - Sort Key: `uploadTimestamp` (Number)
   - Purpose: List user's files chronologically
   - Projection: ALL

2. **contentHash-index**
   - Partition Key: `contentHash` (String)
   - Purpose: Cache lookup for duplicate files
   - Projection: ALL

**Access Patterns**:
- Get file metadata by fileId (primary key)
- List files by user, sorted by upload time (GSI)
- Find files by content hash for caching (GSI)
- Update analysis count and timestamps

### 3. AnalysisResults Table

**Table Name**: `misra-platform-analysis-results-{environment}`

**Purpose**: Stores detailed MISRA analysis results, violations, and compliance metrics.

**Primary Key**:
- Partition Key: `analysisId` (String) - UUID v4
- Sort Key: `timestamp` (Number) - Unix timestamp (ms)

**Attributes**:
```typescript
interface AnalysisResultRecord {
  analysisId: string;          // UUID v4 - Primary key
  fileId: string;              // Reference to analyzed file
  userId: string;              // Analysis owner
  timestamp: number;           // Unix timestamp (ms) - Sort key
  createdAt: string;           // ISO 8601 timestamp
  language: 'c' | 'cpp';       // Programming language
  status: 'completed' | 'failed' | 'in_progress';
  violations: Violation[];     // Array of MISRA violations
  summary: {
    totalViolations: number;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    compliancePercentage: number;
  };
  executionTime: number;       // Analysis time in milliseconds
  cached: boolean;             // True if result from cache
  rulesEvaluated: number;      // Number of MISRA rules checked
  contentHash: string;         // For cache lookup
  ttl?: number;                // DynamoDB TTL (non-prod only)
}

interface Violation {
  ruleId: string;              // e.g., "MISRA-C-2012-1.1"
  severity: 'mandatory' | 'required' | 'advisory';
  line: number;                // Line number in source
  column: number;              // Column number
  message: string;             // Violation description
  recommendation: string;      // Fix recommendation
  codeSnippet?: string;        // Code context
}
```

**Global Secondary Indexes**:
1. **fileId-timestamp-index**
   - Partition Key: `fileId` (String)
   - Sort Key: `timestamp` (Number)
   - Purpose: Get analysis history for a file
   - Projection: ALL

2. **userId-timestamp-index**
   - Partition Key: `userId` (String)
   - Sort Key: `timestamp` (Number)
   - Purpose: Get user's analysis history
   - Projection: ALL

3. **contentHash-timestamp-index**
   - Partition Key: `contentHash` (String)
   - Sort Key: `timestamp` (Number)
   - Purpose: Cache lookup for analysis results
   - Projection: ALL

**Access Patterns**:
- Get analysis by analysisId (primary key)
- List analyses for a file (GSI)
- List analyses for a user (GSI)
- Find cached analysis results (GSI)

**TTL Configuration**: 
- Non-production: 90 days (automatic cleanup)
- Production: No TTL (permanent retention)

### 4. SampleFiles Table

**Table Name**: `misra-platform-sample-files-{environment}`

**Purpose**: Curated library of C/C++ files with known MISRA violations for automated workflow.

**Primary Key**:
- Partition Key: `sampleId` (String) - UUID v4

**Attributes**:
```typescript
interface SampleFileRecord {
  sampleId: string;            // UUID v4 - Primary key
  fileName: string;            // Sample file name
  language: 'c' | 'cpp';       // Programming language
  fileContent: string;         // File content (stored inline)
  fileSize: number;            // File size in bytes
  description: string;         // Educational description
  expectedCompliance: number;  // Expected compliance score (0-100)
  expectedViolations: number;  // Expected violation count
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];              // Educational tags
  violationTypes: string[];    // Types of violations present
  createdAt: string;           // ISO 8601 timestamp
  usageCount: number;          // Times selected for analysis
}
```

**Global Secondary Indexes**:
1. **language-difficultyLevel-index**
   - Partition Key: `language` (String)
   - Sort Key: `difficultyLevel` (String)
   - Purpose: Filter samples by language and difficulty
   - Projection: ALL

2. **language-expectedCompliance-index**
   - Partition Key: `language` (String)
   - Sort Key: `expectedCompliance` (Number)
   - Purpose: Select samples by compliance score range
   - Projection: ALL

3. **usageCount-createdAt-index**
   - Partition Key: `usageCount` (Number)
   - Sort Key: `createdAt` (String)
   - Purpose: Analytics and usage tracking
   - Projection: ALL

**Access Patterns**:
- Get sample by sampleId (primary key)
- List samples by language and difficulty (GSI)
- Select samples by compliance score range (GSI)
- Track sample usage statistics (GSI)

**Sample Library Contents**:
- Minimum 10 sample files (currently 8 implemented)
- Mix of C and C++ files
- Compliance scores: 60%, 65%, 70%, 75%, 80%, 85%, 90%, 95%
- Various violation types and severities
- Real-world code patterns

### 5. Progress Table

**Table Name**: `misra-platform-progress-{environment}`

**Purpose**: Real-time progress tracking for analysis operations (2-second polling updates).

**Primary Key**:
- Partition Key: `analysisId` (String) - UUID v4

**Attributes**:
```typescript
interface ProgressRecord {
  analysisId: string;          // UUID v4 - Primary key
  userId: string;              // Analysis owner
  status: 'starting' | 'in_progress' | 'completed' | 'failed';
  progress: number;            // Percentage (0-100)
  currentStep: string;         // Current operation
  rulesProcessed: number;      // MISRA rules processed
  totalRules: number;          // Total rules to process
  violationsFound: number;     // Violations found so far
  estimatedTimeRemaining: number; // Seconds remaining
  logs: string[];              // Terminal-style log messages
  createdAt: number;           // Unix timestamp (ms)
  updatedAt: number;           // Unix timestamp (ms)
  ttl: number;                 // TTL for auto-cleanup (24 hours)
}
```

**Global Secondary Indexes**:
1. **userId-updatedAt-index**
   - Partition Key: `userId` (String)
   - Sort Key: `updatedAt` (Number)
   - Purpose: Track user's active analyses
   - Projection: ALL

**Access Patterns**:
- Get progress by analysisId (primary key)
- List active analyses for user (GSI)
- Real-time progress updates (2-second polling)

**TTL Configuration**: 
- All environments: 24 hours (automatic cleanup of old progress records)

## Security Configuration

### Encryption
- **At Rest**: All tables use KMS encryption with customer-managed keys
- **In Transit**: All API calls use HTTPS/TLS 1.2+
- **Key Management**: Dedicated KMS key per environment with automatic rotation

### Access Control
- **IAM Roles**: Least privilege access for Lambda functions
- **Resource Policies**: Table-level access restrictions
- **VPC**: Lambda functions can optionally run in VPC for additional isolation

### Backup and Recovery
- **Point-in-Time Recovery**: Enabled for production environment
- **Backup Retention**: 35 days for production, 7 days for non-production
- **Cross-Region Replication**: Available for disaster recovery (optional)

## Performance Configuration

### Billing Mode
- **On-Demand**: All tables use pay-per-request billing for cost optimization
- **Auto-Scaling**: Automatic capacity management
- **Burst Capacity**: Handles traffic spikes automatically

### Indexing Strategy
- **GSI Design**: Optimized for access patterns
- **Projection**: ALL projection for most GSIs to avoid additional queries
- **Hot Partitions**: Avoided through proper key design

### Caching Strategy
- **Application-Level**: Content hash-based caching for analysis results
- **DynamoDB Accelerator (DAX)**: Optional for high-throughput scenarios
- **TTL**: Automatic cleanup of temporary data

## Monitoring and Alerting

### CloudWatch Metrics
- **Read/Write Capacity**: Monitor usage patterns
- **Throttling**: Alert on throttled requests
- **Error Rates**: Track failed operations
- **Latency**: Monitor response times

### Custom Metrics
- **Analysis Performance**: Track analysis execution times
- **Cache Hit Rates**: Monitor caching effectiveness
- **User Activity**: Track platform usage patterns

### Alarms
- **High Error Rates**: > 5% error rate
- **High Latency**: > 100ms average response time
- **Throttling**: Any throttled requests
- **Storage Growth**: Rapid storage increase

## Cost Optimization

### Lifecycle Management
- **TTL**: Automatic cleanup of temporary data
- **Archival**: Move old data to cheaper storage classes
- **Compression**: Optimize data storage format

### Capacity Planning
- **Usage Patterns**: Monitor and optimize based on actual usage
- **Reserved Capacity**: Consider for predictable workloads
- **Cost Allocation**: Tag resources for cost tracking

### Data Retention
- **Analysis Results**: 90 days for non-production, permanent for production
- **Progress Records**: 24 hours (automatic cleanup)
- **User Data**: Permanent (with user consent)
- **Sample Files**: Permanent (reference data)

## Deployment Considerations

### Environment-Specific Configuration
- **Development**: Minimal retention, aggressive cleanup
- **Staging**: Production-like configuration for testing
- **Production**: Full retention, backup, and monitoring

### Migration Strategy
- **Schema Changes**: Use CDK for infrastructure as code
- **Data Migration**: Backup before major changes
- **Rollback Plan**: Maintain previous table versions during migration

### Testing
- **Unit Tests**: Test data access patterns
- **Integration Tests**: Test cross-table operations
- **Load Tests**: Validate performance under load
- **Disaster Recovery**: Test backup and restore procedures

## Compliance and Governance

### Data Privacy
- **GDPR**: Support for data deletion and export
- **Encryption**: All data encrypted at rest and in transit
- **Access Logging**: CloudTrail for audit trails

### Retention Policies
- **Legal Requirements**: Comply with data retention laws
- **Business Requirements**: Balance storage costs with business needs
- **User Rights**: Support data deletion requests

### Documentation
- **Schema Documentation**: Keep this document updated
- **Change Log**: Track all schema changes
- **Access Patterns**: Document all query patterns
- **Performance Baselines**: Maintain performance benchmarks
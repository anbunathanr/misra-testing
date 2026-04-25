# 🔧 ANALYSIS COSTS TABLE PERMISSION FIX

## The Error

```
User: arn:aws:sts::976193236457:assumed-role/MisraPlatform-dev-AnalyzeFileFunctionServiceRole...
is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-1:976193236457:table/AnalysisCosts
```

The `analyze-file.ts` Lambda was trying to write cost tracking data but the table didn't exist and the Lambda had no permissions.

---

## What Was Fixed

### 1. Created AnalysisCosts Table
Added to CDK stack:
```typescript
const analysisCostsTable = new dynamodb.Table(this, 'AnalysisCostsTable', {
  tableName: 'AnalysisCosts',
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
```

### 2. Granted Permissions
```typescript
analysisCostsTable.grantReadWriteData(analyzeFileFunction);
```

### 3. Added Environment Variable
```typescript
environment: {
  FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
  FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
  ANALYSIS_RESULTS_TABLE: this.analysisResultsTable.tableName,
  ANALYSIS_COSTS_TABLE: analysisCostsTable.tableName,  // ← Added
}
```

---

## Files Modified

- ✅ `packages/backend/src/infrastructure/production-misra-stack.ts`
  - Added AnalysisCosts table definition
  - Added permissions grant
  - Added environment variable

---

## Deploy NOW

```bash
cd packages/backend
npm run build
npm run deploy
```

---

## Expected Result After Deployment

✅ Analysis Lambda can write cost tracking data
✅ No more permission errors
✅ Workflow completes successfully
✅ Dashboard reaches 100%
✅ Violation table displays

---

## Status: 🚀 READY TO DEPLOY

This is the final permission fix. After deployment, the real-time pipeline will work end-to-end.

# Results Display Service

## Overview

The Results Display Service is a comprehensive service for formatting MISRA analysis results, calculating compliance scores, categorizing violations, and generating downloadable PDF reports. It implements requirements 4.1, 4.2, 4.5, and 7.1 from the MISRA Production SaaS Platform specification.

## Features

### 1. Results Formatting
- Formats raw analysis results into a structured, user-friendly format
- Matches the test system output format for consistency
- Includes comprehensive metadata and summary statistics

### 2. Compliance Score Calculation
- Calculates weighted compliance scores based on violation severity
- Assigns letter grades (A-F) and status labels (excellent, good, moderate, poor, critical)
- Uses weighted scoring: Mandatory (3x), Required (2x), Advisory (1x)

### 3. Violation Categorization
- Categorizes violations by severity (mandatory, required, advisory)
- Provides counts and detailed lists for each category
- Supports filtering and sorting by severity

### 4. PDF Report Generation
- Generates professional PDF reports using existing infrastructure
- Includes executive summary, compliance scores, and detailed violations
- Stores reports in S3 with automatic caching
- Provides presigned download URLs with configurable expiration

## Installation

The service is part of the backend package and requires the following dependencies:

```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x",
  "pdfkit": "^0.x"
}
```

## Usage

### Basic Usage

```typescript
import { ResultsDisplayService } from './services/results-display-service';

const service = new ResultsDisplayService('my-reports-bucket');

// Format analysis results
const formattedResults = service.formatResults(analysisInput);

// Generate PDF report
const downloadUrl = await service.generateDownloadableReport(analysisInput);
```

### API Integration

```typescript
// In a Lambda function
export const handler = async (event: APIGatewayProxyEvent) => {
  const service = new ResultsDisplayService();
  
  const analysisInput = {
    analysisId: 'analysis-123',
    fileId: 'file-456',
    fileName: 'example.c',
    language: 'C',
    violations: [...],
    rulesChecked: 50,
    timestamp: Date.now(),
    userId: 'user-789',
  };

  const results = service.formatResults(analysisInput);
  
  return {
    statusCode: 200,
    body: JSON.stringify(results),
  };
};
```

## API Reference

### Constructor

```typescript
constructor(bucketName?: string)
```

Creates a new ResultsDisplayService instance.

**Parameters:**
- `bucketName` (optional): S3 bucket name for storing PDF reports. Defaults to `process.env.REPORTS_BUCKET` or `'misra-platform-reports'`.

### Methods

#### formatResults

```typescript
formatResults(analysisResult: AnalysisResultInput): FormattedResults
```

Formats analysis results with compliance score and violation categorization.

**Parameters:**
- `analysisResult`: Raw analysis result data

**Returns:**
- `FormattedResults`: Formatted results with compliance score, categorized violations, and summary

**Example:**
```typescript
const formatted = service.formatResults({
  analysisId: 'analysis-123',
  fileId: 'file-456',
  fileName: 'test.c',
  language: 'C',
  violations: [...],
  rulesChecked: 50,
  timestamp: Date.now(),
  userId: 'user-789',
});

console.log(formatted.complianceScore.percentage); // 92.5
console.log(formatted.complianceScore.grade); // 'A'
console.log(formatted.violations.counts.total); // 3
```

#### calculateComplianceScore

```typescript
calculateComplianceScore(
  violations: ViolationDetail[],
  rulesChecked: number
): ComplianceScore
```

Calculates compliance score with weighted violations.

**Parameters:**
- `violations`: Array of violation details
- `rulesChecked`: Total number of rules checked

**Returns:**
- `ComplianceScore`: Object with percentage, grade, and status

**Scoring Algorithm:**
- Mandatory violations: weight = 3
- Required violations: weight = 2
- Advisory violations: weight = 1
- Compliance % = 100 - (weighted violations / max weighted score) * 100

**Grading Scale:**
- A (Excellent): >= 95%
- B (Good): >= 85%
- C (Moderate): >= 70%
- D (Poor): >= 50%
- F (Critical): < 50%

#### categorizeViolations

```typescript
categorizeViolations(violations: ViolationDetail[]): ViolationCategorization
```

Categorizes violations by severity.

**Parameters:**
- `violations`: Array of violation details

**Returns:**
- `ViolationCategorization`: Object with violations grouped by severity and counts

#### generateDownloadableReport

```typescript
async generateDownloadableReport(
  analysisResult: AnalysisResultInput,
  options?: ReportGenerationOptions
): Promise<string>
```

Generates PDF report and returns presigned download URL.

**Parameters:**
- `analysisResult`: Analysis result data
- `options` (optional): Report generation options
  - `generatePDF`: Whether to generate PDF (default: true)
  - `expirationHours`: URL expiration time in hours (default: 1)

**Returns:**
- `Promise<string>`: Presigned S3 download URL

**Features:**
- Automatic caching: Reuses existing reports if available
- S3 storage: Stores reports with metadata
- Presigned URLs: Secure, time-limited download links

**Example:**
```typescript
const url = await service.generateDownloadableReport(analysisInput, {
  generatePDF: true,
  expirationHours: 24,
});

console.log(url); // https://s3.amazonaws.com/...?X-Amz-Expires=86400...
```

#### formatForTestSystem

```typescript
formatForTestSystem(analysisResult: AnalysisResultInput): TestSystemOutput
```

Formats results matching test system output format.

**Parameters:**
- `analysisResult`: Analysis result data

**Returns:**
- `TestSystemOutput`: Results in test system compatible format

**Use Case:**
- Ensures compatibility with existing test-button.html workflow
- Maintains consistent output format across test and production systems

## Data Types

### AnalysisResultInput

```typescript
interface AnalysisResultInput {
  analysisId: string;
  fileId: string;
  fileName: string;
  language: 'C' | 'CPP';
  violations: ViolationDetail[];
  rulesChecked: number;
  timestamp: number;
  userId: string;
  organizationId?: string;
}
```

### ViolationDetail

```typescript
interface ViolationDetail {
  ruleId: string;
  ruleName: string;
  severity: 'mandatory' | 'required' | 'advisory';
  line: number;
  column: number;
  message: string;
  codeSnippet: string;
  category?: string;
}
```

### FormattedResults

```typescript
interface FormattedResults {
  analysisId: string;
  fileId: string;
  fileName: string;
  language: 'C' | 'CPP';
  complianceScore: ComplianceScore;
  violations: ViolationCategorization;
  summary: {
    totalViolations: number;
    rulesChecked: number;
    rulesViolated: number;
    compliancePercentage: number;
  };
  timestamp: number;
  reportDownloadUrl?: string;
}
```

### ComplianceScore

```typescript
interface ComplianceScore {
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
}
```

## Requirements Mapping

### Requirement 4.1: Display analysis results with compliance percentage
- ✅ Implemented in `calculateComplianceScore()` method
- ✅ Returns percentage with grade and status
- ✅ Included in formatted results

### Requirement 4.2: Categorize violations by severity
- ✅ Implemented in `categorizeViolations()` method
- ✅ Groups violations by mandatory, required, advisory
- ✅ Provides counts for each category

### Requirement 4.5: Generate downloadable PDF reports
- ✅ Implemented in `generateDownloadableReport()` method
- ✅ Uses existing ReportGenerator infrastructure
- ✅ Stores reports in S3 with presigned URLs

### Requirement 7.1: Format results matching test system output
- ✅ Implemented in `formatForTestSystem()` method
- ✅ Maintains compatibility with test-button.html
- ✅ Consistent output format

## Testing

The service includes comprehensive unit tests covering:

- ✅ Results formatting with all data fields
- ✅ Compliance score calculation with weighted violations
- ✅ Grade assignment for all ranges (A-F)
- ✅ Violation categorization by severity
- ✅ PDF report generation and caching
- ✅ S3 storage with metadata
- ✅ Presigned URL generation
- ✅ Test system format compatibility
- ✅ Edge cases (zero violations, zero rules, large datasets)

Run tests:
```bash
npm test -- results-display-service.test.ts
```

## Performance Considerations

### Compliance Score Calculation
- O(n) time complexity where n = number of violations
- Efficient for typical analysis results (< 1000 violations)
- No external API calls or database queries

### PDF Report Generation
- First request: Generates PDF (~100-500ms depending on violations)
- Subsequent requests: Reuses cached PDF (~50ms)
- S3 storage provides automatic caching

### Memory Usage
- Minimal memory footprint for formatting operations
- PDF generation uses streaming to handle large reports
- No in-memory caching (relies on S3)

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const url = await service.generateDownloadableReport(analysisInput);
} catch (error) {
  if (error.name === 'NoSuchBucket') {
    // Handle missing S3 bucket
  } else if (error.message === 'PDF generation is required') {
    // Handle disabled PDF generation
  } else {
    // Handle other errors
  }
}
```

## Environment Variables

```bash
# S3 bucket for storing PDF reports
REPORTS_BUCKET=misra-platform-reports

# AWS region
AWS_REGION=us-east-1
```

## Integration Examples

See `results-display-service.example.ts` for complete integration examples including:

1. API endpoint integration
2. Lambda function usage
3. Test system compatibility
4. Complete workflow examples
5. Quick compliance checks

## Future Enhancements

Potential improvements for future versions:

1. **Caching Layer**: Add Redis/ElastiCache for faster repeated queries
2. **Batch Processing**: Support bulk report generation
3. **Custom Templates**: Allow custom PDF report templates
4. **Export Formats**: Support additional formats (CSV, JSON, HTML)
5. **Analytics**: Track compliance trends over time
6. **Notifications**: Send reports via email or webhook

## Support

For issues or questions:
- Check the test file for usage examples
- Review the example file for integration patterns
- Consult the design document for architecture details

## License

Part of the MISRA Platform Backend - Internal Use Only

# MISRA Analysis API Documentation

## Overview

This document provides comprehensive API documentation for the MISRA C/C++ Code Compliance Analyzer endpoints. All endpoints require authentication using JWT tokens obtained from the authentication system.

## Base URL

```
Production: https://api.misra-platform.com
Development: http://localhost:3000
```

## Authentication

All API requests must include a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Table of Contents

- [File Upload](#file-upload)
- [Analysis Results](#analysis-results)
- [Report Generation](#report-generation)
- [Analysis Status](#analysis-status)
- [Error Handling](#error-handling)

---

## File Upload

### Upload C/C++ File for Analysis

Uploads a C/C++ source file and triggers MISRA analysis.

**Endpoint**: `POST /files/upload`

**Request Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Request Body** (multipart/form-data):
```
file: <binary-file-data>
```

**Supported File Extensions**:
- `.c` - C source files
- `.cpp` - C++ source files
- `.h` - C header files
- `.hpp` - C++ header files

**File Size Limit**: 10 MB

**Example Request** (cURL):
```bash
curl -X POST https://api.misra-platform.com/files/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/path/to/source.cpp"
```

**Example Request** (JavaScript):
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('https://api.misra-platform.com/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
```

**Success Response** (200 OK):
```json
{
  "fileId": "f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o",
  "filename": "source.cpp",
  "fileSize": 2048,
  "fileType": "cpp",
  "uploadTimestamp": 1640000000000,
  "analysisStatus": "pending",
  "s3Key": "uploads/user123/f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o.cpp"
}
```

**Error Responses**:

400 Bad Request - Invalid file:
```json
{
  "error": "Invalid file type. Supported types: .c, .cpp, .h, .hpp"
}
```

413 Payload Too Large - File too large:
```json
{
  "error": "File size exceeds maximum limit of 10MB"
}
```

401 Unauthorized - Missing or invalid token:
```json
{
  "error": "Unauthorized. Valid JWT token required."
}
```

---

## Analysis Results

### Get Analysis Results

Retrieves MISRA analysis results for a specific file.

**Endpoint**: `GET /analysis/results/:fileId`

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Path Parameters**:
- `fileId` (string, required): The unique identifier of the uploaded file

**Example Request** (cURL):
```bash
curl -X GET https://api.misra-platform.com/analysis/results/f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Request** (JavaScript):
```javascript
const response = await fetch(
  `https://api.misra-platform.com/analysis/results/${fileId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const results = await response.json();
```

**Success Response** (200 OK):
```json
{
  "analysisId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "fileId": "f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o",
  "userId": "user123",
  "organizationId": "org456",
  "language": "CPP",
  "standard": "MISRA-C++:2008",
  "violations": [
    {
      "ruleId": "MISRA-CPP-0.1.1",
      "description": "A project shall not contain unused variables",
      "severity": "required",
      "lineNumber": 15,
      "columnNumber": 5,
      "message": "Variable 'unusedVar' is declared but never used",
      "codeSnippet": "    int unusedVar = 10;",
      "recommendation": "Remove unused variables or use them in the code."
    },
    {
      "ruleId": "MISRA-CPP-6.2.1",
      "description": "Assignment operators shall not be used in sub-expressions",
      "severity": "required",
      "lineNumber": 23,
      "columnNumber": 9,
      "message": "Assignment operator used in conditional expression",
      "codeSnippet": "    if ((x = getValue()) > 10) {",
      "recommendation": "Separate assignments from conditional expressions."
    }
  ],
  "violationCount": 2,
  "rulesChecked": 228,
  "compliance": 99.12,
  "duration": 1250,
  "completionTimestamp": 1640000125000,
  "createdAt": 1640000000000
}
```

**Response Fields**:
- `analysisId`: Unique identifier for this analysis
- `fileId`: ID of the analyzed file
- `language`: "C" or "CPP"
- `standard`: "MISRA-C:2012" or "MISRA-C++:2008"
- `violations`: Array of detected violations
  - `ruleId`: MISRA rule identifier
  - `description`: Rule description
  - `severity`: "mandatory", "required", or "advisory"
  - `lineNumber`: Line where violation occurs
  - `columnNumber`: Column where violation occurs
  - `message`: Specific violation message
  - `codeSnippet`: Code context
  - `recommendation`: How to fix the violation
- `violationCount`: Total number of violations
- `rulesChecked`: Number of rules checked
- `compliance`: Compliance percentage (0-100)
- `duration`: Analysis duration in milliseconds
- `completionTimestamp`: When analysis completed
- `createdAt`: When analysis started

**Error Responses**:

404 Not Found - Analysis not found:
```json
{
  "error": "Analysis results not found for fileId: f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o"
}
```

403 Forbidden - User doesn't own the file:
```json
{
  "error": "Access denied. You do not have permission to view this analysis."
}
```

---

## Report Generation

### Generate PDF Report

Generates and downloads a PDF compliance report for analyzed file.

**Endpoint**: `GET /reports/:fileId`

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Path Parameters**:
- `fileId` (string, required): The unique identifier of the uploaded file

**Example Request** (cURL):
```bash
curl -X GET https://api.misra-platform.com/reports/f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -o report.pdf
```

**Example Request** (JavaScript):
```javascript
const response = await fetch(
  `https://api.misra-platform.com/reports/${fileId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
// Use presigned URL to download
window.location.href = data.downloadUrl;
```

**Success Response** (200 OK):
```json
{
  "reportId": "r1e2p3o4-r5t6-7i8d-9a0b-c1d2e3f4g5h6",
  "fileId": "f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o",
  "downloadUrl": "https://s3.amazonaws.com/misra-reports/report.pdf?X-Amz-Algorithm=...",
  "expiresIn": 3600,
  "generatedAt": 1640000200000
}
```

**Response Fields**:
- `reportId`: Unique identifier for the report
- `fileId`: ID of the analyzed file
- `downloadUrl`: Presigned S3 URL for downloading the PDF (valid for 1 hour)
- `expiresIn`: URL expiration time in seconds
- `generatedAt`: Timestamp when report was generated

**Report Contents**:
1. Executive Summary
   - Compliance percentage
   - Total violations by severity
   - Overall assessment
2. Detailed Violations
   - Grouped by severity
   - Line numbers and code snippets
   - Rule descriptions and recommendations
3. Appendix
   - Rule reference
   - Glossary

**Error Responses**:

404 Not Found - Analysis not found:
```json
{
  "error": "Analysis results not found. Please ensure the file has been analyzed."
}
```

403 Forbidden - Access denied:
```json
{
  "error": "Access denied. You do not have permission to generate this report."
}
```

---

## Analysis Status

### Check Analysis Status

Checks the current status of file analysis.

**Endpoint**: `GET /analysis/status/:fileId`

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Path Parameters**:
- `fileId` (string, required): The unique identifier of the uploaded file

**Example Request** (cURL):
```bash
curl -X GET https://api.misra-platform.com/analysis/status/f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Request** (JavaScript):
```javascript
const response = await fetch(
  `https://api.misra-platform.com/analysis/status/${fileId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const status = await response.json();
```

**Success Response** (200 OK):
```json
{
  "fileId": "f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o",
  "status": "completed",
  "progress": 100,
  "message": "Analysis completed successfully",
  "startedAt": 1640000000000,
  "completedAt": 1640000125000
}
```

**Status Values**:
- `pending`: Analysis queued but not started
- `in_progress`: Analysis currently running
- `completed`: Analysis finished successfully
- `failed`: Analysis failed with error

**Error Response Example** (Failed Analysis):
```json
{
  "fileId": "f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o",
  "status": "failed",
  "progress": 0,
  "message": "Syntax error in source file at line 42",
  "error": {
    "code": "PARSE_ERROR",
    "details": "Expected ';' before '}' token"
  },
  "startedAt": 1640000000000,
  "failedAt": 1640000015000
}
```

---

## Error Handling

### Standard Error Response Format

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Additional error details (optional)",
  "timestamp": 1640000000000
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `413 Payload Too Large`: File size exceeds limit
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_FILE_TYPE` | Unsupported file extension |
| `FILE_TOO_LARGE` | File exceeds size limit |
| `PARSE_ERROR` | Syntax error in source code |
| `ANALYSIS_TIMEOUT` | Analysis exceeded time limit |
| `UNAUTHORIZED` | Invalid or expired token |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

### Rate Limiting

API requests are rate-limited to prevent abuse:

- **File uploads**: 10 per minute per user
- **Analysis results**: 100 per minute per user
- **Report generation**: 20 per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640000060
```

---

## Code Examples

### Complete Upload and Analysis Workflow (JavaScript)

```javascript
async function analyzeFile(file, token) {
  try {
    // 1. Upload file
    const formData = new FormData();
    formData.append('file', file);
    
    const uploadResponse = await fetch('https://api.misra-platform.com/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }
    
    const { fileId } = await uploadResponse.json();
    console.log('File uploaded:', fileId);
    
    // 2. Poll for analysis completion
    let status = 'pending';
    while (status === 'pending' || status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await fetch(
        `https://api.misra-platform.com/analysis/status/${fileId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const statusData = await statusResponse.json();
      status = statusData.status;
      console.log('Analysis status:', status);
    }
    
    if (status === 'failed') {
      throw new Error('Analysis failed');
    }
    
    // 3. Get analysis results
    const resultsResponse = await fetch(
      `https://api.misra-platform.com/analysis/results/${fileId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const results = await resultsResponse.json();
    console.log('Violations found:', results.violationCount);
    console.log('Compliance:', results.compliance + '%');
    
    // 4. Generate report
    const reportResponse = await fetch(
      `https://api.misra-platform.com/reports/${fileId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const { downloadUrl } = await reportResponse.json();
    console.log('Report available at:', downloadUrl);
    
    return results;
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

### Python Example

```python
import requests
import time

def analyze_file(file_path, token):
    base_url = 'https://api.misra-platform.com'
    headers = {'Authorization': f'Bearer {token}'}
    
    # 1. Upload file
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            f'{base_url}/files/upload',
            headers=headers,
            files=files
        )
    
    response.raise_for_status()
    file_id = response.json()['fileId']
    print(f'File uploaded: {file_id}')
    
    # 2. Poll for completion
    while True:
        response = requests.get(
            f'{base_url}/analysis/status/{file_id}',
            headers=headers
        )
        status_data = response.json()
        status = status_data['status']
        
        if status == 'completed':
            break
        elif status == 'failed':
            raise Exception('Analysis failed')
        
        time.sleep(2)
    
    # 3. Get results
    response = requests.get(
        f'{base_url}/analysis/results/{file_id}',
        headers=headers
    )
    results = response.json()
    
    print(f"Violations: {results['violationCount']}")
    print(f"Compliance: {results['compliance']}%")
    
    return results
```

---

## Webhooks (Coming Soon)

Future versions will support webhooks for analysis completion notifications:

```json
{
  "event": "analysis.completed",
  "fileId": "f7a3b2c1-4d5e-6f7g-8h9i-0j1k2l3m4n5o",
  "status": "completed",
  "violationCount": 5,
  "compliance": 97.8,
  "timestamp": 1640000125000
}
```

---

## Support

For API support, please contact:
- Email: api-support@misra-platform.com
- Documentation: https://docs.misra-platform.com
- Status Page: https://status.misra-platform.com

**Last Updated**: 2024

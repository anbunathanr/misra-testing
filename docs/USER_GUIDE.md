# MISRA Platform User Guide

## Welcome

Welcome to the MISRA Platform - your comprehensive solution for C/C++ code compliance analysis. This guide will help you get started with uploading files, analyzing code, and understanding your results.

## Table of Contents

1. [Getting Started](#getting-started)
2. [File Upload Process](#file-upload-process)
3. [Understanding Analysis Results](#understanding-analysis-results)
4. [Viewing Violations](#viewing-violations)
5. [Generating Reports](#generating-reports)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

Before using the MISRA Platform, ensure you have:

1. **Account**: Register for an account at the MISRA Platform
2. **Authentication**: Log in to obtain your access credentials
3. **Source Files**: C/C++ source files ready for analysis

### Supported File Types

The platform accepts the following file types:

- `.c` - C source files
- `.cpp` - C++ source files  
- `.h` - C header files
- `.hpp` - C++ header files

### File Size Limits

- **Maximum file size**: 10 MB per file
- **Batch uploads**: Up to 50 files at once
- **Total storage**: Varies by subscription plan

---

## File Upload Process

### Step 1: Access the Upload Interface

1. Log in to your MISRA Platform account
2. Navigate to the **Analysis** section
3. Click on **Upload File** or **New Analysis**

### Step 2: Select Your File

**Option A: Drag and Drop**
1. Drag your C/C++ file from your file explorer
2. Drop it into the upload area
3. The file will be automatically validated

**Option B: File Browser**
1. Click **Browse** or **Choose File**
2. Navigate to your source file
3. Select the file and click **Open**

### Step 3: Verify File Details

Before uploading, verify:
- **Filename**: Correct file selected
- **File size**: Within 10 MB limit
- **File type**: Supported extension (.c, .cpp, .h, .hpp)

### Step 4: Upload

1. Click **Upload** or **Start Analysis**
2. Wait for the upload progress bar to complete
3. You'll receive a confirmation with a unique File ID

### Step 5: Monitor Analysis Progress

After upload, the analysis begins automatically:

1. **Status**: Shows current analysis state
   - `Pending`: Queued for analysis
   - `In Progress`: Currently analyzing
   - `Completed`: Analysis finished
   - `Failed`: Error occurred

2. **Progress Bar**: Visual indicator of completion

3. **Estimated Time**: 
   - Small files (<1 MB): ~10 seconds
   - Medium files (1-5 MB): ~30 seconds
   - Large files (5-10 MB): ~60 seconds

---

## Understanding Analysis Results

### Analysis Summary

Once analysis completes, you'll see a summary dashboard:

#### Compliance Score
```
┌─────────────────────────────┐
│   Compliance: 95.6%         │
│   ████████████████░░        │
└─────────────────────────────┘
```

**Interpretation**:
- **90-100%**: Excellent compliance
- **75-89%**: Good compliance, minor issues
- **50-74%**: Moderate compliance, needs attention
- **Below 50%**: Poor compliance, significant issues

#### Violation Breakdown

```
Violations by Severity:
┌──────────────┬───────┐
│ Mandatory    │   2   │
│ Required     │   8   │
│ Advisory     │   5   │
└──────────────┴───────┘
Total: 15 violations
```

**Severity Levels**:

1. **Mandatory** (Red)
   - Must be fixed
   - Safety-critical issues
   - No deviations allowed

2. **Required** (Orange)
   - Should be fixed
   - Important for compliance
   - Deviations need justification

3. **Advisory** (Yellow)
   - Best practice recommendations
   - Deviations acceptable with documentation

#### Rules Checked

```
Rules Checked: 228 / 228
Standard: MISRA C++:2008
```

Shows how many rules were evaluated against your code.

---

## Viewing Violations

### Violation List

Each violation includes:

```
┌────────────────────────────────────────────────────────────┐
│ Rule: MISRA-CPP-0.1.1                                      │
│ Severity: Required                                         │
│ Line: 15, Column: 5                                        │
│                                                            │
│ Description:                                               │
│ A project shall not contain unused variables               │
│                                                            │
│ Code:                                                      │
│ 14:     int x = 10;                                        │
│ 15:     int unusedVar = 20;  ← Violation                  │
│ 16:     return x;                                          │
│                                                            │
│ Message:                                                   │
│ Variable 'unusedVar' is declared but never used            │
│                                                            │
│ Recommendation:                                            │
│ Remove unused variables or use them in the code.           │
└────────────────────────────────────────────────────────────┘
```

### Filtering Violations

Use filters to focus on specific issues:

**By Severity**:
- Show only Mandatory violations
- Show Required and above
- Show all violations

**By Rule Category**:
- Language compliance
- Declarations
- Types and conversions
- Control flow
- Functions
- Pointers
- Preprocessor
- Standard library

**By Line Number**:
- Jump to specific line
- View violations in range

### Sorting Options

Sort violations by:
- **Severity**: Mandatory → Required → Advisory
- **Line Number**: Top to bottom
- **Rule ID**: Alphabetical order
- **Category**: Grouped by type

---

## Generating Reports

### PDF Compliance Report

Generate a comprehensive PDF report for documentation and sharing.

#### How to Generate

1. Navigate to your analysis results
2. Click **Generate Report** or **Download PDF**
3. Wait for report generation (5-10 seconds)
4. Download automatically starts

#### Report Contents

**1. Cover Page**
- Project name
- File name
- Analysis date
- Compliance score

**2. Executive Summary**
- Overall compliance percentage
- Total violations by severity
- Key findings
- Recommendations

**3. Detailed Violations**

For each violation:
- Rule ID and description
- Severity level
- Line and column number
- Code snippet with context
- Specific message
- Fix recommendation

**4. Compliance Matrix**

Table showing:
- All rules checked
- Pass/Fail status
- Violation count per rule

**5. Appendix**
- MISRA rule reference
- Glossary of terms
- Deviation procedures

#### Report Formats

- **PDF**: Full detailed report (default)
- **CSV**: Violation data for spreadsheets (coming soon)
- **JSON**: Machine-readable format (via API)

---

## Best Practices

### Before Analysis

1. **Clean Compilation**
   - Ensure code compiles without errors
   - Fix syntax errors first
   - Remove commented-out code blocks

2. **File Organization**
   - Analyze one file at a time for clarity
   - Keep related files together
   - Use meaningful file names

3. **Code Preparation**
   - Remove debug code
   - Clean up temporary variables
   - Ensure consistent formatting

### During Analysis

1. **Monitor Progress**
   - Check status regularly
   - Don't close browser during analysis
   - Note any error messages

2. **Multiple Files**
   - Upload related files together
   - Analyze in logical order
   - Track which files are analyzed

### After Analysis

1. **Review Results Carefully**
   - Start with Mandatory violations
   - Understand each violation
   - Check code context

2. **Prioritize Fixes**
   - Fix Mandatory issues first
   - Address Required violations
   - Consider Advisory recommendations

3. **Document Deviations**
   - Record justified deviations
   - Explain why deviation is necessary
   - Get appropriate approvals

4. **Re-analyze**
   - Upload fixed code
   - Verify violations are resolved
   - Track compliance improvement

### Code Quality Tips

1. **Initialize Variables**
   ```cpp
   // Bad
   int x;
   int y = x + 1;  // Violation
   
   // Good
   int x = 0;
   int y = x + 1;  // Compliant
   ```

2. **Use Const Correctness**
   ```cpp
   // Bad
   int getValue() {
       int x = 10;
       return x;
   }
   
   // Good
   int getValue() {
       const int x = 10;
       return x;
   }
   ```

3. **Avoid Implicit Conversions**
   ```cpp
   // Bad
   unsigned int u = 10;
   int s = -5;
   int result = u + s;  // Violation
   
   // Good
   unsigned int u = 10;
   int s = -5;
   int result = (int)u + s;  // Compliant
   ```

4. **Remove Unused Code**
   ```cpp
   // Bad
   void func() {
       int unused = 10;  // Violation
       int used = 20;
       std::cout << used;
   }
   
   // Good
   void func() {
       int used = 20;  // Compliant
       std::cout << used;
   }
   ```

---

## Troubleshooting

### Common Issues

#### Upload Fails

**Problem**: File won't upload

**Solutions**:
1. Check file size (must be ≤ 10 MB)
2. Verify file extension (.c, .cpp, .h, .hpp)
3. Ensure stable internet connection
4. Try a different browser
5. Clear browser cache

#### Analysis Stuck

**Problem**: Analysis shows "In Progress" for too long

**Solutions**:
1. Wait up to 5 minutes for large files
2. Refresh the page
3. Check analysis status via API
4. Contact support if stuck > 10 minutes

#### Syntax Errors

**Problem**: Analysis fails with "Parse Error"

**Solutions**:
1. Compile code locally first
2. Fix syntax errors
3. Ensure valid C/C++ syntax
4. Check for missing semicolons, braces
5. Remove non-standard extensions

#### Missing Violations

**Problem**: Expected violations not shown

**Solutions**:
1. Verify correct MISRA standard (C vs C++)
2. Check if rule is implemented
3. Review rule configuration
4. Ensure code actually violates rule

#### Report Generation Fails

**Problem**: Can't generate PDF report

**Solutions**:
1. Ensure analysis is completed
2. Wait a few seconds and retry
3. Check browser pop-up blocker
4. Try downloading via API
5. Contact support

### Getting Help

If you encounter issues not covered here:

1. **Check Status Page**: https://status.misra-platform.com
2. **View Documentation**: https://docs.misra-platform.com
3. **Contact Support**: 
   - Email: support@misra-platform.com
   - Live Chat: Available in platform
   - Phone: +1-555-MISRA-01

4. **Community Forum**: https://community.misra-platform.com

### Providing Feedback

When reporting issues, include:
- File ID
- Error message (if any)
- Browser and version
- Steps to reproduce
- Screenshots (if applicable)

---

## Keyboard Shortcuts

Speed up your workflow with these shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl + U` | Upload new file |
| `Ctrl + R` | Refresh analysis status |
| `Ctrl + D` | Download report |
| `Ctrl + F` | Filter violations |
| `Ctrl + G` | Go to line number |
| `↑` / `↓` | Navigate violations |
| `Enter` | View violation details |
| `Esc` | Close modal |

---

## Tips for Success

1. **Start Small**: Begin with small files to understand the process
2. **Learn Rules**: Familiarize yourself with common MISRA rules
3. **Iterate**: Fix violations and re-analyze regularly
4. **Document**: Keep records of analyses and fixes
5. **Automate**: Use API for CI/CD integration
6. **Stay Updated**: Check for new features and rule updates

---

## Next Steps

Now that you understand the basics:

1. **Upload Your First File**: Try analyzing a sample file
2. **Review Results**: Understand the violations found
3. **Fix Issues**: Apply recommendations
4. **Generate Report**: Create documentation
5. **Integrate**: Set up automated analysis in your workflow

For advanced usage, see:
- [API Documentation](./API_DOCUMENTATION.md)
- [MISRA Rules Reference](./MISRA_RULES_REFERENCE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

## Glossary

**AST**: Abstract Syntax Tree - tree representation of code structure

**Compliance**: Percentage of rules passed without violations

**Deviation**: Justified exception to a MISRA rule

**Mandatory Rule**: Rule that must be followed without exception

**Required Rule**: Rule that should be followed unless justified

**Advisory Rule**: Best practice recommendation

**Static Analysis**: Code analysis without execution

**Violation**: Instance where code doesn't comply with a rule

---

**Last Updated**: 2024

For the latest version of this guide, visit: https://docs.misra-platform.com/user-guide

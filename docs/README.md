# MISRA Platform Documentation

Welcome to the MISRA Platform documentation. This directory contains comprehensive guides and references for using the MISRA C/C++ Code Compliance Analyzer.

## Documentation Overview

### 📚 [MISRA Rules Reference](./MISRA_RULES_REFERENCE.md)
Complete reference for all implemented MISRA C:2012 and MISRA C++:2008 rules.

**Contents**:
- Rule descriptions and rationale
- Severity levels (Mandatory, Required, Advisory)
- Compliant and non-compliant code examples
- Fix recommendations
- Rule categories

**Use this when**: You need to understand specific MISRA rules, see examples, or learn how to fix violations.

---

### 🔌 [API Documentation](./API_DOCUMENTATION.md)
Comprehensive API reference for programmatic access to the MISRA Platform.

**Contents**:
- Authentication and authorization
- File upload endpoints
- Analysis results retrieval
- Report generation
- Error handling
- Code examples in multiple languages

**Use this when**: You're integrating the MISRA Platform into your CI/CD pipeline or building custom tools.

---

### 👤 [User Guide](./USER_GUIDE.md)
Step-by-step guide for using the MISRA Platform web interface.

**Contents**:
- Getting started
- File upload process
- Understanding analysis results
- Viewing and filtering violations
- Generating PDF reports
- Best practices
- Keyboard shortcuts

**Use this when**: You're new to the platform or need guidance on specific features.

---

### 🔧 [Troubleshooting Guide](./TROUBLESHOOTING.md)
Solutions to common problems and issues.

**Contents**:
- File upload issues
- Analysis problems
- Results and reports issues
- Authentication problems
- Performance issues
- API integration issues
- Browser compatibility
- Error message reference

**Use this when**: You encounter errors or unexpected behavior.

---

### 📖 [MISRA Standards](./MISRA_STANDARDS.md)
Links and references to official MISRA documentation and related standards.

**Contents**:
- Official MISRA C:2012 standard information
- Official MISRA C++:2008 standard information
- Related ISO standards (C11, C++03)
- Safety standards (ISO 26262, IEC 61508, DO-178C)
- Training and certification resources
- Industry adoption information

**Use this when**: You need official MISRA documentation or want to learn more about the standards.

---

## Quick Start

### For New Users

1. **Start here**: [User Guide - Getting Started](./USER_GUIDE.md#getting-started)
2. **Upload your first file**: [User Guide - File Upload Process](./USER_GUIDE.md#file-upload-process)
3. **Understand results**: [User Guide - Understanding Analysis Results](./USER_GUIDE.md#understanding-analysis-results)
4. **Learn about rules**: [MISRA Rules Reference](./MISRA_RULES_REFERENCE.md)

### For Developers

1. **API basics**: [API Documentation - Overview](./API_DOCUMENTATION.md#overview)
2. **Authentication**: [API Documentation - Authentication](./API_DOCUMENTATION.md#authentication)
3. **Upload files**: [API Documentation - File Upload](./API_DOCUMENTATION.md#file-upload)
4. **Get results**: [API Documentation - Analysis Results](./API_DOCUMENTATION.md#analysis-results)
5. **Code examples**: [API Documentation - Code Examples](./API_DOCUMENTATION.md#code-examples)

### For Troubleshooting

1. **Check common issues**: [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. **Search by error message**: [Troubleshooting - Error Messages](./TROUBLESHOOTING.md#error-messages)
3. **Contact support**: [Troubleshooting - Getting Additional Help](./TROUBLESHOOTING.md#getting-additional-help)

---

## Document Structure

Each documentation file follows a consistent structure:

- **Table of Contents**: Quick navigation to sections
- **Overview**: Introduction to the topic
- **Detailed Sections**: In-depth information
- **Examples**: Practical code examples and use cases
- **References**: Links to related documentation
- **Last Updated**: Document version information

---

## Common Tasks

### Analyzing Your First File

1. Log in to the MISRA Platform
2. Navigate to the Analysis section
3. Upload a C/C++ file (.c, .cpp, .h, .hpp)
4. Wait for analysis to complete
5. Review violations and compliance score
6. Generate PDF report if needed

**Detailed Guide**: [User Guide - File Upload Process](./USER_GUIDE.md#file-upload-process)

---

### Understanding Violations

Each violation includes:
- **Rule ID**: e.g., MISRA-C-8.1
- **Severity**: Mandatory, Required, or Advisory
- **Location**: Line and column number
- **Description**: What the rule checks
- **Message**: Specific violation details
- **Code Snippet**: Context around the violation
- **Recommendation**: How to fix it

**Detailed Guide**: [User Guide - Viewing Violations](./USER_GUIDE.md#viewing-violations)

---

### Fixing Common Violations

#### Uninitialized Variables (MISRA-C-9.1)
```c
// Non-compliant
int x;
int y = x + 1;  // Violation

// Compliant
int x = 0;
int y = x + 1;  // OK
```

#### Unused Variables (MISRA-CPP-0.1.1)
```cpp
// Non-compliant
void func() {
    int unused = 10;  // Violation
    int used = 20;
    std::cout << used;
}

// Compliant
void func() {
    int used = 20;  // OK
    std::cout << used;
}
```

**More Examples**: [MISRA Rules Reference](./MISRA_RULES_REFERENCE.md)

---

### Integrating with CI/CD

Example GitHub Actions workflow:

```yaml
name: MISRA Analysis

on: [push, pull_request]

jobs:
  misra-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Analyze with MISRA Platform
        run: |
          # Upload file
          FILE_ID=$(curl -X POST \
            -H "Authorization: Bearer ${{ secrets.MISRA_TOKEN }}" \
            -F "file=@src/main.cpp" \
            https://api.misra-platform.com/files/upload \
            | jq -r '.fileId')
          
          # Wait for analysis
          while true; do
            STATUS=$(curl -H "Authorization: Bearer ${{ secrets.MISRA_TOKEN }}" \
              https://api.misra-platform.com/analysis/status/$FILE_ID \
              | jq -r '.status')
            
            if [ "$STATUS" = "completed" ]; then
              break
            fi
            sleep 5
          done
          
          # Get results
          VIOLATIONS=$(curl -H "Authorization: Bearer ${{ secrets.MISRA_TOKEN }}" \
            https://api.misra-platform.com/analysis/results/$FILE_ID \
            | jq '.violationCount')
          
          # Fail if violations found
          if [ "$VIOLATIONS" -gt 0 ]; then
            echo "Found $VIOLATIONS MISRA violations"
            exit 1
          fi
```

**Detailed Guide**: [API Documentation - Code Examples](./API_DOCUMENTATION.md#code-examples)

---

## Supported File Types

| Extension | Language | Description |
|-----------|----------|-------------|
| `.c` | C | C source files |
| `.cpp` | C++ | C++ source files |
| `.h` | C | C header files |
| `.hpp` | C++ | C++ header files |

**File Size Limit**: 10 MB per file

---

## MISRA Standards Coverage

### MISRA C:2012
- **Total Rules**: 168
- **Implemented**: 143 (85%)
- **Mandatory**: 13 rules
- **Required**: 143 rules
- **Advisory**: 12 rules

### MISRA C++:2008
- **Total Rules**: 228
- **Implemented**: 228 (100%)
- **Mandatory**: 28 rules
- **Required**: 142 rules
- **Advisory**: 58 rules

**Details**: [MISRA Standards](./MISRA_STANDARDS.md)

---

## Severity Levels Explained

### Mandatory (Red)
- **Must** be followed without exception
- Safety-critical issues
- No deviations allowed
- Examples: Undefined behavior, critical safety violations

### Required (Orange)
- **Should** be followed
- Important for compliance
- Deviations need justification and approval
- Examples: Type safety, resource management

### Advisory (Yellow)
- Best practice recommendations
- Deviations acceptable with documentation
- Improves code quality and maintainability
- Examples: Naming conventions, code style

---

## Getting Help

### Documentation
- **User Guide**: For platform usage questions
- **API Documentation**: For integration questions
- **Troubleshooting**: For error resolution
- **MISRA Standards**: For rule interpretation

### Support Channels

**Email**: support@misra-platform.com
- Response time: 24-48 hours
- For general inquiries and issues

**Live Chat**: Available in platform
- Hours: Mon-Fri, 9 AM - 5 PM EST
- For immediate assistance

**Community Forum**: https://community.misra-platform.com
- Search existing topics
- Ask questions
- Share experiences

**Status Page**: https://status.misra-platform.com
- System status
- Incident reports
- Scheduled maintenance

---

## Additional Resources

### Official MISRA Resources
- **MISRA Website**: https://www.misra.org.uk
- **MISRA C:2012**: Purchase from MISRA store
- **MISRA C++:2008**: Purchase from MISRA store
- **MISRA Compliance:2020**: Compliance guidelines

### Related Standards
- **ISO/IEC 9899:2011 (C11)**: C language standard
- **ISO/IEC 14882:2003 (C++03)**: C++ language standard
- **ISO 26262**: Automotive functional safety
- **IEC 61508**: Generic functional safety

### Tools and Training
- **Static Analysis Tools**: PC-lint, Polyspace, Helix QAC
- **Training Courses**: Available from MISRA and partners
- **Certification**: MISRA Exemplar Suite for tool validation

**Details**: [MISRA Standards - Additional Resources](./MISRA_STANDARDS.md#additional-resources)

---

## Contributing to Documentation

Found an error or want to suggest improvements?

1. **Report Issues**: Email documentation@misra-platform.com
2. **Suggest Changes**: Include section and suggested text
3. **Request Topics**: Let us know what's missing

---

## Document Versions

| Document | Version | Last Updated |
|----------|---------|--------------|
| MISRA Rules Reference | 1.0 | 2024 |
| API Documentation | 1.0 | 2024 |
| User Guide | 1.0 | 2024 |
| Troubleshooting Guide | 1.0 | 2024 |
| MISRA Standards | 1.0 | 2024 |

---

## License and Legal

### Platform License
This platform is licensed to implement MISRA rules for compliance checking.

### MISRA Standards Copyright
MISRA C:2012 and MISRA C++:2008 are copyrighted by HORIBA MIRA Limited.

### Trademarks
MISRA, MISRA C, and MISRA C++ are registered trademarks of HORIBA MIRA Limited.

### Disclaimer
This platform implements MISRA rules to the best of our ability. For official rule interpretations and compliance certification, refer to official MISRA documentation.

---

## Feedback

We value your feedback! Help us improve this documentation:

- **Email**: documentation@misra-platform.com
- **Survey**: https://feedback.misra-platform.com
- **Forum**: https://community.misra-platform.com

---

**Last Updated**: 2024

For the latest documentation, visit: https://docs.misra-platform.com

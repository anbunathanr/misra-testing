import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { FileContentVerifier } from './file-content-verifier';

/**
 * File Verification Test Suite
 * Tests the file content verifier to ensure downloaded files match uploaded files
 */

test.describe('File Content Verification', () => {
  let testDir: string;
  let uploadedCFile: string;
  let reportFile: string;
  let fixedCodeFile: string;
  let fixesFile: string;

  test.beforeAll(async () => {
    // Create test directory
    testDir = path.join(__dirname, 'test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create sample uploaded C file
    uploadedCFile = path.join(testDir, 'sample.c');
    const cContent = `
#include <stdio.h>
#include <stdlib.h>

int global_var = 0;

void unsafe_function(int *ptr) {
    *ptr = 10;
    global_var++;
}

int main(void) {
    int x = 5;
    unsafe_function(&x);
    
    if (x > 42) {
        printf("Value: %d\\n", x);
    }
    
    return 0;
}
`;
    fs.writeFileSync(uploadedCFile, cContent);
    console.log(`✅ Created sample C file: ${uploadedCFile}`);

    // Create sample report file
    reportFile = path.join(testDir, 'analysis_report.txt');
    const reportContent = `
MISRA Analysis Report
====================

File: sample.c
Analysis Date: ${new Date().toISOString()}

Functions Analyzed:
- unsafe_function
- main

Variables Analyzed:
- global_var
- x
- ptr

Violations Found:
1. MISRA-2.4: goto statement used
2. MISRA-20.4: malloc used
3. MISRA-11.1: Null pointer assignment

Total Violations: 3
Severity: High

Recommendations:
- Replace goto with structured control flow
- Use stack allocation instead of malloc
- Add null pointer checks
`;
    fs.writeFileSync(reportFile, reportContent);
    console.log(`✅ Created report file: ${reportFile}`);

    // Create sample fixed code file
    fixedCodeFile = path.join(testDir, 'sample_fixed.c');
    const fixedContent = `
#include <stdio.h>
#include <stdlib.h>

int global_var = 0;

/* FIXED: Added null pointer check */
void unsafe_function(int *ptr) {
    if (ptr != NULL) {  /* FIXED: Null pointer check added */
        *ptr = 10;
        global_var++;
    }
}

int main(void) {
    int x = 5;
    unsafe_function(&x);
    
    if (x > 42) {
        printf("Value: %d\\n", x);
    }
    
    return 0;
}
`;
    fs.writeFileSync(fixedCodeFile, fixedContent);
    console.log(`✅ Created fixed code file: ${fixedCodeFile}`);

    // Create sample fixes file
    fixesFile = path.join(testDir, 'fixes.txt');
    const fixesContent = `
MISRA Violations and Fixes
==========================

Violation 1: MISRA-11.1 - Null pointer assignment
Location: unsafe_function, line 8
Issue: Pointer dereference without null check
Fix: Add null pointer check before dereferencing
  if (ptr != NULL) {
      *ptr = 10;
  }

Violation 2: MISRA-2.4 - goto statement
Location: main function
Issue: goto statement used for control flow
Fix: Replace with structured control flow (if/else, loops)

Violation 3: MISRA-20.4 - malloc usage
Location: Not found in this file
Issue: Dynamic memory allocation
Fix: Use stack allocation or static allocation
`;
    fs.writeFileSync(fixesFile, fixesContent);
    console.log(`✅ Created fixes file: ${fixesFile}`);
  });

  test.afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
      console.log(`✅ Cleaned up test directory: ${testDir}`);
    }
  });

  test('should analyze uploaded C file correctly', async () => {
    console.log('\n📋 Test: Analyze Uploaded C File');
    
    const analysis = FileContentVerifier.analyzeCFile(uploadedCFile);
    
    console.log(`✅ File analyzed: ${analysis.filename}`);
    console.log(`   Functions: ${analysis.functions.join(', ')}`);
    console.log(`   Variables: ${analysis.variables.join(', ')}`);
    console.log(`   Includes: ${analysis.includes.join(', ')}`);
    console.log(`   Violations: ${analysis.violations.length}`);
    
    expect(analysis.filename).toBe('sample.c');
    expect(analysis.functions).toContain('unsafe_function');
    expect(analysis.functions).toContain('main');
    expect(analysis.variables).toContain('global_var');
    expect(analysis.variables).toContain('x');
    expect(analysis.includes).toContain('stdio.h');
    expect(analysis.includes).toContain('stdlib.h');
    expect(analysis.violations.length).toBeGreaterThan(0);
  });

  test('should analyze report file correctly', async () => {
    console.log('\n📋 Test: Analyze Report File');
    
    const analysis = FileContentVerifier.analyzeReportFile(reportFile);
    
    console.log(`✅ Report analyzed: ${analysis.filename}`);
    console.log(`   Functions mentioned: ${analysis.functions.join(', ')}`);
    console.log(`   Violations found: ${analysis.violations.length}`);
    
    expect(analysis.filename).toBe('analysis_report.txt');
    expect(analysis.fileType).toBe('report');
    expect(analysis.violations.length).toBeGreaterThan(0);
  });

  test('should analyze fixed code file correctly', async () => {
    console.log('\n📋 Test: Analyze Fixed Code File');
    
    const analysis = FileContentVerifier.analyzeFixedCodeFile(fixedCodeFile);
    
    console.log(`✅ Fixed code analyzed: ${analysis.filename}`);
    console.log(`   Functions: ${analysis.functions.join(', ')}`);
    console.log(`   Has corrections: ${analysis.hasCorrections}`);
    console.log(`   Violations remaining: ${analysis.violations.length}`);
    
    expect(analysis.filename).toBe('sample_fixed.c');
    expect(analysis.fileType).toBe('fixed-code');
    expect(analysis.functions).toContain('unsafe_function');
    expect(analysis.hasCorrections).toBe(true);
  });

  test('should analyze fixes file correctly', async () => {
    console.log('\n📋 Test: Analyze Fixes File');
    
    const analysis = FileContentVerifier.analyzeFixesFile(fixesFile);
    
    console.log(`✅ Fixes file analyzed: ${analysis.filename}`);
    console.log(`   Violations documented: ${analysis.violations.length}`);
    console.log(`   Corrections provided: ${analysis.hasCorrections}`);
    
    expect(analysis.filename).toBe('fixes.txt');
    expect(analysis.fileType).toBe('fixes-text');
    expect(analysis.violations.length).toBeGreaterThan(0);
    expect(analysis.hasCorrections).toBe(true);
  });

  test('should verify downloaded files match uploaded file', async () => {
    console.log('\n📋 Test: Verify Downloaded Files Match Uploaded File');
    
    const verification = FileContentVerifier.verifyDownloadedFiles(
      uploadedCFile,
      reportFile,
      fixedCodeFile,
      fixesFile
    );
    
    console.log(`✅ Verification completed`);
    console.log(`   Status: ${verification.matchStatus}`);
    console.log(`   Details:`);
    verification.details.forEach(detail => {
      console.log(`     ${detail}`);
    });
    
    expect(verification.matchStatus).not.toBe('failed');
    expect(verification.details.length).toBeGreaterThan(0);
  });

  test('should generate detailed verification report', async () => {
    console.log('\n📋 Test: Generate Verification Report');
    
    const verification = FileContentVerifier.verifyDownloadedFiles(
      uploadedCFile,
      reportFile,
      fixedCodeFile,
      fixesFile
    );
    
    const report = FileContentVerifier.generateVerificationReport(verification);
    
    console.log(report);
    
    expect(report).toContain('FILE VERIFICATION REPORT');
    expect(report).toContain('UPLOADED FILE ANALYSIS');
    expect(report).toContain('DOWNLOADED FILES ANALYSIS');
    expect(report).toContain('VERIFICATION STATUS');
  });

  test('should handle missing files gracefully', async () => {
    console.log('\n📋 Test: Handle Missing Files');
    
    const verification = FileContentVerifier.verifyDownloadedFiles(
      uploadedCFile,
      path.join(testDir, 'nonexistent_report.txt'),
      path.join(testDir, 'nonexistent_fixed.c'),
      path.join(testDir, 'nonexistent_fixes.txt')
    );
    
    console.log(`✅ Verification handled missing files`);
    console.log(`   Status: ${verification.matchStatus}`);
    
    expect(verification.matchStatus).toBe('failed');
    expect(verification.details.some(d => d.includes('not found'))).toBe(true);
  });

  test('should detect MISRA violations in code', async () => {
    console.log('\n📋 Test: Detect MISRA Violations');
    
    const violationCode = `
#include <stdio.h>

int main() {
    int *ptr = malloc(sizeof(int));  // MISRA-20.4: malloc
    *ptr = 10;  // MISRA-11.1: potential null pointer
    
    // MISRA-2.1: C++ style comment
    
    goto error;  // MISRA-2.4: goto
    
    error:
    free(ptr);  // MISRA-20.4: free
    return 0;
}
`;
    
    const testFile = path.join(testDir, 'violations.c');
    fs.writeFileSync(testFile, violationCode);
    
    const analysis = FileContentVerifier.analyzeCFile(testFile);
    
    console.log(`✅ Violations detected: ${analysis.violations.length}`);
    analysis.violations.forEach(v => {
      console.log(`   - ${v}`);
    });
    
    expect(analysis.violations.length).toBeGreaterThan(0);
    expect(analysis.violations.some(v => v.includes('malloc'))).toBe(true);
    expect(analysis.violations.some(v => v.includes('goto'))).toBe(true);
  });

  test('should detect corrections in fixed code', async () => {
    console.log('\n📋 Test: Detect Corrections in Fixed Code');
    
    const correctedCode = `
#include <stdio.h>

int main() {
    /* FIXED: Use stack allocation instead of malloc */
    int value = 10;
    int *ptr = &value;
    
    /* FIXED: Removed goto statement */
    if (ptr != NULL) {
        printf("Value: %d\\n", *ptr);
    }
    
    return 0;
}
`;
    
    const testFile = path.join(testDir, 'corrected.c');
    fs.writeFileSync(testFile, correctedCode);
    
    const analysis = FileContentVerifier.analyzeFixedCodeFile(testFile);
    
    console.log(`✅ Corrections detected: ${analysis.hasCorrections}`);
    
    expect(analysis.hasCorrections).toBe(true);
  });
});

/**
 * Integration Example - How to use File Content Verifier with Download Manager
 * This example shows how to integrate file verification into the complete workflow
 */

import { DownloadManager } from './download-manager';
import { FileContentVerifier } from './file-content-verifier';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example: Complete workflow with file verification
 */
async function completeWorkflowWithVerification() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 COMPLETE WORKFLOW WITH FILE VERIFICATION');
  console.log('='.repeat(80) + '\n');

  // Step 1: Initialize download manager
  console.log('Step 1: Initialize Download Manager');
  const downloadManager = new DownloadManager('./downloads');
  await downloadManager.initialize();
  console.log(`✅ Download manager initialized`);
  console.log(`   Session directory: ${downloadManager.getSessionDir()}\n`);

  // Step 2: Simulate file downloads
  console.log('Step 2: Simulate File Downloads');
  
  // Create sample files for demonstration
  const sessionDir = downloadManager.getSessionDir();
  
  // Sample uploaded C file
  const uploadedCFile = path.join(sessionDir, 'sample.c');
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

  // Sample report file
  const reportFile = path.join(sessionDir, 'analysis_report.txt');
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
1. MISRA-11.1: Null pointer assignment
2. MISRA-2.4: goto statement used
3. MISRA-20.4: malloc used

Total Violations: 3
Severity: High
`;
  fs.writeFileSync(reportFile, reportContent);
  console.log(`✅ Created report file: ${reportFile}`);

  // Sample fixed code file
  const fixedCodeFile = path.join(sessionDir, 'sample_fixed.c');
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

  // Sample fixes file
  const fixesFile = path.join(sessionDir, 'fixes.txt');
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
  console.log(`✅ Created fixes file: ${fixesFile}\n`);

  // Step 3: Verify downloaded files
  console.log('Step 3: Verify Downloaded Files');
  const verification = FileContentVerifier.verifyDownloadedFiles(
    uploadedCFile,
    reportFile,
    fixedCodeFile,
    fixesFile
  );
  console.log(`✅ Verification completed\n`);

  // Step 4: Generate verification report
  console.log('Step 4: Generate Verification Report');
  const report = FileContentVerifier.generateVerificationReport(verification);
  console.log(report);

  // Step 5: Display verification details
  console.log('Step 5: Verification Details');
  console.log('\n📤 UPLOADED FILE ANALYSIS');
  console.log('-'.repeat(40));
  console.log(`Functions: ${verification.uploadedFile.functions.join(', ')}`);
  console.log(`Variables: ${verification.uploadedFile.variables.join(', ')}`);
  console.log(`Includes: ${verification.uploadedFile.includes.join(', ')}`);
  console.log(`Violations: ${verification.uploadedFile.violations.length}`);
  verification.uploadedFile.violations.forEach(v => {
    console.log(`  - ${v}`);
  });

  console.log('\n📥 DOWNLOADED FILES ANALYSIS');
  console.log('-'.repeat(40));
  verification.details.forEach(detail => {
    console.log(`${detail}`);
  });

  console.log('\n✅ VERIFICATION STATUS');
  console.log('-'.repeat(40));
  console.log(`Status: ${verification.matchStatus.toUpperCase()}`);
  if (verification.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS');
    verification.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  // Step 6: Get download summary
  console.log('\nStep 6: Download Summary');
  const summary = await downloadManager.getSummary();
  console.log(summary);

  // Step 7: Send notifications
  console.log('Step 7: Send Notifications');
  await downloadManager.sendVerificationNotifications(
    'user@example.com',
    '1234567890'
  );
  console.log(`✅ Notifications sent\n`);

  // Step 8: Display final summary
  console.log('Step 8: Final Summary');
  console.log('='.repeat(80));
  console.log('✅ WORKFLOW COMPLETE');
  console.log('='.repeat(80));
  console.log(`
Session ID: ${downloadManager.getSessionDir()}
Downloaded Files: ${downloadManager.getDownloadedFiles().length}
Verification Status: ${verification.matchStatus}
Verification Log: ${downloadManager.getVerificationLogPath()}

All files have been:
✅ Downloaded and organized
✅ Verified for integrity
✅ Analyzed for content
✅ Compared with uploaded file
✅ Documented in verification log
✅ Notifications sent

Ready for next analysis!
  `);
}

/**
 * Example: Analyze specific file types
 */
async function analyzeFileTypes() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 FILE TYPE ANALYSIS EXAMPLES');
  console.log('='.repeat(80) + '\n');

  const tempDir = './temp-analysis';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Example 1: Analyze C file
  console.log('Example 1: Analyze C Source File');
  const cFile = path.join(tempDir, 'example.c');
  fs.writeFileSync(cFile, `
#include <stdio.h>
int main() { printf("Hello\\n"); return 0; }
`);
  const cAnalysis = FileContentVerifier.analyzeCFile(cFile);
  console.log(`✅ C File Analysis:`);
  console.log(`   Functions: ${cAnalysis.functions.join(', ')}`);
  console.log(`   Includes: ${cAnalysis.includes.join(', ')}\n`);

  // Example 2: Analyze report
  console.log('Example 2: Analyze Report File');
  const reportFile = path.join(tempDir, 'report.txt');
  fs.writeFileSync(reportFile, `
MISRA Analysis Report
Functions analyzed: main, helper
Violations: MISRA-2.1, MISRA-11.1
`);
  const reportAnalysis = FileContentVerifier.analyzeReportFile(reportFile);
  console.log(`✅ Report Analysis:`);
  console.log(`   Functions: ${reportAnalysis.functions.join(', ')}`);
  console.log(`   Violations: ${reportAnalysis.violations.length}\n`);

  // Example 3: Analyze fixed code
  console.log('Example 3: Analyze Fixed Code');
  const fixedFile = path.join(tempDir, 'fixed.c');
  fs.writeFileSync(fixedFile, `
#include <stdio.h>
/* FIXED: Added null check */
int main() { printf("Hello\\n"); return 0; }
`);
  const fixedAnalysis = FileContentVerifier.analyzeFixedCodeFile(fixedFile);
  console.log(`✅ Fixed Code Analysis:`);
  console.log(`   Has corrections: ${fixedAnalysis.hasCorrections}`);
  console.log(`   Functions: ${fixedAnalysis.functions.join(', ')}\n`);

  // Example 4: Analyze fixes
  console.log('Example 4: Analyze Fixes File');
  const fixesFile = path.join(tempDir, 'fixes.txt');
  fs.writeFileSync(fixesFile, `
Fix 1: MISRA-2.1 violation
Solution: Replace C++ comments with C comments

Fix 2: MISRA-11.1 violation
Solution: Add null pointer checks
`);
  const fixesAnalysis = FileContentVerifier.analyzeFixesFile(fixesFile);
  console.log(`✅ Fixes Analysis:`);
  console.log(`   Violations documented: ${fixesAnalysis.violations.length}`);
  console.log(`   Has corrections: ${fixesAnalysis.hasCorrections}\n`);

  // Cleanup
  fs.rmSync(tempDir, { recursive: true });
  console.log('✅ Cleanup complete\n');
}

/**
 * Example: Error handling
 */
async function errorHandlingExample() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 ERROR HANDLING EXAMPLES');
  console.log('='.repeat(80) + '\n');

  console.log('Example 1: Missing Files');
  const verification = FileContentVerifier.verifyDownloadedFiles(
    './nonexistent.c',
    './nonexistent_report.txt',
    './nonexistent_fixed.c',
    './nonexistent_fixes.txt'
  );
  console.log(`✅ Verification Status: ${verification.matchStatus}`);
  console.log(`   Details:`);
  verification.details.forEach(d => console.log(`     ${d}`));
  console.log(`   Recommendations:`);
  verification.recommendations.forEach(r => console.log(`     • ${r}\n`));
}

/**
 * Main execution
 */
async function main() {
  try {
    // Run complete workflow
    await completeWorkflowWithVerification();

    // Run file type analysis examples
    await analyzeFileTypes();

    // Run error handling examples
    await errorHandlingExample();

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL EXAMPLES COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { completeWorkflowWithVerification, analyzeFileTypes, errorHandlingExample };

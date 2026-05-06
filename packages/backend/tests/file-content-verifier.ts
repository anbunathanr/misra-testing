import * as fs from 'fs';
import * as path from 'path';

/**
 * File Content Verifier - Verifies downloaded files match uploaded files
 * Parses C files, reports, and fixed code to ensure integrity
 */

export interface FileAnalysis {
  filename: string;
  filepath: string;
  fileType: 'c-source' | 'report' | 'fixed-code' | 'fixes-text' | 'unknown';
  functions: string[];
  variables: string[];
  includes: string[];
  violations: string[];
  hasCorrections: boolean;
  contentHash: string;
  analysisDetails: string;
}

export interface VerificationReport {
  uploadedFile: FileAnalysis;
  downloadedReport: FileAnalysis;
  downloadedFixedCode: FileAnalysis;
  downloadedFixes: FileAnalysis;
  matchStatus: 'verified' | 'partial' | 'failed';
  details: string[];
  recommendations: string[];
}

export class FileContentVerifier {
  /**
   * Analyze a C source file
   */
  static analyzeCFile(filepath: string): FileAnalysis {
    const content = fs.readFileSync(filepath, 'utf-8');
    const filename = path.basename(filepath);

    const functions = this.extractFunctions(content);
    const variables = this.extractVariables(content);
    const includes = this.extractIncludes(content);
    const violations = this.detectMISRAViolations(content);
    const contentHash = this.generateHash(content);

    return {
      filename,
      filepath,
      fileType: 'c-source',
      functions,
      variables,
      includes,
      violations,
      hasCorrections: false,
      contentHash,
      analysisDetails: `Functions: ${functions.length}, Variables: ${variables.length}, Includes: ${includes.length}, Violations: ${violations.length}`
    };
  }

  /**
   * Analyze a report file
   */
  static analyzeReportFile(filepath: string): FileAnalysis {
    const content = fs.readFileSync(filepath, 'utf-8');
    const filename = path.basename(filepath);

    const functions = this.extractFunctionsFromReport(content);
    const variables = this.extractVariablesFromReport(content);
    const violations = this.extractViolationsFromReport(content);
    const contentHash = this.generateHash(content);

    return {
      filename,
      filepath,
      fileType: 'report',
      functions,
      variables,
      includes: [],
      violations,
      hasCorrections: false,
      contentHash,
      analysisDetails: `Violations Found: ${violations.length}, Functions Analyzed: ${functions.length}`
    };
  }

  /**
   * Analyze fixed code file
   */
  static analyzeFixedCodeFile(filepath: string): FileAnalysis {
    const content = fs.readFileSync(filepath, 'utf-8');
    const filename = path.basename(filepath);

    const functions = this.extractFunctions(content);
    const variables = this.extractVariables(content);
    const includes = this.extractIncludes(content);
    const violations = this.detectMISRAViolations(content);
    const hasCorrections = this.detectCorrections(content);
    const contentHash = this.generateHash(content);

    return {
      filename,
      filepath,
      fileType: 'fixed-code',
      functions,
      variables,
      includes,
      violations,
      hasCorrections,
      contentHash,
      analysisDetails: `Functions: ${functions.length}, Variables: ${variables.length}, Violations Remaining: ${violations.length}, Has Corrections: ${hasCorrections}`
    };
  }

  /**
   * Analyze fixes text file
   */
  static analyzeFixesFile(filepath: string): FileAnalysis {
    const content = fs.readFileSync(filepath, 'utf-8');
    const filename = path.basename(filepath);

    const violations = this.extractViolationsFromFixes(content);
    const corrections = this.extractCorrectionsFromFixes(content);
    const contentHash = this.generateHash(content);

    return {
      filename,
      filepath,
      fileType: 'fixes-text',
      functions: [],
      variables: [],
      includes: [],
      violations,
      hasCorrections: corrections.length > 0,
      contentHash,
      analysisDetails: `Violations Documented: ${violations.length}, Corrections Provided: ${corrections.length}`
    };
  }

  /**
   * Verify downloaded files match uploaded file
   */
  static verifyDownloadedFiles(
    uploadedFilePath: string,
    reportPath: string,
    fixedCodePath: string,
    fixesPath: string
  ): VerificationReport {
    const details: string[] = [];
    const recommendations: string[] = [];
    let matchStatus: 'verified' | 'partial' | 'failed' = 'verified';

    try {
      // Analyze uploaded file
      const uploadedFile = this.analyzeCFile(uploadedFilePath);
      details.push(`✅ Uploaded file analyzed: ${uploadedFile.functions.length} functions, ${uploadedFile.violations.length} violations detected`);

      // Analyze report
      let downloadedReport: FileAnalysis | null = null;
      if (fs.existsSync(reportPath)) {
        downloadedReport = this.analyzeReportFile(reportPath);
        
        // Verify report mentions same functions
        const reportMentionsFunctions = uploadedFile.functions.filter(fn => 
          downloadedReport!.functions.includes(fn)
        );
        
        if (reportMentionsFunctions.length > 0) {
          details.push(`✅ Report mentions ${reportMentionsFunctions.length}/${uploadedFile.functions.length} functions from uploaded file`);
        } else {
          details.push(`⚠️  Report does not mention functions from uploaded file`);
          matchStatus = 'partial';
        }

        // Verify report contains violations
        if (downloadedReport.violations.length > 0) {
          details.push(`✅ Report contains ${downloadedReport.violations.length} violations`);
        } else {
          details.push(`⚠️  Report contains no violations`);
          matchStatus = 'partial';
        }
      } else {
        details.push(`❌ Report file not found: ${reportPath}`);
        matchStatus = 'failed';
        recommendations.push('Ensure report file is downloaded from MISRA platform');
      }

      // Analyze fixed code
      let downloadedFixedCode: FileAnalysis | null = null;
      if (fs.existsSync(fixedCodePath)) {
        downloadedFixedCode = this.analyzeFixedCodeFile(fixedCodePath);
        
        // Verify fixed code has same functions
        const fixedCodeFunctions = uploadedFile.functions.filter(fn => 
          downloadedFixedCode!.functions.includes(fn)
        );
        
        if (fixedCodeFunctions.length > 0) {
          details.push(`✅ Fixed code contains ${fixedCodeFunctions.length}/${uploadedFile.functions.length} functions`);
        } else {
          details.push(`⚠️  Fixed code does not contain functions from uploaded file`);
          matchStatus = 'partial';
        }

        // Verify fixed code has corrections
        if (downloadedFixedCode.hasCorrections) {
          details.push(`✅ Fixed code contains corrections for violations`);
        } else {
          details.push(`⚠️  Fixed code may not contain corrections`);
          matchStatus = 'partial';
        }

        // Verify fewer violations in fixed code
        if (downloadedFixedCode.violations.length < uploadedFile.violations.length) {
          details.push(`✅ Fixed code has fewer violations (${downloadedFixedCode.violations.length} vs ${uploadedFile.violations.length})`);
        } else {
          details.push(`⚠️  Fixed code violations not reduced`);
          matchStatus = 'partial';
        }
      } else {
        details.push(`❌ Fixed code file not found: ${fixedCodePath}`);
        matchStatus = 'failed';
        recommendations.push('Ensure fixed code file is downloaded from MISRA platform');
      }

      // Analyze fixes text
      let downloadedFixes: FileAnalysis | null = null;
      if (fs.existsSync(fixesPath)) {
        downloadedFixes = this.analyzeFixesFile(fixesPath);
        
        // Verify fixes document violations
        if (downloadedFixes.violations.length > 0) {
          details.push(`✅ Fixes file documents ${downloadedFixes.violations.length} violations`);
        } else {
          details.push(`⚠️  Fixes file does not document violations`);
          matchStatus = 'partial';
        }

        // Verify fixes provide corrections
        if (downloadedFixes.hasCorrections) {
          details.push(`✅ Fixes file provides corrections`);
        } else {
          details.push(`⚠️  Fixes file does not provide corrections`);
          matchStatus = 'partial';
        }
      } else {
        details.push(`⚠️  Fixes file not found: ${fixesPath} (optional)`);
      }

      return {
        uploadedFile,
        downloadedReport: downloadedReport || this.createEmptyAnalysis('report'),
        downloadedFixedCode: downloadedFixedCode || this.createEmptyAnalysis('fixed-code'),
        downloadedFixes: downloadedFixes || this.createEmptyAnalysis('fixes-text'),
        matchStatus,
        details,
        recommendations
      };
    } catch (error) {
      return {
        uploadedFile: this.createEmptyAnalysis('c-source'),
        downloadedReport: this.createEmptyAnalysis('report'),
        downloadedFixedCode: this.createEmptyAnalysis('fixed-code'),
        downloadedFixes: this.createEmptyAnalysis('fixes-text'),
        matchStatus: 'failed',
        details: [`❌ Verification failed: ${error}`],
        recommendations: ['Check file paths and ensure all files are accessible']
      };
    }
  }

  /**
   * Extract function names from C code
   */
  private static extractFunctions(content: string): string[] {
    const functionPattern = /(?:^|\n)\s*(?:static\s+)?(?:inline\s+)?(?:void|int|char|float|double|struct\s+\w+|unsigned\s+\w+|\w+\s*\*?)\s+(\w+)\s*\(/gm;
    const functions: string[] = [];
    let match;

    while ((match = functionPattern.exec(content)) !== null) {
      if (match[1] && !['if', 'while', 'for', 'switch'].includes(match[1])) {
        functions.push(match[1]);
      }
    }

    return [...new Set(functions)]; // Remove duplicates
  }

  /**
   * Extract variable declarations from C code
   */
  private static extractVariables(content: string): string[] {
    const variablePattern = /(?:^|\n)\s*(?:static\s+)?(?:const\s+)?(?:volatile\s+)?(?:unsigned\s+)?(?:int|char|float|double|void|struct\s+\w+)\s+(\w+)\s*[=;]/gm;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
      if (match[1]) {
        variables.push(match[1]);
      }
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Extract include statements
   */
  private static extractIncludes(content: string): string[] {
    const includePattern = /#include\s+[<"]([^>"]+)[>"]/g;
    const includes: string[] = [];
    let match;

    while ((match = includePattern.exec(content)) !== null) {
      if (match[1]) {
        includes.push(match[1]);
      }
    }

    return includes;
  }

  /**
   * Detect MISRA violations in code
   */
  private static detectMISRAViolations(content: string): string[] {
    const violations: string[] = [];

    // Common MISRA violations
    if (/goto\s+\w+/.test(content)) violations.push('MISRA-2.4: goto statement used');
    if (/\*\s*\w+\s*=\s*malloc/.test(content)) violations.push('MISRA-20.4: malloc used');
    if (/\*\s*\w+\s*=\s*calloc/.test(content)) violations.push('MISRA-20.4: calloc used');
    if (/\*\s*\w+\s*=\s*realloc/.test(content)) violations.push('MISRA-20.4: realloc used');
    if (/\*\s*\w+\s*=\s*free/.test(content)) violations.push('MISRA-20.4: free used');
    if (/\/\//.test(content)) violations.push('MISRA-2.1: C++ style comments used');
    if (/\w+\s*\[\s*\]/.test(content)) violations.push('MISRA-8.11: Array size not specified');
    if (/\w+\s*\*\s*\w+\s*=\s*NULL/.test(content)) violations.push('MISRA-11.1: Null pointer assignment');
    if (/\w+\s*\*\s*\w+\s*=\s*0/.test(content)) violations.push('MISRA-11.1: Null pointer assignment');
    if (/\w+\s*\*\s*\w+\s*=\s*\(void\s*\*\)/.test(content)) violations.push('MISRA-11.4: Void pointer cast');
    if (/\w+\s*\*\s*\w+\s*=\s*\(char\s*\*\)/.test(content)) violations.push('MISRA-11.4: Pointer cast');

    return [...new Set(violations)]; // Remove duplicates
  }

  /**
   * Detect corrections in fixed code
   */
  private static detectCorrections(content: string): boolean {
    // Check for common correction patterns
    const corrections = [
      /\/\*\s*FIXED\s*\*\//i,
      /\/\*\s*CORRECTED\s*\*\//i,
      /\/\*\s*MISRA\s*FIX\s*\*\//i,
      /\/\*\s*VIOLATION\s*FIXED\s*\*\//i,
      /\/\/\s*FIXED/i,
      /\/\/\s*CORRECTED/i
    ];

    return corrections.some(pattern => pattern.test(content));
  }

  /**
   * Extract functions mentioned in report
   */
  private static extractFunctionsFromReport(content: string): string[] {
    const functionPattern = /(?:function|method|routine)\s+[`"]?(\w+)[`"]?/gi;
    const functions: string[] = [];
    let match;

    while ((match = functionPattern.exec(content)) !== null) {
      if (match[1]) {
        functions.push(match[1]);
      }
    }

    return [...new Set(functions)];
  }

  /**
   * Extract variables mentioned in report
   */
  private static extractVariablesFromReport(content: string): string[] {
    const variablePattern = /(?:variable|parameter)\s+[`"]?(\w+)[`"]?/gi;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
      if (match[1]) {
        variables.push(match[1]);
      }
    }

    return [...new Set(variables)];
  }

  /**
   * Extract violations from report
   */
  private static extractViolationsFromReport(content: string): string[] {
    const violationPattern = /(?:violation|error|issue|rule)\s+(?:MISRA-)?(\d+\.\d+|\d+)/gi;
    const violations: string[] = [];
    let match;

    while ((match = violationPattern.exec(content)) !== null) {
      if (match[1]) {
        violations.push(`MISRA-${match[1]}`);
      }
    }

    return [...new Set(violations)];
  }

  /**
   * Extract violations from fixes file
   */
  private static extractViolationsFromFixes(content: string): string[] {
    const violationPattern = /(?:violation|error|issue|rule)\s+(?:MISRA-)?(\d+\.\d+|\d+)/gi;
    const violations: string[] = [];
    let match;

    while ((match = violationPattern.exec(content)) !== null) {
      if (match[1]) {
        violations.push(`MISRA-${match[1]}`);
      }
    }

    return [...new Set(violations)];
  }

  /**
   * Extract corrections from fixes file
   */
  private static extractCorrectionsFromFixes(content: string): string[] {
    const correctionPattern = /(?:fix|correction|solution|change)\s*:?\s*(.+?)(?:\n|$)/gi;
    const corrections: string[] = [];
    let match;

    while ((match = correctionPattern.exec(content)) !== null) {
      if (match[1] && match[1].length > 10) {
        corrections.push(match[1].trim());
      }
    }

    return corrections;
  }

  /**
   * Generate simple hash of content
   */
  private static generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Create empty analysis object
   */
  private static createEmptyAnalysis(fileType: any): FileAnalysis {
    return {
      filename: 'N/A',
      filepath: 'N/A',
      fileType,
      functions: [],
      variables: [],
      includes: [],
      violations: [],
      hasCorrections: false,
      contentHash: '',
      analysisDetails: 'File not found'
    };
  }

  /**
   * Generate detailed verification report
   */
  static generateVerificationReport(verification: VerificationReport): string {
    let report = '\n' + '='.repeat(80) + '\n';
    report += '📋 FILE VERIFICATION REPORT\n';
    report += '='.repeat(80) + '\n\n';

    report += '📤 UPLOADED FILE ANALYSIS\n';
    report += '-'.repeat(40) + '\n';
    report += `File: ${verification.uploadedFile.filename}\n`;
    report += `Functions: ${verification.uploadedFile.functions.join(', ') || 'None'}\n`;
    report += `Variables: ${verification.uploadedFile.variables.join(', ') || 'None'}\n`;
    report += `Includes: ${verification.uploadedFile.includes.join(', ') || 'None'}\n`;
    report += `Violations Detected: ${verification.uploadedFile.violations.length}\n`;
    if (verification.uploadedFile.violations.length > 0) {
      report += `  ${verification.uploadedFile.violations.join('\n  ')}\n`;
    }
    report += '\n';

    report += '📥 DOWNLOADED FILES ANALYSIS\n';
    report += '-'.repeat(40) + '\n';
    verification.details.forEach(detail => {
      report += `${detail}\n`;
    });
    report += '\n';

    report += '✅ VERIFICATION STATUS\n';
    report += '-'.repeat(40) + '\n';
    report += `Status: ${verification.matchStatus.toUpperCase()}\n`;
    if (verification.recommendations.length > 0) {
      report += '\n💡 RECOMMENDATIONS\n';
      verification.recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
    }
    report += '\n' + '='.repeat(80) + '\n';

    return report;
  }
}

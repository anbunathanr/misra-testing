/**
 * AWS Bedrock AI File Verification
 * Uses Amazon Bedrock (Claude 3.5 Sonnet) to validate MISRA reports, fixes, and fixed code
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  warnings: string[];
  recommendations: string[];
  details: {
    reportQuality: string;
    fixesQuality: string;
    codeQuality: string;
    completeness: string;
  };
  aiModel: string;
  analysisTime: number;
}

interface FileContent {
  report: string;
  fixes: string;
  fixedCode: string;
  uploadedCode: string;
}

/**
 * AWS Bedrock File Verification using Claude 3.5 Sonnet
 */
export class AWSBedrockVerifier {
  private region: string;
  private modelId: string = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

  constructor(region: string = 'us-east-1') {
    this.region = region;
  }

  /**
   * Verify downloaded files using AWS Bedrock
   */
  async verifyFiles(
    reportPath: string,
    fixesPath: string,
    fixedCodePath: string,
    uploadedCodePath: string
  ): Promise<VerificationResult> {
    console.log('🤖 Starting AWS Bedrock AI file verification...');
    console.log(`   Model: Claude 3.5 Sonnet`);
    console.log(`   Region: ${this.region}`);

    const startTime = Date.now();

    try {
      // Read all files
      const fileContent: FileContent = {
        report: this.readFile(reportPath),
        fixes: this.readFile(fixesPath),
        fixedCode: this.readFile(fixedCodePath),
        uploadedCode: this.readFile(uploadedCodePath)
      };

      // Perform verification checks
      const result = await this.performBedrockVerification(fileContent);
      result.analysisTime = Date.now() - startTime;

      return result;
    } catch (error) {
      console.error('❌ AWS Bedrock verification failed:', error);
      return {
        isValid: false,
        score: 0,
        issues: [`Verification error: ${error}`],
        warnings: [],
        recommendations: ['Manual review recommended'],
        details: {
          reportQuality: 'Unknown',
          fixesQuality: 'Unknown',
          codeQuality: 'Unknown',
          completeness: 'Unknown'
        },
        aiModel: 'Claude 3.5 Sonnet (AWS Bedrock)',
        analysisTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform AWS Bedrock verification
   */
  private async performBedrockVerification(fileContent: FileContent): Promise<VerificationResult> {
    try {
      const prompt = this.buildVerificationPrompt(fileContent);
      const response = await this.callBedrockAPI(prompt);
      return this.parseVerificationResponse(response);
    } catch (error) {
      console.warn('⚠️  AWS Bedrock API call failed, falling back to basic verification');
      return this.performBasicVerification(fileContent);
    }
  }

  /**
   * Build verification prompt for Bedrock
   */
  private buildVerificationPrompt(fileContent: FileContent): string {
    return `You are a MISRA C code analysis expert. Verify the following files and provide a detailed assessment.

UPLOADED CODE:
\`\`\`c
${fileContent.uploadedCode.substring(0, 1000)}
\`\`\`

MISRA REPORT (first 1000 chars):
\`\`\`
${fileContent.report.substring(0, 1000)}
\`\`\`

FIXES DOCUMENTATION (first 1000 chars):
\`\`\`
${fileContent.fixes.substring(0, 1000)}
\`\`\`

FIXED CODE (first 1000 chars):
\`\`\`c
${fileContent.fixedCode.substring(0, 1000)}
\`\`\`

Please verify:
1. Does the report accurately identify violations in the uploaded code?
2. Are the fixes properly documented and explained?
3. Does the fixed code actually address the violations?
4. Is the fixed code syntactically correct?
5. Are there any missing violations or incomplete fixes?

Provide response in JSON format:
{
  "isValid": boolean,
  "score": number (0-100),
  "issues": [list of critical issues],
  "warnings": [list of warnings],
  "recommendations": [list of recommendations],
  "details": {
    "reportQuality": "description",
    "fixesQuality": "description",
    "codeQuality": "description",
    "completeness": "description"
  }
}`;
  }

  /**
   * Call AWS Bedrock API
   */
  private async callBedrockAPI(prompt: string): Promise<string> {
    try {
      // Try to use AWS SDK if available
      const { BedrockRuntime } = await import('@aws-sdk/client-bedrock-runtime');
      
      const client = new BedrockRuntime({ region: this.region });
      
      const response = await client.invokeModel({
        modelId: this.modelId,
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-06-01',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.content[0].text;
    } catch (error) {
      console.warn('⚠️  AWS SDK not available, using fallback verification');
      throw error;
    }
  }

  /**
   * Parse Bedrock API response
   */
  private parseVerificationResponse(response: string): VerificationResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]) as VerificationResult;
      result.aiModel = 'Claude 3.5 Sonnet (AWS Bedrock)';
      return result;
    } catch (error) {
      console.warn('⚠️  Failed to parse Bedrock response:', error);
      return this.performBasicVerification({
        report: response,
        fixes: '',
        fixedCode: '',
        uploadedCode: ''
      });
    }
  }

  /**
   * Perform basic verification (fallback)
   */
  private performBasicVerification(fileContent: FileContent): VerificationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check report quality
    const reportQuality = this.checkReportQuality(fileContent.report, fileContent.uploadedCode);
    if (!reportQuality.isGood) {
      issues.push(...reportQuality.issues);
      warnings.push(...reportQuality.warnings);
    }

    // Check fixes quality
    const fixesQuality = this.checkFixesQuality(fileContent.fixes, fileContent.report);
    if (!fixesQuality.isGood) {
      issues.push(...fixesQuality.issues);
      warnings.push(...fixesQuality.warnings);
    }

    // Check fixed code quality
    const codeQuality = this.checkCodeQuality(fileContent.fixedCode);
    if (!codeQuality.isGood) {
      issues.push(...codeQuality.issues);
      warnings.push(...codeQuality.warnings);
    }

    // Check completeness
    const completeness = this.checkCompleteness(fileContent);
    if (!completeness.isGood) {
      issues.push(...completeness.issues);
      warnings.push(...completeness.warnings);
    }

    // Calculate score
    const score = Math.max(0, 100 - (issues.length * 20 + warnings.length * 5));

    return {
      isValid: issues.length === 0,
      score,
      issues,
      warnings,
      recommendations: [
        'Review all identified issues',
        'Verify fixes are correctly applied',
        'Test fixed code compilation',
        'Validate against MISRA standards'
      ],
      details: {
        reportQuality: reportQuality.description,
        fixesQuality: fixesQuality.description,
        codeQuality: codeQuality.description,
        completeness: completeness.description
      },
      aiModel: 'Claude 3.5 Sonnet (AWS Bedrock) - Fallback Mode',
      analysisTime: 0
    };
  }

  /**
   * Check report quality
   */
  private checkReportQuality(
    report: string,
    uploadedCode: string
  ): { isGood: boolean; issues: string[]; warnings: string[]; description: string } {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!report.toLowerCase().includes('violation') && !report.toLowerCase().includes('rule')) {
      issues.push('Report does not mention any violations');
    }

    const functions = this.extractFunctions(uploadedCode);
    let functionsFound = 0;
    for (const func of functions) {
      if (report.includes(func)) {
        functionsFound++;
      }
    }

    if (functionsFound === 0 && functions.length > 0) {
      warnings.push('Report does not mention any functions from uploaded code');
    }

    if (report.length < 100) {
      warnings.push('Report seems too short - may be incomplete');
    }

    const isGood = issues.length === 0;
    const description = isGood ? 'Good' : 'Poor';

    return { isGood, issues, warnings, description };
  }

  /**
   * Check fixes quality
   */
  private checkFixesQuality(
    fixes: string,
    report: string
  ): { isGood: boolean; issues: string[]; warnings: string[]; description: string } {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!fixes.toLowerCase().includes('fix') && !fixes.toLowerCase().includes('change')) {
      issues.push('Fixes file does not document any fixes');
    }

    const violations = this.extractViolations(report);
    let violationsReferenced = 0;
    for (const violation of violations) {
      if (fixes.includes(violation)) {
        violationsReferenced++;
      }
    }

    if (violationsReferenced === 0 && violations.length > 0) {
      warnings.push('Fixes do not reference violations from report');
    }

    if (fixes.length < 50) {
      warnings.push('Fixes documentation seems too short');
    }

    const isGood = issues.length === 0;
    const description = isGood ? 'Good' : 'Poor';

    return { isGood, issues, warnings, description };
  }

  /**
   * Check fixed code quality
   */
  private checkCodeQuality(fixedCode: string): { isGood: boolean; issues: string[]; warnings: string[]; description: string } {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!fixedCode.includes('#include')) {
      warnings.push('Fixed code does not have any includes');
    }

    if (!fixedCode.includes('main')) {
      warnings.push('Fixed code does not have main function');
    }

    if (!fixedCode.includes('{') || !fixedCode.includes('}')) {
      issues.push('Fixed code does not have proper braces');
    }

    if (fixedCode.includes('*') && !fixedCode.includes('!= NULL') && !fixedCode.includes('!= nullptr')) {
      warnings.push('Fixed code has pointers but no null checks');
    }

    const isGood = issues.length === 0;
    const description = isGood ? 'Good' : 'Poor';

    return { isGood, issues, warnings, description };
  }

  /**
   * Check completeness
   */
  private checkCompleteness(fileContent: FileContent): { isGood: boolean; issues: string[]; warnings: string[]; description: string } {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (fileContent.report.length === 0) {
      issues.push('Report file is empty');
    }
    if (fileContent.fixes.length === 0) {
      issues.push('Fixes file is empty');
    }
    if (fileContent.fixedCode.length === 0) {
      issues.push('Fixed code file is empty');
    }

    const violations = this.extractViolations(fileContent.report);
    const fixes = this.extractFixes(fileContent.fixes);

    if (violations.length > fixes.length) {
      warnings.push(`${violations.length - fixes.length} violations may not have fixes`);
    }

    const isGood = issues.length === 0;
    const description = isGood ? 'Complete' : 'Incomplete';

    return { isGood, issues, warnings, description };
  }

  /**
   * Extract functions from code
   */
  private extractFunctions(code: string): string[] {
    const functionRegex = /(?:void|int|char|float|double|struct|typedef)\s+(\w+)\s*\(/g;
    const functions: string[] = [];
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      functions.push(match[1]);
    }

    return [...new Set(functions)];
  }

  /**
   * Extract violations from report
   */
  private extractViolations(report: string): string[] {
    const violationRegex = /(?:Rule|Violation|MISRA)\s+[\w\-:.\d]+/gi;
    const violations: string[] = [];
    let match;

    while ((match = violationRegex.exec(report)) !== null) {
      violations.push(match[0]);
    }

    return [...new Set(violations)];
  }

  /**
   * Extract fixes from fixes file
   */
  private extractFixes(fixes: string): string[] {
    const fixRegex = /(?:fix|change|update|add|remove|modify)\s+[^\n]+/gi;
    const fixList: string[] = [];
    let match;

    while ((match = fixRegex.exec(fixes)) !== null) {
      fixList.push(match[0]);
    }

    return [...new Set(fixList)];
  }

  /**
   * Read file content
   */
  private readFile(filePath: string): string {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filePath}`);
        return '';
      }
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`❌ Error reading file ${filePath}:`, error);
      return '';
    }
  }
}

/**
 * Generate verification report
 */
export function generateBedrockVerificationReport(result: VerificationResult): string {
  const lines: string[] = [];

  lines.push('╔════════════════════════════════════════════════════════════╗');
  lines.push('║     🤖 AWS BEDROCK AI FILE VERIFICATION REPORT            ║');
  lines.push('╚════════════════════════════════════════════════════════════╝');
  lines.push('');

  // Model info
  lines.push(`🔧 AI Model: ${result.aiModel}`);
  lines.push(`⏱️  Analysis Time: ${result.analysisTime}ms`);
  lines.push('');

  // Overall status
  lines.push(`📊 OVERALL STATUS: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push(`📈 VERIFICATION SCORE: ${result.score}/100`);
  lines.push('');

  // Details
  lines.push('📋 VERIFICATION DETAILS:');
  lines.push(`  • Report Quality: ${result.details.reportQuality}`);
  lines.push(`  • Fixes Quality: ${result.details.fixesQuality}`);
  lines.push(`  • Code Quality: ${result.details.codeQuality}`);
  lines.push(`  • Completeness: ${result.details.completeness}`);
  lines.push('');

  // Issues
  if (result.issues.length > 0) {
    lines.push('❌ CRITICAL ISSUES:');
    result.issues.forEach(issue => {
      lines.push(`  • ${issue}`);
    });
    lines.push('');
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push('⚠️  WARNINGS:');
    result.warnings.forEach(warning => {
      lines.push(`  • ${warning}`);
    });
    lines.push('');
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('💡 RECOMMENDATIONS:');
    result.recommendations.forEach(rec => {
      lines.push(`  • ${rec}`);
    });
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

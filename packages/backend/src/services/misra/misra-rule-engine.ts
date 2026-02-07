/**
 * MISRA Rule Engine Service
 * Core service for analyzing code against MISRA standards
 */

import {
  MisraRule,
  MisraRuleSet,
  RuleViolation,
  AnalysisConfig,
  AnalysisResult,
  ViolationSeverity
} from '../../types/misra-rules';
import { getRulesForRuleSet, getEnabledRules } from '../../config/misra-rules-config';

export class MisraRuleEngine {
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig) {
    this.config = config;
  }

  /**
   * Analyze source code against MISRA rules
   */
  async analyzeCode(
    fileId: string,
    fileName: string,
    sourceCode: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Get rules to check based on configuration
      const rulesToCheck = this.getRulesToCheck();
      
      // Perform line-by-line analysis
      const violations = this.performAnalysis(sourceCode, rulesToCheck);
      
      // Filter violations by severity if configured
      const filteredViolations = this.filterViolationsBySeverity(violations);
      
      // Limit violations if max is set
      const limitedViolations = this.config.maxViolations && this.config.maxViolations > 0
        ? filteredViolations.slice(0, this.config.maxViolations)
        : filteredViolations;

      return {
        fileId,
        fileName,
        ruleSet: this.config.ruleSet,
        violations: limitedViolations,
        violationsCount: limitedViolations.length,
        rulesChecked: rulesToCheck.map(r => r.ruleId),
        analysisTimestamp: Date.now(),
        success: true
      };
    } catch (error) {
      return {
        fileId,
        fileName,
        ruleSet: this.config.ruleSet,
        violations: [],
        violationsCount: 0,
        rulesChecked: [],
        analysisTimestamp: Date.now(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get rules to check based on configuration
   */
  private getRulesToCheck(): MisraRule[] {
    let rules = getEnabledRules(this.config.ruleSet);

    // Filter by enabled rules if specified
    if (this.config.enabledRules && this.config.enabledRules.length > 0) {
      rules = rules.filter(rule => this.config.enabledRules!.includes(rule.ruleId));
    }

    // Remove disabled rules if specified
    if (this.config.disabledRules && this.config.disabledRules.length > 0) {
      rules = rules.filter(rule => !this.config.disabledRules!.includes(rule.ruleId));
    }

    return rules;
  }

  /**
   * Perform line-by-line analysis of source code
   */
  private performAnalysis(sourceCode: string, rules: MisraRule[]): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const lines = sourceCode.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;

      // Check each rule against this line
      for (const rule of rules) {
        const violation = this.checkRuleAgainstLine(rule, line, lineNumber);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    return violations;
  }

  /**
   * Check a specific rule against a line of code
   */
  private checkRuleAgainstLine(
    rule: MisraRule,
    line: string,
    lineNumber: number
  ): RuleViolation | null {
    // Skip empty lines and comments
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
      return null;
    }

    // Rule-specific checks
    switch (rule.ruleId) {
      case '14.4': // goto statement check (C 2004)
        if (/\bgoto\b/.test(line)) {
          return this.createViolation(rule, lineNumber, line, 
            'Remove goto statement and use structured control flow');
        }
        break;

      case '2.1': // Unreachable code check (C 2012)
        if (/\breturn\b.*;.*\S/.test(line)) {
          return this.createViolation(rule, lineNumber, line,
            'Remove code after return statement');
        }
        break;

      case '9.1': // Uninitialized variable check (C 2012)
        if (/\b(int|char|float|double)\s+\w+\s*;/.test(line) && !/=/.test(line)) {
          return this.createViolation(rule, lineNumber, line,
            'Initialize variable at declaration');
        }
        break;

      case '17.7': // Unused return value check (C 2012)
        if (/^\s*\w+\s*\([^)]*\)\s*;/.test(line) && !/void\s+\w+/.test(line)) {
          return this.createViolation(rule, lineNumber, line,
            'Use or explicitly discard function return value');
        }
        break;

      case '5-0-3': // Assignment in expression check (C++ 2008)
        if (/if\s*\([^=]*=[^=]/.test(line) || /while\s*\([^=]*=[^=]/.test(line)) {
          return this.createViolation(rule, lineNumber, line,
            'Use comparison operator (==) instead of assignment (=)');
        }
        break;

      // Add more rule checks as needed
    }

    return null;
  }

  /**
   * Create a violation object
   */
  private createViolation(
    rule: MisraRule,
    lineNumber: number,
    codeSnippet: string,
    recommendation: string
  ): RuleViolation {
    return {
      ruleId: rule.ruleId,
      ruleSet: rule.ruleSet,
      severity: rule.severity,
      lineNumber,
      message: `${rule.ruleSet} Rule ${rule.ruleId}: ${rule.title}`,
      codeSnippet: codeSnippet.trim(),
      recommendation
    };
  }

  /**
   * Filter violations by configured severity levels
   */
  private filterViolationsBySeverity(violations: RuleViolation[]): RuleViolation[] {
    if (!this.config.severityFilter || this.config.severityFilter.length === 0) {
      return violations;
    }

    return violations.filter(v => this.config.severityFilter!.includes(v.severity));
  }

  /**
   * Update analysis configuration
   */
  updateConfig(config: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalysisConfig {
    return { ...this.config };
  }
}

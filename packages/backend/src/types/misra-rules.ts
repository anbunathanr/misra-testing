/**
 * MISRA rule engine types and interfaces
 * Defines rule sets, violations, and analysis configuration
 */

/**
 * Supported MISRA rule sets
 */
export enum MisraRuleSet {
  C_2004 = 'MISRA-C-2004',
  C_2012 = 'MISRA-C-2012',
  CPP_2008 = 'MISRA-C++-2008'
}

/**
 * Violation severity levels
 */
export enum ViolationSeverity {
  REQUIRED = 'required',
  ADVISORY = 'advisory',
  MANDATORY = 'mandatory'
}

/**
 * Rule category for classification
 */
export enum RuleCategory {
  ENVIRONMENT = 'environment',
  LANGUAGE = 'language',
  DOCUMENTATION = 'documentation',
  CHARACTER_SETS = 'character_sets',
  IDENTIFIERS = 'identifiers',
  TYPES = 'types',
  CONSTANTS = 'constants',
  DECLARATIONS = 'declarations',
  INITIALIZATION = 'initialization',
  POINTERS = 'pointers',
  EXPRESSIONS = 'expressions',
  CONTROL_FLOW = 'control_flow',
  FUNCTIONS = 'functions',
  PREPROCESSING = 'preprocessing',
  STANDARD_LIBRARIES = 'standard_libraries'
}

/**
 * Individual MISRA rule definition
 */
export interface MisraRule {
  ruleId: string                    // e.g., "1.1", "2.3"
  ruleSet: MisraRuleSet            // Which standard this belongs to
  category: RuleCategory           // Rule classification
  severity: ViolationSeverity      // Required, Advisory, or Mandatory
  title: string                    // Short rule description
  description: string              // Detailed rule explanation
  rationale: string                // Why this rule exists
  enabled: boolean                 // Whether to check this rule
}

/**
 * Detected violation of a MISRA rule
 */
export interface RuleViolation {
  ruleId: string                   // Rule that was violated
  ruleSet: MisraRuleSet           // Which standard
  severity: ViolationSeverity     // Violation severity
  lineNumber: number              // Line where violation occurred
  columnNumber?: number           // Optional column number
  message: string                 // Human-readable violation message
  codeSnippet: string            // Code that violated the rule
  recommendation: string          // How to fix the violation
}

/**
 * Analysis configuration for MISRA checking
 */
export interface AnalysisConfig {
  ruleSet: MisraRuleSet           // Which rule set to use
  enabledRules?: string[]         // Specific rules to enable (empty = all)
  disabledRules?: string[]        // Specific rules to disable
  severityFilter?: ViolationSeverity[] // Only report these severities
  maxViolations?: number          // Stop after N violations (0 = unlimited)
}

/**
 * Complete analysis result for a file
 */
export interface AnalysisResult {
  fileId: string                  // File being analyzed
  fileName: string                // Original filename
  ruleSet: MisraRuleSet          // Rule set used
  violations: RuleViolation[]     // All detected violations
  violationsCount: number         // Total violation count
  rulesChecked: string[]          // List of rules that were checked
  analysisTimestamp: number       // When analysis completed
  success: boolean                // Whether analysis completed successfully
  errorMessage?: string           // Error if analysis failed
}

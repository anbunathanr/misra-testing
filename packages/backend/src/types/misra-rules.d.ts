/**
 * MISRA rule engine types and interfaces
 * Defines rule sets, violations, and analysis configuration
 */
/**
 * Supported MISRA rule sets
 */
export declare enum MisraRuleSet {
    C_2004 = "MISRA-C-2004",
    C_2012 = "MISRA-C-2012",
    CPP_2008 = "MISRA-C++-2008"
}
/**
 * Violation severity levels
 */
export declare enum ViolationSeverity {
    REQUIRED = "required",
    ADVISORY = "advisory",
    MANDATORY = "mandatory"
}
/**
 * Rule category for classification
 */
export declare enum RuleCategory {
    ENVIRONMENT = "environment",
    LANGUAGE = "language",
    DOCUMENTATION = "documentation",
    CHARACTER_SETS = "character_sets",
    IDENTIFIERS = "identifiers",
    TYPES = "types",
    CONSTANTS = "constants",
    DECLARATIONS = "declarations",
    INITIALIZATION = "initialization",
    POINTERS = "pointers",
    EXPRESSIONS = "expressions",
    CONTROL_FLOW = "control_flow",
    FUNCTIONS = "functions",
    PREPROCESSING = "preprocessing",
    STANDARD_LIBRARIES = "standard_libraries"
}
/**
 * Individual MISRA rule definition
 */
export interface MisraRule {
    ruleId: string;
    ruleSet: MisraRuleSet;
    category: RuleCategory;
    severity: ViolationSeverity;
    title: string;
    description: string;
    rationale: string;
    enabled: boolean;
}
/**
 * Detected violation of a MISRA rule
 */
export interface RuleViolation {
    ruleId: string;
    ruleSet: MisraRuleSet;
    severity: ViolationSeverity;
    lineNumber: number;
    columnNumber?: number;
    message: string;
    codeSnippet: string;
    recommendation: string;
}
/**
 * Analysis configuration for MISRA checking
 */
export interface AnalysisConfig {
    ruleSet: MisraRuleSet;
    enabledRules?: string[];
    disabledRules?: string[];
    severityFilter?: ViolationSeverity[];
    maxViolations?: number;
}
/**
 * Complete analysis result for a file
 */
export interface AnalysisResult {
    fileId: string;
    fileName: string;
    ruleSet: MisraRuleSet;
    violations: RuleViolation[];
    violationsCount: number;
    rulesChecked: string[];
    analysisTimestamp: number;
    success: boolean;
    errorMessage?: string;
}

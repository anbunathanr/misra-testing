/**
 * MISRA rule definitions and configurations
 * Contains rule sets for C 2004, C 2012, and C++ 2008
 */

import { MisraRule, MisraRuleSet, ViolationSeverity, RuleCategory } from '../types/misra-rules';

/**
 * MISRA C 2004 rule definitions (sample subset)
 */
export const MISRA_C_2004_RULES: MisraRule[] = [
  {
    ruleId: '1.1',
    ruleSet: MisraRuleSet.C_2004,
    category: RuleCategory.ENVIRONMENT,
    severity: ViolationSeverity.REQUIRED,
    title: 'All code shall conform to ISO 9899:1990',
    description: 'Code shall conform to the C90 standard',
    rationale: 'Ensures portability and predictable behavior',
    enabled: true
  },
  {
    ruleId: '8.1',
    ruleSet: MisraRuleSet.C_2004,
    category: RuleCategory.DECLARATIONS,
    severity: ViolationSeverity.REQUIRED,
    title: 'Functions shall have prototype declarations',
    description: 'All functions must be declared with prototypes before use',
    rationale: 'Prevents type mismatches and improves type safety',
    enabled: true
  },
  {
    ruleId: '14.4',
    ruleSet: MisraRuleSet.C_2004,
    category: RuleCategory.CONTROL_FLOW,
    severity: ViolationSeverity.REQUIRED,
    title: 'The goto statement shall not be used',
    description: 'goto statements are prohibited',
    rationale: 'Improves code readability and maintainability',
    enabled: true
  }
];

/**
 * MISRA C 2012 rule definitions (sample subset)
 */
export const MISRA_C_2012_RULES: MisraRule[] = [
  {
    ruleId: '1.1',
    ruleSet: MisraRuleSet.C_2012,
    category: RuleCategory.LANGUAGE,
    severity: ViolationSeverity.REQUIRED,
    title: 'Language extensions shall not be used',
    description: 'Compiler-specific extensions are not allowed',
    rationale: 'Ensures portability across different compilers',
    enabled: true
  },
  {
    ruleId: '2.1',
    ruleSet: MisraRuleSet.C_2012,
    category: RuleCategory.LANGUAGE,
    severity: ViolationSeverity.REQUIRED,
    title: 'Project shall not contain unreachable code',
    description: 'All code must be reachable through some execution path',
    rationale: 'Dead code indicates logic errors or maintenance issues',
    enabled: true
  },
  {
    ruleId: '8.4',
    ruleSet: MisraRuleSet.C_2012,
    category: RuleCategory.DECLARATIONS,
    severity: ViolationSeverity.REQUIRED,
    title: 'Compatible declaration shall be visible',
    description: 'Function declarations must be visible at definition point',
    rationale: 'Ensures type consistency across translation units',
    enabled: true
  },
  {
    ruleId: '9.1',
    ruleSet: MisraRuleSet.C_2012,
    category: RuleCategory.INITIALIZATION,
    severity: ViolationSeverity.MANDATORY,
    title: 'Value of object shall not be read before assignment',
    description: 'Variables must be initialized before use',
    rationale: 'Prevents undefined behavior from uninitialized variables',
    enabled: true
  },
  {
    ruleId: '17.7',
    ruleSet: MisraRuleSet.C_2012,
    category: RuleCategory.FUNCTIONS,
    severity: ViolationSeverity.REQUIRED,
    title: 'Return value of non-void function shall be used',
    description: 'Function return values must not be discarded',
    rationale: 'Ensures error conditions are properly handled',
    enabled: true
  }
];

/**
 * MISRA C++ 2008 rule definitions (sample subset)
 */
export const MISRA_CPP_2008_RULES: MisraRule[] = [
  {
    ruleId: '0-1-1',
    ruleSet: MisraRuleSet.CPP_2008,
    category: RuleCategory.LANGUAGE,
    severity: ViolationSeverity.REQUIRED,
    title: 'Project shall not contain unreachable code',
    description: 'All code must be reachable',
    rationale: 'Dead code indicates potential bugs',
    enabled: true
  },
  {
    ruleId: '5-0-3',
    ruleSet: MisraRuleSet.CPP_2008,
    category: RuleCategory.EXPRESSIONS,
    severity: ViolationSeverity.REQUIRED,
    title: 'Cvalue expression shall not be used',
    description: 'Result of assignment shall not be used in expressions',
    rationale: 'Prevents accidental assignment in conditions',
    enabled: true
  },
  {
    ruleId: '8-4-2',
    ruleSet: MisraRuleSet.CPP_2008,
    category: RuleCategory.DECLARATIONS,
    severity: ViolationSeverity.REQUIRED,
    title: 'Function parameters shall be named',
    description: 'All function parameters must have names',
    rationale: 'Improves code documentation and readability',
    enabled: true
  }
];

/**
 * Get all rules for a specific rule set
 */
export function getRulesForRuleSet(ruleSet: MisraRuleSet): MisraRule[] {
  switch (ruleSet) {
    case MisraRuleSet.C_2004:
      return MISRA_C_2004_RULES;
    case MisraRuleSet.C_2012:
      return MISRA_C_2012_RULES;
    case MisraRuleSet.CPP_2008:
      return MISRA_CPP_2008_RULES;
    default:
      return [];
  }
}

/**
 * Get a specific rule by ID and rule set
 */
export function getRule(ruleSet: MisraRuleSet, ruleId: string): MisraRule | undefined {
  const rules = getRulesForRuleSet(ruleSet);
  return rules.find(rule => rule.ruleId === ruleId);
}

/**
 * Get all enabled rules for a rule set
 */
export function getEnabledRules(ruleSet: MisraRuleSet): MisraRule[] {
  return getRulesForRuleSet(ruleSet).filter(rule => rule.enabled);
}

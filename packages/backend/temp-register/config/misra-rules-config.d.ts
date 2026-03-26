/**
 * MISRA rule definitions and configurations
 * Contains rule sets for C 2004, C 2012, and C++ 2008
 */
import { MisraRule, MisraRuleSet } from '../types/misra-rules';
/**
 * MISRA C 2004 rule definitions (sample subset)
 */
export declare const MISRA_C_2004_RULES: MisraRule[];
/**
 * MISRA C 2012 rule definitions (sample subset)
 */
export declare const MISRA_C_2012_RULES: MisraRule[];
/**
 * MISRA C++ 2008 rule definitions (sample subset)
 */
export declare const MISRA_CPP_2008_RULES: MisraRule[];
/**
 * Get all rules for a specific rule set
 */
export declare function getRulesForRuleSet(ruleSet: MisraRuleSet): MisraRule[];
/**
 * Get a specific rule by ID and rule set
 */
export declare function getRule(ruleSet: MisraRuleSet, ruleId: string): MisraRule | undefined;
/**
 * Get all enabled rules for a rule set
 */
export declare function getEnabledRules(ruleSet: MisraRuleSet): MisraRule[];

/**
 * Rule configuration types and profile definitions for MISRA analysis.
 *
 * Profiles control which rules are active during analysis:
 *   - 'minimal'  → mandatory rules only
 *   - 'moderate' → mandatory + required rules
 *   - 'strict'   → all rules (mandatory + required + advisory)
 */
/** Analysis profile controlling which severity levels are active. */
export type RuleProfile = 'strict' | 'moderate' | 'minimal';
/**
 * Per-analysis rule configuration.
 *
 * The `profile` field sets the baseline set of rules.
 * `enabledRules` and `disabledRules` allow fine-grained overrides on top of
 * the profile selection.
 */
export interface RuleConfig {
    /** Baseline profile that determines which severity levels are included. */
    profile: RuleProfile;
    /**
     * Optional list of rule IDs to force-enable regardless of profile.
     * These are added on top of the rules already selected by the profile.
     */
    enabledRules?: string[];
    /**
     * Optional list of rule IDs to force-disable regardless of profile.
     * These are removed from the rules selected by the profile.
     */
    disabledRules?: string[];
}
/**
 * Describes which severity levels are included in each profile.
 *
 * Used for documentation and UI display; the actual filtering logic lives in
 * `RuleEngine.getEnabledRules()`.
 */
export declare const PROFILE_SEVERITIES: Record<RuleProfile, Array<'mandatory' | 'required' | 'advisory'>>;
/**
 * Human-readable descriptions for each profile.
 */
export declare const PROFILE_DESCRIPTIONS: Record<RuleProfile, string>;
/**
 * Returns the default RuleConfig for new users / projects.
 */
export declare function getDefaultRuleConfig(): RuleConfig;
/**
 * Validates a RuleConfig object.
 * Returns an array of error messages (empty if valid).
 */
export declare function validateRuleConfig(config: unknown): string[];

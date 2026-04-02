/**
 * Rule configuration types and profile definitions for MISRA analysis.
 *
 * Profiles control which rules are active during analysis:
 *   - 'minimal'  → mandatory rules only
 *   - 'moderate' → mandatory + required rules
 *   - 'strict'   → all rules (mandatory + required + advisory)
 */

// ─── Types ─────────────────────────────────────────────────────────────────

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

// ─── Profile definitions ───────────────────────────────────────────────────

/**
 * Describes which severity levels are included in each profile.
 *
 * Used for documentation and UI display; the actual filtering logic lives in
 * `RuleEngine.getEnabledRules()`.
 */
export const PROFILE_SEVERITIES: Record<RuleProfile, Array<'mandatory' | 'required' | 'advisory'>> = {
  minimal: ['mandatory'],
  moderate: ['mandatory', 'required'],
  strict: ['mandatory', 'required', 'advisory'],
};

/**
 * Human-readable descriptions for each profile.
 */
export const PROFILE_DESCRIPTIONS: Record<RuleProfile, string> = {
  minimal: 'Mandatory rules only – minimum viable compliance check.',
  moderate: 'Mandatory and required rules – recommended for most projects.',
  strict: 'All rules including advisory – maximum compliance coverage.',
};

/**
 * Returns the default RuleConfig for new users / projects.
 */
export function getDefaultRuleConfig(): RuleConfig {
  return { profile: 'moderate' };
}

/**
 * Validates a RuleConfig object.
 * Returns an array of error messages (empty if valid).
 */
export function validateRuleConfig(config: unknown): string[] {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('RuleConfig must be an object');
    return errors;
  }

  const cfg = config as Record<string, unknown>;

  const validProfiles: RuleProfile[] = ['strict', 'moderate', 'minimal'];
  if (!validProfiles.includes(cfg['profile'] as RuleProfile)) {
    errors.push(`profile must be one of: ${validProfiles.join(', ')}`);
  }

  if (cfg['enabledRules'] !== undefined) {
    if (!Array.isArray(cfg['enabledRules']) || !cfg['enabledRules'].every((r: unknown) => typeof r === 'string')) {
      errors.push('enabledRules must be an array of strings');
    }
  }

  if (cfg['disabledRules'] !== undefined) {
    if (!Array.isArray(cfg['disabledRules']) || !cfg['disabledRules'].every((r: unknown) => typeof r === 'string')) {
      errors.push('disabledRules must be an array of strings');
    }
  }

  return errors;
}

"use strict";
/**
 * MISRA rule definitions and configurations
 * Contains rule sets for C 2004, C 2012, and C++ 2008
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MISRA_CPP_2008_RULES = exports.MISRA_C_2012_RULES = exports.MISRA_C_2004_RULES = void 0;
exports.getRulesForRuleSet = getRulesForRuleSet;
exports.getRule = getRule;
exports.getEnabledRules = getEnabledRules;
const misra_rules_1 = require("../types/misra-rules");
/**
 * MISRA C 2004 rule definitions (sample subset)
 */
exports.MISRA_C_2004_RULES = [
    {
        ruleId: '1.1',
        ruleSet: misra_rules_1.MisraRuleSet.C_2004,
        category: misra_rules_1.RuleCategory.ENVIRONMENT,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'All code shall conform to ISO 9899:1990',
        description: 'Code shall conform to the C90 standard',
        rationale: 'Ensures portability and predictable behavior',
        enabled: true
    },
    {
        ruleId: '8.1',
        ruleSet: misra_rules_1.MisraRuleSet.C_2004,
        category: misra_rules_1.RuleCategory.DECLARATIONS,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'Functions shall have prototype declarations',
        description: 'All functions must be declared with prototypes before use',
        rationale: 'Prevents type mismatches and improves type safety',
        enabled: true
    },
    {
        ruleId: '14.4',
        ruleSet: misra_rules_1.MisraRuleSet.C_2004,
        category: misra_rules_1.RuleCategory.CONTROL_FLOW,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'The goto statement shall not be used',
        description: 'goto statements are prohibited',
        rationale: 'Improves code readability and maintainability',
        enabled: true
    }
];
/**
 * MISRA C 2012 rule definitions (sample subset)
 */
exports.MISRA_C_2012_RULES = [
    {
        ruleId: '1.1',
        ruleSet: misra_rules_1.MisraRuleSet.C_2012,
        category: misra_rules_1.RuleCategory.LANGUAGE,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'Language extensions shall not be used',
        description: 'Compiler-specific extensions are not allowed',
        rationale: 'Ensures portability across different compilers',
        enabled: true
    },
    {
        ruleId: '2.1',
        ruleSet: misra_rules_1.MisraRuleSet.C_2012,
        category: misra_rules_1.RuleCategory.LANGUAGE,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'Project shall not contain unreachable code',
        description: 'All code must be reachable through some execution path',
        rationale: 'Dead code indicates logic errors or maintenance issues',
        enabled: true
    },
    {
        ruleId: '8.4',
        ruleSet: misra_rules_1.MisraRuleSet.C_2012,
        category: misra_rules_1.RuleCategory.DECLARATIONS,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'Compatible declaration shall be visible',
        description: 'Function declarations must be visible at definition point',
        rationale: 'Ensures type consistency across translation units',
        enabled: true
    },
    {
        ruleId: '9.1',
        ruleSet: misra_rules_1.MisraRuleSet.C_2012,
        category: misra_rules_1.RuleCategory.INITIALIZATION,
        severity: misra_rules_1.ViolationSeverity.MANDATORY,
        title: 'Value of object shall not be read before assignment',
        description: 'Variables must be initialized before use',
        rationale: 'Prevents undefined behavior from uninitialized variables',
        enabled: true
    },
    {
        ruleId: '17.7',
        ruleSet: misra_rules_1.MisraRuleSet.C_2012,
        category: misra_rules_1.RuleCategory.FUNCTIONS,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'Return value of non-void function shall be used',
        description: 'Function return values must not be discarded',
        rationale: 'Ensures error conditions are properly handled',
        enabled: true
    }
];
/**
 * MISRA C++ 2008 rule definitions (sample subset)
 */
exports.MISRA_CPP_2008_RULES = [
    {
        ruleId: '0-1-1',
        ruleSet: misra_rules_1.MisraRuleSet.CPP_2008,
        category: misra_rules_1.RuleCategory.LANGUAGE,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'Project shall not contain unreachable code',
        description: 'All code must be reachable',
        rationale: 'Dead code indicates potential bugs',
        enabled: true
    },
    {
        ruleId: '5-0-3',
        ruleSet: misra_rules_1.MisraRuleSet.CPP_2008,
        category: misra_rules_1.RuleCategory.EXPRESSIONS,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'Cvalue expression shall not be used',
        description: 'Result of assignment shall not be used in expressions',
        rationale: 'Prevents accidental assignment in conditions',
        enabled: true
    },
    {
        ruleId: '8-4-2',
        ruleSet: misra_rules_1.MisraRuleSet.CPP_2008,
        category: misra_rules_1.RuleCategory.DECLARATIONS,
        severity: misra_rules_1.ViolationSeverity.REQUIRED,
        title: 'Function parameters shall be named',
        description: 'All function parameters must have names',
        rationale: 'Improves code documentation and readability',
        enabled: true
    }
];
/**
 * Get all rules for a specific rule set
 */
function getRulesForRuleSet(ruleSet) {
    switch (ruleSet) {
        case misra_rules_1.MisraRuleSet.C_2004:
            return exports.MISRA_C_2004_RULES;
        case misra_rules_1.MisraRuleSet.C_2012:
            return exports.MISRA_C_2012_RULES;
        case misra_rules_1.MisraRuleSet.CPP_2008:
            return exports.MISRA_CPP_2008_RULES;
        default:
            return [];
    }
}
/**
 * Get a specific rule by ID and rule set
 */
function getRule(ruleSet, ruleId) {
    const rules = getRulesForRuleSet(ruleSet);
    return rules.find(rule => rule.ruleId === ruleId);
}
/**
 * Get all enabled rules for a rule set
 */
function getEnabledRules(ruleSet) {
    return getRulesForRuleSet(ruleSet).filter(rule => rule.enabled);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcnVsZXMtY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWlzcmEtcnVsZXMtY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQXVJSCxnREFXQztBQUtELDBCQUdDO0FBS0QsMENBRUM7QUEvSkQsc0RBQWdHO0FBRWhHOztHQUVHO0FBQ1UsUUFBQSxrQkFBa0IsR0FBZ0I7SUFDN0M7UUFDRSxNQUFNLEVBQUUsS0FBSztRQUNiLE9BQU8sRUFBRSwwQkFBWSxDQUFDLE1BQU07UUFDNUIsUUFBUSxFQUFFLDBCQUFZLENBQUMsV0FBVztRQUNsQyxRQUFRLEVBQUUsK0JBQWlCLENBQUMsUUFBUTtRQUNwQyxLQUFLLEVBQUUseUNBQXlDO1FBQ2hELFdBQVcsRUFBRSx3Q0FBd0M7UUFDckQsU0FBUyxFQUFFLDhDQUE4QztRQUN6RCxPQUFPLEVBQUUsSUFBSTtLQUNkO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsS0FBSztRQUNiLE9BQU8sRUFBRSwwQkFBWSxDQUFDLE1BQU07UUFDNUIsUUFBUSxFQUFFLDBCQUFZLENBQUMsWUFBWTtRQUNuQyxRQUFRLEVBQUUsK0JBQWlCLENBQUMsUUFBUTtRQUNwQyxLQUFLLEVBQUUsNkNBQTZDO1FBQ3BELFdBQVcsRUFBRSwyREFBMkQ7UUFDeEUsU0FBUyxFQUFFLG1EQUFtRDtRQUM5RCxPQUFPLEVBQUUsSUFBSTtLQUNkO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsTUFBTTtRQUNkLE9BQU8sRUFBRSwwQkFBWSxDQUFDLE1BQU07UUFDNUIsUUFBUSxFQUFFLDBCQUFZLENBQUMsWUFBWTtRQUNuQyxRQUFRLEVBQUUsK0JBQWlCLENBQUMsUUFBUTtRQUNwQyxLQUFLLEVBQUUsc0NBQXNDO1FBQzdDLFdBQVcsRUFBRSxnQ0FBZ0M7UUFDN0MsU0FBUyxFQUFFLCtDQUErQztRQUMxRCxPQUFPLEVBQUUsSUFBSTtLQUNkO0NBQ0YsQ0FBQztBQUVGOztHQUVHO0FBQ1UsUUFBQSxrQkFB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QUVHO0FBQ0gsU0FBZ0Isa0JBQWtCLENBQUMsT0FBcUI7SUFDdEQsUUFBUSxPQUFPLEVBQUUsQ0FBQztRQUNoQixLQUFLLDBCQUFZLENBQUMsTUFBTTtZQUN0QixPQUFPLDBCQUFrQixDQUFDO1FBQzVCLEtBQUssMEJBQVksQ0FBQyxNQUFNO1lBQ3RCLE9BQU8sMEJBQWtCLENBQUM7UUFDNUIsS0FBSywwQkFBWSxDQUFDLFFBQVE7WUFDeEIsT0FBTyw0QkFBb0IsQ0FBQztRQUM5QjtZQUNFLE9BQU8sRUFBRSxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLE9BQU8sQ0FBQyxPQUFxQixFQUFFLE1BQWM7SUFDM0QsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDMUMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsQ0FBQztBQUNwRCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixlQUFlLENBQUMsT0FBcUI7SUFDbkQsT0FBTyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDbEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBNSVNSQSBydWxlIGRlZmluaXRpb25zIGFuZCBjb25maWd1cmF0aW9uc1xyXG4gKiBDb250YWlucyBydWxlIHNldHMgZm9yIEMgMjAwNCwgQyAyMDEyLCBhbmQgQysrIDIwMDhcclxuICovXHJcblxyXG5pbXBvcnQgeyBNaXNyYVJ1bGUsIE1pc3JhUnVsZVNldCwgVmlvbGF0aW9uU2V2ZXJpdHksIFJ1bGVDYXRlZ29yeSB9IGZyb20gJy4uL3R5cGVzL21pc3JhLXJ1bGVzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDIDIwMDQgcnVsZSBkZWZpbml0aW9ucyAoc2FtcGxlIHN1YnNldClcclxuICovXHJcbmV4cG9ydCBjb25zdCBNSVNSQV9DXzIwMDRfUlVMRVM6IE1pc3JhUnVsZVtdID0gW1xyXG4gIHtcclxuICAgIHJ1bGVJZDogJzEuMScsXHJcbiAgICBydWxlU2V0OiBNaXNyYVJ1bGVTZXQuQ18yMDA0LFxyXG4gICAgY2F0ZWdvcnk6IFJ1bGVDYXRlZ29yeS5FTlZJUk9OTUVOVCxcclxuICAgIHNldmVyaXR5OiBWaW9sYXRpb25TZXZlcml0eS5SRVFVSVJFRCxcclxuICAgIHRpdGxlOiAnQWxsIGNvZGUgc2hhbGwgY29uZm9ybSB0byBJU08gOTg5OToxOTkwJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnQ29kZSBzaGFsbCBjb25mb3JtIHRvIHRoZSBDOTAgc3RhbmRhcmQnLFxyXG4gICAgcmF0aW9uYWxlOiAnRW5zdXJlcyBwb3J0YWJpbGl0eSBhbmQgcHJlZGljdGFibGUgYmVoYXZpb3InLFxyXG4gICAgZW5hYmxlZDogdHJ1ZVxyXG4gIH0sXHJcbiAge1xyXG4gICAgcnVsZUlkOiAnOC4xJyxcclxuICAgIHJ1bGVTZXQ6IE1pc3JhUnVsZVNldC5DXzIwMDQsXHJcbiAgICBjYXRlZ29yeTogUnVsZUNhdGVnb3J5LkRFQ0xBUkFUSU9OUyxcclxuICAgIHNldmVyaXR5OiBWaW9sYXRpb25TZXZlcml0eS5SRVFVSVJFRCxcclxuICAgIHRpdGxlOiAnRnVuY3Rpb25zIHNoYWxsIGhhdmUgcHJvdG90eXBlIGRlY2xhcmF0aW9ucycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0FsbCBmdW5jdGlvbnMgbXVzdCBiZSBkZWNsYXJlZCB3aXRoIHByb3RvdHlwZXMgYmVmb3JlIHVzZScsXHJcbiAgICByYXRpb25hbGU6ICdQcmV2ZW50cyB0eXBlIG1pc21hdGNoZXMgYW5kIGltcHJvdmVzIHR5cGUgc2FmZXR5JyxcclxuICAgIGVuYWJsZWQ6IHRydWVcclxuICB9LFxyXG4gIHtcclxuICAgIHJ1bGVJZDogJzE0LjQnLFxyXG4gICAgcnVsZVNldDogTWlzcmFSdWxlU2V0LkNfMjAwNCxcclxuICAgIGNhdGVnb3J5OiBSdWxlQ2F0ZWdvcnkuQ09OVFJPTF9GTE9XLFxyXG4gICAgc2V2ZXJpdHk6IFZpb2xhdGlvblNldmVyaXR5LlJFUVVJUkVELFxyXG4gICAgdGl0bGU6ICdUaGUgZ290byBzdGF0ZW1lbnQgc2hhbGwgbm90IGJlIHVzZWQnLFxyXG4gICAgZGVzY3JpcHRpb246ICdnb3RvIHN0YXRlbWVudHMgYXJlIHByb2hpYml0ZWQnLFxyXG4gICAgcmF0aW9uYWxlOiAnSW1wcm92ZXMgY29kZSByZWFkYWJpbGl0eSBhbmQgbWFpbnRhaW5hYmlsaXR5JyxcclxuICAgIGVuYWJsZWQ6IHRydWVcclxuICB9XHJcbl07XHJcblxyXG4vKipcclxuICogTUlTUkEgQyAyMDEyIHJ1bGUgZGVmaW5pdGlvbnMgKHNhbXBsZSBzdWJzZXQpXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgTUlTUkFfQ18yMDEyX1JVTEVTOiBNaXNyYVJ1bGVbXSA9IFtcclxuICB7XHJcbiAgICBydWxlSWQ6ICcxLjEnLFxyXG4gICAgcnVsZVNldDogTWlzcmFSdWxlU2V0LkNfMjAxMixcclxuICAgIGNhdGVnb3J5OiBSdWxlQ2F0ZWdvcnkuTEFOR1VBR0UsXHJcbiAgICBzZXZlcml0eTogVmlvbGF0aW9uU2V2ZXJpdHkuUkVRVUlSRUQsXHJcbiAgICB0aXRsZTogJ0xhbmd1YWdlIGV4dGVuc2lvbnMgc2hhbGwgbm90IGJlIHVzZWQnLFxyXG4gICAgZGVzY3JpcHRpb246ICdDb21waWxlci1zcGVjaWZpYyBleHRlbnNpb25zIGFyZSBub3QgYWxsb3dlZCcsXHJcbiAgICByYXRpb25hbGU6ICdFbnN1cmVzIHBvcnRhYmlsaXR5IGFjcm9zcyBkaWZmZXJlbnQgY29tcGlsZXJzJyxcclxuICAgIGVuYWJsZWQ6IHRydWVcclxuICB9LFxyXG4gIHtcclxuICAgIHJ1bGVJZDogJzIuMScsXHJcbiAgICBydWxlU2V0OiBNaXNyYVJ1bGVTZXQuQ18yMDEyLFxyXG4gICAgY2F0ZWdvcnk6IFJ1bGVDYXRlZ29yeS5MQU5HVUFHRSxcclxuICAgIHNldmVyaXR5OiBWaW9sYXRpb25TZXZlcml0eS5SRVFVSVJFRCxcclxuICAgIHRpdGxlOiAnUHJvamVjdCBzaGFsbCBub3QgY29udGFpbiB1bnJlYWNoYWJsZSBjb2RlJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnQWxsIGNvZGUgbXVzdCBiZSByZWFjaGFibGUgdGhyb3VnaCBzb21lIGV4ZWN1dGlvbiBwYXRoJyxcclxuICAgIHJhdGlvbmFsZTogJ0RlYWQgY29kZSBpbmRpY2F0ZXMgbG9naWMgZXJyb3JzIG9yIG1haW50ZW5hbmNlIGlzc3VlcycsXHJcbiAgICBlbmFibGVkOiB0cnVlXHJcbiAgfSxcclxuICB7XHJcbiAgICBydWxlSWQ6ICc4LjQnLFxyXG4gICAgcnVsZVNldDogTWlzcmFSdWxlU2V0LkNfMjAxMixcclxuICAgIGNhdGVnb3J5OiBSdWxlQ2F0ZWdvcnkuREVDTEFSQVRJT05TLFxyXG4gICAgc2V2ZXJpdHk6IFZpb2xhdGlvblNldmVyaXR5LlJFUVVJUkVELFxyXG4gICAgdGl0bGU6ICdDb21wYXRpYmxlIGRlY2xhcmF0aW9uIHNoYWxsIGJlIHZpc2libGUnLFxyXG4gICAgZGVzY3JpcHRpb246ICdGdW5jdGlvbiBkZWNsYXJhdGlvbnMgbXVzdCBiZSB2aXNpYmxlIGF0IGRlZmluaXRpb24gcG9pbnQnLFxyXG4gICAgcmF0aW9uYWxlOiAnRW5zdXJlcyB0eXBlIGNvbnNpc3RlbmN5IGFjcm9zcyB0cmFuc2xhdGlvbiB1bml0cycsXHJcbiAgICBlbmFibGVkOiB0cnVlXHJcbiAgfSxcclxuICB7XHJcbiAgICBydWxlSWQ6ICc5LjEnLFxyXG4gICAgcnVsZVNldDogTWlzcmFSdWxlU2V0LkNfMjAxMixcclxuICAgIGNhdGVnb3J5OiBSdWxlQ2F0ZWdvcnkuSU5JVElBTElaQVRJT04sXHJcbiAgICBzZXZlcml0eTogVmlvbGF0aW9uU2V2ZXJpdHkuTUFOREFUT1JZLFxyXG4gICAgdGl0bGU6ICdWYWx1ZSBvZiBvYmplY3Qgc2hhbGwgbm90IGJlIHJlYWQgYmVmb3JlIGFzc2lnbm1lbnQnLFxyXG4gICAgZGVzY3JpcHRpb246ICdWYXJpYWJsZXMgbXVzdCBiZSBpbml0aWFsaXplZCBiZWZvcmUgdXNlJyxcclxuICAgIHJhdGlvbmFsZTogJ1ByZXZlbnRzIHVuZGVmaW5lZCBiZWhhdmlvciBmcm9tIHVuaW5pdGlhbGl6ZWQgdmFyaWFibGVzJyxcclxuICAgIGVuYWJsZWQ6IHRydWVcclxuICB9LFxyXG4gIHtcclxuICAgIHJ1bGVJZDogJzE3LjcnLFxyXG4gICAgcnVsZVNldDogTWlzcmFSdWxlU2V0LkNfMjAxMixcclxuICAgIGNhdGVnb3J5OiBSdWxlQ2F0ZWdvcnkuRlVOQ1RJT05TLFxyXG4gICAgc2V2ZXJpdHk6IFZpb2xhdGlvblNldmVyaXR5LlJFUVVJUkVELFxyXG4gICAgdGl0bGU6ICdSZXR1cm4gdmFsdWUgb2Ygbm9uLXZvaWQgZnVuY3Rpb24gc2hhbGwgYmUgdXNlZCcsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0Z1bmN0aW9uIHJldHVybiB2YWx1ZXMgbXVzdCBub3QgYmUgZGlzY2FyZGVkJyxcclxuICAgIHJhdGlvbmFsZTogJ0Vuc3VyZXMgZXJyb3IgY29uZGl0aW9ucyBhcmUgcHJvcGVybHkgaGFuZGxlZCcsXHJcbiAgICBlbmFibGVkOiB0cnVlXHJcbiAgfVxyXG5dO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKyAyMDA4IHJ1bGUgZGVmaW5pdGlvbnMgKHNhbXBsZSBzdWJzZXQpXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgTUlTUkFfQ1BQXzIwMDhfUlVMRVM6IE1pc3JhUnVsZVtdID0gW1xyXG4gIHtcclxuICAgIHJ1bGVJZDogJzAtMS0xJyxcclxuICAgIHJ1bGVTZXQ6IE1pc3JhUnVsZVNldC5DUFBfMjAwOCxcclxuICAgIGNhdGVnb3J5OiBSdWxlQ2F0ZWdvcnkuTEFOR1VBR0UsXHJcbiAgICBzZXZlcml0eTogVmlvbGF0aW9uU2V2ZXJpdHkuUkVRVUlSRUQsXHJcbiAgICB0aXRsZTogJ1Byb2plY3Qgc2hhbGwgbm90IGNvbnRhaW4gdW5yZWFjaGFibGUgY29kZScsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0FsbCBjb2RlIG11c3QgYmUgcmVhY2hhYmxlJyxcclxuICAgIHJhdGlvbmFsZTogJ0RlYWQgY29kZSBpbmRpY2F0ZXMgcG90ZW50aWFsIGJ1Z3MnLFxyXG4gICAgZW5hYmxlZDogdHJ1ZVxyXG4gIH0sXHJcbiAge1xyXG4gICAgcnVsZUlkOiAnNS0wLTMnLFxyXG4gICAgcnVsZVNldDogTWlzcmFSdWxlU2V0LkNQUF8yMDA4LFxyXG4gICAgY2F0ZWdvcnk6IFJ1bGVDYXRlZ29yeS5FWFBSRVNTSU9OUyxcclxuICAgIHNldmVyaXR5OiBWaW9sYXRpb25TZXZlcml0eS5SRVFVSVJFRCxcclxuICAgIHRpdGxlOiAnQ3ZhbHVlIGV4cHJlc3Npb24gc2hhbGwgbm90IGJlIHVzZWQnLFxyXG4gICAgZGVzY3JpcHRpb246ICdSZXN1bHQgb2YgYXNzaWdubWVudCBzaGFsbCBub3QgYmUgdXNlZCBpbiBleHByZXNzaW9ucycsXHJcbiAgICByYXRpb25hbGU6ICdQcmV2ZW50cyBhY2NpZGVudGFsIGFzc2lnbm1lbnQgaW4gY29uZGl0aW9ucycsXHJcbiAgICBlbmFibGVkOiB0cnVlXHJcbiAgfSxcclxuICB7XHJcbiAgICBydWxlSWQ6ICc4LTQtMicsXHJcbiAgICBydWxlU2V0OiBNaXNyYVJ1bGVTZXQuQ1BQXzIwMDgsXHJcbiAgICBjYXRlZ29yeTogUnVsZUNhdGVnb3J5LkRFQ0xBUkFUSU9OUyxcclxuICAgIHNldmVyaXR5OiBWaW9sYXRpb25TZXZlcml0eS5SRVFVSVJFRCxcclxuICAgIHRpdGxlOiAnRnVuY3Rpb24gcGFyYW1ldGVycyBzaGFsbCBiZSBuYW1lZCcsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0FsbCBmdW5jdGlvbiBwYXJhbWV0ZXJzIG11c3QgaGF2ZSBuYW1lcycsXHJcbiAgICByYXRpb25hbGU6ICdJbXByb3ZlcyBjb2RlIGRvY3VtZW50YXRpb24gYW5kIHJlYWRhYmlsaXR5JyxcclxuICAgIGVuYWJsZWQ6IHRydWVcclxuICB9XHJcbl07XHJcblxyXG4vKipcclxuICogR2V0IGFsbCBydWxlcyBmb3IgYSBzcGVjaWZpYyBydWxlIHNldFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFJ1bGVzRm9yUnVsZVNldChydWxlU2V0OiBNaXNyYVJ1bGVTZXQpOiBNaXNyYVJ1bGVbXSB7XHJcbiAgc3dpdGNoIChydWxlU2V0KSB7XHJcbiAgICBjYXNlIE1pc3JhUnVsZVNldC5DXzIwMDQ6XHJcbiAgICAgIHJldHVybiBNSVNSQV9DXzIwMDRfUlVMRVM7XHJcbiAgICBjYXNlIE1pc3JhUnVsZVNldC5DXzIwMTI6XHJcbiAgICAgIHJldHVybiBNSVNSQV9DXzIwMTJfUlVMRVM7XHJcbiAgICBjYXNlIE1pc3JhUnVsZVNldC5DUFBfMjAwODpcclxuICAgICAgcmV0dXJuIE1JU1JBX0NQUF8yMDA4X1JVTEVTO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBhIHNwZWNpZmljIHJ1bGUgYnkgSUQgYW5kIHJ1bGUgc2V0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UnVsZShydWxlU2V0OiBNaXNyYVJ1bGVTZXQsIHJ1bGVJZDogc3RyaW5nKTogTWlzcmFSdWxlIHwgdW5kZWZpbmVkIHtcclxuICBjb25zdCBydWxlcyA9IGdldFJ1bGVzRm9yUnVsZVNldChydWxlU2V0KTtcclxuICByZXR1cm4gcnVsZXMuZmluZChydWxlID0+IHJ1bGUucnVsZUlkID09PSBydWxlSWQpO1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IGFsbCBlbmFibGVkIHJ1bGVzIGZvciBhIHJ1bGUgc2V0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW5hYmxlZFJ1bGVzKHJ1bGVTZXQ6IE1pc3JhUnVsZVNldCk6IE1pc3JhUnVsZVtdIHtcclxuICByZXR1cm4gZ2V0UnVsZXNGb3JSdWxlU2V0KHJ1bGVTZXQpLmZpbHRlcihydWxlID0+IHJ1bGUuZW5hYmxlZCk7XHJcbn1cclxuIl19
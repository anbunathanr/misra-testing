"use strict";
/**
 * MISRA Rule Engine Service
 * Core service for analyzing code against MISRA standards
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MisraRuleEngine = void 0;
const misra_rules_config_1 = require("../../config/misra-rules-config");
class MisraRuleEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Analyze source code against MISRA rules
     */
    async analyzeCode(fileId, fileName, sourceCode) {
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
        }
        catch (error) {
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
    getRulesToCheck() {
        let rules = (0, misra_rules_config_1.getEnabledRules)(this.config.ruleSet);
        // Filter by enabled rules if specified
        if (this.config.enabledRules && this.config.enabledRules.length > 0) {
            rules = rules.filter(rule => this.config.enabledRules.includes(rule.ruleId));
        }
        // Remove disabled rules if specified
        if (this.config.disabledRules && this.config.disabledRules.length > 0) {
            rules = rules.filter(rule => !this.config.disabledRules.includes(rule.ruleId));
        }
        return rules;
    }
    /**
     * Perform line-by-line analysis of source code
     */
    performAnalysis(sourceCode, rules) {
        const violations = [];
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
    checkRuleAgainstLine(rule, line, lineNumber) {
        // Skip empty lines and comments
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
            return null;
        }
        // Rule-specific checks
        switch (rule.ruleId) {
            case '14.4': // goto statement check (C 2004)
                if (/\bgoto\b/.test(line)) {
                    return this.createViolation(rule, lineNumber, line, 'Remove goto statement and use structured control flow');
                }
                break;
            case '2.1': // Unreachable code check (C 2012)
                if (/\breturn\b.*;.*\S/.test(line)) {
                    return this.createViolation(rule, lineNumber, line, 'Remove code after return statement');
                }
                break;
            case '9.1': // Uninitialized variable check (C 2012)
                if (/\b(int|char|float|double)\s+\w+\s*;/.test(line) && !/=/.test(line)) {
                    return this.createViolation(rule, lineNumber, line, 'Initialize variable at declaration');
                }
                break;
            case '17.7': // Unused return value check (C 2012)
                if (/^\s*\w+\s*\([^)]*\)\s*;/.test(line) && !/void\s+\w+/.test(line)) {
                    return this.createViolation(rule, lineNumber, line, 'Use or explicitly discard function return value');
                }
                break;
            case '5-0-3': // Assignment in expression check (C++ 2008)
                if (/if\s*\([^=]*=[^=]/.test(line) || /while\s*\([^=]*=[^=]/.test(line)) {
                    return this.createViolation(rule, lineNumber, line, 'Use comparison operator (==) instead of assignment (=)');
                }
                break;
            // Add more rule checks as needed
        }
        return null;
    }
    /**
     * Create a violation object
     */
    createViolation(rule, lineNumber, codeSnippet, recommendation) {
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
    filterViolationsBySeverity(violations) {
        if (!this.config.severityFilter || this.config.severityFilter.length === 0) {
            return violations;
        }
        return violations.filter(v => this.config.severityFilter.includes(v.severity));
    }
    /**
     * Update analysis configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.MisraRuleEngine = MisraRuleEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcnVsZS1lbmdpbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtaXNyYS1ydWxlLWVuZ2luZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFVSCx3RUFBc0Y7QUFFdEYsTUFBYSxlQUFlO0lBQ2xCLE1BQU0sQ0FBaUI7SUFFL0IsWUFBWSxNQUFzQjtRQUNoQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN2QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsV0FBVyxDQUNmLE1BQWMsRUFDZCxRQUFnQixFQUNoQixVQUFrQjtRQUVsQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFN0IsSUFBSSxDQUFDO1lBQ0gsNENBQTRDO1lBQzVDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUU1QyxnQ0FBZ0M7WUFDaEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFFbEUsOENBQThDO1lBQzlDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRXZFLGlDQUFpQztZQUNqQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxHQUFHLENBQUM7Z0JBQ2xGLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO2dCQUN4RCxDQUFDLENBQUMsa0JBQWtCLENBQUM7WUFFdkIsT0FBTztnQkFDTCxNQUFNO2dCQUNOLFFBQVE7Z0JBQ1IsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTztnQkFDNUIsVUFBVSxFQUFFLGlCQUFpQjtnQkFDN0IsZUFBZSxFQUFFLGlCQUFpQixDQUFDLE1BQU07Z0JBQ3pDLFlBQVksRUFBRSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDN0MsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDN0IsT0FBTyxFQUFFLElBQUk7YUFDZCxDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPO2dCQUNMLE1BQU07Z0JBQ04sUUFBUTtnQkFDUixPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPO2dCQUM1QixVQUFVLEVBQUUsRUFBRTtnQkFDZCxlQUFlLEVBQUUsQ0FBQztnQkFDbEIsWUFBWSxFQUFFLEVBQUU7Z0JBQ2hCLGlCQUFpQixFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQzdCLE9BQU8sRUFBRSxLQUFLO2dCQUNkLFlBQVksRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ3ZFLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssZUFBZTtRQUNyQixJQUFJLEtBQUssR0FBRyxJQUFBLG9DQUFlLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVqRCx1Q0FBdUM7UUFDdkMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEUsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQWEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUVELHFDQUFxQztRQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0RSxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFjLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRDs7T0FFRztJQUNLLGVBQWUsQ0FBQyxVQUFrQixFQUFFLEtBQWtCO1FBQzVELE1BQU0sVUFBVSxHQUFvQixFQUFFLENBQUM7UUFDdkMsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyQyxLQUFLLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRSxTQUFTLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQzlELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM5QixNQUFNLFVBQVUsR0FBRyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBRWpDLG9DQUFvQztZQUNwQyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN6QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDcEUsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZCxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUM3QixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxvQkFBb0IsQ0FDMUIsSUFBZSxFQUNmLElBQVksRUFDWixVQUFrQjtRQUVsQixnQ0FBZ0M7UUFDaEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxXQUFXLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDakYsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLEtBQUssTUFBTSxFQUFFLGdDQUFnQztnQkFDM0MsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzFCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFDaEQsdURBQXVELENBQUMsQ0FBQztnQkFDN0QsQ0FBQztnQkFDRCxNQUFNO1lBRVIsS0FBSyxLQUFLLEVBQUUsa0NBQWtDO2dCQUM1QyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNuQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQ2hELG9DQUFvQyxDQUFDLENBQUM7Z0JBQzFDLENBQUM7Z0JBQ0QsTUFBTTtZQUVSLEtBQUssS0FBSyxFQUFFLHdDQUF3QztnQkFDbEQsSUFBSSxxQ0FBcUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ3hFLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFDaEQsb0NBQW9DLENBQUMsQ0FBQztnQkFDMUMsQ0FBQztnQkFDRCxNQUFNO1lBRVIsS0FBSyxNQUFNLEVBQUUscUNBQXFDO2dCQUNoRCxJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDckUsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUNoRCxpREFBaUQsQ0FBQyxDQUFDO2dCQUN2RCxDQUFDO2dCQUNELE1BQU07WUFFUixLQUFLLE9BQU8sRUFBRSw0Q0FBNEM7Z0JBQ3hELElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN4RSxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQ2hELHdEQUF3RCxDQUFDLENBQUM7Z0JBQzlELENBQUM7Z0JBQ0QsTUFBTTtZQUVSLGlDQUFpQztRQUNuQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxlQUFlLENBQ3JCLElBQWUsRUFDZixVQUFrQixFQUNsQixXQUFtQixFQUNuQixjQUFzQjtRQUV0QixPQUFPO1lBQ0wsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsVUFBVTtZQUNWLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLFNBQVMsSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQzdELFdBQVcsRUFBRSxXQUFXLENBQUMsSUFBSSxFQUFFO1lBQy9CLGNBQWM7U0FDZixDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ssMEJBQTBCLENBQUMsVUFBMkI7UUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzRSxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFFRDs7T0FFRztJQUNILFlBQVksQ0FBQyxNQUErQjtRQUMxQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7SUFDOUMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUztRQUNQLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM1QixDQUFDO0NBQ0Y7QUF4TUQsMENBd01DIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIE1JU1JBIFJ1bGUgRW5naW5lIFNlcnZpY2VcclxuICogQ29yZSBzZXJ2aWNlIGZvciBhbmFseXppbmcgY29kZSBhZ2FpbnN0IE1JU1JBIHN0YW5kYXJkc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7XHJcbiAgTWlzcmFSdWxlLFxyXG4gIE1pc3JhUnVsZVNldCxcclxuICBSdWxlVmlvbGF0aW9uLFxyXG4gIEFuYWx5c2lzQ29uZmlnLFxyXG4gIEFuYWx5c2lzUmVzdWx0LFxyXG4gIFZpb2xhdGlvblNldmVyaXR5XHJcbn0gZnJvbSAnLi4vLi4vdHlwZXMvbWlzcmEtcnVsZXMnO1xyXG5pbXBvcnQgeyBnZXRSdWxlc0ZvclJ1bGVTZXQsIGdldEVuYWJsZWRSdWxlcyB9IGZyb20gJy4uLy4uL2NvbmZpZy9taXNyYS1ydWxlcy1jb25maWcnO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pc3JhUnVsZUVuZ2luZSB7XHJcbiAgcHJpdmF0ZSBjb25maWc6IEFuYWx5c2lzQ29uZmlnO1xyXG5cclxuICBjb25zdHJ1Y3Rvcihjb25maWc6IEFuYWx5c2lzQ29uZmlnKSB7XHJcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFuYWx5emUgc291cmNlIGNvZGUgYWdhaW5zdCBNSVNSQSBydWxlc1xyXG4gICAqL1xyXG4gIGFzeW5jIGFuYWx5emVDb2RlKFxyXG4gICAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgICBmaWxlTmFtZTogc3RyaW5nLFxyXG4gICAgc291cmNlQ29kZTogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTxBbmFseXNpc1Jlc3VsdD4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gR2V0IHJ1bGVzIHRvIGNoZWNrIGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cclxuICAgICAgY29uc3QgcnVsZXNUb0NoZWNrID0gdGhpcy5nZXRSdWxlc1RvQ2hlY2soKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFBlcmZvcm0gbGluZS1ieS1saW5lIGFuYWx5c2lzXHJcbiAgICAgIGNvbnN0IHZpb2xhdGlvbnMgPSB0aGlzLnBlcmZvcm1BbmFseXNpcyhzb3VyY2VDb2RlLCBydWxlc1RvQ2hlY2spO1xyXG4gICAgICBcclxuICAgICAgLy8gRmlsdGVyIHZpb2xhdGlvbnMgYnkgc2V2ZXJpdHkgaWYgY29uZmlndXJlZFxyXG4gICAgICBjb25zdCBmaWx0ZXJlZFZpb2xhdGlvbnMgPSB0aGlzLmZpbHRlclZpb2xhdGlvbnNCeVNldmVyaXR5KHZpb2xhdGlvbnMpO1xyXG4gICAgICBcclxuICAgICAgLy8gTGltaXQgdmlvbGF0aW9ucyBpZiBtYXggaXMgc2V0XHJcbiAgICAgIGNvbnN0IGxpbWl0ZWRWaW9sYXRpb25zID0gdGhpcy5jb25maWcubWF4VmlvbGF0aW9ucyAmJiB0aGlzLmNvbmZpZy5tYXhWaW9sYXRpb25zID4gMFxyXG4gICAgICAgID8gZmlsdGVyZWRWaW9sYXRpb25zLnNsaWNlKDAsIHRoaXMuY29uZmlnLm1heFZpb2xhdGlvbnMpXHJcbiAgICAgICAgOiBmaWx0ZXJlZFZpb2xhdGlvbnM7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBmaWxlTmFtZSxcclxuICAgICAgICBydWxlU2V0OiB0aGlzLmNvbmZpZy5ydWxlU2V0LFxyXG4gICAgICAgIHZpb2xhdGlvbnM6IGxpbWl0ZWRWaW9sYXRpb25zLFxyXG4gICAgICAgIHZpb2xhdGlvbnNDb3VudDogbGltaXRlZFZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICAgIHJ1bGVzQ2hlY2tlZDogcnVsZXNUb0NoZWNrLm1hcChyID0+IHIucnVsZUlkKSxcclxuICAgICAgICBhbmFseXNpc1RpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuICAgICAgICBzdWNjZXNzOiB0cnVlXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBmaWxlTmFtZSxcclxuICAgICAgICBydWxlU2V0OiB0aGlzLmNvbmZpZy5ydWxlU2V0LFxyXG4gICAgICAgIHZpb2xhdGlvbnM6IFtdLFxyXG4gICAgICAgIHZpb2xhdGlvbnNDb3VudDogMCxcclxuICAgICAgICBydWxlc0NoZWNrZWQ6IFtdLFxyXG4gICAgICAgIGFuYWx5c2lzVGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yTWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBydWxlcyB0byBjaGVjayBiYXNlZCBvbiBjb25maWd1cmF0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRSdWxlc1RvQ2hlY2soKTogTWlzcmFSdWxlW10ge1xyXG4gICAgbGV0IHJ1bGVzID0gZ2V0RW5hYmxlZFJ1bGVzKHRoaXMuY29uZmlnLnJ1bGVTZXQpO1xyXG5cclxuICAgIC8vIEZpbHRlciBieSBlbmFibGVkIHJ1bGVzIGlmIHNwZWNpZmllZFxyXG4gICAgaWYgKHRoaXMuY29uZmlnLmVuYWJsZWRSdWxlcyAmJiB0aGlzLmNvbmZpZy5lbmFibGVkUnVsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBydWxlcyA9IHJ1bGVzLmZpbHRlcihydWxlID0+IHRoaXMuY29uZmlnLmVuYWJsZWRSdWxlcyEuaW5jbHVkZXMocnVsZS5ydWxlSWQpKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBSZW1vdmUgZGlzYWJsZWQgcnVsZXMgaWYgc3BlY2lmaWVkXHJcbiAgICBpZiAodGhpcy5jb25maWcuZGlzYWJsZWRSdWxlcyAmJiB0aGlzLmNvbmZpZy5kaXNhYmxlZFJ1bGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgcnVsZXMgPSBydWxlcy5maWx0ZXIocnVsZSA9PiAhdGhpcy5jb25maWcuZGlzYWJsZWRSdWxlcyEuaW5jbHVkZXMocnVsZS5ydWxlSWQpKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcnVsZXM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBQZXJmb3JtIGxpbmUtYnktbGluZSBhbmFseXNpcyBvZiBzb3VyY2UgY29kZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgcGVyZm9ybUFuYWx5c2lzKHNvdXJjZUNvZGU6IHN0cmluZywgcnVsZXM6IE1pc3JhUnVsZVtdKTogUnVsZVZpb2xhdGlvbltdIHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFJ1bGVWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBzb3VyY2VDb2RlLnNwbGl0KCdcXG4nKTtcclxuXHJcbiAgICBmb3IgKGxldCBsaW5lSW5kZXggPSAwOyBsaW5lSW5kZXggPCBsaW5lcy5sZW5ndGg7IGxpbmVJbmRleCsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tsaW5lSW5kZXhdO1xyXG4gICAgICBjb25zdCBsaW5lTnVtYmVyID0gbGluZUluZGV4ICsgMTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGVhY2ggcnVsZSBhZ2FpbnN0IHRoaXMgbGluZVxyXG4gICAgICBmb3IgKGNvbnN0IHJ1bGUgb2YgcnVsZXMpIHtcclxuICAgICAgICBjb25zdCB2aW9sYXRpb24gPSB0aGlzLmNoZWNrUnVsZUFnYWluc3RMaW5lKHJ1bGUsIGxpbmUsIGxpbmVOdW1iZXIpO1xyXG4gICAgICAgIGlmICh2aW9sYXRpb24pIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaCh2aW9sYXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgYSBzcGVjaWZpYyBydWxlIGFnYWluc3QgYSBsaW5lIG9mIGNvZGVcclxuICAgKi9cclxuICBwcml2YXRlIGNoZWNrUnVsZUFnYWluc3RMaW5lKFxyXG4gICAgcnVsZTogTWlzcmFSdWxlLFxyXG4gICAgbGluZTogc3RyaW5nLFxyXG4gICAgbGluZU51bWJlcjogbnVtYmVyXHJcbiAgKTogUnVsZVZpb2xhdGlvbiB8IG51bGwge1xyXG4gICAgLy8gU2tpcCBlbXB0eSBsaW5lcyBhbmQgY29tbWVudHNcclxuICAgIGNvbnN0IHRyaW1tZWRMaW5lID0gbGluZS50cmltKCk7XHJcbiAgICBpZiAoIXRyaW1tZWRMaW5lIHx8IHRyaW1tZWRMaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgdHJpbW1lZExpbmUuc3RhcnRzV2l0aCgnLyonKSkge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBSdWxlLXNwZWNpZmljIGNoZWNrc1xyXG4gICAgc3dpdGNoIChydWxlLnJ1bGVJZCkge1xyXG4gICAgICBjYXNlICcxNC40JzogLy8gZ290byBzdGF0ZW1lbnQgY2hlY2sgKEMgMjAwNClcclxuICAgICAgICBpZiAoL1xcYmdvdG9cXGIvLnRlc3QobGluZSkpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVZpb2xhdGlvbihydWxlLCBsaW5lTnVtYmVyLCBsaW5lLCBcclxuICAgICAgICAgICAgJ1JlbW92ZSBnb3RvIHN0YXRlbWVudCBhbmQgdXNlIHN0cnVjdHVyZWQgY29udHJvbCBmbG93Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnMi4xJzogLy8gVW5yZWFjaGFibGUgY29kZSBjaGVjayAoQyAyMDEyKVxyXG4gICAgICAgIGlmICgvXFxicmV0dXJuXFxiLio7LipcXFMvLnRlc3QobGluZSkpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVZpb2xhdGlvbihydWxlLCBsaW5lTnVtYmVyLCBsaW5lLFxyXG4gICAgICAgICAgICAnUmVtb3ZlIGNvZGUgYWZ0ZXIgcmV0dXJuIHN0YXRlbWVudCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJzkuMSc6IC8vIFVuaW5pdGlhbGl6ZWQgdmFyaWFibGUgY2hlY2sgKEMgMjAxMilcclxuICAgICAgICBpZiAoL1xcYihpbnR8Y2hhcnxmbG9hdHxkb3VibGUpXFxzK1xcdytcXHMqOy8udGVzdChsaW5lKSAmJiAhLz0vLnRlc3QobGluZSkpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVZpb2xhdGlvbihydWxlLCBsaW5lTnVtYmVyLCBsaW5lLFxyXG4gICAgICAgICAgICAnSW5pdGlhbGl6ZSB2YXJpYWJsZSBhdCBkZWNsYXJhdGlvbicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJzE3LjcnOiAvLyBVbnVzZWQgcmV0dXJuIHZhbHVlIGNoZWNrIChDIDIwMTIpXHJcbiAgICAgICAgaWYgKC9eXFxzKlxcdytcXHMqXFwoW14pXSpcXClcXHMqOy8udGVzdChsaW5lKSAmJiAhL3ZvaWRcXHMrXFx3Ky8udGVzdChsaW5lKSkge1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlVmlvbGF0aW9uKHJ1bGUsIGxpbmVOdW1iZXIsIGxpbmUsXHJcbiAgICAgICAgICAgICdVc2Ugb3IgZXhwbGljaXRseSBkaXNjYXJkIGZ1bmN0aW9uIHJldHVybiB2YWx1ZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJzUtMC0zJzogLy8gQXNzaWdubWVudCBpbiBleHByZXNzaW9uIGNoZWNrIChDKysgMjAwOClcclxuICAgICAgICBpZiAoL2lmXFxzKlxcKFtePV0qPVtePV0vLnRlc3QobGluZSkgfHwgL3doaWxlXFxzKlxcKFtePV0qPVtePV0vLnRlc3QobGluZSkpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVZpb2xhdGlvbihydWxlLCBsaW5lTnVtYmVyLCBsaW5lLFxyXG4gICAgICAgICAgICAnVXNlIGNvbXBhcmlzb24gb3BlcmF0b3IgKD09KSBpbnN0ZWFkIG9mIGFzc2lnbm1lbnQgKD0pJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgLy8gQWRkIG1vcmUgcnVsZSBjaGVja3MgYXMgbmVlZGVkXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSB2aW9sYXRpb24gb2JqZWN0XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICBydWxlOiBNaXNyYVJ1bGUsXHJcbiAgICBsaW5lTnVtYmVyOiBudW1iZXIsXHJcbiAgICBjb2RlU25pcHBldDogc3RyaW5nLFxyXG4gICAgcmVjb21tZW5kYXRpb246IHN0cmluZ1xyXG4gICk6IFJ1bGVWaW9sYXRpb24ge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcnVsZUlkOiBydWxlLnJ1bGVJZCxcclxuICAgICAgcnVsZVNldDogcnVsZS5ydWxlU2V0LFxyXG4gICAgICBzZXZlcml0eTogcnVsZS5zZXZlcml0eSxcclxuICAgICAgbGluZU51bWJlcixcclxuICAgICAgbWVzc2FnZTogYCR7cnVsZS5ydWxlU2V0fSBSdWxlICR7cnVsZS5ydWxlSWR9OiAke3J1bGUudGl0bGV9YCxcclxuICAgICAgY29kZVNuaXBwZXQ6IGNvZGVTbmlwcGV0LnRyaW0oKSxcclxuICAgICAgcmVjb21tZW5kYXRpb25cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGaWx0ZXIgdmlvbGF0aW9ucyBieSBjb25maWd1cmVkIHNldmVyaXR5IGxldmVsc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZmlsdGVyVmlvbGF0aW9uc0J5U2V2ZXJpdHkodmlvbGF0aW9uczogUnVsZVZpb2xhdGlvbltdKTogUnVsZVZpb2xhdGlvbltdIHtcclxuICAgIGlmICghdGhpcy5jb25maWcuc2V2ZXJpdHlGaWx0ZXIgfHwgdGhpcy5jb25maWcuc2V2ZXJpdHlGaWx0ZXIubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zLmZpbHRlcih2ID0+IHRoaXMuY29uZmlnLnNldmVyaXR5RmlsdGVyIS5pbmNsdWRlcyh2LnNldmVyaXR5KSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgYW5hbHlzaXMgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHVwZGF0ZUNvbmZpZyhjb25maWc6IFBhcnRpYWw8QW5hbHlzaXNDb25maWc+KTogdm9pZCB7XHJcbiAgICB0aGlzLmNvbmZpZyA9IHsgLi4udGhpcy5jb25maWcsIC4uLmNvbmZpZyB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIGdldENvbmZpZygpOiBBbmFseXNpc0NvbmZpZyB7XHJcbiAgICByZXR1cm4geyAuLi50aGlzLmNvbmZpZyB9O1xyXG4gIH1cclxufVxyXG4iXX0=
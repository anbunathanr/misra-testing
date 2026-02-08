"use strict";
/**
 * Violation Report Service
 * Generates structured violation reports with detailed analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViolationReportService = void 0;
const uuid_1 = require("uuid");
const misra_rules_1 = require("../../types/misra-rules");
const misra_rules_config_1 = require("../../config/misra-rules-config");
class ViolationReportService {
    /**
     * Generate a detailed violation report from analysis results
     */
    generateReport(analysisResult, options = {}) {
        const { includeSummary = true, includeRecommendations = true, groupBySeverity = true, groupByRule = true, sortBy = 'line', maxViolationsPerReport = 0 } = options;
        // Sort violations
        const sortedViolations = this.sortViolations(analysisResult.violations, sortBy);
        // Limit violations if specified
        const limitedViolations = maxViolationsPerReport > 0
            ? sortedViolations.slice(0, maxViolationsPerReport)
            : sortedViolations;
        // Generate summary
        const summary = includeSummary
            ? this.generateSummary(limitedViolations)
            : this.getEmptySummary();
        // Group violations
        const violationsBySeverity = groupBySeverity
            ? this.groupBySeverity(limitedViolations)
            : this.getEmptyBySeverity();
        const violationsByRule = groupByRule
            ? this.groupByRule(limitedViolations, analysisResult.ruleSet)
            : [];
        // Generate recommendations
        const recommendations = includeRecommendations
            ? this.generateRecommendations(summary, violationsByRule)
            : [];
        return {
            reportId: (0, uuid_1.v4)(),
            fileId: analysisResult.fileId,
            fileName: analysisResult.fileName,
            ruleSet: analysisResult.ruleSet,
            generatedAt: Date.now(),
            summary,
            violationsBySeverity,
            violationsByRule,
            allViolations: limitedViolations,
            recommendations
        };
    }
    /**
     * Generate a batch report for multiple files
     */
    generateBatchReport(analysisResults, options = {}) {
        const fileReports = analysisResults.map(result => this.generateReport(result, options));
        const totalViolations = fileReports.reduce((sum, r) => sum + r.summary.totalViolations, 0);
        const totalMandatory = fileReports.reduce((sum, r) => sum + r.summary.mandatoryCount, 0);
        const totalRequired = fileReports.reduce((sum, r) => sum + r.summary.requiredCount, 0);
        const totalAdvisory = fileReports.reduce((sum, r) => sum + r.summary.advisoryCount, 0);
        const filesWithViolations = fileReports.filter(r => r.summary.totalViolations > 0).length;
        const filesWithoutViolations = fileReports.filter(r => r.summary.totalViolations === 0).length;
        return {
            reportId: (0, uuid_1.v4)(),
            generatedAt: Date.now(),
            totalFiles: analysisResults.length,
            filesAnalyzed: analysisResults.filter(r => r.success).length,
            fileReports,
            overallSummary: {
                totalViolations,
                totalMandatory,
                totalRequired,
                totalAdvisory,
                filesWithViolations,
                filesWithoutViolations
            }
        };
    }
    /**
     * Generate summary statistics
     */
    generateSummary(violations) {
        const mandatoryCount = violations.filter(v => v.severity === misra_rules_1.ViolationSeverity.MANDATORY).length;
        const requiredCount = violations.filter(v => v.severity === misra_rules_1.ViolationSeverity.REQUIRED).length;
        const advisoryCount = violations.filter(v => v.severity === misra_rules_1.ViolationSeverity.ADVISORY).length;
        // Count unique rules violated
        const uniqueRules = new Set(violations.map(v => v.ruleId));
        // Find most violated rule
        const ruleCounts = new Map();
        violations.forEach(v => {
            ruleCounts.set(v.ruleId, (ruleCounts.get(v.ruleId) || 0) + 1);
        });
        let mostViolatedRule = null;
        let maxCount = 0;
        ruleCounts.forEach((count, ruleId) => {
            if (count > maxCount) {
                maxCount = count;
                mostViolatedRule = ruleId;
            }
        });
        // Calculate average violations per line
        const uniqueLines = new Set(violations.map(v => v.lineNumber));
        const averageViolationsPerLine = uniqueLines.size > 0
            ? violations.length / uniqueLines.size
            : 0;
        return {
            totalViolations: violations.length,
            mandatoryCount,
            requiredCount,
            advisoryCount,
            uniqueRulesViolated: uniqueRules.size,
            mostViolatedRule,
            averageViolationsPerLine: Math.round(averageViolationsPerLine * 100) / 100
        };
    }
    /**
     * Group violations by severity
     */
    groupBySeverity(violations) {
        return {
            mandatory: violations.filter(v => v.severity === misra_rules_1.ViolationSeverity.MANDATORY),
            required: violations.filter(v => v.severity === misra_rules_1.ViolationSeverity.REQUIRED),
            advisory: violations.filter(v => v.severity === misra_rules_1.ViolationSeverity.ADVISORY)
        };
    }
    /**
     * Group violations by rule
     */
    groupByRule(violations, ruleSet) {
        const ruleMap = new Map();
        violations.forEach(violation => {
            const existing = ruleMap.get(violation.ruleId) || [];
            existing.push(violation);
            ruleMap.set(violation.ruleId, existing);
        });
        const grouped = [];
        ruleMap.forEach((ruleViolations, ruleId) => {
            const rule = (0, misra_rules_config_1.getRule)(ruleSet, ruleId);
            grouped.push({
                ruleId,
                ruleTitle: rule?.title || 'Unknown Rule',
                severity: ruleViolations[0].severity,
                count: ruleViolations.length,
                violations: ruleViolations
            });
        });
        // Sort by count (descending)
        return grouped.sort((a, b) => b.count - a.count);
    }
    /**
     * Sort violations by specified criteria
     */
    sortViolations(violations, sortBy) {
        const sorted = [...violations];
        switch (sortBy) {
            case 'line':
                return sorted.sort((a, b) => a.lineNumber - b.lineNumber);
            case 'severity':
                const severityOrder = {
                    [misra_rules_1.ViolationSeverity.MANDATORY]: 0,
                    [misra_rules_1.ViolationSeverity.REQUIRED]: 1,
                    [misra_rules_1.ViolationSeverity.ADVISORY]: 2
                };
                return sorted.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
            case 'rule':
                return sorted.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
            default:
                return sorted;
        }
    }
    /**
     * Generate actionable recommendations based on violations
     */
    generateRecommendations(summary, violationsByRule) {
        const recommendations = [];
        // Priority recommendations based on severity
        if (summary.mandatoryCount > 0) {
            recommendations.push(`CRITICAL: Address ${summary.mandatoryCount} mandatory violation(s) immediately. ` +
                `These violations must be fixed for MISRA compliance.`);
        }
        if (summary.requiredCount > 0) {
            recommendations.push(`HIGH PRIORITY: Fix ${summary.requiredCount} required violation(s). ` +
                `These are strongly recommended for code safety and quality.`);
        }
        if (summary.advisoryCount > 0) {
            recommendations.push(`ADVISORY: Consider addressing ${summary.advisoryCount} advisory violation(s) ` +
                `to improve code quality and maintainability.`);
        }
        // Recommendations for most violated rules
        if (violationsByRule.length > 0 && summary.mostViolatedRule) {
            const topRule = violationsByRule[0];
            recommendations.push(`Focus on Rule ${topRule.ruleId}: "${topRule.ruleTitle}" ` +
                `which has ${topRule.count} violation(s). Fixing this rule will have the biggest impact.`);
        }
        // General recommendations
        if (summary.totalViolations > 50) {
            recommendations.push('Consider breaking down the analysis into smaller files or modules for easier remediation.');
        }
        if (summary.averageViolationsPerLine > 1.5) {
            recommendations.push('Multiple violations per line detected. Review code structure and formatting practices.');
        }
        // Success message if no violations
        if (summary.totalViolations === 0) {
            recommendations.push('Excellent! No MISRA violations detected. Code meets compliance standards.');
        }
        return recommendations;
    }
    /**
     * Format report as text
     */
    formatAsText(report) {
        let output = '';
        output += `MISRA Violation Report\n`;
        output += `${'='.repeat(80)}\n\n`;
        output += `File: ${report.fileName}\n`;
        output += `Rule Set: ${report.ruleSet}\n`;
        output += `Generated: ${new Date(report.generatedAt).toISOString()}\n\n`;
        // Summary
        output += `Summary\n`;
        output += `${'-'.repeat(80)}\n`;
        output += `Total Violations: ${report.summary.totalViolations}\n`;
        output += `  - Mandatory: ${report.summary.mandatoryCount}\n`;
        output += `  - Required: ${report.summary.requiredCount}\n`;
        output += `  - Advisory: ${report.summary.advisoryCount}\n`;
        output += `Unique Rules Violated: ${report.summary.uniqueRulesViolated}\n\n`;
        // Recommendations
        if (report.recommendations.length > 0) {
            output += `Recommendations\n`;
            output += `${'-'.repeat(80)}\n`;
            report.recommendations.forEach((rec, i) => {
                output += `${i + 1}. ${rec}\n`;
            });
            output += `\n`;
        }
        // Violations by rule
        if (report.violationsByRule.length > 0) {
            output += `Violations by Rule\n`;
            output += `${'-'.repeat(80)}\n`;
            report.violationsByRule.forEach(rule => {
                output += `\nRule ${rule.ruleId}: ${rule.ruleTitle} (${rule.severity})\n`;
                output += `Count: ${rule.count}\n`;
                rule.violations.forEach(v => {
                    output += `  Line ${v.lineNumber}: ${v.message}\n`;
                    output += `    Code: ${v.codeSnippet}\n`;
                    output += `    Fix: ${v.recommendation}\n`;
                });
            });
        }
        return output;
    }
    /**
     * Format report as CSV
     */
    formatAsCSV(report) {
        let csv = 'Rule ID,Severity,Line Number,Message,Code Snippet,Recommendation\n';
        report.allViolations.forEach(v => {
            const row = [
                v.ruleId,
                v.severity,
                v.lineNumber.toString(),
                `"${v.message.replace(/"/g, '""')}"`,
                `"${v.codeSnippet.replace(/"/g, '""')}"`,
                `"${v.recommendation.replace(/"/g, '""')}"`
            ];
            csv += row.join(',') + '\n';
        });
        return csv;
    }
    /**
     * Helper methods for empty structures
     */
    getEmptySummary() {
        return {
            totalViolations: 0,
            mandatoryCount: 0,
            requiredCount: 0,
            advisoryCount: 0,
            uniqueRulesViolated: 0,
            mostViolatedRule: null,
            averageViolationsPerLine: 0
        };
    }
    getEmptyBySeverity() {
        return {
            mandatory: [],
            required: [],
            advisory: []
        };
    }
}
exports.ViolationReportService = ViolationReportService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlvbGF0aW9uLXJlcG9ydC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmlvbGF0aW9uLXJlcG9ydC1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILCtCQUFvQztBQVVwQyx5REFBeUc7QUFDekcsd0VBQTBEO0FBRTFELE1BQWEsc0JBQXNCO0lBQ2pDOztPQUVHO0lBQ0gsY0FBYyxDQUNaLGNBQThCLEVBQzlCLFVBQXlCLEVBQUU7UUFFM0IsTUFBTSxFQUNKLGNBQWMsR0FBRyxJQUFJLEVBQ3JCLHNCQUFzQixHQUFHLElBQUksRUFDN0IsZUFBZSxHQUFHLElBQUksRUFDdEIsV0FBVyxHQUFHLElBQUksRUFDbEIsTUFBTSxHQUFHLE1BQU0sRUFDZixzQkFBc0IsR0FBRyxDQUFDLEVBQzNCLEdBQUcsT0FBTyxDQUFDO1FBRVosa0JBQWtCO1FBQ2xCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWhGLGdDQUFnQztRQUNoQyxNQUFNLGlCQUFpQixHQUFHLHNCQUFzQixHQUFHLENBQUM7WUFDbEQsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLENBQUM7WUFDbkQsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO1FBRXJCLG1CQUFtQjtRQUNuQixNQUFNLE9BQU8sR0FBRyxjQUFjO1lBQzVCLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDO1lBQ3pDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFM0IsbUJBQW1CO1FBQ25CLE1BQU0sb0JBQW9CLEdBQUcsZUFBZTtZQUMxQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQztZQUN6QyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENB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QkFDUixDQUFDLENBQUMsUUFBUTtnQkFDVixDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtnQkFDdkIsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUc7Z0JBQ3BDLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHO2dCQUN4QyxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRzthQUM1QyxDQUFDO1lBQ0YsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSyxlQUFlO1FBQ3JCLE9BQU87WUFDTCxlQUFlLEVBQUUsQ0FBQztZQUNsQixjQUFjLEVBQUUsQ0FBQztZQUNqQixhQUFhLEVBQUUsQ0FBQztZQUNoQixhQUFhLEVBQUUsQ0FBQztZQUNoQixtQkFBbUIsRUFBRSxDQUFDO1lBQ3RCLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsd0JBQXdCLEVBQUUsQ0FBQztTQUM1QixDQUFDO0lBQ0osQ0FBQztJQUVPLGtCQUFrQjtRQUN4QixPQUFPO1lBQ0wsU0FBUyxFQUFFLEVBQUU7WUFDYixRQUFRLEVBQUUsRUFBRTtZQUNaLFFBQVEsRUFBRSxFQUFFO1NBQ2IsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXZXRCx3REF1V0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVmlvbGF0aW9uIFJlcG9ydCBTZXJ2aWNlXHJcbiAqIEdlbmVyYXRlcyBzdHJ1Y3R1cmVkIHZpb2xhdGlvbiByZXBvcnRzIHdpdGggZGV0YWlsZWQgYW5hbHlzaXNcclxuICovXHJcblxyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0IHtcclxuICBWaW9sYXRpb25SZXBvcnQsXHJcbiAgVmlvbGF0aW9uU3VtbWFyeSxcclxuICBWaW9sYXRpb25zQnlTZXZlcml0eSxcclxuICBWaW9sYXRpb25zQnlSdWxlLFxyXG4gIFJlcG9ydE9wdGlvbnMsXHJcbiAgQmF0Y2hWaW9sYXRpb25SZXBvcnQsXHJcbiAgUmVwb3J0Rm9ybWF0XHJcbn0gZnJvbSAnLi4vLi4vdHlwZXMvdmlvbGF0aW9uLXJlcG9ydCc7XHJcbmltcG9ydCB7IFJ1bGVWaW9sYXRpb24sIE1pc3JhUnVsZVNldCwgVmlvbGF0aW9uU2V2ZXJpdHksIEFuYWx5c2lzUmVzdWx0IH0gZnJvbSAnLi4vLi4vdHlwZXMvbWlzcmEtcnVsZXMnO1xyXG5pbXBvcnQgeyBnZXRSdWxlIH0gZnJvbSAnLi4vLi4vY29uZmlnL21pc3JhLXJ1bGVzLWNvbmZpZyc7XHJcblxyXG5leHBvcnQgY2xhc3MgVmlvbGF0aW9uUmVwb3J0U2VydmljZSB7XHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYSBkZXRhaWxlZCB2aW9sYXRpb24gcmVwb3J0IGZyb20gYW5hbHlzaXMgcmVzdWx0c1xyXG4gICAqL1xyXG4gIGdlbmVyYXRlUmVwb3J0KFxyXG4gICAgYW5hbHlzaXNSZXN1bHQ6IEFuYWx5c2lzUmVzdWx0LFxyXG4gICAgb3B0aW9uczogUmVwb3J0T3B0aW9ucyA9IHt9XHJcbiAgKTogVmlvbGF0aW9uUmVwb3J0IHtcclxuICAgIGNvbnN0IHtcclxuICAgICAgaW5jbHVkZVN1bW1hcnkgPSB0cnVlLFxyXG4gICAgICBpbmNsdWRlUmVjb21tZW5kYXRpb25zID0gdHJ1ZSxcclxuICAgICAgZ3JvdXBCeVNldmVyaXR5ID0gdHJ1ZSxcclxuICAgICAgZ3JvdXBCeVJ1bGUgPSB0cnVlLFxyXG4gICAgICBzb3J0QnkgPSAnbGluZScsXHJcbiAgICAgIG1heFZpb2xhdGlvbnNQZXJSZXBvcnQgPSAwXHJcbiAgICB9ID0gb3B0aW9ucztcclxuXHJcbiAgICAvLyBTb3J0IHZpb2xhdGlvbnNcclxuICAgIGNvbnN0IHNvcnRlZFZpb2xhdGlvbnMgPSB0aGlzLnNvcnRWaW9sYXRpb25zKGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMsIHNvcnRCeSk7XHJcblxyXG4gICAgLy8gTGltaXQgdmlvbGF0aW9ucyBpZiBzcGVjaWZpZWRcclxuICAgIGNvbnN0IGxpbWl0ZWRWaW9sYXRpb25zID0gbWF4VmlvbGF0aW9uc1BlclJlcG9ydCA+IDBcclxuICAgICAgPyBzb3J0ZWRWaW9sYXRpb25zLnNsaWNlKDAsIG1heFZpb2xhdGlvbnNQZXJSZXBvcnQpXHJcbiAgICAgIDogc29ydGVkVmlvbGF0aW9ucztcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSBzdW1tYXJ5XHJcbiAgICBjb25zdCBzdW1tYXJ5ID0gaW5jbHVkZVN1bW1hcnlcclxuICAgICAgPyB0aGlzLmdlbmVyYXRlU3VtbWFyeShsaW1pdGVkVmlvbGF0aW9ucylcclxuICAgICAgOiB0aGlzLmdldEVtcHR5U3VtbWFyeSgpO1xyXG5cclxuICAgIC8vIEdyb3VwIHZpb2xhdGlvbnNcclxuICAgIGNvbnN0IHZpb2xhdGlvbnNCeVNldmVyaXR5ID0gZ3JvdXBCeVNldmVyaXR5XHJcbiAgICAgID8gdGhpcy5ncm91cEJ5U2V2ZXJpdHkobGltaXRlZFZpb2xhdGlvbnMpXHJcbiAgICAgIDogdGhpcy5nZXRFbXB0eUJ5U2V2ZXJpdHkoKTtcclxuXHJcbiAgICBjb25zdCB2aW9sYXRpb25zQnlSdWxlID0gZ3JvdXBCeVJ1bGVcclxuICAgICAgPyB0aGlzLmdyb3VwQnlSdWxlKGxpbWl0ZWRWaW9sYXRpb25zLCBhbmFseXNpc1Jlc3VsdC5ydWxlU2V0KVxyXG4gICAgICA6IFtdO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIHJlY29tbWVuZGF0aW9uc1xyXG4gICAgY29uc3QgcmVjb21tZW5kYXRpb25zID0gaW5jbHVkZVJlY29tbWVuZGF0aW9uc1xyXG4gICAgICA/IHRoaXMuZ2VuZXJhdGVSZWNvbW1lbmRhdGlvbnMoc3VtbWFyeSwgdmlvbGF0aW9uc0J5UnVsZSlcclxuICAgICAgOiBbXTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXBvcnRJZDogdXVpZHY0KCksXHJcbiAgICAgIGZpbGVJZDogYW5hbHlzaXNSZXN1bHQuZmlsZUlkLFxyXG4gICAgICBmaWxlTmFtZTogYW5hbHlzaXNSZXN1bHQuZmlsZU5hbWUsXHJcbiAgICAgIHJ1bGVTZXQ6IGFuYWx5c2lzUmVzdWx0LnJ1bGVTZXQsXHJcbiAgICAgIGdlbmVyYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICBzdW1tYXJ5LFxyXG4gICAgICB2aW9sYXRpb25zQnlTZXZlcml0eSxcclxuICAgICAgdmlvbGF0aW9uc0J5UnVsZSxcclxuICAgICAgYWxsVmlvbGF0aW9uczogbGltaXRlZFZpb2xhdGlvbnMsXHJcbiAgICAgIHJlY29tbWVuZGF0aW9uc1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGEgYmF0Y2ggcmVwb3J0IGZvciBtdWx0aXBsZSBmaWxlc1xyXG4gICAqL1xyXG4gIGdlbmVyYXRlQmF0Y2hSZXBvcnQoXHJcbiAgICBhbmFseXNpc1Jlc3VsdHM6IEFuYWx5c2lzUmVzdWx0W10sXHJcbiAgICBvcHRpb25zOiBSZXBvcnRPcHRpb25zID0ge31cclxuICApOiBCYXRjaFZpb2xhdGlvblJlcG9ydCB7XHJcbiAgICBjb25zdCBmaWxlUmVwb3J0cyA9IGFuYWx5c2lzUmVzdWx0cy5tYXAocmVzdWx0ID0+IFxyXG4gICAgICB0aGlzLmdlbmVyYXRlUmVwb3J0KHJlc3VsdCwgb3B0aW9ucylcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgdG90YWxWaW9sYXRpb25zID0gZmlsZVJlcG9ydHMucmVkdWNlKChzdW0sIHIpID0+IHN1bSArIHIuc3VtbWFyeS50b3RhbFZpb2xhdGlvbnMsIDApO1xyXG4gICAgY29uc3QgdG90YWxNYW5kYXRvcnkgPSBmaWxlUmVwb3J0cy5yZWR1Y2UoKHN1bSwgcikgPT4gc3VtICsgci5zdW1tYXJ5Lm1hbmRhdG9yeUNvdW50LCAwKTtcclxuICAgIGNvbnN0IHRvdGFsUmVxdWlyZWQgPSBmaWxlUmVwb3J0cy5yZWR1Y2UoKHN1bSwgcikgPT4gc3VtICsgci5zdW1tYXJ5LnJlcXVpcmVkQ291bnQsIDApO1xyXG4gICAgY29uc3QgdG90YWxBZHZpc29yeSA9IGZpbGVSZXBvcnRzLnJlZHVjZSgoc3VtLCByKSA9PiBzdW0gKyByLnN1bW1hcnkuYWR2aXNvcnlDb3VudCwgMCk7XHJcbiAgICBjb25zdCBmaWxlc1dpdGhWaW9sYXRpb25zID0gZmlsZVJlcG9ydHMuZmlsdGVyKHIgPT4gci5zdW1tYXJ5LnRvdGFsVmlvbGF0aW9ucyA+IDApLmxlbmd0aDtcclxuICAgIGNvbnN0IGZpbGVzV2l0aG91dFZpb2xhdGlvbnMgPSBmaWxlUmVwb3J0cy5maWx0ZXIociA9PiByLnN1bW1hcnkudG90YWxWaW9sYXRpb25zID09PSAwKS5sZW5ndGg7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVwb3J0SWQ6IHV1aWR2NCgpLFxyXG4gICAgICBnZW5lcmF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgdG90YWxGaWxlczogYW5hbHlzaXNSZXN1bHRzLmxlbmd0aCxcclxuICAgICAgZmlsZXNBbmFseXplZDogYW5hbHlzaXNSZXN1bHRzLmZpbHRlcihyID0+IHIuc3VjY2VzcykubGVuZ3RoLFxyXG4gICAgICBmaWxlUmVwb3J0cyxcclxuICAgICAgb3ZlcmFsbFN1bW1hcnk6IHtcclxuICAgICAgICB0b3RhbFZpb2xhdGlvbnMsXHJcbiAgICAgICAgdG90YWxNYW5kYXRvcnksXHJcbiAgICAgICAgdG90YWxSZXF1aXJlZCxcclxuICAgICAgICB0b3RhbEFkdmlzb3J5LFxyXG4gICAgICAgIGZpbGVzV2l0aFZpb2xhdGlvbnMsXHJcbiAgICAgICAgZmlsZXNXaXRob3V0VmlvbGF0aW9uc1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgc3VtbWFyeSBzdGF0aXN0aWNzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVN1bW1hcnkodmlvbGF0aW9uczogUnVsZVZpb2xhdGlvbltdKTogVmlvbGF0aW9uU3VtbWFyeSB7XHJcbiAgICBjb25zdCBtYW5kYXRvcnlDb3VudCA9IHZpb2xhdGlvbnMuZmlsdGVyKHYgPT4gdi5zZXZlcml0eSA9PT0gVmlvbGF0aW9uU2V2ZXJpdHkuTUFOREFUT1JZKS5sZW5ndGg7XHJcbiAgICBjb25zdCByZXF1aXJlZENvdW50ID0gdmlvbGF0aW9ucy5maWx0ZXIodiA9PiB2LnNldmVyaXR5ID09PSBWaW9sYXRpb25TZXZlcml0eS5SRVFVSVJFRCkubGVuZ3RoO1xyXG4gICAgY29uc3QgYWR2aXNvcnlDb3VudCA9IHZpb2xhdGlvbnMuZmlsdGVyKHYgPT4gdi5zZXZlcml0eSA9PT0gVmlvbGF0aW9uU2V2ZXJpdHkuQURWSVNPUlkpLmxlbmd0aDtcclxuXHJcbiAgICAvLyBDb3VudCB1bmlxdWUgcnVsZXMgdmlvbGF0ZWRcclxuICAgIGNvbnN0IHVuaXF1ZVJ1bGVzID0gbmV3IFNldCh2aW9sYXRpb25zLm1hcCh2ID0+IHYucnVsZUlkKSk7XHJcblxyXG4gICAgLy8gRmluZCBtb3N0IHZpb2xhdGVkIHJ1bGVcclxuICAgIGNvbnN0IHJ1bGVDb3VudHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG4gICAgdmlvbGF0aW9ucy5mb3JFYWNoKHYgPT4ge1xyXG4gICAgICBydWxlQ291bnRzLnNldCh2LnJ1bGVJZCwgKHJ1bGVDb3VudHMuZ2V0KHYucnVsZUlkKSB8fCAwKSArIDEpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgbGV0IG1vc3RWaW9sYXRlZFJ1bGU6IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gICAgbGV0IG1heENvdW50ID0gMDtcclxuICAgIHJ1bGVDb3VudHMuZm9yRWFjaCgoY291bnQsIHJ1bGVJZCkgPT4ge1xyXG4gICAgICBpZiAoY291bnQgPiBtYXhDb3VudCkge1xyXG4gICAgICAgIG1heENvdW50ID0gY291bnQ7XHJcbiAgICAgICAgbW9zdFZpb2xhdGVkUnVsZSA9IHJ1bGVJZDtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIGF2ZXJhZ2UgdmlvbGF0aW9ucyBwZXIgbGluZVxyXG4gICAgY29uc3QgdW5pcXVlTGluZXMgPSBuZXcgU2V0KHZpb2xhdGlvbnMubWFwKHYgPT4gdi5saW5lTnVtYmVyKSk7XHJcbiAgICBjb25zdCBhdmVyYWdlVmlvbGF0aW9uc1BlckxpbmUgPSB1bmlxdWVMaW5lcy5zaXplID4gMFxyXG4gICAgICA/IHZpb2xhdGlvbnMubGVuZ3RoIC8gdW5pcXVlTGluZXMuc2l6ZVxyXG4gICAgICA6IDA7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdG90YWxWaW9sYXRpb25zOiB2aW9sYXRpb25zLmxlbmd0aCxcclxuICAgICAgbWFuZGF0b3J5Q291bnQsXHJcbiAgICAgIHJlcXVpcmVkQ291bnQsXHJcbiAgICAgIGFkdmlzb3J5Q291bnQsXHJcbiAgICAgIHVuaXF1ZVJ1bGVzVmlvbGF0ZWQ6IHVuaXF1ZVJ1bGVzLnNpemUsXHJcbiAgICAgIG1vc3RWaW9sYXRlZFJ1bGUsXHJcbiAgICAgIGF2ZXJhZ2VWaW9sYXRpb25zUGVyTGluZTogTWF0aC5yb3VuZChhdmVyYWdlVmlvbGF0aW9uc1BlckxpbmUgKiAxMDApIC8gMTAwXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JvdXAgdmlvbGF0aW9ucyBieSBzZXZlcml0eVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ3JvdXBCeVNldmVyaXR5KHZpb2xhdGlvbnM6IFJ1bGVWaW9sYXRpb25bXSk6IFZpb2xhdGlvbnNCeVNldmVyaXR5IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG1hbmRhdG9yeTogdmlvbGF0aW9ucy5maWx0ZXIodiA9PiB2LnNldmVyaXR5ID09PSBWaW9sYXRpb25TZXZlcml0eS5NQU5EQVRPUlkpLFxyXG4gICAgICByZXF1aXJlZDogdmlvbGF0aW9ucy5maWx0ZXIodiA9PiB2LnNldmVyaXR5ID09PSBWaW9sYXRpb25TZXZlcml0eS5SRVFVSVJFRCksXHJcbiAgICAgIGFkdmlzb3J5OiB2aW9sYXRpb25zLmZpbHRlcih2ID0+IHYuc2V2ZXJpdHkgPT09IFZpb2xhdGlvblNldmVyaXR5LkFEVklTT1JZKVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyb3VwIHZpb2xhdGlvbnMgYnkgcnVsZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ3JvdXBCeVJ1bGUodmlvbGF0aW9uczogUnVsZVZpb2xhdGlvbltdLCBydWxlU2V0OiBNaXNyYVJ1bGVTZXQpOiBWaW9sYXRpb25zQnlSdWxlW10ge1xyXG4gICAgY29uc3QgcnVsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBSdWxlVmlvbGF0aW9uW10+KCk7XHJcblxyXG4gICAgdmlvbGF0aW9ucy5mb3JFYWNoKHZpb2xhdGlvbiA9PiB7XHJcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gcnVsZU1hcC5nZXQodmlvbGF0aW9uLnJ1bGVJZCkgfHwgW107XHJcbiAgICAgIGV4aXN0aW5nLnB1c2godmlvbGF0aW9uKTtcclxuICAgICAgcnVsZU1hcC5zZXQodmlvbGF0aW9uLnJ1bGVJZCwgZXhpc3RpbmcpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ3JvdXBlZDogVmlvbGF0aW9uc0J5UnVsZVtdID0gW107XHJcbiAgICBydWxlTWFwLmZvckVhY2goKHJ1bGVWaW9sYXRpb25zLCBydWxlSWQpID0+IHtcclxuICAgICAgY29uc3QgcnVsZSA9IGdldFJ1bGUocnVsZVNldCwgcnVsZUlkKTtcclxuICAgICAgZ3JvdXBlZC5wdXNoKHtcclxuICAgICAgICBydWxlSWQsXHJcbiAgICAgICAgcnVsZVRpdGxlOiBydWxlPy50aXRsZSB8fCAnVW5rbm93biBSdWxlJyxcclxuICAgICAgICBzZXZlcml0eTogcnVsZVZpb2xhdGlvbnNbMF0uc2V2ZXJpdHksXHJcbiAgICAgICAgY291bnQ6IHJ1bGVWaW9sYXRpb25zLmxlbmd0aCxcclxuICAgICAgICB2aW9sYXRpb25zOiBydWxlVmlvbGF0aW9uc1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNvcnQgYnkgY291bnQgKGRlc2NlbmRpbmcpXHJcbiAgICByZXR1cm4gZ3JvdXBlZC5zb3J0KChhLCBiKSA9PiBiLmNvdW50IC0gYS5jb3VudCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTb3J0IHZpb2xhdGlvbnMgYnkgc3BlY2lmaWVkIGNyaXRlcmlhXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzb3J0VmlvbGF0aW9ucyhcclxuICAgIHZpb2xhdGlvbnM6IFJ1bGVWaW9sYXRpb25bXSxcclxuICAgIHNvcnRCeTogJ2xpbmUnIHwgJ3NldmVyaXR5JyB8ICdydWxlJ1xyXG4gICk6IFJ1bGVWaW9sYXRpb25bXSB7XHJcbiAgICBjb25zdCBzb3J0ZWQgPSBbLi4udmlvbGF0aW9uc107XHJcblxyXG4gICAgc3dpdGNoIChzb3J0QnkpIHtcclxuICAgICAgY2FzZSAnbGluZSc6XHJcbiAgICAgICAgcmV0dXJuIHNvcnRlZC5zb3J0KChhLCBiKSA9PiBhLmxpbmVOdW1iZXIgLSBiLmxpbmVOdW1iZXIpO1xyXG4gICAgICBcclxuICAgICAgY2FzZSAnc2V2ZXJpdHknOlxyXG4gICAgICAgIGNvbnN0IHNldmVyaXR5T3JkZXIgPSB7XHJcbiAgICAgICAgICBbVmlvbGF0aW9uU2V2ZXJpdHkuTUFOREFUT1JZXTogMCxcclxuICAgICAgICAgIFtWaW9sYXRpb25TZXZlcml0eS5SRVFVSVJFRF06IDEsXHJcbiAgICAgICAgICBbVmlvbGF0aW9uU2V2ZXJpdHkuQURWSVNPUlldOiAyXHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gc29ydGVkLnNvcnQoKGEsIGIpID0+IHNldmVyaXR5T3JkZXJbYS5zZXZlcml0eV0gLSBzZXZlcml0eU9yZGVyW2Iuc2V2ZXJpdHldKTtcclxuICAgICAgXHJcbiAgICAgIGNhc2UgJ3J1bGUnOlxyXG4gICAgICAgIHJldHVybiBzb3J0ZWQuc29ydCgoYSwgYikgPT4gYS5ydWxlSWQubG9jYWxlQ29tcGFyZShiLnJ1bGVJZCkpO1xyXG4gICAgICBcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gc29ydGVkO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYWN0aW9uYWJsZSByZWNvbW1lbmRhdGlvbnMgYmFzZWQgb24gdmlvbGF0aW9uc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVSZWNvbW1lbmRhdGlvbnMoXHJcbiAgICBzdW1tYXJ5OiBWaW9sYXRpb25TdW1tYXJ5LFxyXG4gICAgdmlvbGF0aW9uc0J5UnVsZTogVmlvbGF0aW9uc0J5UnVsZVtdXHJcbiAgKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgcmVjb21tZW5kYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgIC8vIFByaW9yaXR5IHJlY29tbWVuZGF0aW9ucyBiYXNlZCBvbiBzZXZlcml0eVxyXG4gICAgaWYgKHN1bW1hcnkubWFuZGF0b3J5Q291bnQgPiAwKSB7XHJcbiAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKFxyXG4gICAgICAgIGBDUklUSUNBTDogQWRkcmVzcyAke3N1bW1hcnkubWFuZGF0b3J5Q291bnR9IG1hbmRhdG9yeSB2aW9sYXRpb24ocykgaW1tZWRpYXRlbHkuIGAgK1xyXG4gICAgICAgIGBUaGVzZSB2aW9sYXRpb25zIG11c3QgYmUgZml4ZWQgZm9yIE1JU1JBIGNvbXBsaWFuY2UuYFxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChzdW1tYXJ5LnJlcXVpcmVkQ291bnQgPiAwKSB7XHJcbiAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKFxyXG4gICAgICAgIGBISUdIIFBSSU9SSVRZOiBGaXggJHtzdW1tYXJ5LnJlcXVpcmVkQ291bnR9IHJlcXVpcmVkIHZpb2xhdGlvbihzKS4gYCArXHJcbiAgICAgICAgYFRoZXNlIGFyZSBzdHJvbmdseSByZWNvbW1lbmRlZCBmb3IgY29kZSBzYWZldHkgYW5kIHF1YWxpdHkuYFxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChzdW1tYXJ5LmFkdmlzb3J5Q291bnQgPiAwKSB7XHJcbiAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKFxyXG4gICAgICAgIGBBRFZJU09SWTogQ29uc2lkZXIgYWRkcmVzc2luZyAke3N1bW1hcnkuYWR2aXNvcnlDb3VudH0gYWR2aXNvcnkgdmlvbGF0aW9uKHMpIGAgK1xyXG4gICAgICAgIGB0byBpbXByb3ZlIGNvZGUgcXVhbGl0eSBhbmQgbWFpbnRhaW5hYmlsaXR5LmBcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBSZWNvbW1lbmRhdGlvbnMgZm9yIG1vc3QgdmlvbGF0ZWQgcnVsZXNcclxuICAgIGlmICh2aW9sYXRpb25zQnlSdWxlLmxlbmd0aCA+IDAgJiYgc3VtbWFyeS5tb3N0VmlvbGF0ZWRSdWxlKSB7XHJcbiAgICAgIGNvbnN0IHRvcFJ1bGUgPSB2aW9sYXRpb25zQnlSdWxlWzBdO1xyXG4gICAgICByZWNvbW1lbmRhdGlvbnMucHVzaChcclxuICAgICAgICBgRm9jdXMgb24gUnVsZSAke3RvcFJ1bGUucnVsZUlkfTogXCIke3RvcFJ1bGUucnVsZVRpdGxlfVwiIGAgK1xyXG4gICAgICAgIGB3aGljaCBoYXMgJHt0b3BSdWxlLmNvdW50fSB2aW9sYXRpb24ocykuIEZpeGluZyB0aGlzIHJ1bGUgd2lsbCBoYXZlIHRoZSBiaWdnZXN0IGltcGFjdC5gXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJhbCByZWNvbW1lbmRhdGlvbnNcclxuICAgIGlmIChzdW1tYXJ5LnRvdGFsVmlvbGF0aW9ucyA+IDUwKSB7XHJcbiAgICAgIHJlY29tbWVuZGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICdDb25zaWRlciBicmVha2luZyBkb3duIHRoZSBhbmFseXNpcyBpbnRvIHNtYWxsZXIgZmlsZXMgb3IgbW9kdWxlcyBmb3IgZWFzaWVyIHJlbWVkaWF0aW9uLidcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc3VtbWFyeS5hdmVyYWdlVmlvbGF0aW9uc1BlckxpbmUgPiAxLjUpIHtcclxuICAgICAgcmVjb21tZW5kYXRpb25zLnB1c2goXHJcbiAgICAgICAgJ011bHRpcGxlIHZpb2xhdGlvbnMgcGVyIGxpbmUgZGV0ZWN0ZWQuIFJldmlldyBjb2RlIHN0cnVjdHVyZSBhbmQgZm9ybWF0dGluZyBwcmFjdGljZXMuJ1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN1Y2Nlc3MgbWVzc2FnZSBpZiBubyB2aW9sYXRpb25zXHJcbiAgICBpZiAoc3VtbWFyeS50b3RhbFZpb2xhdGlvbnMgPT09IDApIHtcclxuICAgICAgcmVjb21tZW5kYXRpb25zLnB1c2goXHJcbiAgICAgICAgJ0V4Y2VsbGVudCEgTm8gTUlTUkEgdmlvbGF0aW9ucyBkZXRlY3RlZC4gQ29kZSBtZWV0cyBjb21wbGlhbmNlIHN0YW5kYXJkcy4nXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlY29tbWVuZGF0aW9ucztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZvcm1hdCByZXBvcnQgYXMgdGV4dFxyXG4gICAqL1xyXG4gIGZvcm1hdEFzVGV4dChyZXBvcnQ6IFZpb2xhdGlvblJlcG9ydCk6IHN0cmluZyB7XHJcbiAgICBsZXQgb3V0cHV0ID0gJyc7XHJcbiAgICBcclxuICAgIG91dHB1dCArPSBgTUlTUkEgVmlvbGF0aW9uIFJlcG9ydFxcbmA7XHJcbiAgICBvdXRwdXQgKz0gYCR7Jz0nLnJlcGVhdCg4MCl9XFxuXFxuYDtcclxuICAgIG91dHB1dCArPSBgRmlsZTogJHtyZXBvcnQuZmlsZU5hbWV9XFxuYDtcclxuICAgIG91dHB1dCArPSBgUnVsZSBTZXQ6ICR7cmVwb3J0LnJ1bGVTZXR9XFxuYDtcclxuICAgIG91dHB1dCArPSBgR2VuZXJhdGVkOiAke25ldyBEYXRlKHJlcG9ydC5nZW5lcmF0ZWRBdCkudG9JU09TdHJpbmcoKX1cXG5cXG5gO1xyXG5cclxuICAgIC8vIFN1bW1hcnlcclxuICAgIG91dHB1dCArPSBgU3VtbWFyeVxcbmA7XHJcbiAgICBvdXRwdXQgKz0gYCR7Jy0nLnJlcGVhdCg4MCl9XFxuYDtcclxuICAgIG91dHB1dCArPSBgVG90YWwgVmlvbGF0aW9uczogJHtyZXBvcnQuc3VtbWFyeS50b3RhbFZpb2xhdGlvbnN9XFxuYDtcclxuICAgIG91dHB1dCArPSBgICAtIE1hbmRhdG9yeTogJHtyZXBvcnQuc3VtbWFyeS5tYW5kYXRvcnlDb3VudH1cXG5gO1xyXG4gICAgb3V0cHV0ICs9IGAgIC0gUmVxdWlyZWQ6ICR7cmVwb3J0LnN1bW1hcnkucmVxdWlyZWRDb3VudH1cXG5gO1xyXG4gICAgb3V0cHV0ICs9IGAgIC0gQWR2aXNvcnk6ICR7cmVwb3J0LnN1bW1hcnkuYWR2aXNvcnlDb3VudH1cXG5gO1xyXG4gICAgb3V0cHV0ICs9IGBVbmlxdWUgUnVsZXMgVmlvbGF0ZWQ6ICR7cmVwb3J0LnN1bW1hcnkudW5pcXVlUnVsZXNWaW9sYXRlZH1cXG5cXG5gO1xyXG5cclxuICAgIC8vIFJlY29tbWVuZGF0aW9uc1xyXG4gICAgaWYgKHJlcG9ydC5yZWNvbW1lbmRhdGlvbnMubGVuZ3RoID4gMCkge1xyXG4gICAgICBvdXRwdXQgKz0gYFJlY29tbWVuZGF0aW9uc1xcbmA7XHJcbiAgICAgIG91dHB1dCArPSBgJHsnLScucmVwZWF0KDgwKX1cXG5gO1xyXG4gICAgICByZXBvcnQucmVjb21tZW5kYXRpb25zLmZvckVhY2goKHJlYywgaSkgPT4ge1xyXG4gICAgICAgIG91dHB1dCArPSBgJHtpICsgMX0uICR7cmVjfVxcbmA7XHJcbiAgICAgIH0pO1xyXG4gICAgICBvdXRwdXQgKz0gYFxcbmA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmlvbGF0aW9ucyBieSBydWxlXHJcbiAgICBpZiAocmVwb3J0LnZpb2xhdGlvbnNCeVJ1bGUubGVuZ3RoID4gMCkge1xyXG4gICAgICBvdXRwdXQgKz0gYFZpb2xhdGlvbnMgYnkgUnVsZVxcbmA7XHJcbiAgICAgIG91dHB1dCArPSBgJHsnLScucmVwZWF0KDgwKX1cXG5gO1xyXG4gICAgICByZXBvcnQudmlvbGF0aW9uc0J5UnVsZS5mb3JFYWNoKHJ1bGUgPT4ge1xyXG4gICAgICAgIG91dHB1dCArPSBgXFxuUnVsZSAke3J1bGUucnVsZUlkfTogJHtydWxlLnJ1bGVUaXRsZX0gKCR7cnVsZS5zZXZlcml0eX0pXFxuYDtcclxuICAgICAgICBvdXRwdXQgKz0gYENvdW50OiAke3J1bGUuY291bnR9XFxuYDtcclxuICAgICAgICBydWxlLnZpb2xhdGlvbnMuZm9yRWFjaCh2ID0+IHtcclxuICAgICAgICAgIG91dHB1dCArPSBgICBMaW5lICR7di5saW5lTnVtYmVyfTogJHt2Lm1lc3NhZ2V9XFxuYDtcclxuICAgICAgICAgIG91dHB1dCArPSBgICAgIENvZGU6ICR7di5jb2RlU25pcHBldH1cXG5gO1xyXG4gICAgICAgICAgb3V0cHV0ICs9IGAgICAgRml4OiAke3YucmVjb21tZW5kYXRpb259XFxuYDtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG91dHB1dDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZvcm1hdCByZXBvcnQgYXMgQ1NWXHJcbiAgICovXHJcbiAgZm9ybWF0QXNDU1YocmVwb3J0OiBWaW9sYXRpb25SZXBvcnQpOiBzdHJpbmcge1xyXG4gICAgbGV0IGNzdiA9ICdSdWxlIElELFNldmVyaXR5LExpbmUgTnVtYmVyLE1lc3NhZ2UsQ29kZSBTbmlwcGV0LFJlY29tbWVuZGF0aW9uXFxuJztcclxuICAgIFxyXG4gICAgcmVwb3J0LmFsbFZpb2xhdGlvbnMuZm9yRWFjaCh2ID0+IHtcclxuICAgICAgY29uc3Qgcm93ID0gW1xyXG4gICAgICAgIHYucnVsZUlkLFxyXG4gICAgICAgIHYuc2V2ZXJpdHksXHJcbiAgICAgICAgdi5saW5lTnVtYmVyLnRvU3RyaW5nKCksXHJcbiAgICAgICAgYFwiJHt2Lm1lc3NhZ2UucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImAsXHJcbiAgICAgICAgYFwiJHt2LmNvZGVTbmlwcGV0LnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgLFxyXG4gICAgICAgIGBcIiR7di5yZWNvbW1lbmRhdGlvbi5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYFxyXG4gICAgICBdO1xyXG4gICAgICBjc3YgKz0gcm93LmpvaW4oJywnKSArICdcXG4nO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGNzdjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEhlbHBlciBtZXRob2RzIGZvciBlbXB0eSBzdHJ1Y3R1cmVzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRFbXB0eVN1bW1hcnkoKTogVmlvbGF0aW9uU3VtbWFyeSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0b3RhbFZpb2xhdGlvbnM6IDAsXHJcbiAgICAgIG1hbmRhdG9yeUNvdW50OiAwLFxyXG4gICAgICByZXF1aXJlZENvdW50OiAwLFxyXG4gICAgICBhZHZpc29yeUNvdW50OiAwLFxyXG4gICAgICB1bmlxdWVSdWxlc1Zpb2xhdGVkOiAwLFxyXG4gICAgICBtb3N0VmlvbGF0ZWRSdWxlOiBudWxsLFxyXG4gICAgICBhdmVyYWdlVmlvbGF0aW9uc1BlckxpbmU6IDBcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldEVtcHR5QnlTZXZlcml0eSgpOiBWaW9sYXRpb25zQnlTZXZlcml0eSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBtYW5kYXRvcnk6IFtdLFxyXG4gICAgICByZXF1aXJlZDogW10sXHJcbiAgICAgIGFkdmlzb3J5OiBbXVxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuIl19
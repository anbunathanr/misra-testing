/**
 * Violation Report Service
 * Generates structured violation reports with detailed analysis
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ViolationReport,
  ViolationSummary,
  ViolationsBySeverity,
  ViolationsByRule,
  ReportOptions,
  BatchViolationReport,
  ReportFormat
} from '../../types/violation-report';
import { RuleViolation, MisraRuleSet, ViolationSeverity, AnalysisResult } from '../../types/misra-rules';
import { getRule } from '../../config/misra-rules-config';

export class ViolationReportService {
  /**
   * Generate a detailed violation report from analysis results
   */
  generateReport(
    analysisResult: AnalysisResult,
    options: ReportOptions = {}
  ): ViolationReport {
    const {
      includeSummary = true,
      includeRecommendations = true,
      groupBySeverity = true,
      groupByRule = true,
      sortBy = 'line',
      maxViolationsPerReport = 0
    } = options;

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
      reportId: uuidv4(),
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
  generateBatchReport(
    analysisResults: AnalysisResult[],
    options: ReportOptions = {}
  ): BatchViolationReport {
    const fileReports = analysisResults.map(result => 
      this.generateReport(result, options)
    );

    const totalViolations = fileReports.reduce((sum, r) => sum + r.summary.totalViolations, 0);
    const totalMandatory = fileReports.reduce((sum, r) => sum + r.summary.mandatoryCount, 0);
    const totalRequired = fileReports.reduce((sum, r) => sum + r.summary.requiredCount, 0);
    const totalAdvisory = fileReports.reduce((sum, r) => sum + r.summary.advisoryCount, 0);
    const filesWithViolations = fileReports.filter(r => r.summary.totalViolations > 0).length;
    const filesWithoutViolations = fileReports.filter(r => r.summary.totalViolations === 0).length;

    return {
      reportId: uuidv4(),
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
  private generateSummary(violations: RuleViolation[]): ViolationSummary {
    const mandatoryCount = violations.filter(v => v.severity === ViolationSeverity.MANDATORY).length;
    const requiredCount = violations.filter(v => v.severity === ViolationSeverity.REQUIRED).length;
    const advisoryCount = violations.filter(v => v.severity === ViolationSeverity.ADVISORY).length;

    // Count unique rules violated
    const uniqueRules = new Set(violations.map(v => v.ruleId));

    // Find most violated rule
    const ruleCounts = new Map<string, number>();
    violations.forEach(v => {
      ruleCounts.set(v.ruleId, (ruleCounts.get(v.ruleId) || 0) + 1);
    });

    let mostViolatedRule: string | null = null;
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
  private groupBySeverity(violations: RuleViolation[]): ViolationsBySeverity {
    return {
      mandatory: violations.filter(v => v.severity === ViolationSeverity.MANDATORY),
      required: violations.filter(v => v.severity === ViolationSeverity.REQUIRED),
      advisory: violations.filter(v => v.severity === ViolationSeverity.ADVISORY)
    };
  }

  /**
   * Group violations by rule
   */
  private groupByRule(violations: RuleViolation[], ruleSet: MisraRuleSet): ViolationsByRule[] {
    const ruleMap = new Map<string, RuleViolation[]>();

    violations.forEach(violation => {
      const existing = ruleMap.get(violation.ruleId) || [];
      existing.push(violation);
      ruleMap.set(violation.ruleId, existing);
    });

    const grouped: ViolationsByRule[] = [];
    ruleMap.forEach((ruleViolations, ruleId) => {
      const rule = getRule(ruleSet, ruleId);
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
  private sortViolations(
    violations: RuleViolation[],
    sortBy: 'line' | 'severity' | 'rule'
  ): RuleViolation[] {
    const sorted = [...violations];

    switch (sortBy) {
      case 'line':
        return sorted.sort((a, b) => a.lineNumber - b.lineNumber);
      
      case 'severity':
        const severityOrder = {
          [ViolationSeverity.MANDATORY]: 0,
          [ViolationSeverity.REQUIRED]: 1,
          [ViolationSeverity.ADVISORY]: 2
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
  private generateRecommendations(
    summary: ViolationSummary,
    violationsByRule: ViolationsByRule[]
  ): string[] {
    const recommendations: string[] = [];

    // Priority recommendations based on severity
    if (summary.mandatoryCount > 0) {
      recommendations.push(
        `CRITICAL: Address ${summary.mandatoryCount} mandatory violation(s) immediately. ` +
        `These violations must be fixed for MISRA compliance.`
      );
    }

    if (summary.requiredCount > 0) {
      recommendations.push(
        `HIGH PRIORITY: Fix ${summary.requiredCount} required violation(s). ` +
        `These are strongly recommended for code safety and quality.`
      );
    }

    if (summary.advisoryCount > 0) {
      recommendations.push(
        `ADVISORY: Consider addressing ${summary.advisoryCount} advisory violation(s) ` +
        `to improve code quality and maintainability.`
      );
    }

    // Recommendations for most violated rules
    if (violationsByRule.length > 0 && summary.mostViolatedRule) {
      const topRule = violationsByRule[0];
      recommendations.push(
        `Focus on Rule ${topRule.ruleId}: "${topRule.ruleTitle}" ` +
        `which has ${topRule.count} violation(s). Fixing this rule will have the biggest impact.`
      );
    }

    // General recommendations
    if (summary.totalViolations > 50) {
      recommendations.push(
        'Consider breaking down the analysis into smaller files or modules for easier remediation.'
      );
    }

    if (summary.averageViolationsPerLine > 1.5) {
      recommendations.push(
        'Multiple violations per line detected. Review code structure and formatting practices.'
      );
    }

    // Success message if no violations
    if (summary.totalViolations === 0) {
      recommendations.push(
        'Excellent! No MISRA violations detected. Code meets compliance standards.'
      );
    }

    return recommendations;
  }

  /**
   * Format report as text
   */
  formatAsText(report: ViolationReport): string {
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
  formatAsCSV(report: ViolationReport): string {
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
  private getEmptySummary(): ViolationSummary {
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

  private getEmptyBySeverity(): ViolationsBySeverity {
    return {
      mandatory: [],
      required: [],
      advisory: []
    };
  }
}

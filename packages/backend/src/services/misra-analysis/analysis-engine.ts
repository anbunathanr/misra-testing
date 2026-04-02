import { RuleEngine } from './rule-engine';
import { CodeParser } from './code-parser';
import { AnalysisResult, Violation, AnalysisSummary, AnalysisStatus, Language } from '../../types/misra-analysis';
import { v4 as uuidv4 } from 'uuid';

export class MISRAAnalysisEngine {
  private ruleEngine: RuleEngine;
  private parser: CodeParser;

  constructor() {
    this.ruleEngine = new RuleEngine();
    this.parser = new CodeParser();
  }

  async analyzeFile(
    fileContent: string,
    language: Language,
    fileId: string,
    userId: string
  ): Promise<AnalysisResult> {
    const analysisId = uuidv4();
    const startTime = Date.now();

    try {
      // Parse source code
      const ast = await this.parser.parse(fileContent, language);

      // Get applicable rules
      const rules = this.ruleEngine.getRulesForLanguage(language);

      // Check each rule and collect violations
      const violations: Violation[] = [];
      for (const rule of rules) {
        const ruleViolations = await rule.check(ast, fileContent);
        violations.push(...ruleViolations);
      }

      const summary = this.buildSummary(violations, rules.length);

      return {
        analysisId,
        fileId,
        userId,
        language,
        violations,
        summary,
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };
    } catch (error) {
      return {
        analysisId,
        fileId,
        userId,
        language,
        violations: [],
        summary: { totalViolations: 0, criticalCount: 0, majorCount: 0, minorCount: 0, compliancePercentage: 0 },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.FAILED,
      };
    }
  }

  private buildSummary(violations: Violation[], totalRules: number): AnalysisSummary {
    const criticalCount = violations.filter(v => v.severity === 'mandatory').length;
    const majorCount = violations.filter(v => v.severity === 'required').length;
    const minorCount = violations.filter(v => v.severity === 'advisory').length;
    const compliancePercentage = totalRules > 0
      ? ((totalRules - violations.length) / totalRules) * 100
      : 100;

    return {
      totalViolations: violations.length,
      criticalCount,
      majorCount,
      minorCount,
      compliancePercentage: Math.max(0, compliancePercentage),
    };
  }
}

import { RuleEngine } from './rule-engine';
import { CodeParser } from './code-parser';
import { AnalysisCache } from './analysis-cache';
import { AnalysisResult, Violation, AnalysisSummary, AnalysisStatus, Language } from '../../types/misra-analysis';
import { v4 as uuidv4 } from 'uuid';

export class MISRAAnalysisEngine {
  private ruleEngine: RuleEngine;
  private parser: CodeParser;
  private cache: AnalysisCache;

  constructor() {
    this.ruleEngine = new RuleEngine();
    this.parser = new CodeParser();
    this.cache = new AnalysisCache();
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
      // Hash file content for cache key (Requirement 10.7)
      const fileHash = AnalysisCache.hashFileContent(fileContent);
      console.log(`[AnalysisEngine] File hash: ${fileHash}`);

      // Check cache before analysis (Requirement 10.7)
      const cachedResult = await this.cache.getCachedResult(fileHash);
      if (cachedResult) {
        console.log(`[AnalysisEngine] Using cached analysis result`);
        console.log(`[AnalysisEngine] Cache hit saved ${Date.now() - startTime}ms`);
        
        // Return cached result with new IDs for this request
        return {
          ...cachedResult,
          analysisId, // New analysis ID for this request
          fileId,     // Current file ID
          userId,     // Current user ID
          createdAt: new Date().toISOString(), // Current timestamp
        };
      }

      console.log(`[AnalysisEngine] Cache miss - performing fresh analysis`);

      // Parse source code once (Requirement 10.2 - optimize AST traversal)
      const ast = await this.parser.parse(fileContent, language);

      // Get applicable rules
      const rules = this.ruleEngine.getRulesForLanguage(language);

      // Check rules in parallel using Promise.all() (Requirement 10.1)
      console.log(`[AnalysisEngine] Checking ${rules.length} rules in parallel`);
      const violationArrays = await Promise.all(
        rules.map(rule => rule.check(ast, fileContent))
      );

      // Flatten all violations into a single array
      const violations: Violation[] = violationArrays.flat();

      const summary = this.buildSummary(violations, rules.length);

      const result: AnalysisResult = {
        analysisId,
        fileId,
        userId,
        language,
        violations,
        summary,
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      // Store result in cache for future use (Requirement 10.7)
      await this.cache.setCachedResult(fileHash, result, userId, language);

      const duration = Date.now() - startTime;
      console.log(`[AnalysisEngine] Analysis completed in ${duration}ms`);

      return result;
    } catch (error) {
      console.error('[AnalysisEngine] Analysis failed:', error);
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

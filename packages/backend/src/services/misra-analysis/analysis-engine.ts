import { RuleEngine } from './rule-engine';
import { CodeParser } from './code-parser';
import { AnalysisCache } from './analysis-cache';
import { AnalysisResult, Violation, AnalysisSummary, AnalysisStatus, Language } from '../../types/misra-analysis';
import { v4 as uuidv4 } from 'uuid';

export interface AnalysisProgressCallback {
  (progress: number, message: string): Promise<void>;
}

export interface AnalysisOptions {
  progressCallback?: AnalysisProgressCallback;
  updateInterval?: number; // milliseconds between progress updates (default: 2000)
}

export class MISRAAnalysisEngine {
  private ruleEngine: RuleEngine;
  private parser: CodeParser;
  private cache: AnalysisCache;
  private readonly DEFAULT_UPDATE_INTERVAL = 2000; // 2 seconds

  constructor() {
    this.ruleEngine = new RuleEngine();
    this.parser = new CodeParser();
    this.cache = new AnalysisCache();
  }

  async analyzeFile(
    fileContent: string,
    language: Language,
    fileId: string,
    userId: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult> {
    const analysisId = uuidv4();
    const startTime = Date.now();
    const progressCallback = options?.progressCallback;
    const updateInterval = options?.updateInterval || this.DEFAULT_UPDATE_INTERVAL;

    try {
      // Report initial progress
      if (progressCallback) {
        await progressCallback(0, 'Starting MISRA compliance analysis...');
      }

      // Hash file content for cache key (Requirement 10.7)
      const fileHash = AnalysisCache.hashFileContent(fileContent);
      console.log(`[AnalysisEngine] File hash: ${fileHash}`);

      if (progressCallback) {
        await progressCallback(5, 'Checking analysis cache...');
      }

      // Check cache before analysis (Requirement 10.7)
      const cachedResult = await this.cache.getCachedResult(fileHash);
      if (cachedResult) {
        console.log(`[AnalysisEngine] Using cached analysis result`);
        console.log(`[AnalysisEngine] Cache hit saved ${Date.now() - startTime}ms`);
        
        if (progressCallback) {
          await progressCallback(100, 'Analysis completed (from cache)');
        }
        
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

      if (progressCallback) {
        await progressCallback(10, 'Parsing source code...');
      }

      // Parse source code once (Requirement 10.2 - optimize AST traversal)
      const ast = await this.parser.parse(fileContent, language);

      if (progressCallback) {
        await progressCallback(20, `Parsed ${language} source code successfully`);
      }

      // Get applicable rules
      const rules = this.ruleEngine.getRulesForLanguage(language);
      const totalRules = rules.length;

      if (progressCallback) {
        await progressCallback(25, `Evaluating ${totalRules} MISRA ${language} rules...`);
      }

      // Check rules with progress tracking (Requirement 3.3 - 2-second updates)
      console.log(`[AnalysisEngine] Checking ${totalRules} rules with progress tracking`);
      const violations: Violation[] = await this.checkRulesWithProgress(
        rules,
        ast,
        fileContent,
        progressCallback,
        updateInterval
      );

      if (progressCallback) {
        await progressCallback(90, 'Generating compliance report...');
      }

      const summary = this.buildSummary(violations, totalRules);

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

      if (progressCallback) {
        await progressCallback(95, 'Caching analysis results...');
      }

      // Store result in cache for future use (Requirement 10.7)
      await this.cache.setCachedResult(fileHash, result, userId, language);

      const duration = Date.now() - startTime;
      console.log(`[AnalysisEngine] Analysis completed in ${duration}ms`);

      if (progressCallback) {
        await progressCallback(100, `Analysis completed: ${summary.compliancePercentage.toFixed(1)}% compliance`);
      }

      return result;
    } catch (error) {
      console.error('[AnalysisEngine] Analysis failed:', error);
      
      if (progressCallback) {
        await progressCallback(0, `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
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

  /**
   * Check rules with progress tracking and periodic updates
   * Requirements: 3.3 (2-second progress updates)
   */
  private async checkRulesWithProgress(
    rules: any[],
    ast: any,
    fileContent: string,
    progressCallback?: AnalysisProgressCallback,
    updateInterval: number = 2000
  ): Promise<Violation[]> {
    const totalRules = rules.length;
    const violations: Violation[] = [];
    let completedRules = 0;
    let lastUpdateTime = Date.now();

    // Process rules in batches for better progress granularity
    const batchSize = Math.max(1, Math.floor(totalRules / 10)); // 10 progress updates
    
    for (let i = 0; i < totalRules; i += batchSize) {
      const batch = rules.slice(i, Math.min(i + batchSize, totalRules));
      
      // Process batch in parallel
      const batchViolations = await Promise.all(
        batch.map(rule => rule.check(ast, fileContent))
      );
      
      // Flatten and collect violations
      violations.push(...batchViolations.flat());
      
      completedRules += batch.length;
      const progress = 25 + Math.floor((completedRules / totalRules) * 65); // 25-90% range
      
      // Update progress if enough time has passed (2-second intervals)
      const now = Date.now();
      if (progressCallback && (now - lastUpdateTime >= updateInterval || completedRules === totalRules)) {
        const message = `Evaluating rules: ${completedRules}/${totalRules} completed`;
        await progressCallback(progress, message);
        lastUpdateTime = now;
      }
    }

    return violations;
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

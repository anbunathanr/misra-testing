import { RuleEngine } from './rule-engine';
import { CodeParser } from './code-parser';
import { AnalysisCache } from './analysis-cache';
import { AnalysisResult, Violation, AnalysisSummary, AnalysisStatus, Language } from '../../types/misra-analysis';
import { progressTrackingService } from '../progress-tracking';
import { v4 as uuidv4 } from 'uuid';

export interface AnalysisProgressCallback {
  (progress: number, message: string): Promise<void>;
}

export interface AnalysisOptions {
  progressCallback?: AnalysisProgressCallback;
  updateInterval?: number; // milliseconds between progress updates (default: 2000)
  workflowId?: string; // For integration with progress tracking service
  enableRealTimeProgress?: boolean; // Enable detailed rule-by-rule progress
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
    
    // Load MISRA rules during initialization
    this.ruleEngine.loadRules();
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
    const workflowId = options?.workflowId;
    const enableRealTimeProgress = options?.enableRealTimeProgress ?? false;

    try {
      // Report initial progress
      if (progressCallback) {
        await progressCallback(0, 'Starting MISRA compliance analysis...');
      }

      // Update workflow progress if workflowId provided
      if (workflowId) {
        progressTrackingService.updateStepProgress(
          workflowId,
          3, // Analysis step
          'MISRA Analysis',
          0,
          'Starting MISRA compliance analysis...'
        );
      }

      // Hash file content for cache key (Requirement 10.7)
      const fileHash = AnalysisCache.hashFileContent(fileContent);
      console.log(`[AnalysisEngine] File hash: ${fileHash}`);

      if (progressCallback) {
        await progressCallback(5, 'Checking analysis cache...');
      }

      if (workflowId) {
        progressTrackingService.updateStepProgress(
          workflowId,
          3,
          'MISRA Analysis',
          5,
          'Checking analysis cache...'
        );
      }

      // Check cache before analysis (Requirement 10.7)
      const cachedResult = await this.cache.getCachedResult(fileHash);
      if (cachedResult) {
        console.log(`[AnalysisEngine] Using cached analysis result`);
        console.log(`[AnalysisEngine] Cache hit saved ${Date.now() - startTime}ms`);
        
        if (progressCallback) {
          await progressCallback(100, 'Analysis completed (from cache)');
        }

        if (workflowId) {
          progressTrackingService.updateStepProgress(
            workflowId,
            3,
            'MISRA Analysis',
            100,
            'Analysis completed (from cache)',
            {
              cached: true,
              compliancePercentage: cachedResult.summary.compliancePercentage,
              violationCount: cachedResult.violations.length
            }
          );
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

      if (workflowId) {
        progressTrackingService.updateStepProgress(
          workflowId,
          3,
          'MISRA Analysis',
          10,
          'Parsing source code...'
        );
      }

      // Parse source code once (Requirement 10.2 - optimize AST traversal)
      const ast = await this.parser.parse(fileContent, language);

      if (progressCallback) {
        await progressCallback(20, `Parsed ${language} source code successfully`);
      }

      if (workflowId) {
        progressTrackingService.updateStepProgress(
          workflowId,
          3,
          'MISRA Analysis',
          20,
          `Parsed ${language} source code successfully`
        );
      }

      // Get applicable rules
      const rules = this.ruleEngine.getRulesForLanguage(language);
      const totalRules = rules.length;

      if (progressCallback) {
        await progressCallback(25, `Evaluating ${totalRules} MISRA ${language} rules...`);
      }

      if (workflowId) {
        progressTrackingService.updateStepProgress(
          workflowId,
          3,
          'MISRA Analysis',
          25,
          `Evaluating ${totalRules} MISRA ${language} rules...`,
          {
            totalRules,
            rulesProcessed: 0
          }
        );
      }

      // Check rules with progress tracking (Requirement 3.3 - 2-second updates)
      console.log(`[AnalysisEngine] Checking ${totalRules} rules with progress tracking`);
      const violations: Violation[] = await this.checkRulesWithProgress(
        rules,
        ast,
        fileContent,
        progressCallback,
        updateInterval,
        workflowId,
        enableRealTimeProgress
      );

      if (progressCallback) {
        await progressCallback(90, 'Generating compliance report...');
      }

      if (workflowId) {
        progressTrackingService.updateStepProgress(
          workflowId,
          3,
          'MISRA Analysis',
          90,
          'Generating compliance report...'
        );
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

      if (workflowId) {
        progressTrackingService.updateStepProgress(
          workflowId,
          3,
          'MISRA Analysis',
          95,
          'Caching analysis results...'
        );
      }

      // Store result in cache for future use (Requirement 10.7)
      await this.cache.setCachedResult(fileHash, result, userId, language);

      const duration = Date.now() - startTime;
      console.log(`[AnalysisEngine] Analysis completed in ${duration}ms`);

      if (progressCallback) {
        await progressCallback(100, `Analysis completed: ${summary.compliancePercentage.toFixed(1)}% compliance`);
      }

      if (workflowId) {
        progressTrackingService.updateStepProgress(
          workflowId,
          3,
          'MISRA Analysis',
          100,
          `Analysis completed: ${summary.compliancePercentage.toFixed(1)}% compliance`,
          {
            compliancePercentage: summary.compliancePercentage,
            violationCount: violations.length,
            executionTime: duration,
            rulesProcessed: totalRules,
            totalRules
          }
        );
      }

      return result;
    } catch (error) {
      console.error('[AnalysisEngine] Analysis failed:', error);
      
      if (progressCallback) {
        await progressCallback(0, `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      if (workflowId) {
        progressTrackingService.handleWorkflowError(
          workflowId,
          3,
          'MISRA Analysis',
          error instanceof Error ? error.message : 'Unknown error'
        );
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
    updateInterval: number = 2000,
    workflowId?: string,
    enableRealTimeProgress: boolean = false
  ): Promise<Violation[]> {
    const totalRules = rules.length;
    const violations: Violation[] = [];
    let completedRules = 0;
    let lastUpdateTime = Date.now();

    console.log(`[AnalysisEngine] ✅ Starting rule checking: ${totalRules} rules to process`);
    console.log(`[AnalysisEngine] Rules loaded: ${rules.map((r: any) => r.id).join(', ')}`);

    // Process rules in batches for better progress granularity
    const batchSize = enableRealTimeProgress ? 1 : Math.max(1, Math.floor(totalRules / 10)); // 10 progress updates or rule-by-rule
    
    for (let i = 0; i < totalRules; i += batchSize) {
      const batch = rules.slice(i, Math.min(i + batchSize, totalRules));
      
      // Process batch in parallel (or sequentially for real-time progress)
      let batchViolations: Violation[][];
      
      if (enableRealTimeProgress && workflowId) {
        // Process rules one by one for detailed progress
        batchViolations = [];
        for (const rule of batch) {
          try {
            console.log(`[AnalysisEngine] 🔍 Checking rule: ${rule.id}`);
            const ruleViolations = await rule.check(ast, fileContent);
            console.log(`[AnalysisEngine] ✅ Rule ${rule.id} found ${ruleViolations.length} violations`);
            batchViolations.push(ruleViolations);
            
            completedRules++;
            
            // Update progress for each rule when in real-time mode
            progressTrackingService.updateAnalysisProgress(
              workflowId,
              completedRules,
              totalRules,
              rule.id || `Rule ${completedRules}`,
              Math.max(0, Math.round((totalRules - completedRules) * 0.15))
            );
            
            // Small delay to make progress visible in demonstrations
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (ruleError) {
            console.error(`[AnalysisEngine] ❌ Error checking rule ${rule.id}:`, ruleError);
            batchViolations.push([]);
            completedRules++;
          }
        }
      } else {
        // Process batch in parallel for faster execution
        batchViolations = await Promise.all(
          batch.map(async (rule) => {
            try {
              console.log(`[AnalysisEngine] 🔍 Checking rule: ${rule.id}`);
              const ruleViolations = await rule.check(ast, fileContent);
              console.log(`[AnalysisEngine] ✅ Rule ${rule.id} found ${ruleViolations.length} violations`);
              return ruleViolations;
            } catch (ruleError) {
              console.error(`[AnalysisEngine] ❌ Error checking rule ${rule.id}:`, ruleError);
              return [];
            }
          })
        );
        completedRules += batch.length;
      }
      
      // Flatten and collect violations
      const batchViolationsList = batchViolations.flat();
      violations.push(...batchViolationsList);
      console.log(`[AnalysisEngine] 📊 Batch complete: ${completedRules}/${totalRules} rules processed, ${violations.length} total violations found`);
      
      const progress = 25 + Math.floor((completedRules / totalRules) * 65); // 25-90% range
      
      // Update progress if enough time has passed (2-second intervals) or in real-time mode
      const now = Date.now();
      if (progressCallback && (now - lastUpdateTime >= updateInterval || completedRules === totalRules || enableRealTimeProgress)) {
        const message = `Evaluating rules: ${completedRules}/${totalRules} completed, ${violations.length} violations found`;
        console.log(`[AnalysisEngine] 📈 Progress callback: ${progress}% - ${message}`);
        await progressCallback(progress, message);
        lastUpdateTime = now;
      }

      // Update workflow progress for non-real-time mode
      if (workflowId && !enableRealTimeProgress && (now - lastUpdateTime >= updateInterval || completedRules === totalRules)) {
        console.log(`[AnalysisEngine] 📈 Workflow progress: ${completedRules}/${totalRules} rules`);
        progressTrackingService.updateAnalysisProgress(
          workflowId,
          completedRules,
          totalRules,
          '',
          Math.max(0, Math.round((totalRules - completedRules) * 0.15))
        );
      }
    }

    console.log(`[AnalysisEngine] ✅ Rule checking complete: ${completedRules}/${totalRules} rules processed, ${violations.length} total violations found`);
    return violations;
  }

  private buildSummary(violations: Violation[], totalRules: number): AnalysisSummary {
    const criticalCount = violations.filter(v => v.severity === 'mandatory').length;
    const majorCount = violations.filter(v => v.severity === 'required').length;
    const minorCount = violations.filter(v => v.severity === 'advisory').length;
    
    // Compliance calculation based on actual violations found:
    // - Zero violations = 100% compliance
    // - Violations reduce score proportionally based on severity
    let compliancePercentage: number;
    
    if (violations.length === 0) {
      // Perfect compliance when no violations found
      compliancePercentage = 100;
    } else {
      // Calculate weighted penalty based on violation severity
      // Each violation type has different impact on compliance
      const criticalPenalty = criticalCount * 10; // Mandatory violations: 10% each
      const majorPenalty = majorCount * 5;        // Required violations: 5% each
      const minorPenalty = minorCount * 1;        // Advisory violations: 1% each
      
      const totalPenalty = criticalPenalty + majorPenalty + minorPenalty;
      
      // Compliance score = 100 - total penalty, with minimum of 0%
      compliancePercentage = Math.max(0, 100 - totalPenalty);
    }

    return {
      totalViolations: violations.length,
      criticalCount,
      majorCount,
      minorCount,
      compliancePercentage: Math.round(compliancePercentage * 100) / 100, // Round to 2 decimal places
    };
  }
}

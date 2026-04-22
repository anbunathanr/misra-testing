"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MISRAAnalysisEngine = void 0;
const rule_engine_1 = require("./rule-engine");
const code_parser_1 = require("./code-parser");
const analysis_cache_1 = require("./analysis-cache");
const misra_analysis_1 = require("../../types/misra-analysis");
const progress_tracking_1 = require("../progress-tracking");
const uuid_1 = require("uuid");
class MISRAAnalysisEngine {
    ruleEngine;
    parser;
    cache;
    DEFAULT_UPDATE_INTERVAL = 2000; // 2 seconds
    constructor() {
        this.ruleEngine = new rule_engine_1.RuleEngine();
        this.parser = new code_parser_1.CodeParser();
        this.cache = new analysis_cache_1.AnalysisCache();
        // Load MISRA rules during initialization
        this.ruleEngine.loadRules();
    }
    async analyzeFile(fileContent, language, fileId, userId, options) {
        const analysisId = (0, uuid_1.v4)();
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
                progress_tracking_1.progressTrackingService.updateStepProgress(workflowId, 3, // Analysis step
                'MISRA Analysis', 0, 'Starting MISRA compliance analysis...');
            }
            // Hash file content for cache key (Requirement 10.7)
            const fileHash = analysis_cache_1.AnalysisCache.hashFileContent(fileContent);
            console.log(`[AnalysisEngine] File hash: ${fileHash}`);
            if (progressCallback) {
                await progressCallback(5, 'Checking analysis cache...');
            }
            if (workflowId) {
                progress_tracking_1.progressTrackingService.updateStepProgress(workflowId, 3, 'MISRA Analysis', 5, 'Checking analysis cache...');
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
                    progress_tracking_1.progressTrackingService.updateStepProgress(workflowId, 3, 'MISRA Analysis', 100, 'Analysis completed (from cache)', {
                        cached: true,
                        compliancePercentage: cachedResult.summary.compliancePercentage,
                        violationCount: cachedResult.violations.length
                    });
                }
                // Return cached result with new IDs for this request
                return {
                    ...cachedResult,
                    analysisId, // New analysis ID for this request
                    fileId, // Current file ID
                    userId, // Current user ID
                    createdAt: new Date().toISOString(), // Current timestamp
                };
            }
            console.log(`[AnalysisEngine] Cache miss - performing fresh analysis`);
            if (progressCallback) {
                await progressCallback(10, 'Parsing source code...');
            }
            if (workflowId) {
                progress_tracking_1.progressTrackingService.updateStepProgress(workflowId, 3, 'MISRA Analysis', 10, 'Parsing source code...');
            }
            // Parse source code once (Requirement 10.2 - optimize AST traversal)
            const ast = await this.parser.parse(fileContent, language);
            if (progressCallback) {
                await progressCallback(20, `Parsed ${language} source code successfully`);
            }
            if (workflowId) {
                progress_tracking_1.progressTrackingService.updateStepProgress(workflowId, 3, 'MISRA Analysis', 20, `Parsed ${language} source code successfully`);
            }
            // Get applicable rules
            const rules = this.ruleEngine.getRulesForLanguage(language);
            const totalRules = rules.length;
            if (progressCallback) {
                await progressCallback(25, `Evaluating ${totalRules} MISRA ${language} rules...`);
            }
            if (workflowId) {
                progress_tracking_1.progressTrackingService.updateStepProgress(workflowId, 3, 'MISRA Analysis', 25, `Evaluating ${totalRules} MISRA ${language} rules...`, {
                    totalRules,
                    rulesProcessed: 0
                });
            }
            // Check rules with progress tracking (Requirement 3.3 - 2-second updates)
            console.log(`[AnalysisEngine] Checking ${totalRules} rules with progress tracking`);
            const violations = await this.checkRulesWithProgress(rules, ast, fileContent, progressCallback, updateInterval, workflowId, enableRealTimeProgress);
            if (progressCallback) {
                await progressCallback(90, 'Generating compliance report...');
            }
            if (workflowId) {
                progress_tracking_1.progressTrackingService.updateStepProgress(workflowId, 3, 'MISRA Analysis', 90, 'Generating compliance report...');
            }
            const summary = this.buildSummary(violations, totalRules);
            const result = {
                analysisId,
                fileId,
                userId,
                language,
                violations,
                summary,
                createdAt: new Date().toISOString(),
                status: misra_analysis_1.AnalysisStatus.COMPLETED,
            };
            if (progressCallback) {
                await progressCallback(95, 'Caching analysis results...');
            }
            if (workflowId) {
                progress_tracking_1.progressTrackingService.updateStepProgress(workflowId, 3, 'MISRA Analysis', 95, 'Caching analysis results...');
            }
            // Store result in cache for future use (Requirement 10.7)
            await this.cache.setCachedResult(fileHash, result, userId, language);
            const duration = Date.now() - startTime;
            console.log(`[AnalysisEngine] Analysis completed in ${duration}ms`);
            if (progressCallback) {
                await progressCallback(100, `Analysis completed: ${summary.compliancePercentage.toFixed(1)}% compliance`);
            }
            if (workflowId) {
                progress_tracking_1.progressTrackingService.updateStepProgress(workflowId, 3, 'MISRA Analysis', 100, `Analysis completed: ${summary.compliancePercentage.toFixed(1)}% compliance`, {
                    compliancePercentage: summary.compliancePercentage,
                    violationCount: violations.length,
                    executionTime: duration,
                    rulesProcessed: totalRules,
                    totalRules
                });
            }
            return result;
        }
        catch (error) {
            console.error('[AnalysisEngine] Analysis failed:', error);
            if (progressCallback) {
                await progressCallback(0, `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            if (workflowId) {
                progress_tracking_1.progressTrackingService.handleWorkflowError(workflowId, 3, 'MISRA Analysis', error instanceof Error ? error.message : 'Unknown error');
            }
            return {
                analysisId,
                fileId,
                userId,
                language,
                violations: [],
                summary: { totalViolations: 0, criticalCount: 0, majorCount: 0, minorCount: 0, compliancePercentage: 0 },
                createdAt: new Date().toISOString(),
                status: misra_analysis_1.AnalysisStatus.FAILED,
            };
        }
    }
    /**
     * Check rules with progress tracking and periodic updates
     * Requirements: 3.3 (2-second progress updates)
     */
    async checkRulesWithProgress(rules, ast, fileContent, progressCallback, updateInterval = 2000, workflowId, enableRealTimeProgress = false) {
        const totalRules = rules.length;
        const violations = [];
        let completedRules = 0;
        let lastUpdateTime = Date.now();
        // Process rules in batches for better progress granularity
        const batchSize = enableRealTimeProgress ? 1 : Math.max(1, Math.floor(totalRules / 10)); // 10 progress updates or rule-by-rule
        for (let i = 0; i < totalRules; i += batchSize) {
            const batch = rules.slice(i, Math.min(i + batchSize, totalRules));
            // Process batch in parallel (or sequentially for real-time progress)
            let batchViolations;
            if (enableRealTimeProgress && workflowId) {
                // Process rules one by one for detailed progress
                batchViolations = [];
                for (const rule of batch) {
                    const ruleViolations = await rule.check(ast, fileContent);
                    batchViolations.push(ruleViolations);
                    completedRules++;
                    // Update progress for each rule when in real-time mode
                    progress_tracking_1.progressTrackingService.updateAnalysisProgress(workflowId, completedRules, totalRules, rule.id || `Rule ${completedRules}`, Math.max(0, Math.round((totalRules - completedRules) * 0.15)));
                    // Small delay to make progress visible in demonstrations
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            else {
                // Process batch in parallel for faster execution
                batchViolations = await Promise.all(batch.map(rule => rule.check(ast, fileContent)));
                completedRules += batch.length;
            }
            // Flatten and collect violations
            violations.push(...batchViolations.flat());
            const progress = 25 + Math.floor((completedRules / totalRules) * 65); // 25-90% range
            // Update progress if enough time has passed (2-second intervals) or in real-time mode
            const now = Date.now();
            if (progressCallback && (now - lastUpdateTime >= updateInterval || completedRules === totalRules || enableRealTimeProgress)) {
                const message = `Evaluating rules: ${completedRules}/${totalRules} completed`;
                await progressCallback(progress, message);
                lastUpdateTime = now;
            }
            // Update workflow progress for non-real-time mode
            if (workflowId && !enableRealTimeProgress && (now - lastUpdateTime >= updateInterval || completedRules === totalRules)) {
                progress_tracking_1.progressTrackingService.updateAnalysisProgress(workflowId, completedRules, totalRules, '', Math.max(0, Math.round((totalRules - completedRules) * 0.15)));
            }
        }
        return violations;
    }
    buildSummary(violations, totalRules) {
        const criticalCount = violations.filter(v => v.severity === 'mandatory').length;
        const majorCount = violations.filter(v => v.severity === 'required').length;
        const minorCount = violations.filter(v => v.severity === 'advisory').length;
        // Compliance calculation based on actual violations found:
        // - Zero violations = 100% compliance
        // - Violations reduce score proportionally based on severity
        let compliancePercentage;
        if (violations.length === 0) {
            // Perfect compliance when no violations found
            compliancePercentage = 100;
        }
        else {
            // Calculate weighted penalty based on violation severity
            // Each violation type has different impact on compliance
            const criticalPenalty = criticalCount * 10; // Mandatory violations: 10% each
            const majorPenalty = majorCount * 5; // Required violations: 5% each
            const minorPenalty = minorCount * 1; // Advisory violations: 1% each
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
exports.MISRAAnalysisEngine = MISRAAnalysisEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtZW5naW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHlzaXMtZW5naW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUEyQztBQUMzQywrQ0FBMkM7QUFDM0MscURBQWlEO0FBQ2pELCtEQUFrSDtBQUNsSCw0REFBK0Q7QUFDL0QsK0JBQW9DO0FBYXBDLE1BQWEsbUJBQW1CO0lBQ3RCLFVBQVUsQ0FBYTtJQUN2QixNQUFNLENBQWE7SUFDbkIsS0FBSyxDQUFnQjtJQUNaLHVCQUF1QixHQUFHLElBQUksQ0FBQyxDQUFDLFlBQVk7SUFFN0Q7UUFDRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLDhCQUFhLEVBQUUsQ0FBQztRQUVqQyx5Q0FBeUM7UUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FDZixXQUFtQixFQUNuQixRQUFrQixFQUNsQixNQUFjLEVBQ2QsTUFBYyxFQUNkLE9BQXlCO1FBRXpCLE1BQU0sVUFBVSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFDNUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzdCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxFQUFFLGdCQUFnQixDQUFDO1FBQ25ELE1BQU0sY0FBYyxHQUFHLE9BQU8sRUFBRSxjQUFjLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDO1FBQy9FLE1BQU0sVUFBVSxHQUFHLE9BQU8sRUFBRSxVQUFVLENBQUM7UUFDdkMsTUFBTSxzQkFBc0IsR0FBRyxPQUFPLEVBQUUsc0JBQXNCLElBQUksS0FBSyxDQUFDO1FBRXhFLElBQUksQ0FBQztZQUNILDBCQUEw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QVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFFNUUsMkRBQTJEO1FBQzNELHNDQUFzQztRQUN0Qyw2REFBNkQ7UUFDN0QsSUFBSSxvQkFBNEIsQ0FBQztRQUVqQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsOENBQThDO1lBQzlDLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztRQUM3QixDQUFDO2FBQU0sQ0FBQztZQUNOLHlEQUF5RDtZQUN6RCx5REFBeUQ7WUFDekQsTUFBTSxlQUFlLEdBQUcsYUFBYSxHQUFHLEVBQUUsQ0FBQyxDQUFDLGlDQUFpQztZQUM3RSxNQUFNLFlBQVksR0FBRyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQVEsK0JBQStCO1lBQzNFLE1BQU0sWUFBWSxHQUFHLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBUSwrQkFBK0I7WUFFM0UsTUFBTSxZQUFZLEdBQUcsZUFBZSxHQUFHLFlBQVksR0FBRyxZQUFZLENBQUM7WUFFbkUsNkRBQTZEO1lBQzdELG9CQUFvQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBRUQsT0FBTztZQUNMLGVBQWUsRUFBRSxVQUFVLENBQUMsTUFBTTtZQUNsQyxhQUFhO1lBQ2IsVUFBVTtZQUNWLFVBQVU7WUFDVixvQkFBb0IsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSw0QkFBNEI7U0FDakcsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTlYRCxrREE4WEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSdWxlRW5naW5lIH0gZnJvbSAnLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IENvZGVQYXJzZXIgfSBmcm9tICcuL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgQW5hbHlzaXNDYWNoZSB9IGZyb20gJy4vYW5hbHlzaXMtY2FjaGUnO1xyXG5pbXBvcnQgeyBBbmFseXNpc1Jlc3VsdCwgVmlvbGF0aW9uLCBBbmFseXNpc1N1bW1hcnksIEFuYWx5c2lzU3RhdHVzLCBMYW5ndWFnZSB9IGZyb20gJy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuaW1wb3J0IHsgcHJvZ3Jlc3NUcmFja2luZ1NlcnZpY2UgfSBmcm9tICcuLi9wcm9ncmVzcy10cmFja2luZyc7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBbmFseXNpc1Byb2dyZXNzQ2FsbGJhY2sge1xyXG4gIChwcm9ncmVzczogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5c2lzT3B0aW9ucyB7XHJcbiAgcHJvZ3Jlc3NDYWxsYmFjaz86IEFuYWx5c2lzUHJvZ3Jlc3NDYWxsYmFjaztcclxuICB1cGRhdGVJbnRlcnZhbD86IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzIGJldHdlZW4gcHJvZ3Jlc3MgdXBkYXRlcyAoZGVmYXVsdDogMjAwMClcclxuICB3b3JrZmxvd0lkPzogc3RyaW5nOyAvLyBGb3IgaW50ZWdyYXRpb24gd2l0aCBwcm9ncmVzcyB0cmFja2luZyBzZXJ2aWNlXHJcbiAgZW5hYmxlUmVhbFRpbWVQcm9ncmVzcz86IGJvb2xlYW47IC8vIEVuYWJsZSBkZXRhaWxlZCBydWxlLWJ5LXJ1bGUgcHJvZ3Jlc3NcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1JU1JBQW5hbHlzaXNFbmdpbmUge1xyXG4gIHByaXZhdGUgcnVsZUVuZ2luZTogUnVsZUVuZ2luZTtcclxuICBwcml2YXRlIHBhcnNlcjogQ29kZVBhcnNlcjtcclxuICBwcml2YXRlIGNhY2hlOiBBbmFseXNpc0NhY2hlO1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgREVGQVVMVF9VUERBVEVfSU5URVJWQUwgPSAyMDAwOyAvLyAyIHNlY29uZHNcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnJ1bGVFbmdpbmUgPSBuZXcgUnVsZUVuZ2luZSgpO1xyXG4gICAgdGhpcy5wYXJzZXIgPSBuZXcgQ29kZVBhcnNlcigpO1xyXG4gICAgdGhpcy5jYWNoZSA9IG5ldyBBbmFseXNpc0NhY2hlKCk7XHJcbiAgICBcclxuICAgIC8vIExvYWQgTUlTUkEgcnVsZXMgZHVyaW5nIGluaXRpYWxpemF0aW9uXHJcbiAgICB0aGlzLnJ1bGVFbmdpbmUubG9hZFJ1bGVzKCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBhbmFseXplRmlsZShcclxuICAgIGZpbGVDb250ZW50OiBzdHJpbmcsXHJcbiAgICBsYW5ndWFnZTogTGFuZ3VhZ2UsXHJcbiAgICBmaWxlSWQ6IHN0cmluZyxcclxuICAgIHVzZXJJZDogc3RyaW5nLFxyXG4gICAgb3B0aW9ucz86IEFuYWx5c2lzT3B0aW9uc1xyXG4gICk6IFByb21pc2U8QW5hbHlzaXNSZXN1bHQ+IHtcclxuICAgIGNvbnN0IGFuYWx5c2lzSWQgPSB1dWlkdjQoKTtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBjb25zdCBwcm9ncmVzc0NhbGxiYWNrID0gb3B0aW9ucz8ucHJvZ3Jlc3NDYWxsYmFjaztcclxuICAgIGNvbnN0IHVwZGF0ZUludGVydmFsID0gb3B0aW9ucz8udXBkYXRlSW50ZXJ2YWwgfHwgdGhpcy5ERUZBVUxUX1VQREFURV9JTlRFUlZBTDtcclxuICAgIGNvbnN0IHdvcmtmbG93SWQgPSBvcHRpb25zPy53b3JrZmxvd0lkO1xyXG4gICAgY29uc3QgZW5hYmxlUmVhbFRpbWVQcm9ncmVzcyA9IG9wdGlvbnM/LmVuYWJsZVJlYWxUaW1lUHJvZ3Jlc3MgPz8gZmFsc2U7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gUmVwb3J0IGluaXRpYWwgcHJvZ3Jlc3NcclxuICAgICAgaWYgKHByb2dyZXNzQ2FsbGJhY2spIHtcclxuICAgICAgICBhd2FpdCBwcm9ncmVzc0NhbGxiYWNrKDAsICdTdGFydGluZyBNSVNSQSBjb21wbGlhbmNlIGFuYWx5c2lzLi4uJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFVwZGF0ZSB3b3JrZmxvdyBwcm9ncmVzcyBpZiB3b3JrZmxvd0lkIHByb3ZpZGVkXHJcbiAgICAgIGlmICh3b3JrZmxvd0lkKSB7XHJcbiAgICAgICAgcHJvZ3Jlc3NUcmFja2luZ1NlcnZpY2UudXBkYXRlU3RlcFByb2dyZXNzKFxyXG4gICAgICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgICAgIDMsIC8vIEFuYWx5c2lzIHN0ZXBcclxuICAgICAgICAgICdNSVNSQSBBbmFseXNpcycsXHJcbiAgICAgICAgICAwLFxyXG4gICAgICAgICAgJ1N0YXJ0aW5nIE1JU1JBIGNvbXBsaWFuY2UgYW5hbHlzaXMuLi4nXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSGFzaCBmaWxlIGNvbnRlbnQgZm9yIGNhY2hlIGtleSAoUmVxdWlyZW1lbnQgMTAuNylcclxuICAgICAgY29uc3QgZmlsZUhhc2ggPSBBbmFseXNpc0NhY2hlLmhhc2hGaWxlQ29udGVudChmaWxlQ29udGVudCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNFbmdpbmVdIEZpbGUgaGFzaDogJHtmaWxlSGFzaH1gKTtcclxuXHJcbiAgICAgIGlmIChwcm9ncmVzc0NhbGxiYWNrKSB7XHJcbiAgICAgICAgYXdhaXQgcHJvZ3Jlc3NDYWxsYmFjayg1LCAnQ2hlY2tpbmcgYW5hbHlzaXMgY2FjaGUuLi4nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHdvcmtmbG93SWQpIHtcclxuICAgICAgICBwcm9ncmVzc1RyYWNraW5nU2VydmljZS51cGRhdGVTdGVwUHJvZ3Jlc3MoXHJcbiAgICAgICAgICB3b3JrZmxvd0lkLFxyXG4gICAgICAgICAgMyxcclxuICAgICAgICAgICdNSVNSQSBBbmFseXNpcycsXHJcbiAgICAgICAgICA1LFxyXG4gICAgICAgICAgJ0NoZWNraW5nIGFuYWx5c2lzIGNhY2hlLi4uJ1xyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIGNhY2hlIGJlZm9yZSBhbmFseXNpcyAoUmVxdWlyZW1lbnQgMTAuNylcclxuICAgICAgY29uc3QgY2FjaGVkUmVzdWx0ID0gYXdhaXQgdGhpcy5jYWNoZS5nZXRDYWNoZWRSZXN1bHQoZmlsZUhhc2gpO1xyXG4gICAgICBpZiAoY2FjaGVkUmVzdWx0KSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0VuZ2luZV0gVXNpbmcgY2FjaGVkIGFuYWx5c2lzIHJlc3VsdGApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNFbmdpbmVdIENhY2hlIGhpdCBzYXZlZCAke0RhdGUubm93KCkgLSBzdGFydFRpbWV9bXNgKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gICAgICAgICAgYXdhaXQgcHJvZ3Jlc3NDYWxsYmFjaygxMDAsICdBbmFseXNpcyBjb21wbGV0ZWQgKGZyb20gY2FjaGUpJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAod29ya2Zsb3dJZCkge1xyXG4gICAgICAgICAgcHJvZ3Jlc3NUcmFja2luZ1NlcnZpY2UudXBkYXRlU3RlcFByb2dyZXNzKFxyXG4gICAgICAgICAgICB3b3JrZmxvd0lkLFxyXG4gICAgICAgICAgICAzLFxyXG4gICAgICAgICAgICAnTUlTUkEgQW5hbHlzaXMnLFxyXG4gICAgICAgICAgICAxMDAsXHJcbiAgICAgICAgICAgICdBbmFseXNpcyBjb21wbGV0ZWQgKGZyb20gY2FjaGUpJyxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGNhY2hlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogY2FjaGVkUmVzdWx0LnN1bW1hcnkuY29tcGxpYW5jZVBlcmNlbnRhZ2UsXHJcbiAgICAgICAgICAgICAgdmlvbGF0aW9uQ291bnQ6IGNhY2hlZFJlc3VsdC52aW9sYXRpb25zLmxlbmd0aFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBSZXR1cm4gY2FjaGVkIHJlc3VsdCB3aXRoIG5ldyBJRHMgZm9yIHRoaXMgcmVxdWVzdFxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAuLi5jYWNoZWRSZXN1bHQsXHJcbiAgICAgICAgICBhbmFseXNpc0lkLCAvLyBOZXcgYW5hbHlzaXMgSUQgZm9yIHRoaXMgcmVxdWVzdFxyXG4gICAgICAgICAgZmlsZUlkLCAgICAgLy8gQ3VycmVudCBmaWxlIElEXHJcbiAgICAgICAgICB1c2VySWQsICAgICAvLyBDdXJyZW50IHVzZXIgSURcclxuICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLCAvLyBDdXJyZW50IHRpbWVzdGFtcFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNFbmdpbmVdIENhY2hlIG1pc3MgLSBwZXJmb3JtaW5nIGZyZXNoIGFuYWx5c2lzYCk7XHJcblxyXG4gICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gICAgICAgIGF3YWl0IHByb2dyZXNzQ2FsbGJhY2soMTAsICdQYXJzaW5nIHNvdXJjZSBjb2RlLi4uJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh3b3JrZmxvd0lkKSB7XHJcbiAgICAgICAgcHJvZ3Jlc3NUcmFja2luZ1NlcnZpY2UudXBkYXRlU3RlcFByb2dyZXNzKFxyXG4gICAgICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgICAgIDMsXHJcbiAgICAgICAgICAnTUlTUkEgQW5hbHlzaXMnLFxyXG4gICAgICAgICAgMTAsXHJcbiAgICAgICAgICAnUGFyc2luZyBzb3VyY2UgY29kZS4uLidcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBQYXJzZSBzb3VyY2UgY29kZSBvbmNlIChSZXF1aXJlbWVudCAxMC4yIC0gb3B0aW1pemUgQVNUIHRyYXZlcnNhbClcclxuICAgICAgY29uc3QgYXN0ID0gYXdhaXQgdGhpcy5wYXJzZXIucGFyc2UoZmlsZUNvbnRlbnQsIGxhbmd1YWdlKTtcclxuXHJcbiAgICAgIGlmIChwcm9ncmVzc0NhbGxiYWNrKSB7XHJcbiAgICAgICAgYXdhaXQgcHJvZ3Jlc3NDYWxsYmFjaygyMCwgYFBhcnNlZCAke2xhbmd1YWdlfSBzb3VyY2UgY29kZSBzdWNjZXNzZnVsbHlgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHdvcmtmbG93SWQpIHtcclxuICAgICAgICBwcm9ncmVzc1RyYWNraW5nU2VydmljZS51cGRhdGVTdGVwUHJvZ3Jlc3MoXHJcbiAgICAgICAgICB3b3JrZmxvd0lkLFxyXG4gICAgICAgICAgMyxcclxuICAgICAgICAgICdNSVNSQSBBbmFseXNpcycsXHJcbiAgICAgICAgICAyMCxcclxuICAgICAgICAgIGBQYXJzZWQgJHtsYW5ndWFnZX0gc291cmNlIGNvZGUgc3VjY2Vzc2Z1bGx5YFxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdldCBhcHBsaWNhYmxlIHJ1bGVzXHJcbiAgICAgIGNvbnN0IHJ1bGVzID0gdGhpcy5ydWxlRW5naW5lLmdldFJ1bGVzRm9yTGFuZ3VhZ2UobGFuZ3VhZ2UpO1xyXG4gICAgICBjb25zdCB0b3RhbFJ1bGVzID0gcnVsZXMubGVuZ3RoO1xyXG5cclxuICAgICAgaWYgKHByb2dyZXNzQ2FsbGJhY2spIHtcclxuICAgICAgICBhd2FpdCBwcm9ncmVzc0NhbGxiYWNrKDI1LCBgRXZhbHVhdGluZyAke3RvdGFsUnVsZXN9IE1JU1JBICR7bGFuZ3VhZ2V9IHJ1bGVzLi4uYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh3b3JrZmxvd0lkKSB7XHJcbiAgICAgICAgcHJvZ3Jlc3NUcmFja2luZ1NlcnZpY2UudXBkYXRlU3RlcFByb2dyZXNzKFxyXG4gICAgICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgICAgIDMsXHJcbiAgICAgICAgICAnTUlTUkEgQW5hbHlzaXMnLFxyXG4gICAgICAgICAgMjUsXHJcbiAgICAgICAgICBgRXZhbHVhdGluZyAke3RvdGFsUnVsZXN9IE1JU1JBICR7bGFuZ3VhZ2V9IHJ1bGVzLi4uYCxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdG90YWxSdWxlcyxcclxuICAgICAgICAgICAgcnVsZXNQcm9jZXNzZWQ6IDBcclxuICAgICAgICAgIH1cclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBydWxlcyB3aXRoIHByb2dyZXNzIHRyYWNraW5nIChSZXF1aXJlbWVudCAzLjMgLSAyLXNlY29uZCB1cGRhdGVzKVxyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzRW5naW5lXSBDaGVja2luZyAke3RvdGFsUnVsZXN9IHJ1bGVzIHdpdGggcHJvZ3Jlc3MgdHJhY2tpbmdgKTtcclxuICAgICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBhd2FpdCB0aGlzLmNoZWNrUnVsZXNXaXRoUHJvZ3Jlc3MoXHJcbiAgICAgICAgcnVsZXMsXHJcbiAgICAgICAgYXN0LFxyXG4gICAgICAgIGZpbGVDb250ZW50LFxyXG4gICAgICAgIHByb2dyZXNzQ2FsbGJhY2ssXHJcbiAgICAgICAgdXBkYXRlSW50ZXJ2YWwsXHJcbiAgICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgICBlbmFibGVSZWFsVGltZVByb2dyZXNzXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gICAgICAgIGF3YWl0IHByb2dyZXNzQ2FsbGJhY2soOTAsICdHZW5lcmF0aW5nIGNvbXBsaWFuY2UgcmVwb3J0Li4uJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh3b3JrZmxvd0lkKSB7XHJcbiAgICAgICAgcHJvZ3Jlc3NUcmFja2luZ1NlcnZpY2UudXBkYXRlU3RlcFByb2dyZXNzKFxyXG4gICAgICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgICAgIDMsXHJcbiAgICAgICAgICAnTUlTUkEgQW5hbHlzaXMnLFxyXG4gICAgICAgICAgOTAsXHJcbiAgICAgICAgICAnR2VuZXJhdGluZyBjb21wbGlhbmNlIHJlcG9ydC4uLidcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5idWlsZFN1bW1hcnkodmlvbGF0aW9ucywgdG90YWxSdWxlcyk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQ6IEFuYWx5c2lzUmVzdWx0ID0ge1xyXG4gICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICB2aW9sYXRpb25zLFxyXG4gICAgICAgIHN1bW1hcnksXHJcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgc3RhdHVzOiBBbmFseXNpc1N0YXR1cy5DT01QTEVURUQsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gICAgICAgIGF3YWl0IHByb2dyZXNzQ2FsbGJhY2soOTUsICdDYWNoaW5nIGFuYWx5c2lzIHJlc3VsdHMuLi4nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHdvcmtmbG93SWQpIHtcclxuICAgICAgICBwcm9ncmVzc1RyYWNraW5nU2VydmljZS51cGRhdGVTdGVwUHJvZ3Jlc3MoXHJcbiAgICAgICAgICB3b3JrZmxvd0lkLFxyXG4gICAgICAgICAgMyxcclxuICAgICAgICAgICdNSVNSQSBBbmFseXNpcycsXHJcbiAgICAgICAgICA5NSxcclxuICAgICAgICAgICdDYWNoaW5nIGFuYWx5c2lzIHJlc3VsdHMuLi4nXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU3RvcmUgcmVzdWx0IGluIGNhY2hlIGZvciBmdXR1cmUgdXNlIChSZXF1aXJlbWVudCAxMC43KVxyXG4gICAgICBhd2FpdCB0aGlzLmNhY2hlLnNldENhY2hlZFJlc3VsdChmaWxlSGFzaCwgcmVzdWx0LCB1c2VySWQsIGxhbmd1YWdlKTtcclxuXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0VuZ2luZV0gQW5hbHlzaXMgY29tcGxldGVkIGluICR7ZHVyYXRpb259bXNgKTtcclxuXHJcbiAgICAgIGlmIChwcm9ncmVzc0NhbGxiYWNrKSB7XHJcbiAgICAgICAgYXdhaXQgcHJvZ3Jlc3NDYWxsYmFjaygxMDAsIGBBbmFseXNpcyBjb21wbGV0ZWQ6ICR7c3VtbWFyeS5jb21wbGlhbmNlUGVyY2VudGFnZS50b0ZpeGVkKDEpfSUgY29tcGxpYW5jZWApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAod29ya2Zsb3dJZCkge1xyXG4gICAgICAgIHByb2dyZXNzVHJhY2tpbmdTZXJ2aWNlLnVwZGF0ZVN0ZXBQcm9ncmVzcyhcclxuICAgICAgICAgIHdvcmtmbG93SWQsXHJcbiAgICAgICAgICAzLFxyXG4gICAgICAgICAgJ01JU1JBIEFuYWx5c2lzJyxcclxuICAgICAgICAgIDEwMCxcclxuICAgICAgICAgIGBBbmFseXNpcyBjb21wbGV0ZWQ6ICR7c3VtbWFyeS5jb21wbGlhbmNlUGVyY2VudGFnZS50b0ZpeGVkKDEpfSUgY29tcGxpYW5jZWAsXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbXBsaWFuY2VQZXJjZW50YWdlOiBzdW1tYXJ5LmNvbXBsaWFuY2VQZXJjZW50YWdlLFxyXG4gICAgICAgICAgICB2aW9sYXRpb25Db3VudDogdmlvbGF0aW9ucy5sZW5ndGgsXHJcbiAgICAgICAgICAgIGV4ZWN1dGlvblRpbWU6IGR1cmF0aW9uLFxyXG4gICAgICAgICAgICBydWxlc1Byb2Nlc3NlZDogdG90YWxSdWxlcyxcclxuICAgICAgICAgICAgdG90YWxSdWxlc1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbQW5hbHlzaXNFbmdpbmVdIEFuYWx5c2lzIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgIFxyXG4gICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gICAgICAgIGF3YWl0IHByb2dyZXNzQ2FsbGJhY2soMCwgYEFuYWx5c2lzIGZhaWxlZDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHdvcmtmbG93SWQpIHtcclxuICAgICAgICBwcm9ncmVzc1RyYWNraW5nU2VydmljZS5oYW5kbGVXb3JrZmxvd0Vycm9yKFxyXG4gICAgICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgICAgIDMsXHJcbiAgICAgICAgICAnTUlTUkEgQW5hbHlzaXMnLFxyXG4gICAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICB2aW9sYXRpb25zOiBbXSxcclxuICAgICAgICBzdW1tYXJ5OiB7IHRvdGFsVmlvbGF0aW9uczogMCwgY3JpdGljYWxDb3VudDogMCwgbWFqb3JDb3VudDogMCwgbWlub3JDb3VudDogMCwgY29tcGxpYW5jZVBlcmNlbnRhZ2U6IDAgfSxcclxuICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBzdGF0dXM6IEFuYWx5c2lzU3RhdHVzLkZBSUxFRCxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIHJ1bGVzIHdpdGggcHJvZ3Jlc3MgdHJhY2tpbmcgYW5kIHBlcmlvZGljIHVwZGF0ZXNcclxuICAgKiBSZXF1aXJlbWVudHM6IDMuMyAoMi1zZWNvbmQgcHJvZ3Jlc3MgdXBkYXRlcylcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGNoZWNrUnVsZXNXaXRoUHJvZ3Jlc3MoXHJcbiAgICBydWxlczogYW55W10sXHJcbiAgICBhc3Q6IGFueSxcclxuICAgIGZpbGVDb250ZW50OiBzdHJpbmcsXHJcbiAgICBwcm9ncmVzc0NhbGxiYWNrPzogQW5hbHlzaXNQcm9ncmVzc0NhbGxiYWNrLFxyXG4gICAgdXBkYXRlSW50ZXJ2YWw6IG51bWJlciA9IDIwMDAsXHJcbiAgICB3b3JrZmxvd0lkPzogc3RyaW5nLFxyXG4gICAgZW5hYmxlUmVhbFRpbWVQcm9ncmVzczogYm9vbGVhbiA9IGZhbHNlXHJcbiAgKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdG90YWxSdWxlcyA9IHJ1bGVzLmxlbmd0aDtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBsZXQgY29tcGxldGVkUnVsZXMgPSAwO1xyXG4gICAgbGV0IGxhc3RVcGRhdGVUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICAvLyBQcm9jZXNzIHJ1bGVzIGluIGJhdGNoZXMgZm9yIGJldHRlciBwcm9ncmVzcyBncmFudWxhcml0eVxyXG4gICAgY29uc3QgYmF0Y2hTaXplID0gZW5hYmxlUmVhbFRpbWVQcm9ncmVzcyA/IDEgOiBNYXRoLm1heCgxLCBNYXRoLmZsb29yKHRvdGFsUnVsZXMgLyAxMCkpOyAvLyAxMCBwcm9ncmVzcyB1cGRhdGVzIG9yIHJ1bGUtYnktcnVsZVxyXG4gICAgXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRvdGFsUnVsZXM7IGkgKz0gYmF0Y2hTaXplKSB7XHJcbiAgICAgIGNvbnN0IGJhdGNoID0gcnVsZXMuc2xpY2UoaSwgTWF0aC5taW4oaSArIGJhdGNoU2l6ZSwgdG90YWxSdWxlcykpO1xyXG4gICAgICBcclxuICAgICAgLy8gUHJvY2VzcyBiYXRjaCBpbiBwYXJhbGxlbCAob3Igc2VxdWVudGlhbGx5IGZvciByZWFsLXRpbWUgcHJvZ3Jlc3MpXHJcbiAgICAgIGxldCBiYXRjaFZpb2xhdGlvbnM6IFZpb2xhdGlvbltdW107XHJcbiAgICAgIFxyXG4gICAgICBpZiAoZW5hYmxlUmVhbFRpbWVQcm9ncmVzcyAmJiB3b3JrZmxvd0lkKSB7XHJcbiAgICAgICAgLy8gUHJvY2VzcyBydWxlcyBvbmUgYnkgb25lIGZvciBkZXRhaWxlZCBwcm9ncmVzc1xyXG4gICAgICAgIGJhdGNoVmlvbGF0aW9ucyA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgcnVsZSBvZiBiYXRjaCkge1xyXG4gICAgICAgICAgY29uc3QgcnVsZVZpb2xhdGlvbnMgPSBhd2FpdCBydWxlLmNoZWNrKGFzdCwgZmlsZUNvbnRlbnQpO1xyXG4gICAgICAgICAgYmF0Y2hWaW9sYXRpb25zLnB1c2gocnVsZVZpb2xhdGlvbnMpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjb21wbGV0ZWRSdWxlcysrO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgZm9yIGVhY2ggcnVsZSB3aGVuIGluIHJlYWwtdGltZSBtb2RlXHJcbiAgICAgICAgICBwcm9ncmVzc1RyYWNraW5nU2VydmljZS51cGRhdGVBbmFseXNpc1Byb2dyZXNzKFxyXG4gICAgICAgICAgICB3b3JrZmxvd0lkLFxyXG4gICAgICAgICAgICBjb21wbGV0ZWRSdWxlcyxcclxuICAgICAgICAgICAgdG90YWxSdWxlcyxcclxuICAgICAgICAgICAgcnVsZS5pZCB8fCBgUnVsZSAke2NvbXBsZXRlZFJ1bGVzfWAsXHJcbiAgICAgICAgICAgIE1hdGgubWF4KDAsIE1hdGgucm91bmQoKHRvdGFsUnVsZXMgLSBjb21wbGV0ZWRSdWxlcykgKiAwLjE1KSlcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFNtYWxsIGRlbGF5IHRvIG1ha2UgcHJvZ3Jlc3MgdmlzaWJsZSBpbiBkZW1vbnN0cmF0aW9uc1xyXG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIFByb2Nlc3MgYmF0Y2ggaW4gcGFyYWxsZWwgZm9yIGZhc3RlciBleGVjdXRpb25cclxuICAgICAgICBiYXRjaFZpb2xhdGlvbnMgPSBhd2FpdCBQcm9taXNlLmFsbChcclxuICAgICAgICAgIGJhdGNoLm1hcChydWxlID0+IHJ1bGUuY2hlY2soYXN0LCBmaWxlQ29udGVudCkpXHJcbiAgICAgICAgKTtcclxuICAgICAgICBjb21wbGV0ZWRSdWxlcyArPSBiYXRjaC5sZW5ndGg7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIEZsYXR0ZW4gYW5kIGNvbGxlY3QgdmlvbGF0aW9uc1xyXG4gICAgICB2aW9sYXRpb25zLnB1c2goLi4uYmF0Y2hWaW9sYXRpb25zLmZsYXQoKSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBwcm9ncmVzcyA9IDI1ICsgTWF0aC5mbG9vcigoY29tcGxldGVkUnVsZXMgLyB0b3RhbFJ1bGVzKSAqIDY1KTsgLy8gMjUtOTAlIHJhbmdlXHJcbiAgICAgIFxyXG4gICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgaWYgZW5vdWdoIHRpbWUgaGFzIHBhc3NlZCAoMi1zZWNvbmQgaW50ZXJ2YWxzKSBvciBpbiByZWFsLXRpbWUgbW9kZVxyXG4gICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjayAmJiAobm93IC0gbGFzdFVwZGF0ZVRpbWUgPj0gdXBkYXRlSW50ZXJ2YWwgfHwgY29tcGxldGVkUnVsZXMgPT09IHRvdGFsUnVsZXMgfHwgZW5hYmxlUmVhbFRpbWVQcm9ncmVzcykpIHtcclxuICAgICAgICBjb25zdCBtZXNzYWdlID0gYEV2YWx1YXRpbmcgcnVsZXM6ICR7Y29tcGxldGVkUnVsZXN9LyR7dG90YWxSdWxlc30gY29tcGxldGVkYDtcclxuICAgICAgICBhd2FpdCBwcm9ncmVzc0NhbGxiYWNrKHByb2dyZXNzLCBtZXNzYWdlKTtcclxuICAgICAgICBsYXN0VXBkYXRlVGltZSA9IG5vdztcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVXBkYXRlIHdvcmtmbG93IHByb2dyZXNzIGZvciBub24tcmVhbC10aW1lIG1vZGVcclxuICAgICAgaWYgKHdvcmtmbG93SWQgJiYgIWVuYWJsZVJlYWxUaW1lUHJvZ3Jlc3MgJiYgKG5vdyAtIGxhc3RVcGRhdGVUaW1lID49IHVwZGF0ZUludGVydmFsIHx8IGNvbXBsZXRlZFJ1bGVzID09PSB0b3RhbFJ1bGVzKSkge1xyXG4gICAgICAgIHByb2dyZXNzVHJhY2tpbmdTZXJ2aWNlLnVwZGF0ZUFuYWx5c2lzUHJvZ3Jlc3MoXHJcbiAgICAgICAgICB3b3JrZmxvd0lkLFxyXG4gICAgICAgICAgY29tcGxldGVkUnVsZXMsXHJcbiAgICAgICAgICB0b3RhbFJ1bGVzLFxyXG4gICAgICAgICAgJycsXHJcbiAgICAgICAgICBNYXRoLm1heCgwLCBNYXRoLnJvdW5kKCh0b3RhbFJ1bGVzIC0gY29tcGxldGVkUnVsZXMpICogMC4xNSkpXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBidWlsZFN1bW1hcnkodmlvbGF0aW9uczogVmlvbGF0aW9uW10sIHRvdGFsUnVsZXM6IG51bWJlcik6IEFuYWx5c2lzU3VtbWFyeSB7XHJcbiAgICBjb25zdCBjcml0aWNhbENvdW50ID0gdmlvbGF0aW9ucy5maWx0ZXIodiA9PiB2LnNldmVyaXR5ID09PSAnbWFuZGF0b3J5JykubGVuZ3RoO1xyXG4gICAgY29uc3QgbWFqb3JDb3VudCA9IHZpb2xhdGlvbnMuZmlsdGVyKHYgPT4gdi5zZXZlcml0eSA9PT0gJ3JlcXVpcmVkJykubGVuZ3RoO1xyXG4gICAgY29uc3QgbWlub3JDb3VudCA9IHZpb2xhdGlvbnMuZmlsdGVyKHYgPT4gdi5zZXZlcml0eSA9PT0gJ2Fkdmlzb3J5JykubGVuZ3RoO1xyXG4gICAgXHJcbiAgICAvLyBDb21wbGlhbmNlIGNhbGN1bGF0aW9uIGJhc2VkIG9uIGFjdHVhbCB2aW9sYXRpb25zIGZvdW5kOlxyXG4gICAgLy8gLSBaZXJvIHZpb2xhdGlvbnMgPSAxMDAlIGNvbXBsaWFuY2VcclxuICAgIC8vIC0gVmlvbGF0aW9ucyByZWR1Y2Ugc2NvcmUgcHJvcG9ydGlvbmFsbHkgYmFzZWQgb24gc2V2ZXJpdHlcclxuICAgIGxldCBjb21wbGlhbmNlUGVyY2VudGFnZTogbnVtYmVyO1xyXG4gICAgXHJcbiAgICBpZiAodmlvbGF0aW9ucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgLy8gUGVyZmVjdCBjb21wbGlhbmNlIHdoZW4gbm8gdmlvbGF0aW9ucyBmb3VuZFxyXG4gICAgICBjb21wbGlhbmNlUGVyY2VudGFnZSA9IDEwMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIENhbGN1bGF0ZSB3ZWlnaHRlZCBwZW5hbHR5IGJhc2VkIG9uIHZpb2xhdGlvbiBzZXZlcml0eVxyXG4gICAgICAvLyBFYWNoIHZpb2xhdGlvbiB0eXBlIGhhcyBkaWZmZXJlbnQgaW1wYWN0IG9uIGNvbXBsaWFuY2VcclxuICAgICAgY29uc3QgY3JpdGljYWxQZW5hbHR5ID0gY3JpdGljYWxDb3VudCAqIDEwOyAvLyBNYW5kYXRvcnkgdmlvbGF0aW9uczogMTAlIGVhY2hcclxuICAgICAgY29uc3QgbWFqb3JQZW5hbHR5ID0gbWFqb3JDb3VudCAqIDU7ICAgICAgICAvLyBSZXF1aXJlZCB2aW9sYXRpb25zOiA1JSBlYWNoXHJcbiAgICAgIGNvbnN0IG1pbm9yUGVuYWx0eSA9IG1pbm9yQ291bnQgKiAxOyAgICAgICAgLy8gQWR2aXNvcnkgdmlvbGF0aW9uczogMSUgZWFjaFxyXG4gICAgICBcclxuICAgICAgY29uc3QgdG90YWxQZW5hbHR5ID0gY3JpdGljYWxQZW5hbHR5ICsgbWFqb3JQZW5hbHR5ICsgbWlub3JQZW5hbHR5O1xyXG4gICAgICBcclxuICAgICAgLy8gQ29tcGxpYW5jZSBzY29yZSA9IDEwMCAtIHRvdGFsIHBlbmFsdHksIHdpdGggbWluaW11bSBvZiAwJVxyXG4gICAgICBjb21wbGlhbmNlUGVyY2VudGFnZSA9IE1hdGgubWF4KDAsIDEwMCAtIHRvdGFsUGVuYWx0eSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdG90YWxWaW9sYXRpb25zOiB2aW9sYXRpb25zLmxlbmd0aCxcclxuICAgICAgY3JpdGljYWxDb3VudCxcclxuICAgICAgbWFqb3JDb3VudCxcclxuICAgICAgbWlub3JDb3VudCxcclxuICAgICAgY29tcGxpYW5jZVBlcmNlbnRhZ2U6IE1hdGgucm91bmQoY29tcGxpYW5jZVBlcmNlbnRhZ2UgKiAxMDApIC8gMTAwLCAvLyBSb3VuZCB0byAyIGRlY2ltYWwgcGxhY2VzXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG4iXX0=
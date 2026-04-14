"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MISRAAnalysisEngine = void 0;
const rule_engine_1 = require("./rule-engine");
const code_parser_1 = require("./code-parser");
const analysis_cache_1 = require("./analysis-cache");
const misra_analysis_1 = require("../../types/misra-analysis");
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
    }
    async analyzeFile(fileContent, language, fileId, userId, options) {
        const analysisId = (0, uuid_1.v4)();
        const startTime = Date.now();
        const progressCallback = options?.progressCallback;
        const updateInterval = options?.updateInterval || this.DEFAULT_UPDATE_INTERVAL;
        try {
            // Report initial progress
            if (progressCallback) {
                await progressCallback(0, 'Starting MISRA compliance analysis...');
            }
            // Hash file content for cache key (Requirement 10.7)
            const fileHash = analysis_cache_1.AnalysisCache.hashFileContent(fileContent);
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
                    fileId, // Current file ID
                    userId, // Current user ID
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
            const violations = await this.checkRulesWithProgress(rules, ast, fileContent, progressCallback, updateInterval);
            if (progressCallback) {
                await progressCallback(90, 'Generating compliance report...');
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
            // Store result in cache for future use (Requirement 10.7)
            await this.cache.setCachedResult(fileHash, result, userId, language);
            const duration = Date.now() - startTime;
            console.log(`[AnalysisEngine] Analysis completed in ${duration}ms`);
            if (progressCallback) {
                await progressCallback(100, `Analysis completed: ${summary.compliancePercentage.toFixed(1)}% compliance`);
            }
            return result;
        }
        catch (error) {
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
                status: misra_analysis_1.AnalysisStatus.FAILED,
            };
        }
    }
    /**
     * Check rules with progress tracking and periodic updates
     * Requirements: 3.3 (2-second progress updates)
     */
    async checkRulesWithProgress(rules, ast, fileContent, progressCallback, updateInterval = 2000) {
        const totalRules = rules.length;
        const violations = [];
        let completedRules = 0;
        let lastUpdateTime = Date.now();
        // Process rules in batches for better progress granularity
        const batchSize = Math.max(1, Math.floor(totalRules / 10)); // 10 progress updates
        for (let i = 0; i < totalRules; i += batchSize) {
            const batch = rules.slice(i, Math.min(i + batchSize, totalRules));
            // Process batch in parallel
            const batchViolations = await Promise.all(batch.map(rule => rule.check(ast, fileContent)));
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
    buildSummary(violations, totalRules) {
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
exports.MISRAAnalysisEngine = MISRAAnalysisEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtZW5naW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHlzaXMtZW5naW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUEyQztBQUMzQywrQ0FBMkM7QUFDM0MscURBQWlEO0FBQ2pELCtEQUFrSDtBQUNsSCwrQkFBb0M7QUFXcEMsTUFBYSxtQkFBbUI7SUFDdEIsVUFBVSxDQUFhO0lBQ3ZCLE1BQU0sQ0FBYTtJQUNuQixLQUFLLENBQWdCO0lBQ1osdUJBQXVCLEdBQUcsSUFBSSxDQUFDLENBQUMsWUFBWTtJQUU3RDtRQUNFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksOEJBQWEsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUNmLFdBQW1CLEVBQ25CLFFBQWtCLEVBQ2xCLE1BQWMsRUFDZCxNQUFjLEVBQ2QsT0FBeUI7UUFFekIsTUFBTSxVQUFVLEdBQUcsSUFBQSxTQUFNLEdBQUUsQ0FBQztRQUM1QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0IsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLEVBQUUsZ0JBQWdCLENBQUM7UUFDbkQsTUFBTSxjQUFjLEdBQUcsT0FBTyxFQUFFLGNBQWMsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUM7UUFFL0UsSUFBSSxDQUFDO1lBQ0gsMEJBQTBCO1lBQzFCLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsdUNBQXVDLENBQUMsQ0FBQztZQUNyRSxDQUFDO1lBRUQscURBQXFEO1lBQ3JELE1BQU0sUUFBUSxHQUFHLDhCQUFhLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lB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WUFDTCxlQUFlLEVBQUUsVUFBVSxDQUFDLE1BQU07WUFDbEMsYUFBYTtZQUNiLFVBQVU7WUFDVixVQUFVO1lBQ1Ysb0JBQW9CLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CLENBQUM7U0FDeEQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTFNRCxrREEwTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSdWxlRW5naW5lIH0gZnJvbSAnLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IENvZGVQYXJzZXIgfSBmcm9tICcuL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgQW5hbHlzaXNDYWNoZSB9IGZyb20gJy4vYW5hbHlzaXMtY2FjaGUnO1xyXG5pbXBvcnQgeyBBbmFseXNpc1Jlc3VsdCwgVmlvbGF0aW9uLCBBbmFseXNpc1N1bW1hcnksIEFuYWx5c2lzU3RhdHVzLCBMYW5ndWFnZSB9IGZyb20gJy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5c2lzUHJvZ3Jlc3NDYWxsYmFjayB7XHJcbiAgKHByb2dyZXNzOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZyk6IFByb21pc2U8dm9pZD47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHlzaXNPcHRpb25zIHtcclxuICBwcm9ncmVzc0NhbGxiYWNrPzogQW5hbHlzaXNQcm9ncmVzc0NhbGxiYWNrO1xyXG4gIHVwZGF0ZUludGVydmFsPzogbnVtYmVyOyAvLyBtaWxsaXNlY29uZHMgYmV0d2VlbiBwcm9ncmVzcyB1cGRhdGVzIChkZWZhdWx0OiAyMDAwKVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTUlTUkFBbmFseXNpc0VuZ2luZSB7XHJcbiAgcHJpdmF0ZSBydWxlRW5naW5lOiBSdWxlRW5naW5lO1xyXG4gIHByaXZhdGUgcGFyc2VyOiBDb2RlUGFyc2VyO1xyXG4gIHByaXZhdGUgY2FjaGU6IEFuYWx5c2lzQ2FjaGU7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBERUZBVUxUX1VQREFURV9JTlRFUlZBTCA9IDIwMDA7IC8vIDIgc2Vjb25kc1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMucnVsZUVuZ2luZSA9IG5ldyBSdWxlRW5naW5lKCk7XHJcbiAgICB0aGlzLnBhcnNlciA9IG5ldyBDb2RlUGFyc2VyKCk7XHJcbiAgICB0aGlzLmNhY2hlID0gbmV3IEFuYWx5c2lzQ2FjaGUoKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGFuYWx5emVGaWxlKFxyXG4gICAgZmlsZUNvbnRlbnQ6IHN0cmluZyxcclxuICAgIGxhbmd1YWdlOiBMYW5ndWFnZSxcclxuICAgIGZpbGVJZDogc3RyaW5nLFxyXG4gICAgdXNlcklkOiBzdHJpbmcsXHJcbiAgICBvcHRpb25zPzogQW5hbHlzaXNPcHRpb25zXHJcbiAgKTogUHJvbWlzZTxBbmFseXNpc1Jlc3VsdD4ge1xyXG4gICAgY29uc3QgYW5hbHlzaXNJZCA9IHV1aWR2NCgpO1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IHByb2dyZXNzQ2FsbGJhY2sgPSBvcHRpb25zPy5wcm9ncmVzc0NhbGxiYWNrO1xyXG4gICAgY29uc3QgdXBkYXRlSW50ZXJ2YWwgPSBvcHRpb25zPy51cGRhdGVJbnRlcnZhbCB8fCB0aGlzLkRFRkFVTFRfVVBEQVRFX0lOVEVSVkFMO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFJlcG9ydCBpbml0aWFsIHByb2dyZXNzXHJcbiAgICAgIGlmIChwcm9ncmVzc0NhbGxiYWNrKSB7XHJcbiAgICAgICAgYXdhaXQgcHJvZ3Jlc3NDYWxsYmFjaygwLCAnU3RhcnRpbmcgTUlTUkEgY29tcGxpYW5jZSBhbmFseXNpcy4uLicpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBIYXNoIGZpbGUgY29udGVudCBmb3IgY2FjaGUga2V5IChSZXF1aXJlbWVudCAxMC43KVxyXG4gICAgICBjb25zdCBmaWxlSGFzaCA9IEFuYWx5c2lzQ2FjaGUuaGFzaEZpbGVDb250ZW50KGZpbGVDb250ZW50KTtcclxuICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0VuZ2luZV0gRmlsZSBoYXNoOiAke2ZpbGVIYXNofWApO1xyXG5cclxuICAgICAgaWYgKHByb2dyZXNzQ2FsbGJhY2spIHtcclxuICAgICAgICBhd2FpdCBwcm9ncmVzc0NhbGxiYWNrKDUsICdDaGVja2luZyBhbmFseXNpcyBjYWNoZS4uLicpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBjYWNoZSBiZWZvcmUgYW5hbHlzaXMgKFJlcXVpcmVtZW50IDEwLjcpXHJcbiAgICAgIGNvbnN0IGNhY2hlZFJlc3VsdCA9IGF3YWl0IHRoaXMuY2FjaGUuZ2V0Q2FjaGVkUmVzdWx0KGZpbGVIYXNoKTtcclxuICAgICAgaWYgKGNhY2hlZFJlc3VsdCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNFbmdpbmVdIFVzaW5nIGNhY2hlZCBhbmFseXNpcyByZXN1bHRgKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzRW5naW5lXSBDYWNoZSBoaXQgc2F2ZWQgJHtEYXRlLm5vdygpIC0gc3RhcnRUaW1lfW1zYCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKHByb2dyZXNzQ2FsbGJhY2spIHtcclxuICAgICAgICAgIGF3YWl0IHByb2dyZXNzQ2FsbGJhY2soMTAwLCAnQW5hbHlzaXMgY29tcGxldGVkIChmcm9tIGNhY2hlKScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBSZXR1cm4gY2FjaGVkIHJlc3VsdCB3aXRoIG5ldyBJRHMgZm9yIHRoaXMgcmVxdWVzdFxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAuLi5jYWNoZWRSZXN1bHQsXHJcbiAgICAgICAgICBhbmFseXNpc0lkLCAvLyBOZXcgYW5hbHlzaXMgSUQgZm9yIHRoaXMgcmVxdWVzdFxyXG4gICAgICAgICAgZmlsZUlkLCAgICAgLy8gQ3VycmVudCBmaWxlIElEXHJcbiAgICAgICAgICB1c2VySWQsICAgICAvLyBDdXJyZW50IHVzZXIgSURcclxuICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLCAvLyBDdXJyZW50IHRpbWVzdGFtcFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNFbmdpbmVdIENhY2hlIG1pc3MgLSBwZXJmb3JtaW5nIGZyZXNoIGFuYWx5c2lzYCk7XHJcblxyXG4gICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gICAgICAgIGF3YWl0IHByb2dyZXNzQ2FsbGJhY2soMTAsICdQYXJzaW5nIHNvdXJjZSBjb2RlLi4uJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFBhcnNlIHNvdXJjZSBjb2RlIG9uY2UgKFJlcXVpcmVtZW50IDEwLjIgLSBvcHRpbWl6ZSBBU1QgdHJhdmVyc2FsKVxyXG4gICAgICBjb25zdCBhc3QgPSBhd2FpdCB0aGlzLnBhcnNlci5wYXJzZShmaWxlQ29udGVudCwgbGFuZ3VhZ2UpO1xyXG5cclxuICAgICAgaWYgKHByb2dyZXNzQ2FsbGJhY2spIHtcclxuICAgICAgICBhd2FpdCBwcm9ncmVzc0NhbGxiYWNrKDIwLCBgUGFyc2VkICR7bGFuZ3VhZ2V9IHNvdXJjZSBjb2RlIHN1Y2Nlc3NmdWxseWApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZXQgYXBwbGljYWJsZSBydWxlc1xyXG4gICAgICBjb25zdCBydWxlcyA9IHRoaXMucnVsZUVuZ2luZS5nZXRSdWxlc0Zvckxhbmd1YWdlKGxhbmd1YWdlKTtcclxuICAgICAgY29uc3QgdG90YWxSdWxlcyA9IHJ1bGVzLmxlbmd0aDtcclxuXHJcbiAgICAgIGlmIChwcm9ncmVzc0NhbGxiYWNrKSB7XHJcbiAgICAgICAgYXdhaXQgcHJvZ3Jlc3NDYWxsYmFjaygyNSwgYEV2YWx1YXRpbmcgJHt0b3RhbFJ1bGVzfSBNSVNSQSAke2xhbmd1YWdlfSBydWxlcy4uLmApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBydWxlcyB3aXRoIHByb2dyZXNzIHRyYWNraW5nIChSZXF1aXJlbWVudCAzLjMgLSAyLXNlY29uZCB1cGRhdGVzKVxyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzRW5naW5lXSBDaGVja2luZyAke3RvdGFsUnVsZXN9IHJ1bGVzIHdpdGggcHJvZ3Jlc3MgdHJhY2tpbmdgKTtcclxuICAgICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBhd2FpdCB0aGlzLmNoZWNrUnVsZXNXaXRoUHJvZ3Jlc3MoXHJcbiAgICAgICAgcnVsZXMsXHJcbiAgICAgICAgYXN0LFxyXG4gICAgICAgIGZpbGVDb250ZW50LFxyXG4gICAgICAgIHByb2dyZXNzQ2FsbGJhY2ssXHJcbiAgICAgICAgdXBkYXRlSW50ZXJ2YWxcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmIChwcm9ncmVzc0NhbGxiYWNrKSB7XHJcbiAgICAgICAgYXdhaXQgcHJvZ3Jlc3NDYWxsYmFjayg5MCwgJ0dlbmVyYXRpbmcgY29tcGxpYW5jZSByZXBvcnQuLi4nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgc3VtbWFyeSA9IHRoaXMuYnVpbGRTdW1tYXJ5KHZpb2xhdGlvbnMsIHRvdGFsUnVsZXMpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0OiBBbmFseXNpc1Jlc3VsdCA9IHtcclxuICAgICAgICBhbmFseXNpc0lkLFxyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgbGFuZ3VhZ2UsXHJcbiAgICAgICAgdmlvbGF0aW9ucyxcclxuICAgICAgICBzdW1tYXJ5LFxyXG4gICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHN0YXR1czogQW5hbHlzaXNTdGF0dXMuQ09NUExFVEVELFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgaWYgKHByb2dyZXNzQ2FsbGJhY2spIHtcclxuICAgICAgICBhd2FpdCBwcm9ncmVzc0NhbGxiYWNrKDk1LCAnQ2FjaGluZyBhbmFseXNpcyByZXN1bHRzLi4uJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFN0b3JlIHJlc3VsdCBpbiBjYWNoZSBmb3IgZnV0dXJlIHVzZSAoUmVxdWlyZW1lbnQgMTAuNylcclxuICAgICAgYXdhaXQgdGhpcy5jYWNoZS5zZXRDYWNoZWRSZXN1bHQoZmlsZUhhc2gsIHJlc3VsdCwgdXNlcklkLCBsYW5ndWFnZSk7XHJcblxyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNFbmdpbmVdIEFuYWx5c2lzIGNvbXBsZXRlZCBpbiAke2R1cmF0aW9ufW1zYCk7XHJcblxyXG4gICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gICAgICAgIGF3YWl0IHByb2dyZXNzQ2FsbGJhY2soMTAwLCBgQW5hbHlzaXMgY29tcGxldGVkOiAke3N1bW1hcnkuY29tcGxpYW5jZVBlcmNlbnRhZ2UudG9GaXhlZCgxKX0lIGNvbXBsaWFuY2VgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tBbmFseXNpc0VuZ2luZV0gQW5hbHlzaXMgZmFpbGVkOicsIGVycm9yKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChwcm9ncmVzc0NhbGxiYWNrKSB7XHJcbiAgICAgICAgYXdhaXQgcHJvZ3Jlc3NDYWxsYmFjaygwLCBgQW5hbHlzaXMgZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICB2aW9sYXRpb25zOiBbXSxcclxuICAgICAgICBzdW1tYXJ5OiB7IHRvdGFsVmlvbGF0aW9uczogMCwgY3JpdGljYWxDb3VudDogMCwgbWFqb3JDb3VudDogMCwgbWlub3JDb3VudDogMCwgY29tcGxpYW5jZVBlcmNlbnRhZ2U6IDAgfSxcclxuICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBzdGF0dXM6IEFuYWx5c2lzU3RhdHVzLkZBSUxFRCxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIHJ1bGVzIHdpdGggcHJvZ3Jlc3MgdHJhY2tpbmcgYW5kIHBlcmlvZGljIHVwZGF0ZXNcclxuICAgKiBSZXF1aXJlbWVudHM6IDMuMyAoMi1zZWNvbmQgcHJvZ3Jlc3MgdXBkYXRlcylcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGNoZWNrUnVsZXNXaXRoUHJvZ3Jlc3MoXHJcbiAgICBydWxlczogYW55W10sXHJcbiAgICBhc3Q6IGFueSxcclxuICAgIGZpbGVDb250ZW50OiBzdHJpbmcsXHJcbiAgICBwcm9ncmVzc0NhbGxiYWNrPzogQW5hbHlzaXNQcm9ncmVzc0NhbGxiYWNrLFxyXG4gICAgdXBkYXRlSW50ZXJ2YWw6IG51bWJlciA9IDIwMDBcclxuICApOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB0b3RhbFJ1bGVzID0gcnVsZXMubGVuZ3RoO1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGxldCBjb21wbGV0ZWRSdWxlcyA9IDA7XHJcbiAgICBsZXQgbGFzdFVwZGF0ZVRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIC8vIFByb2Nlc3MgcnVsZXMgaW4gYmF0Y2hlcyBmb3IgYmV0dGVyIHByb2dyZXNzIGdyYW51bGFyaXR5XHJcbiAgICBjb25zdCBiYXRjaFNpemUgPSBNYXRoLm1heCgxLCBNYXRoLmZsb29yKHRvdGFsUnVsZXMgLyAxMCkpOyAvLyAxMCBwcm9ncmVzcyB1cGRhdGVzXHJcbiAgICBcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG90YWxSdWxlczsgaSArPSBiYXRjaFNpemUpIHtcclxuICAgICAgY29uc3QgYmF0Y2ggPSBydWxlcy5zbGljZShpLCBNYXRoLm1pbihpICsgYmF0Y2hTaXplLCB0b3RhbFJ1bGVzKSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBQcm9jZXNzIGJhdGNoIGluIHBhcmFsbGVsXHJcbiAgICAgIGNvbnN0IGJhdGNoVmlvbGF0aW9ucyA9IGF3YWl0IFByb21pc2UuYWxsKFxyXG4gICAgICAgIGJhdGNoLm1hcChydWxlID0+IHJ1bGUuY2hlY2soYXN0LCBmaWxlQ29udGVudCkpXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBGbGF0dGVuIGFuZCBjb2xsZWN0IHZpb2xhdGlvbnNcclxuICAgICAgdmlvbGF0aW9ucy5wdXNoKC4uLmJhdGNoVmlvbGF0aW9ucy5mbGF0KCkpO1xyXG4gICAgICBcclxuICAgICAgY29tcGxldGVkUnVsZXMgKz0gYmF0Y2gubGVuZ3RoO1xyXG4gICAgICBjb25zdCBwcm9ncmVzcyA9IDI1ICsgTWF0aC5mbG9vcigoY29tcGxldGVkUnVsZXMgLyB0b3RhbFJ1bGVzKSAqIDY1KTsgLy8gMjUtOTAlIHJhbmdlXHJcbiAgICAgIFxyXG4gICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgaWYgZW5vdWdoIHRpbWUgaGFzIHBhc3NlZCAoMi1zZWNvbmQgaW50ZXJ2YWxzKVxyXG4gICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgICBpZiAocHJvZ3Jlc3NDYWxsYmFjayAmJiAobm93IC0gbGFzdFVwZGF0ZVRpbWUgPj0gdXBkYXRlSW50ZXJ2YWwgfHwgY29tcGxldGVkUnVsZXMgPT09IHRvdGFsUnVsZXMpKSB7XHJcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGBFdmFsdWF0aW5nIHJ1bGVzOiAke2NvbXBsZXRlZFJ1bGVzfS8ke3RvdGFsUnVsZXN9IGNvbXBsZXRlZGA7XHJcbiAgICAgICAgYXdhaXQgcHJvZ3Jlc3NDYWxsYmFjayhwcm9ncmVzcywgbWVzc2FnZSk7XHJcbiAgICAgICAgbGFzdFVwZGF0ZVRpbWUgPSBub3c7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYnVpbGRTdW1tYXJ5KHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdLCB0b3RhbFJ1bGVzOiBudW1iZXIpOiBBbmFseXNpc1N1bW1hcnkge1xyXG4gICAgY29uc3QgY3JpdGljYWxDb3VudCA9IHZpb2xhdGlvbnMuZmlsdGVyKHYgPT4gdi5zZXZlcml0eSA9PT0gJ21hbmRhdG9yeScpLmxlbmd0aDtcclxuICAgIGNvbnN0IG1ham9yQ291bnQgPSB2aW9sYXRpb25zLmZpbHRlcih2ID0+IHYuc2V2ZXJpdHkgPT09ICdyZXF1aXJlZCcpLmxlbmd0aDtcclxuICAgIGNvbnN0IG1pbm9yQ291bnQgPSB2aW9sYXRpb25zLmZpbHRlcih2ID0+IHYuc2V2ZXJpdHkgPT09ICdhZHZpc29yeScpLmxlbmd0aDtcclxuICAgIGNvbnN0IGNvbXBsaWFuY2VQZXJjZW50YWdlID0gdG90YWxSdWxlcyA+IDBcclxuICAgICAgPyAoKHRvdGFsUnVsZXMgLSB2aW9sYXRpb25zLmxlbmd0aCkgLyB0b3RhbFJ1bGVzKSAqIDEwMFxyXG4gICAgICA6IDEwMDtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0b3RhbFZpb2xhdGlvbnM6IHZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICBjcml0aWNhbENvdW50LFxyXG4gICAgICBtYWpvckNvdW50LFxyXG4gICAgICBtaW5vckNvdW50LFxyXG4gICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogTWF0aC5tYXgoMCwgY29tcGxpYW5jZVBlcmNlbnRhZ2UpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuIl19
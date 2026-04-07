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
    constructor() {
        this.ruleEngine = new rule_engine_1.RuleEngine();
        this.parser = new code_parser_1.CodeParser();
        this.cache = new analysis_cache_1.AnalysisCache();
    }
    async analyzeFile(fileContent, language, fileId, userId) {
        const analysisId = (0, uuid_1.v4)();
        const startTime = Date.now();
        try {
            // Hash file content for cache key (Requirement 10.7)
            const fileHash = analysis_cache_1.AnalysisCache.hashFileContent(fileContent);
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
                    fileId, // Current file ID
                    userId, // Current user ID
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
            const violationArrays = await Promise.all(rules.map(rule => rule.check(ast, fileContent)));
            // Flatten all violations into a single array
            const violations = violationArrays.flat();
            const summary = this.buildSummary(violations, rules.length);
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
            // Store result in cache for future use (Requirement 10.7)
            await this.cache.setCachedResult(fileHash, result, userId, language);
            const duration = Date.now() - startTime;
            console.log(`[AnalysisEngine] Analysis completed in ${duration}ms`);
            return result;
        }
        catch (error) {
            console.error('[AnalysisEngine] Analysis failed:', error);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtZW5naW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHlzaXMtZW5naW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUEyQztBQUMzQywrQ0FBMkM7QUFDM0MscURBQWlEO0FBQ2pELCtEQUFrSDtBQUNsSCwrQkFBb0M7QUFFcEMsTUFBYSxtQkFBbUI7SUFDdEIsVUFBVSxDQUFhO0lBQ3ZCLE1BQU0sQ0FBYTtJQUNuQixLQUFLLENBQWdCO0lBRTdCO1FBQ0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztRQUNuQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSw4QkFBYSxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQ2YsV0FBbUIsRUFDbkIsUUFBa0IsRUFDbEIsTUFBYyxFQUNkLE1BQWM7UUFFZCxNQUFNLFVBQVUsR0FBRyxJQUFBLFNBQU0sR0FBRSxDQUFDO1FBQzVCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixJQUFJLENBQUM7WUFDSCxxREFBcUQ7WUFDckQsTUFBTSxRQUFRLEdBQUcsOEJBQWEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDNUQsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUV2RCxpREFBaUQ7WUFDakQsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNoRSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLCtDQUErQyxDQUFDLENBQUM7Z0JBQzdELE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLElBQUksQ0FBQyxHQUFHLEVBQUUs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LENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUM1RSxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDNUUsTUFBTSxvQkFBb0IsR0FBRyxVQUFVLEdBQUcsQ0FBQztZQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsR0FBRztZQUN2RCxDQUFDLENBQUMsR0FBRyxDQUFDO1FBRVIsT0FBTztZQUNMLGVBQWUsRUFBRSxVQUFVLENBQUMsTUFBTTtZQUNsQyxhQUFhO1lBQ2IsVUFBVTtZQUNWLFVBQVU7WUFDVixvQkFBb0IsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQztTQUN4RCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBN0dELGtEQTZHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJ1bGVFbmdpbmUgfSBmcm9tICcuL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQ29kZVBhcnNlciB9IGZyb20gJy4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBBbmFseXNpc0NhY2hlIH0gZnJvbSAnLi9hbmFseXNpcy1jYWNoZSc7XHJcbmltcG9ydCB7IEFuYWx5c2lzUmVzdWx0LCBWaW9sYXRpb24sIEFuYWx5c2lzU3VtbWFyeSwgQW5hbHlzaXNTdGF0dXMsIExhbmd1YWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuXHJcbmV4cG9ydCBjbGFzcyBNSVNSQUFuYWx5c2lzRW5naW5lIHtcclxuICBwcml2YXRlIHJ1bGVFbmdpbmU6IFJ1bGVFbmdpbmU7XHJcbiAgcHJpdmF0ZSBwYXJzZXI6IENvZGVQYXJzZXI7XHJcbiAgcHJpdmF0ZSBjYWNoZTogQW5hbHlzaXNDYWNoZTtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnJ1bGVFbmdpbmUgPSBuZXcgUnVsZUVuZ2luZSgpO1xyXG4gICAgdGhpcy5wYXJzZXIgPSBuZXcgQ29kZVBhcnNlcigpO1xyXG4gICAgdGhpcy5jYWNoZSA9IG5ldyBBbmFseXNpc0NhY2hlKCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBhbmFseXplRmlsZShcclxuICAgIGZpbGVDb250ZW50OiBzdHJpbmcsXHJcbiAgICBsYW5ndWFnZTogTGFuZ3VhZ2UsXHJcbiAgICBmaWxlSWQ6IHN0cmluZyxcclxuICAgIHVzZXJJZDogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTxBbmFseXNpc1Jlc3VsdD4ge1xyXG4gICAgY29uc3QgYW5hbHlzaXNJZCA9IHV1aWR2NCgpO1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBIYXNoIGZpbGUgY29udGVudCBmb3IgY2FjaGUga2V5IChSZXF1aXJlbWVudCAxMC43KVxyXG4gICAgICBjb25zdCBmaWxlSGFzaCA9IEFuYWx5c2lzQ2FjaGUuaGFzaEZpbGVDb250ZW50KGZpbGVDb250ZW50KTtcclxuICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0VuZ2luZV0gRmlsZSBoYXNoOiAke2ZpbGVIYXNofWApO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgY2FjaGUgYmVmb3JlIGFuYWx5c2lzIChSZXF1aXJlbWVudCAxMC43KVxyXG4gICAgICBjb25zdCBjYWNoZWRSZXN1bHQgPSBhd2FpdCB0aGlzLmNhY2hlLmdldENhY2hlZFJlc3VsdChmaWxlSGFzaCk7XHJcbiAgICAgIGlmIChjYWNoZWRSZXN1bHQpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzRW5naW5lXSBVc2luZyBjYWNoZWQgYW5hbHlzaXMgcmVzdWx0YCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0VuZ2luZV0gQ2FjaGUgaGl0IHNhdmVkICR7RGF0ZS5ub3coKSAtIHN0YXJ0VGltZX1tc2ApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFJldHVybiBjYWNoZWQgcmVzdWx0IHdpdGggbmV3IElEcyBmb3IgdGhpcyByZXF1ZXN0XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIC4uLmNhY2hlZFJlc3VsdCxcclxuICAgICAgICAgIGFuYWx5c2lzSWQsIC8vIE5ldyBhbmFseXNpcyBJRCBmb3IgdGhpcyByZXF1ZXN0XHJcbiAgICAgICAgICBmaWxlSWQsICAgICAvLyBDdXJyZW50IGZpbGUgSURcclxuICAgICAgICAgIHVzZXJJZCwgICAgIC8vIEN1cnJlbnQgdXNlciBJRFxyXG4gICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksIC8vIEN1cnJlbnQgdGltZXN0YW1wXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0VuZ2luZV0gQ2FjaGUgbWlzcyAtIHBlcmZvcm1pbmcgZnJlc2ggYW5hbHlzaXNgKTtcclxuXHJcbiAgICAgIC8vIFBhcnNlIHNvdXJjZSBjb2RlIG9uY2UgKFJlcXVpcmVtZW50IDEwLjIgLSBvcHRpbWl6ZSBBU1QgdHJhdmVyc2FsKVxyXG4gICAgICBjb25zdCBhc3QgPSBhd2FpdCB0aGlzLnBhcnNlci5wYXJzZShmaWxlQ29udGVudCwgbGFuZ3VhZ2UpO1xyXG5cclxuICAgICAgLy8gR2V0IGFwcGxpY2FibGUgcnVsZXNcclxuICAgICAgY29uc3QgcnVsZXMgPSB0aGlzLnJ1bGVFbmdpbmUuZ2V0UnVsZXNGb3JMYW5ndWFnZShsYW5ndWFnZSk7XHJcblxyXG4gICAgICAvLyBDaGVjayBydWxlcyBpbiBwYXJhbGxlbCB1c2luZyBQcm9taXNlLmFsbCgpIChSZXF1aXJlbWVudCAxMC4xKVxyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzRW5naW5lXSBDaGVja2luZyAke3J1bGVzLmxlbmd0aH0gcnVsZXMgaW4gcGFyYWxsZWxgKTtcclxuICAgICAgY29uc3QgdmlvbGF0aW9uQXJyYXlzID0gYXdhaXQgUHJvbWlzZS5hbGwoXHJcbiAgICAgICAgcnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5jaGVjayhhc3QsIGZpbGVDb250ZW50KSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIEZsYXR0ZW4gYWxsIHZpb2xhdGlvbnMgaW50byBhIHNpbmdsZSBhcnJheVxyXG4gICAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IHZpb2xhdGlvbkFycmF5cy5mbGF0KCk7XHJcblxyXG4gICAgICBjb25zdCBzdW1tYXJ5ID0gdGhpcy5idWlsZFN1bW1hcnkodmlvbGF0aW9ucywgcnVsZXMubGVuZ3RoKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdDogQW5hbHlzaXNSZXN1bHQgPSB7XHJcbiAgICAgICAgYW5hbHlzaXNJZCxcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGxhbmd1YWdlLFxyXG4gICAgICAgIHZpb2xhdGlvbnMsXHJcbiAgICAgICAgc3VtbWFyeSxcclxuICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBzdGF0dXM6IEFuYWx5c2lzU3RhdHVzLkNPTVBMRVRFRCxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFN0b3JlIHJlc3VsdCBpbiBjYWNoZSBmb3IgZnV0dXJlIHVzZSAoUmVxdWlyZW1lbnQgMTAuNylcclxuICAgICAgYXdhaXQgdGhpcy5jYWNoZS5zZXRDYWNoZWRSZXN1bHQoZmlsZUhhc2gsIHJlc3VsdCwgdXNlcklkLCBsYW5ndWFnZSk7XHJcblxyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNFbmdpbmVdIEFuYWx5c2lzIGNvbXBsZXRlZCBpbiAke2R1cmF0aW9ufW1zYCk7XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0FuYWx5c2lzRW5naW5lXSBBbmFseXNpcyBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICB2aW9sYXRpb25zOiBbXSxcclxuICAgICAgICBzdW1tYXJ5OiB7IHRvdGFsVmlvbGF0aW9uczogMCwgY3JpdGljYWxDb3VudDogMCwgbWFqb3JDb3VudDogMCwgbWlub3JDb3VudDogMCwgY29tcGxpYW5jZVBlcmNlbnRhZ2U6IDAgfSxcclxuICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBzdGF0dXM6IEFuYWx5c2lzU3RhdHVzLkZBSUxFRCxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYnVpbGRTdW1tYXJ5KHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdLCB0b3RhbFJ1bGVzOiBudW1iZXIpOiBBbmFseXNpc1N1bW1hcnkge1xyXG4gICAgY29uc3QgY3JpdGljYWxDb3VudCA9IHZpb2xhdGlvbnMuZmlsdGVyKHYgPT4gdi5zZXZlcml0eSA9PT0gJ21hbmRhdG9yeScpLmxlbmd0aDtcclxuICAgIGNvbnN0IG1ham9yQ291bnQgPSB2aW9sYXRpb25zLmZpbHRlcih2ID0+IHYuc2V2ZXJpdHkgPT09ICdyZXF1aXJlZCcpLmxlbmd0aDtcclxuICAgIGNvbnN0IG1pbm9yQ291bnQgPSB2aW9sYXRpb25zLmZpbHRlcih2ID0+IHYuc2V2ZXJpdHkgPT09ICdhZHZpc29yeScpLmxlbmd0aDtcclxuICAgIGNvbnN0IGNvbXBsaWFuY2VQZXJjZW50YWdlID0gdG90YWxSdWxlcyA+IDBcclxuICAgICAgPyAoKHRvdGFsUnVsZXMgLSB2aW9sYXRpb25zLmxlbmd0aCkgLyB0b3RhbFJ1bGVzKSAqIDEwMFxyXG4gICAgICA6IDEwMDtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0b3RhbFZpb2xhdGlvbnM6IHZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICBjcml0aWNhbENvdW50LFxyXG4gICAgICBtYWpvckNvdW50LFxyXG4gICAgICBtaW5vckNvdW50LFxyXG4gICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogTWF0aC5tYXgoMCwgY29tcGxpYW5jZVBlcmNlbnRhZ2UpLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuIl19
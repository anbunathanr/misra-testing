# MISRA Performance Testing Script
# Tests analysis performance, scalability, and load handling

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MISRA Performance Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Run performance tests
Write-Host "[1/3] Running performance tests..." -ForegroundColor Yellow
Write-Host ""

$perfTests = npm test -- --testPathPattern="performance.test.ts" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Performance tests passed" -ForegroundColor Green
} else {
    Write-Host "⚠ Some performance tests failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/3] Running cache integration tests..." -ForegroundColor Yellow
Write-Host ""

$cacheTests = npm test -- --testPathPattern="cache.*test.ts" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Cache tests passed" -ForegroundColor Green
} else {
    Write-Host "⚠ Some cache tests failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/3] Running analysis engine tests..." -ForegroundColor Yellow
Write-Host ""

$engineTests = npm test -- --testPathPattern="analysis-engine.test.ts" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Analysis engine tests passed" -ForegroundColor Green
} else {
    Write-Host "⚠ Some analysis engine tests failed" -ForegroundColor Yellow
}

# Performance requirements summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Performance Requirements" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Requirement 10.1: Files up to 1MB should complete in < 10 seconds" -ForegroundColor White
Write-Host "Requirement 10.2: Files up to 10MB should complete in < 60 seconds" -ForegroundColor White
Write-Host "Requirement 10.3: Support 10+ concurrent analyses" -ForegroundColor White
Write-Host "Requirement 10.4: Use Lambda for auto-scaling" -ForegroundColor White
Write-Host "Requirement 10.5: Implement analysis queue for high load" -ForegroundColor White
Write-Host "Requirement 10.6: Timeout after 5 minutes" -ForegroundColor White
Write-Host "Requirement 10.7: Cache results for identical files" -ForegroundColor White
Write-Host ""

# Load testing recommendations
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Load Testing Recommendations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To perform load testing:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Create load test script:" -ForegroundColor White
Write-Host @"
   // load-test.ts
   import { MISRAAnalysisEngine } from './services/misra-analysis/analysis-engine';
   import { Language } from './types/misra-analysis';
   
   async function loadTest() {
     const engine = new MISRAAnalysisEngine();
     const code = generateLargeCodeSample(1000); // 1000 lines
     
     console.log('Starting load test with 10 concurrent analyses...');
     const startTime = Date.now();
     
     const analyses = [];
     for (let i = 0; i < 10; i++) {
       analyses.push(
         engine.analyzeFile(code, Language.C, `file-\${i}`, `user-\${i}`)
       );
     }
     
     const results = await Promise.all(analyses);
     const duration = Date.now() - startTime;
     
     console.log(`Completed 10 analyses in \${duration}ms`);
     console.log(`Average: \${duration / 10}ms per analysis`);
     
     // Verify all succeeded
     const allSucceeded = results.every(r => r.violations !== undefined);
     console.log(`Success rate: \${allSucceeded ? '100%' : 'FAILED'}`);
   }
   
   loadTest().catch(console.error);
"@ -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run the load test:" -ForegroundColor White
Write-Host "   npx ts-node load-test.ts" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Monitor performance metrics:" -ForegroundColor White
Write-Host "   - Total duration" -ForegroundColor Gray
Write-Host "   - Average analysis time" -ForegroundColor Gray
Write-Host "   - Memory usage" -ForegroundColor Gray
Write-Host "   - Cache hit rate" -ForegroundColor Gray
Write-Host ""

# Scalability testing
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Scalability Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test with increasing file sizes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "File Size | Expected Time | Status" -ForegroundColor White
Write-Host "----------|---------------|-------" -ForegroundColor Gray
Write-Host "100 KB    | < 2 seconds   | ?" -ForegroundColor Gray
Write-Host "500 KB    | < 5 seconds   | ?" -ForegroundColor Gray
Write-Host "1 MB      | < 10 seconds  | ?" -ForegroundColor Gray
Write-Host "5 MB      | < 30 seconds  | ?" -ForegroundColor Gray
Write-Host "10 MB     | < 60 seconds  | ?" -ForegroundColor Gray
Write-Host ""
Write-Host "To test scalability:" -ForegroundColor White
Write-Host "1. Generate test files of various sizes" -ForegroundColor Gray
Write-Host "2. Run analysis on each file" -ForegroundColor Gray
Write-Host "3. Measure and record duration" -ForegroundColor Gray
Write-Host "4. Verify linear scaling" -ForegroundColor Gray
Write-Host ""

# Performance optimization tips
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Performance Optimization Tips" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If performance tests fail:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Enable parallel rule checking:" -ForegroundColor White
Write-Host "   - Use Promise.all() for concurrent rule execution" -ForegroundColor Gray
Write-Host "   - Optimize AST traversal" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Implement caching:" -ForegroundColor White
Write-Host "   - Cache parsed ASTs" -ForegroundColor Gray
Write-Host "   - Cache analysis results by file hash" -ForegroundColor Gray
Write-Host "   - Use in-memory cache for frequently accessed data" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Optimize rule implementations:" -ForegroundColor White
Write-Host "   - Avoid redundant AST traversals" -ForegroundColor Gray
Write-Host "   - Use efficient data structures" -ForegroundColor Gray
Write-Host "   - Profile slow rules and optimize" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Increase Lambda resources:" -ForegroundColor White
Write-Host "   - Increase memory allocation (more CPU)" -ForegroundColor Gray
Write-Host "   - Adjust timeout settings" -ForegroundColor Gray
Write-Host "   - Use provisioned concurrency for consistent performance" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Performance testing completed." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review test results above" -ForegroundColor White
Write-Host "2. Implement load testing script" -ForegroundColor White
Write-Host "3. Run scalability tests with various file sizes" -ForegroundColor White
Write-Host "4. Document performance metrics" -ForegroundColor White
Write-Host "5. Optimize any bottlenecks identified" -ForegroundColor White
Write-Host ""

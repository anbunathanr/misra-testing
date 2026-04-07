# Test Coverage Analysis Script for MISRA C++ Analysis
# This script runs tests with coverage and generates a detailed report

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MISRA C++ Analysis - Test Coverage" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous coverage data
Write-Host "[1/4] Cleaning previous coverage data..." -ForegroundColor Yellow
if (Test-Path "coverage") {
    Remove-Item -Recurse -Force "coverage"
    Write-Host "✓ Cleaned coverage directory" -ForegroundColor Green
}

# Step 2: Run tests with coverage
Write-Host ""
Write-Host "[2/4] Running tests with coverage..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray
Write-Host ""

$testOutput = npm test -- --coverage --coverageReporters=text --coverageReporters=html --coverageReporters=json-summary 2>&1

# Check if tests passed
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Tests completed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Some tests failed (Exit code: $LASTEXITCODE)" -ForegroundColor Yellow
}

# Step 3: Parse coverage summary
Write-Host ""
Write-Host "[3/4] Analyzing coverage..." -ForegroundColor Yellow

if (Test-Path "coverage/coverage-summary.json") {
    $coverageData = Get-Content "coverage/coverage-summary.json" | ConvertFrom-Json
    $total = $coverageData.total
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Coverage Summary" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Lines:      $($total.lines.pct)% ($($total.lines.covered)/$($total.lines.total))" -ForegroundColor $(if ($total.lines.pct -ge 95) { "Green" } elseif ($total.lines.pct -ge 80) { "Yellow" } else { "Red" })
    Write-Host "Statements: $($total.statements.pct)% ($($total.statements.covered)/$($total.statements.total))" -ForegroundColor $(if ($total.statements.pct -ge 95) { "Green" } elseif ($total.statements.pct -ge 80) { "Yellow" } else { "Red" })
    Write-Host "Functions:  $($total.functions.pct)% ($($total.functions.covered)/$($total.functions.total))" -ForegroundColor $(if ($total.functions.pct -ge 95) { "Green" } elseif ($total.functions.pct -ge 80) { "Yellow" } else { "Red" })
    Write-Host "Branches:   $($total.branches.pct)% ($($total.branches.covered)/$($total.branches.total))" -ForegroundColor $(if ($total.branches.pct -ge 95) { "Green" } elseif ($total.branches.pct -ge 80) { "Yellow" } else { "Red" })
    Write-Host ""
    
    # Check if we meet the 95% goal
    if ($total.lines.pct -ge 95 -and $total.statements.pct -ge 95 -and $total.functions.pct -ge 95 -and $total.branches.pct -ge 95) {
        Write-Host "✓ Coverage goal achieved (95%+)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Coverage below 95% goal" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To reach 95% coverage, focus on:" -ForegroundColor Yellow
        if ($total.lines.pct -lt 95) {
            Write-Host "  - Lines: Need $(95 - $total.lines.pct)% more coverage" -ForegroundColor Gray
        }
        if ($total.statements.pct -lt 95) {
            Write-Host "  - Statements: Need $(95 - $total.statements.pct)% more coverage" -ForegroundColor Gray
        }
        if ($total.functions.pct -lt 95) {
            Write-Host "  - Functions: Need $(95 - $total.functions.pct)% more coverage" -ForegroundColor Gray
        }
        if ($total.branches.pct -lt 95) {
            Write-Host "  - Branches: Need $(95 - $total.branches.pct)% more coverage" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "⚠ Coverage summary not found" -ForegroundColor Yellow
}

# Step 4: Identify low-coverage files
Write-Host ""
Write-Host "[4/4] Identifying low-coverage files..." -ForegroundColor Yellow

if (Test-Path "coverage/coverage-summary.json") {
    $coverageData = Get-Content "coverage/coverage-summary.json" | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "Files with < 95% coverage:" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Gray
    
    $lowCoverageFiles = @()
    
    foreach ($file in $coverageData.PSObject.Properties) {
        if ($file.Name -ne "total") {
            $fileCoverage = $file.Value
            $avgCoverage = ($fileCoverage.lines.pct + $fileCoverage.statements.pct + $fileCoverage.functions.pct + $fileCoverage.branches.pct) / 4
            
            if ($avgCoverage -lt 95) {
                $lowCoverageFiles += [PSCustomObject]@{
                    File = $file.Name
                    Lines = $fileCoverage.lines.pct
                    Statements = $fileCoverage.statements.pct
                    Functions = $fileCoverage.functions.pct
                    Branches = $fileCoverage.branches.pct
                    Average = [math]::Round($avgCoverage, 2)
                }
            }
        }
    }
    
    if ($lowCoverageFiles.Count -gt 0) {
        $lowCoverageFiles | Sort-Object Average | Format-Table -AutoSize
        Write-Host ""
        Write-Host "Total files needing attention: $($lowCoverageFiles.Count)" -ForegroundColor Yellow
    } else {
        Write-Host "✓ All files have 95%+ coverage!" -ForegroundColor Green
    }
}

# Final summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open coverage report: coverage/index.html" -ForegroundColor White
Write-Host "2. Review low-coverage files listed above" -ForegroundColor White
Write-Host "3. Write tests for uncovered code paths" -ForegroundColor White
Write-Host "4. Focus on MISRA rule implementations" -ForegroundColor White
Write-Host ""
Write-Host "To open the HTML report:" -ForegroundColor Gray
Write-Host "  Start-Process coverage/index.html" -ForegroundColor Gray
Write-Host ""

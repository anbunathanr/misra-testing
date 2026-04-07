# MISRA Rule Accuracy Validation Script
# This script validates MISRA rule detection accuracy using test files

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MISRA Rule Accuracy Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if test files exist
$testFilesDir = "test-files"
if (-not (Test-Path $testFilesDir)) {
    Write-Host "Creating test files directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $testFilesDir | Out-Null
}

# Create sample test files if they don't exist
$misraCViolations = "$testFilesDir/misra-c-violations.c"
$misraCppViolations = "$testFilesDir/misra-cpp-violations.cpp"
$misraCompliant = "$testFilesDir/misra-compliant.c"

if (-not (Test-Path $misraCViolations)) {
    Write-Host "Creating sample MISRA C violations file..." -ForegroundColor Yellow
    @"
/* MISRA C Violations Test File */
/* This file contains known MISRA C:2012 violations for testing */

#include <stdio.h>

/* Rule 2.1: Unreachable code */
int test_rule_2_1() {
    return 1;
    printf("This is unreachable\n");  /* Violation: Rule 2.1 */
}

/* Rule 8.2: Function prototypes */
int test_rule_8_2();  /* Missing parameter types - Violation: Rule 8.2 */

/* Rule 9.1: Uninitialized variables */
int test_rule_9_1() {
    int x;
    return x + 1;  /* Violation: Rule 9.1 - x is uninitialized */
}

/* Rule 10.1: Implicit conversions */
int test_rule_10_1() {
    unsigned int u = 10;
    int s = -5;
    return u + s;  /* Violation: Rule 10.1 - implicit conversion */
}

/* Rule 11.1: Pointer conversions */
void test_rule_11_1() {
    int x = 42;
    void (*func_ptr)() = (void (*)())&x;  /* Violation: Rule 11.1 */
}

/* Rule 11.3: Pointer casts */
void test_rule_11_3() {
    int x = 42;
    char *p = (char *)&x;  /* Violation: Rule 11.3 */
}

/* Rule 13.3: Side effects in expressions */
int test_rule_13_3() {
    int x = 0;
    return (x++) + (x++);  /* Violation: Rule 13.3 */
}

/* Rule 13.4: Assignment in expressions */
int test_rule_13_4(int x) {
    if (x = 5) {  /* Violation: Rule 13.4 - assignment in condition */
        return x;
    }
    return 0;
}

/* Rule 15.1: goto statement */
void test_rule_15_1() {
    goto label;  /* Violation: Rule 15.1 */
    label:
    printf("After goto\n");
}

/* Rule 15.4: Multiple break statements */
void test_rule_15_4(int x) {
    switch(x) {
        case 1:
            break;
            break;  /* Violation: Rule 15.4 */
        default:
            break;
    }
}

/* Rule 15.5: Multiple exit points */
int test_rule_15_5(int x) {
    if (x > 0) {
        return 1;  /* First exit */
    }
    if (x < 0) {
        return -1;  /* Second exit - Violation: Rule 15.5 */
    }
    return 0;  /* Third exit */
}

/* Rule 16.3: Fall-through in switch */
void test_rule_16_3(int x) {
    switch(x) {
        case 1:
            printf("One\n");
            /* Fall-through - Violation: Rule 16.3 */
        case 2:
            printf("Two\n");
            break;
        default:
            break;
    }
}

/* Rule 17.7: Unused return value */
void test_rule_17_7() {
    printf("Hello\n");  /* Violation: Rule 17.7 - return value not used */
}

/* Rule 20.9: Preprocessor directives */
#define MAX(a,b) ((a)>(b)?(a):(b))  /* Violation: Rule 20.9 - function-like macro */

/* Rule 21.3: Memory allocation */
#include <stdlib.h>
void test_rule_21_3() {
    int *p = malloc(sizeof(int));  /* Violation: Rule 21.3 */
    free(p);
}

/* Rule 21.6: Standard library functions */
#include <stdio.h>
void test_rule_21_6() {
    FILE *f = fopen("test.txt", "r");  /* Violation: Rule 21.6 */
    fclose(f);
}

/* Rule 22.1: File operations */
void test_rule_22_1() {
    FILE *f = fopen("test.txt", "r");
    fclose(f);
    fclose(f);  /* Violation: Rule 22.1 - double close */
}

/* Rule 22.2: File pointer usage */
void test_rule_22_2() {
    FILE *f;
    fprintf(f, "test");  /* Violation: Rule 22.2 - uninitialized file pointer */
}

int main() {
    printf("MISRA C Violations Test File\n");
    return 0;
}
"@ | Out-File -FilePath $misraCViolations -Encoding UTF8
    Write-Host "✓ Created $misraCViolations" -ForegroundColor Green
}

if (-not (Test-Path $misraCppViolations)) {
    Write-Host "Creating sample MISRA C++ violations file..." -ForegroundColor Yellow
    @"
/* MISRA C++ Violations Test File */
/* This file contains known MISRA C++:2008 violations for testing */

#include <iostream>

/* Rule 0-1-1: Unused code */
static int unused_variable = 42;  /* Violation: Rule 0-1-1 */

/* Rule 0-1-2: Infeasible paths */
void test_rule_0_1_2() {
    if (true) {
        std::cout << "Always executed\n";
    } else {
        std::cout << "Never executed\n";  /* Violation: Rule 0-1-2 */
    }
}

/* Rule 0-1-3: Unused types */
typedef int unused_type;  /* Violation: Rule 0-1-3 */

/* Rule 2-10-1: Identifiers */
int _leading_underscore;  /* Violation: Rule 2-10-1 */

/* Rule 3-1-1: Object declarations */
int x, y, z;  /* Violation: Rule 3-1-1 - multiple declarations */

/* Rule 3-9-1: Types */
int test_rule_3_9_1() {
    return 0;
}
int test_rule_3_9_1() {  /* Violation: Rule 3-9-1 - duplicate definition */
    return 1;
}

/* Rule 5-0-1: Implicit conversions */
void test_rule_5_0_1() {
    float f = 3.14f;
    int i = f;  /* Violation: Rule 5-0-1 */
}

/* Rule 5-2-6: Unary operators */
void test_rule_5_2_6() {
    int x = 5;
    int y = x+++x;  /* Violation: Rule 5-2-6 */
}

/* Rule 6-2-1: Assignment operators */
void test_rule_6_2_1(int x) {
    if (x = 5) {  /* Violation: Rule 6-2-1 */
        std::cout << "Assigned\n";
    }
}

/* Rule 6-4-1: if-else structure */
void test_rule_6_4_1(int x) {
    if (x > 0)
        std::cout << "Positive\n";  /* Violation: Rule 6-4-1 - missing braces */
}

/* Rule 6-5-1: for loop structure */
void test_rule_6_5_1() {
    for (int i = 0; i < 10; i++)
        std::cout << i << "\n";  /* Violation: Rule 6-5-1 - missing braces */
}

/* Rule 7-1-1: Variable initialization */
void test_rule_7_1_1() {
    int x;  /* Violation: Rule 7-1-1 - uninitialized */
    std::cout << x << "\n";
}

/* Rule 8-4-1: Function definitions */
void test_rule_8_4_1();  /* Declaration */
void test_rule_8_4_1() {  /* Violation: Rule 8-4-1 - definition not in same file as declaration */
    std::cout << "Function\n";
}

/* Rule 15-0-3: Exception handling */
void test_rule_15_0_3() {
    try {
        throw 42;  /* Violation: Rule 15-0-3 - throwing non-exception type */
    } catch (int e) {
        std::cout << "Caught: " << e << "\n";
    }
}

int main() {
    std::cout << "MISRA C++ Violations Test File\n";
    return 0;
}
"@ | Out-File -FilePath $misraCppViolations -Encoding UTF8
    Write-Host "✓ Created $misraCppViolations" -ForegroundColor Green
}

if (-not (Test-Path $misraCompliant)) {
    Write-Host "Creating sample MISRA compliant file..." -ForegroundColor Yellow
    @"
/* MISRA Compliant Code */
/* This file should have no MISRA violations */

#include <stdio.h>
#include <stdint.h>

/* Compliant function with proper prototype */
static int32_t add_numbers(int32_t a, int32_t b);

/* Compliant function implementation */
static int32_t add_numbers(int32_t a, int32_t b) {
    int32_t result = a + b;
    return result;
}

/* Compliant function with single exit point */
static int32_t get_sign(int32_t x) {
    int32_t result;
    
    if (x > 0) {
        result = 1;
    } else if (x < 0) {
        result = -1;
    } else {
        result = 0;
    }
    
    return result;
}

/* Compliant switch statement */
static void print_day(int32_t day) {
    switch(day) {
        case 1:
            (void)printf("Monday\n");
            break;
        case 2:
            (void)printf("Tuesday\n");
            break;
        case 3:
            (void)printf("Wednesday\n");
            break;
        default:
            (void)printf("Invalid day\n");
            break;
    }
}

/* Compliant main function */
int main(void) {
    int32_t x = 5;
    int32_t y = 10;
    int32_t sum = add_numbers(x, y);
    
    (void)printf("Sum: %d\n", sum);
    
    int32_t sign = get_sign(x);
    (void)printf("Sign: %d\n", sign);
    
    print_day(1);
    
    return 0;
}
"@ | Out-File -FilePath $misraCompliant -Encoding UTF8
    Write-Host "✓ Created $misraCompliant" -ForegroundColor Green
}

Write-Host ""
Write-Host "Test files ready:" -ForegroundColor Green
Write-Host "  - $misraCViolations" -ForegroundColor Gray
Write-Host "  - $misraCppViolations" -ForegroundColor Gray
Write-Host "  - $misraCompliant" -ForegroundColor Gray
Write-Host ""

# Run analysis on test files
Write-Host "Running MISRA analysis on test files..." -ForegroundColor Yellow
Write-Host ""

# Note: This would require the actual MISRA analysis service to be running
# For now, we'll just provide instructions

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Manual Validation Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Upload test files to the MISRA analysis service" -ForegroundColor White
Write-Host "2. Review the analysis results" -ForegroundColor White
Write-Host "3. Verify that violations are correctly detected:" -ForegroundColor White
Write-Host ""
Write-Host "   Expected violations in misra-c-violations.c:" -ForegroundColor Gray
Write-Host "   - Rule 2.1: Unreachable code" -ForegroundColor Gray
Write-Host "   - Rule 8.2: Function prototypes" -ForegroundColor Gray
Write-Host "   - Rule 9.1: Uninitialized variables" -ForegroundColor Gray
Write-Host "   - Rule 10.1: Implicit conversions" -ForegroundColor Gray
Write-Host "   - Rule 11.1, 11.3: Pointer conversions" -ForegroundColor Gray
Write-Host "   - Rule 13.3, 13.4: Expression side effects" -ForegroundColor Gray
Write-Host "   - Rule 15.1, 15.4, 15.5: Control flow" -ForegroundColor Gray
Write-Host "   - Rule 16.3: Switch fall-through" -ForegroundColor Gray
Write-Host "   - Rule 17.7: Unused return values" -ForegroundColor Gray
Write-Host "   - Rule 20.9, 21.3, 21.6, 22.1, 22.2: Library usage" -ForegroundColor Gray
Write-Host ""
Write-Host "   Expected violations in misra-cpp-violations.cpp:" -ForegroundColor Gray
Write-Host "   - Rule 0-1-1, 0-1-2, 0-1-3: Unused code" -ForegroundColor Gray
Write-Host "   - Rule 2-10-1: Identifier naming" -ForegroundColor Gray
Write-Host "   - Rule 3-1-1, 3-9-1: Declarations" -ForegroundColor Gray
Write-Host "   - Rule 5-0-1, 5-2-6: Type conversions" -ForegroundColor Gray
Write-Host "   - Rule 6-2-1, 6-4-1, 6-5-1: Control structures" -ForegroundColor Gray
Write-Host "   - Rule 7-1-1: Variable initialization" -ForegroundColor Gray
Write-Host "   - Rule 8-4-1: Function definitions" -ForegroundColor Gray
Write-Host "   - Rule 15-0-3: Exception handling" -ForegroundColor Gray
Write-Host ""
Write-Host "   Expected violations in misra-compliant.c:" -ForegroundColor Gray
Write-Host "   - NONE (should be 100% compliant)" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Document any false positives or false negatives" -ForegroundColor White
Write-Host "5. Compare with commercial tool results (if available)" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Automated Testing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run automated rule accuracy tests:" -ForegroundColor White
Write-Host "  npm test -- --testPathPattern='misra.*rules.test.ts'" -ForegroundColor Gray
Write-Host ""
Write-Host "To test specific rule implementations:" -ForegroundColor White
Write-Host "  npm test -- --testPathPattern='rule-engine.test.ts'" -ForegroundColor Gray
Write-Host ""

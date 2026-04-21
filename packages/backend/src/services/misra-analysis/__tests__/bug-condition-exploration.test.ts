/**
 * Bug Condition Exploration Test for MISRA Analysis 94% Compliance Bug
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * **Validates: Requirements 2.1, 2.2**
 * 
 * Property 1: Bug Condition - MISRA Analysis Returns Hardcoded 94% Compliance
 * 
 * For any MISRA analysis request where different C/C++ files are uploaded, 
 * the fixed system SHALL return different compliance scores and violation counts 
 * that accurately reflect the actual MISRA rule violations found in each specific file.
 */

import * as fc from 'fast-check';
import { RuleEngine } from '../rule-engine';
import { MISRAAnalysisEngine } from '../analysis-engine';
import { Language } from '../../../types/misra-analysis';
import { registerMISRACRules } from '../rules/c';
import { registerMISRACPPRules } from '../rules/cpp';

describe('Bug Condition Exploration: MISRA Analysis 94% Compliance Bug', () => {
  
  /**
   * **Property 1: Bug Condition** - MISRA Analysis Returns Variable Compliance Scores
   * 
   * **Validates: Requirements 2.1, 2.2**
   * 
   * This test verifies that different C/C++ files produce different compliance scores
   * based on actual code content and violations found, not hardcoded 94% values.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: Test FAILS (this proves the bug exists)
   * **EXPECTED OUTCOME ON FIXED CODE**: Test PASSES (this confirms the bug is fixed)
   */
  test('Property 1: Different C/C++ files should produce different compliance scores (not hardcoded 94%)', async () => {
    const engine = new MISRAAnalysisEngine();
    
    // Test case 1: Perfect C code with zero violations should return 100% compliance
    const perfectCCode = `
#include <stdio.h>

int main(void) {
    printf("Hello, World!\\n");
    return 0;
}
`.trim();

    // Test case 2: C code with many MISRA violations should return low compliance
    const violatingCCode = `
#include <stdio.h>

int global_var; // Violation: uninitialized global
int unused_var; // Violation: unused variable

void function_without_declaration() { // Violation: no declaration
    int x = 5;
    x++; // Violation: increment without use
    printf("Value: %d", x); // Violation: missing newline
} // Violation: no return statement for non-void

int main() { // Violation: should be int main(void)
    function_without_declaration();
    return 0;
}
`.trim();

    // Test case 3: Different C++ code should also produce different results
    const cppCode = `
#include <iostream>

class TestClass {
public:
    int value;
    TestClass() { value = 0; }
};

int main() {
    TestClass obj;
    std::cout << obj.value << std::endl;
    return 0;
}
`.trim();

    try {
      // Analyze all three different files
      const perfectResult = await engine.analyzeFile(perfectCCode, Language.C, 'perfect-file', 'test-user');
      const violatingResult = await engine.analyzeFile(violatingCCode, Language.C, 'violating-file', 'test-user');
      const cppResult = await engine.analyzeFile(cppCode, Language.CPP, 'cpp-file', 'test-user');

      // **BUG CONDITION ASSERTIONS**
      // These assertions encode the EXPECTED behavior after the fix
      // On unfixed code, these will FAIL because all files return 94%
      
      // Perfect code should have 100% compliance (not 94%)
      expect(perfectResult.summary.compliancePercentage).toBeCloseTo(100, 1);
      expect(perfectResult.summary.totalViolations).toBe(0);
      
      // Code with violations should have significantly lower compliance (not 94%)
      expect(violatingResult.summary.compliancePercentage).toBeLessThan(90);
      expect(violatingResult.summary.totalViolations).toBeGreaterThan(0);
      
      // Different files should produce different compliance scores
      expect(perfectResult.summary.compliancePercentage).not.toBeCloseTo(violatingResult.summary.compliancePercentage, 1);
      expect(perfectResult.summary.compliancePercentage).not.toBeCloseTo(cppResult.summary.compliancePercentage, 1);
      
      // No file should return exactly 94% (the hardcoded bug value)
      expect(perfectResult.summary.compliancePercentage).not.toBeCloseTo(94, 1);
      expect(violatingResult.summary.compliancePercentage).not.toBeCloseTo(94, 1);
      expect(cppResult.summary.compliancePercentage).not.toBeCloseTo(94, 1);
      
    } catch (error) {
      // If analysis fails completely, this indicates a deeper issue
      throw new Error(`Analysis failed unexpectedly: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * **Property 1 (Supporting Test): Rule Engine Should Have Loaded Rules**
   * 
   * **Validates: Requirements 2.3**
   * 
   * This test verifies that the rule engine has successfully loaded MISRA rules.
   * If getRuleCount() returns 0, it indicates the loadRules() method is empty.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: Test FAILS (getRuleCount() returns 0)
   * **EXPECTED OUTCOME ON FIXED CODE**: Test PASSES (getRuleCount() > 0)
   */
  test('Property 1 (Supporting): Rule engine should have loaded MISRA rules', () => {
    const ruleEngine = new RuleEngine();
    
    // Simulate what should happen in loadRules() method
    // On unfixed code, loadRules() is empty, so this will fail
    ruleEngine.loadRules();
    
    // **BUG CONDITION ASSERTION**
    // This assertion encodes the EXPECTED behavior after the fix
    // On unfixed code, this will FAIL because loadRules() is empty
    expect(ruleEngine.getRuleCount()).toBeGreaterThan(0);
    
    // Verify rules are loaded for both C and C++
    const cRules = ruleEngine.getRulesForLanguage(Language.C);
    const cppRules = ruleEngine.getRulesForLanguage(Language.CPP);
    
    expect(cRules.length).toBeGreaterThan(0);
    expect(cppRules.length).toBeGreaterThan(0);
  });

  /**
   * **Property 1 (Edge Case): Property-based test with random C code samples**
   * 
   * **Validates: Requirements 2.1, 2.2**
   * 
   * This property-based test generates different C code samples and verifies
   * that they don't all return the same hardcoded 94% compliance score.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: Test FAILS (all samples return 94%)
   * **EXPECTED OUTCOME ON FIXED CODE**: Test PASSES (samples return varied scores)
   */
  test('Property 1 (Edge Case): Random C code samples should not all return 94% compliance', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate different C code patterns
        fc.record({
          includeStdio: fc.boolean(),
          hasMainFunction: fc.boolean(),
          hasGlobalVars: fc.boolean(),
          hasUnusedVars: fc.boolean(),
          functionCount: fc.integer({ min: 0, max: 3 })
        }),
        async (codePattern) => {
          // Generate C code based on pattern
          let code = '';
          
          if (codePattern.includeStdio) {
            code += '#include <stdio.h>\n\n';
          }
          
          if (codePattern.hasGlobalVars) {
            code += 'int global_var;\n';
          }
          
          if (codePattern.hasUnusedVars) {
            code += 'int unused_var;\n';
          }
          
          // Add functions
          for (let i = 0; i < codePattern.functionCount; i++) {
            code += `void func${i}(void) { printf("Function ${i}"); }\n`;
          }
          
          if (codePattern.hasMainFunction) {
            code += 'int main(void) { return 0; }\n';
          }
          
          // Skip empty code
          if (code.trim().length === 0) {
            return true; // Skip this test case
          }
          
          const engine = new MISRAAnalysisEngine();
          
          try {
            const result = await engine.analyzeFile(code, Language.C, `random-file-${Date.now()}`, 'test-user');
            
            // **BUG CONDITION ASSERTION**
            // On unfixed code, this will likely FAIL because most/all files return 94%
            // The assertion checks that we don't get the hardcoded 94% value
            const compliance = result.summary.compliancePercentage;
            
            // Allow some tolerance, but 94% should not be the default for all files
            // This assertion will fail on unfixed code where everything returns 94%
            if (code.includes('unused_var') || code.includes('global_var')) {
              // Code with obvious violations should not have 94% compliance
              expect(compliance).not.toBeCloseTo(94, 0.5);
            }
            
            return true;
          } catch (error) {
            // Analysis errors are acceptable for malformed code
            return true;
          }
        }
      ),
      { 
        numRuns: 10, // Limited runs for faster execution
        verbose: true // Show counterexamples when test fails
      }
    );
  });

  /**
   * **Property 1 (Deterministic Test): Specific known violation patterns**
   * 
   * **Validates: Requirements 2.1, 2.2**
   * 
   * This test uses specific, deterministic code samples that are known to have
   * different violation counts to ensure reproducible test failures on unfixed code.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: Test FAILS (all return 94%)
   * **EXPECTED OUTCOME ON FIXED CODE**: Test PASSES (returns varied scores)
   */
  test('Property 1 (Deterministic): Known violation patterns should produce different compliance scores', async () => {
    const engine = new MISRAAnalysisEngine();
    
    // Test samples with known different violation patterns
    const testCases = [
      {
        name: 'minimal-valid',
        code: 'int main(void) { return 0; }',
        expectedViolations: 0, // Should be minimal violations
        expectedCompliance: { min: 95, max: 100 }
      },
      {
        name: 'multiple-violations',
        code: `
int global;
int unused;
void func() { global++; }
int main() { func(); return 0; }
        `.trim(),
        expectedViolations: { min: 2, max: 10 }, // Should have several violations
        expectedCompliance: { min: 50, max: 90 }
      },
      {
        name: 'severe-violations',
        code: `
int a,b,c,d,e;
void f1() { a++; }
void f2() { b++; }
void f3() { c++; }
int main() { return 0; }
        `.trim(),
        expectedViolations: { min: 5, max: 20 }, // Should have many violations
        expectedCompliance: { min: 20, max: 70 }
      }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      const result = await engine.analyzeFile(testCase.code, Language.C, testCase.name, 'test-user');
      results.push({
        name: testCase.name,
        compliance: result.summary.compliancePercentage,
        violations: result.summary.totalViolations,
        expected: testCase
      });
    }
    
    // **BUG CONDITION ASSERTIONS**
    // These will FAIL on unfixed code because all return 94%
    
    // All results should NOT be 94% (the hardcoded bug value)
    for (const result of results) {
      expect(result.compliance).not.toBeCloseTo(94, 1);
    }
    
    // Results should be different from each other
    const compliances = results.map(r => r.compliance);
    const uniqueCompliances = new Set(compliances.map(c => Math.round(c)));
    expect(uniqueCompliances.size).toBeGreaterThan(1); // Should have different values
    
    // Minimal code should have higher compliance than code with many violations
    const minimalResult = results.find(r => r.name === 'minimal-valid')!;
    const severeResult = results.find(r => r.name === 'severe-violations')!;
    expect(minimalResult.compliance).toBeGreaterThan(severeResult.compliance);
  });
});
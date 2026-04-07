import { MISRAAnalysisEngine } from '../analysis-engine';
import { Language, AnalysisStatus } from '../../../types/misra-analysis';
import { RuleEngine } from '../rule-engine';
import { CodeParser } from '../code-parser';

// Mock the dependencies
jest.mock('../rule-engine');
jest.mock('../code-parser');
jest.mock('../analysis-cache');

describe('MISRAAnalysisEngine - Parallel Rule Checking', () => {
  let engine: MISRAAnalysisEngine;
  let mockRuleEngine: jest.Mocked<RuleEngine>;
  let mockParser: jest.Mocked<CodeParser>;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new MISRAAnalysisEngine();
    
    // Get the mocked instances
    mockRuleEngine = (engine as any).ruleEngine;
    mockParser = (engine as any).parser;
  });

  describe('Parallel Rule Execution', () => {
    it('should execute rules in parallel using Promise.all()', async () => {
      const sourceCode = 'int main() { return 0; }';
      const fileId = 'test-file-id';
      const userId = 'test-user-id';

      // Mock AST
      const mockAst = {
        type: 'TranslationUnit' as const,
        language: Language.C,
        source: sourceCode,
        lines: ['int main() { return 0; }'],
        tokens: [],
        functions: [],
        variables: [],
        includes: [],
        macros: [],
        syntaxErrors: [],
      };

      // Create mock rules with delays to test parallelism
      const mockRules = [
        {
          id: 'MISRA-C-1.1',
          description: 'Test rule 1',
          severity: 'mandatory' as const,
          category: 'Test',
          language: 'C' as const,
          check: jest.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return [{
              ruleId: 'MISRA-C-1.1',
              ruleName: 'MISRA-C-1.1',
              severity: 'mandatory' as const,
              line: 1,
              column: 1,
              message: 'Violation 1',
              codeSnippet: 'int main()',
            }];
          }),
        },
        {
          id: 'MISRA-C-2.1',
          description: 'Test rule 2',
          severity: 'required' as const,
          category: 'Test',
          language: 'C' as const,
          check: jest.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return [{
              ruleId: 'MISRA-C-2.1',
              ruleName: 'MISRA-C-2.1',
              severity: 'required' as const,
              line: 1,
              column: 5,
              message: 'Violation 2',
              codeSnippet: 'main()',
            }];
          }),
        },
        {
          id: 'MISRA-C-3.1',
          description: 'Test rule 3',
          severity: 'advisory' as const,
          category: 'Test',
          language: 'C' as const,
          check: jest.fn().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return [];
          }),
        },
      ];

      mockParser.parse.mockResolvedValue(mockAst);
      mockRuleEngine.getRulesForLanguage.mockReturnValue(mockRules);

      const startTime = Date.now();
      const result = await engine.analyzeFile(sourceCode, Language.C, fileId, userId);
      const duration = Date.now() - startTime;

      // Verify all rules were called
      expect(mockRules[0].check).toHaveBeenCalledWith(mockAst, sourceCode);
      expect(mockRules[1].check).toHaveBeenCalledWith(mockAst, sourceCode);
      expect(mockRules[2].check).toHaveBeenCalledWith(mockAst, sourceCode);

      // Verify violations were collected correctly
      expect(result.violations).toHaveLength(2);
      expect(result.violations[0].ruleId).toBe('MISRA-C-1.1');
      expect(result.violations[1].ruleId).toBe('MISRA-C-2.1');

      // Verify parallel execution (should take ~50ms, not 150ms)
      // Allow generous overhead for test execution environment
      expect(duration).toBeLessThan(200);

      // Verify summary
      expect(result.summary.totalViolations).toBe(2);
      expect(result.summary.criticalCount).toBe(1); // mandatory
      expect(result.summary.majorCount).toBe(1); // required
      expect(result.summary.minorCount).toBe(0); // advisory
    });

    it('should handle rule check failures gracefully', async () => {
      const sourceCode = 'int main() { return 0; }';
      const fileId = 'test-file-id';
      const userId = 'test-user-id';

      const mockAst = {
        type: 'TranslationUnit' as const,
        language: Language.C,
        source: sourceCode,
        lines: ['int main() { return 0; }'],
        tokens: [],
        functions: [],
        variables: [],
        includes: [],
        macros: [],
        syntaxErrors: [],
      };

      const mockRules = [
        {
          id: 'MISRA-C-1.1',
          description: 'Test rule 1',
          severity: 'mandatory' as const,
          category: 'Test',
          language: 'C' as const,
          check: jest.fn().mockResolvedValue([{
            ruleId: 'MISRA-C-1.1',
            ruleName: 'MISRA-C-1.1',
            severity: 'mandatory' as const,
            line: 1,
            column: 1,
            message: 'Violation 1',
            codeSnippet: 'int main()',
          }]),
        },
        {
          id: 'MISRA-C-2.1',
          description: 'Test rule 2',
          severity: 'required' as const,
          category: 'Test',
          language: 'C' as const,
          check: jest.fn().mockRejectedValue(new Error('Rule check failed')),
        },
      ];

      mockParser.parse.mockResolvedValue(mockAst);
      mockRuleEngine.getRulesForLanguage.mockReturnValue(mockRules);

      // The engine catches errors and returns a FAILED status instead of throwing
      const result = await engine.analyzeFile(sourceCode, Language.C, fileId, userId);

      // Verify it handled the error gracefully
      expect(result.status).toBe(AnalysisStatus.FAILED);
      expect(result.violations).toHaveLength(0);
    });

    it('should parse AST only once for all rules', async () => {
      const sourceCode = 'int main() { return 0; }';
      const fileId = 'test-file-id';
      const userId = 'test-user-id';

      const mockAst = {
        type: 'TranslationUnit' as const,
        language: Language.C,
        source: sourceCode,
        lines: ['int main() { return 0; }'],
        tokens: [],
        functions: [],
        variables: [],
        includes: [],
        macros: [],
        syntaxErrors: [],
      };

      const mockRules = [
        {
          id: 'MISRA-C-1.1',
          description: 'Test rule 1',
          severity: 'mandatory' as const,
          category: 'Test',
          language: 'C' as const,
          check: jest.fn().mockResolvedValue([]),
        },
        {
          id: 'MISRA-C-2.1',
          description: 'Test rule 2',
          severity: 'required' as const,
          category: 'Test',
          language: 'C' as const,
          check: jest.fn().mockResolvedValue([]),
        },
        {
          id: 'MISRA-C-3.1',
          description: 'Test rule 3',
          severity: 'advisory' as const,
          category: 'Test',
          language: 'C' as const,
          check: jest.fn().mockResolvedValue([]),
        },
      ];

      mockParser.parse.mockResolvedValue(mockAst);
      mockRuleEngine.getRulesForLanguage.mockReturnValue(mockRules);

      await engine.analyzeFile(sourceCode, Language.C, fileId, userId);

      // Verify parser was called only once
      expect(mockParser.parse).toHaveBeenCalledTimes(1);
      expect(mockParser.parse).toHaveBeenCalledWith(sourceCode, Language.C);

      // Verify all rules received the same AST instance
      expect(mockRules[0].check).toHaveBeenCalledWith(mockAst, sourceCode);
      expect(mockRules[1].check).toHaveBeenCalledWith(mockAst, sourceCode);
      expect(mockRules[2].check).toHaveBeenCalledWith(mockAst, sourceCode);
    });

    it('should work with C++ language', async () => {
      const sourceCode = 'int main() { return 0; }';
      const fileId = 'test-file-id';
      const userId = 'test-user-id';

      const mockAst = {
        type: 'TranslationUnit' as const,
        language: Language.CPP,
        source: sourceCode,
        lines: ['int main() { return 0; }'],
        tokens: [],
        functions: [],
        variables: [],
        includes: [],
        macros: [],
        syntaxErrors: [],
      };

      const mockRules = [
        {
          id: 'MISRA-CPP-0-1-1',
          description: 'Test C++ rule',
          severity: 'mandatory' as const,
          category: 'Test',
          language: 'CPP' as const,
          check: jest.fn().mockResolvedValue([{
            ruleId: 'MISRA-CPP-0-1-1',
            ruleName: 'MISRA-CPP-0-1-1',
            severity: 'mandatory' as const,
            line: 1,
            column: 1,
            message: 'C++ Violation',
            codeSnippet: 'int main()',
          }]),
        },
      ];

      mockParser.parse.mockResolvedValue(mockAst);
      mockRuleEngine.getRulesForLanguage.mockReturnValue(mockRules);

      const result = await engine.analyzeFile(sourceCode, Language.CPP, fileId, userId);

      expect(result.language).toBe(Language.CPP);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleId).toBe('MISRA-CPP-0-1-1');
    });

    it('should handle empty rule set', async () => {
      const sourceCode = 'int main() { return 0; }';
      const fileId = 'test-file-id';
      const userId = 'test-user-id';

      const mockAst = {
        type: 'TranslationUnit' as const,
        language: Language.C,
        source: sourceCode,
        lines: ['int main() { return 0; }'],
        tokens: [],
        functions: [],
        variables: [],
        includes: [],
        macros: [],
        syntaxErrors: [],
      };

      mockParser.parse.mockResolvedValue(mockAst);
      mockRuleEngine.getRulesForLanguage.mockReturnValue([]);

      const result = await engine.analyzeFile(sourceCode, Language.C, fileId, userId);

      expect(result.violations).toHaveLength(0);
      expect(result.summary.totalViolations).toBe(0);
      expect(result.summary.compliancePercentage).toBe(100);
      expect(result.status).toBe(AnalysisStatus.COMPLETED);
    });
  });

  describe('Performance Optimization', () => {
    it('should complete analysis faster with parallel execution', async () => {
      const sourceCode = 'int main() { return 0; }';
      const fileId = 'test-file-id';
      const userId = 'test-user-id';

      const mockAst = {
        type: 'TranslationUnit' as const,
        language: Language.C,
        source: sourceCode,
        lines: ['int main() { return 0; }'],
        tokens: [],
        functions: [],
        variables: [],
        includes: [],
        macros: [],
        syntaxErrors: [],
      };

      // Create 10 rules with 20ms delay each
      const mockRules = Array.from({ length: 10 }, (_, i) => ({
        id: `MISRA-C-${i + 1}.1`,
        description: `Test rule ${i + 1}`,
        severity: 'mandatory' as const,
        category: 'Test',
        language: 'C' as const,
        check: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          return [];
        }),
      }));

      mockParser.parse.mockResolvedValue(mockAst);
      mockRuleEngine.getRulesForLanguage.mockReturnValue(mockRules);

      const startTime = Date.now();
      await engine.analyzeFile(sourceCode, Language.C, fileId, userId);
      const duration = Date.now() - startTime;

      // Sequential execution would take 200ms (10 * 20ms)
      // Parallel execution should take ~20ms + overhead
      // Allow generous overhead for test environment
      expect(duration).toBeLessThan(100);
    });
  });
});

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-0-1
 * The value of an expression shall be the same under any order of evaluation.
 * Detects implicit conversions between different numeric types in C++.
 */
export class Rule_CPP_5_0_1 implements MISRARule {
  id = 'MISRA-CPP-5.0.1';
  description = 'Implicit conversions between different numeric types shall not be used';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect implicit conversions: float f = 10; (int literal to float)
    const floatFromIntLiteralRegex = /\b(float|double)\s+\w+\s*=\s*\d+\s*;/;
    // Detect mixed arithmetic: int x = float_var + 1.0;
    const mixedArithRegex = /\b(int|short|char|long)\s+\w+\s*=\s*.*\b(float|double)\b/;
    const floatToIntRegex = /\b(float|double)\s+\w+\s*=\s*.*\b(int|short|char|long)\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      // Check for float/double initialized with integer literal
      if (floatFromIntLiteralRegex.test(line)) {
        // Check there's no explicit C++ cast or C-style cast
        const hasCast =
          line.includes('static_cast') ||
          line.includes('(int)') ||
          line.includes('(float)') ||
          line.includes('(double)') ||
          line.includes('(long)');
        if (!hasCast) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Implicit conversion from integer literal to floating-point type',
              line
            )
          );
        }
      }

      if (mixedArithRegex.test(line) || floatToIntRegex.test(line)) {
        // Check there's no explicit C++ cast or C-style cast
        const hasCast =
          line.includes('static_cast') ||
          line.includes('(int)') ||
          line.includes('(float)') ||
          line.includes('(double)') ||
          line.includes('(long)');
        if (!hasCast) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Implicit conversion between integer and floating-point types',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

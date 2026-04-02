import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 10.1
 * Operands shall not be of an inappropriate essential type.
 * Detects implicit conversions: mixed arithmetic with int and float/double.
 */
export class Rule_C_10_1 implements MISRARule {
  id = 'MISRA-C-10.1';
  description = 'Operands shall not be of an inappropriate essential type';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Look for mixed arithmetic: int variable used with float/double without cast
    // Simple heuristic: look for expressions mixing int and float/double declarations
    const mixedArithRegex = /\b(int|short|char|long)\s+\w+\s*=\s*.*\b(float|double)\b/;
    const floatToIntRegex = /\b(float|double)\s+\w+\s*=\s*.*\b(int|short|char|long)\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      if (mixedArithRegex.test(line) || floatToIntRegex.test(line)) {
        // Check there's no explicit cast
        if (!line.includes('(int)') && !line.includes('(float)') &&
            !line.includes('(double)') && !line.includes('(long)')) {
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

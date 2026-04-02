import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 10.3
 * The value of an expression shall not be assigned to an object with a
 * narrower essential type or of a different essential type category.
 * Detects assignment of wider type (long) to narrower type (int).
 */
export class Rule_C_10_3 implements MISRARule {
  id = 'MISRA-C-10.3';
  description = 'The value of an expression shall not be assigned to an object with a narrower essential type';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect: int x = longVar; or int x = (long)...;
    // Simple heuristic: int/short variable assigned from long expression
    const narrowingRegex = /\b(int|short|char)\s+\w+\s*=\s*[^;]*\blong\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      if (narrowingRegex.test(line)) {
        // Check there's no explicit cast to the narrower type
        if (!line.includes('(int)') && !line.includes('(short)') && !line.includes('(char)')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Assignment of wider type (long) to narrower type without explicit cast',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

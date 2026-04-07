import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 12.1
 * The precedence of operators within expressions should be made explicit.
 * Detects expressions that rely on implicit operator precedence without parentheses.
 */
export class Rule_C_12_1 implements MISRARule {
  id = 'MISRA-C-12.1';
  description = 'The precedence of operators within expressions should be made explicit';
  severity = 'advisory' as const;
  category = 'Expressions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect mixed arithmetic/bitwise without parentheses:
    // e.g. a + b * c, a | b & c, a + b << c
    const mixedPrecedenceRegex = /\b\w+\s*[+\-]\s*\w+\s*[*\/]\s*\w+|\b\w+\s*\|\s*\w+\s*&\s*\w+|\b\w+\s*[+\-]\s*\w+\s*<<\s*\w+/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      if (mixedPrecedenceRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Expression relies on implicit operator precedence; use parentheses to make precedence explicit',
            line
          )
        );
      }
    }

    return violations;
  }
}

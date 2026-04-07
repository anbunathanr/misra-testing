import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 7.3
 * The lowercase character "l" shall not be used in a literal suffix.
 */
export class Rule_C_7_3 implements MISRARule {
  id = 'MISRA-C-7.3';
  description = 'The lowercase character "l" shall not be used in a literal suffix';
  severity = 'required' as const;
  category = 'Literals';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i];
      
      // Match numeric literals with lowercase 'l' suffix
      const lowercaseLMatch = line.match(/\b\d+l\b/g);
      if (lowercaseLMatch) {
        for (const literal of lowercaseLMatch) {
          violations.push(
            createViolation(
              this,
              i + 1,
              line.indexOf(literal),
              `Lowercase 'l' suffix used in literal '${literal}'`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

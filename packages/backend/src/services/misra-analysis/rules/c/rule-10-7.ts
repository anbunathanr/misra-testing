import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 10.7
 * If a composite expression is used as one operand of an operator in which the usual arithmetic conversions are performed then the other operand shall not have wider essential type.
 */
export class Rule_C_10_7 implements MISRARule {
  id = 'MISRA-C-10.7';
  description = 'If a composite expression is used as one operand of an operator in which the usual arithmetic conversions are performed then the other operand shall not have wider essential type';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for composite expression with wider type operand
      if (line.includes('+') || line.includes('-') || line.includes('*') || line.includes('/')) {
        const compositeMatch = line.match(/\([^)]+[+\-*\/][^)]+\)\s*[+\-*\/]\s*\w+/);
        if (compositeMatch) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Composite expression used with potentially wider type operand',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

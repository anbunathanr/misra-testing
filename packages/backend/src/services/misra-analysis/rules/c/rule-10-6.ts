import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 10.6
 * The value of a composite expression shall not be assigned to an object with wider essential type.
 */
export class Rule_C_10_6 implements MISRARule {
  id = 'MISRA-C-10.6';
  description = 'The value of a composite expression shall not be assigned to an object with wider essential type';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for assignment of narrow type expression to wider type
      const wideningMatch = line.match(/(long|double)\s+\w+\s*=\s*\w+\s*[+\-*\/]\s*\w+/);
      if (wideningMatch && !line.includes('(long)') && !line.includes('(double)')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Composite expression assigned to wider type without explicit cast',
            line
          )
        );
      }
    }

    return violations;
  }
}

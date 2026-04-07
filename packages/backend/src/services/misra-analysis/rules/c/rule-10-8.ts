import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 10.8
 * The value of a composite expression shall not be cast to a different essential type category or a wider essential type.
 */
export class Rule_C_10_8 implements MISRARule {
  id = 'MISRA-C-10.8';
  description = 'The value of a composite expression shall not be cast to a different essential type category or a wider essential type';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for cast of composite expression
      const castMatch = line.match(/\((?:int|long|float|double|char)\)\s*\([^)]+[+\-*\/][^)]+\)/);
      if (castMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Composite expression cast to different or wider type',
            line
          )
        );
      }
    }

    return violations;
  }
}

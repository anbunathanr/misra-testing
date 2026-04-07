import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 10.5
 * The value of an expression should not be cast to an inappropriate essential type.
 */
export class Rule_C_10_5 implements MISRARule {
  id = 'MISRA-C-10.5';
  description = 'The value of an expression should not be cast to an inappropriate essential type';
  severity = 'advisory' as const;
  category = 'Conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for pointer to integer casts
      const ptrToIntMatch = line.match(/\((?:int|long|short)\)\s*\w+/);
      if (ptrToIntMatch && line.includes('*')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Inappropriate cast from pointer to integer type',
            line
          )
        );
      }
    }

    return violations;
  }
}

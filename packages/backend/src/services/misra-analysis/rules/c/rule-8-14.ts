import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.14
 * The restrict type qualifier shall not be used.
 */
export class Rule_C_8_14 implements MISRARule {
  id = 'MISRA-C-8.14';
  description = 'The restrict type qualifier shall not be used';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i];
      
      if (line.includes('restrict')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            line.indexOf('restrict'),
            'The restrict type qualifier is not allowed',
            line.trim()
          )
        );
      }
    }

    return violations;
  }
}

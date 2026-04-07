import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 10.2
 * Expressions of essentially character type shall not be used inappropriately in addition and subtraction operations.
 */
export class Rule_C_10_2 implements MISRARule {
  id = 'MISRA-C-10.2';
  description = 'Expressions of essentially character type shall not be used inappropriately in addition and subtraction operations';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for char arithmetic
      const charArithMatch = line.match(/char\s+\w+\s*=\s*[^;]*[+\-][^;]*/);
      if (charArithMatch && !line.includes('(int)')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Character type used in arithmetic operation without cast',
            line
          )
        );
      }
    }

    return violations;
  }
}

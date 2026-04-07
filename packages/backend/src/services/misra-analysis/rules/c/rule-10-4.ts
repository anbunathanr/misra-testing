import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 10.4
 * Both operands of an operator in which the usual arithmetic conversions are performed shall have the same essential type category.
 */
export class Rule_C_10_4 implements MISRARule {
  id = 'MISRA-C-10.4';
  description = 'Both operands of an operator in which the usual arithmetic conversions are performed shall have the same essential type category';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for mixed signed/unsigned operations
      const mixedMatch = line.match(/(unsigned\s+\w+|signed\s+\w+)\s+\w+\s*=\s*\w+\s*[+\-*\/]\s*\w+/);
      if (mixedMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Mixed type operands in arithmetic operation',
            line
          )
        );
      }
    }

    return violations;
  }
}

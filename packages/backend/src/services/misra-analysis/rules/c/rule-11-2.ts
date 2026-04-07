import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 11.2
 * Conversions shall not be performed between a pointer to an incomplete type and any other type.
 */
export class Rule_C_11_2 implements MISRARule {
  id = 'MISRA-C-11.2';
  description = 'Conversions shall not be performed between a pointer to an incomplete type and any other type';
  severity = 'required' as const;
  category = 'Pointers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for void* conversions
      const voidPtrMatch = line.match(/\(void\s*\*\)\s*\w+/);
      if (voidPtrMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Conversion to/from void pointer (incomplete type)',
            line
          )
        );
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 11.6
 * A cast shall not be performed between pointer to void and an arithmetic type.
 */
export class Rule_C_11_6 implements MISRARule {
  id = 'MISRA-C-11.6';
  description = 'A cast shall not be performed between pointer to void and an arithmetic type';
  severity = 'required' as const;
  category = 'Pointers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for void* to arithmetic type
      const voidToArithMatch = line.match(/\((?:int|long|float|double|char)\)\s*\w+/);
      if (voidToArithMatch && line.includes('void')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Cast between void pointer and arithmetic type',
            line
          )
        );
      }
      
      // Check for arithmetic type to void*
      const arithToVoidMatch = line.match(/\(void\s*\*\)\s*\d+/);
      if (arithToVoidMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Cast from arithmetic type to void pointer',
            line
          )
        );
      }
    }

    return violations;
  }
}

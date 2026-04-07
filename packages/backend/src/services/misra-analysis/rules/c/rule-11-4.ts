import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 11.4
 * A conversion should not be performed between a pointer to object and an integer type.
 */
export class Rule_C_11_4 implements MISRARule {
  id = 'MISRA-C-11.4';
  description = 'A conversion should not be performed between a pointer to object and an integer type';
  severity = 'advisory' as const;
  category = 'Pointers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for pointer to int conversion
      const ptrToIntMatch = line.match(/\((?:int|long|unsigned)\)\s*\w+/);
      if (ptrToIntMatch && (line.includes('*') || line.includes('&'))) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Conversion between pointer and integer type',
            line
          )
        );
      }
      
      // Check for int to pointer conversion
      const intToPtrMatch = line.match(/\(\w+\s*\*\)\s*\d+/);
      if (intToPtrMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Conversion from integer to pointer type',
            line
          )
        );
      }
    }

    return violations;
  }
}

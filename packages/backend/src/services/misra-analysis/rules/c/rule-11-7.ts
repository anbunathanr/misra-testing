import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 11.7
 * A cast shall not be performed between pointer to object and a non-integer arithmetic type.
 */
export class Rule_C_11_7 implements MISRARule {
  id = 'MISRA-C-11.7';
  description = 'A cast shall not be performed between pointer to object and a non-integer arithmetic type';
  severity = 'required' as const;
  category = 'Pointers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for pointer to float/double conversion
      const ptrToFloatMatch = line.match(/\((?:float|double)\)\s*\w+/);
      if (ptrToFloatMatch && (line.includes('*') || line.includes('&'))) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Cast between pointer and non-integer arithmetic type',
            line
          )
        );
      }
      
      // Check for float/double to pointer conversion
      const floatToPtrMatch = line.match(/\(\w+\s*\*\)\s*[\d.]+[fF]?/);
      if (floatToPtrMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Cast from non-integer arithmetic type to pointer',
            line
          )
        );
      }
    }

    return violations;
  }
}

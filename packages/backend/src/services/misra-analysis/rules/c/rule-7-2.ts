import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 7.2
 * A "u" or "U" suffix shall be applied to all integer constants that are represented in an unsigned type.
 */
export class Rule_C_7_2 implements MISRARule {
  id = 'MISRA-C-7.2';
  description = 'A "u" or "U" suffix shall be applied to all integer constants that are represented in an unsigned type';
  severity = 'required' as const;
  category = 'Literals';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i];
      
      // Check for unsigned variable initialization without U suffix
      const unsignedMatch = line.match(/unsigned\s+(?:int|long|short|char)\s+\w+\s*=\s*(\d+)(?![uUlL])/);
      if (unsignedMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Unsigned constant '${unsignedMatch[1]}' should have 'U' suffix`,
            line.trim()
          )
        );
      }
    }

    return violations;
  }
}

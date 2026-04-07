import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 6.2
 * Single-bit named bit fields shall not be of a signed type.
 */
export class Rule_C_6_2 implements MISRARule {
  id = 'MISRA-C-6.2';
  description = 'Single-bit named bit fields shall not be of a signed type';
  severity = 'required' as const;
  category = 'Types';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Match single-bit signed bit-fields
      const bitfieldMatch = line.match(/(signed\s+int|signed|int)\s+(\w+)\s*:\s*1/);
      if (bitfieldMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Single-bit field '${bitfieldMatch[2]}' should not be signed`,
            line
          )
        );
      }
    }

    return violations;
  }
}

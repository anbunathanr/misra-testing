import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.11
 * When an array with external linkage is declared, its size should be explicitly specified.
 */
export class Rule_C_8_11 implements MISRARule {
  id = 'MISRA-C-8.11';
  description = 'When an array with external linkage is declared, its size should be explicitly specified';
  severity = 'advisory' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for extern array declarations without size
      const arrayMatch = line.match(/extern\s+\w+\s+(\w+)\s*\[\s*\]/);
      if (arrayMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `External array '${arrayMatch[1]}' should have explicit size`,
            line
          )
        );
      }
    }

    return violations;
  }
}

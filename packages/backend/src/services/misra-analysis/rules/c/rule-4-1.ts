import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 4.1
 * Octal and hexadecimal escape sequences shall be terminated.
 */
export class Rule_C_4_1 implements MISRARule {
  id = 'MISRA-C-4.1';
  description = 'Octal and hexadecimal escape sequences shall be terminated';
  severity = 'required' as const;
  category = 'Character sets';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for octal escape sequences followed by digits
      const octalMatch = line.match(/\\[0-7]{1,3}[0-9]/);
      if (octalMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Octal escape sequence not properly terminated',
            line.trim()
          )
        );
      }

      // Check for hex escape sequences followed by hex digits
      const hexMatch = line.match(/\\x[0-9a-fA-F]+[0-9a-fA-F]/);
      if (hexMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Hexadecimal escape sequence not properly terminated',
            line.trim()
          )
        );
      }
    }

    return violations;
  }
}

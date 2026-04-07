import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 11.5
 * A conversion should not be performed from pointer to void into pointer to object.
 */
export class Rule_C_11_5 implements MISRARule {
  id = 'MISRA-C-11.5';
  description = 'A conversion should not be performed from pointer to void into pointer to object';
  severity = 'advisory' as const;
  category = 'Pointers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for void* to typed pointer conversion
      const voidPtrMatch = line.match(/\((\w+)\s*\*\)\s*\w+/);
      if (voidPtrMatch && line.includes('void')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Conversion from void* to ${voidPtrMatch[1]}*`,
            line
          )
        );
      }
    }

    return violations;
  }
}

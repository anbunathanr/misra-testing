import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 12.2
 * The right hand operand of a shift operator shall lie in the range zero to one less than the width in bits of the essential type of the left hand operand.
 */
export class Rule_C_12_2 implements MISRARule {
  id = 'MISRA-C-12.2';
  description = 'The right hand operand of a shift operator shall lie in the range zero to one less than the width in bits of the essential type of the left hand operand';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for shift operations
      const shiftMatch = line.match(/(\w+)\s*(<<|>>)\s*(\d+)/);
      if (shiftMatch) {
        const shiftAmount = parseInt(shiftMatch[3]);
        
        // Check for common problematic shift amounts
        // Assuming 32-bit integers (common case)
        if (shiftAmount >= 32) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Shift amount ${shiftAmount} exceeds typical integer width`,
              line
            )
          );
        }
        
        // Check for negative shift (if using variable)
        if (shiftAmount < 0) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Shift amount must be non-negative',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

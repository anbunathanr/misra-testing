import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 13.6
 * The operand of the sizeof operator shall not contain any expression which has potential side effects.
 */
export class Rule_C_13_6 implements MISRARule {
  id = 'MISRA-C-13.6';
  description = 'The operand of the sizeof operator shall not contain any expression which has potential side effects';
  severity = 'required' as const;
  category = 'Side effects';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for sizeof with side effects
      const sizeofMatch = line.match(/sizeof\s*\(([^)]+)\)/);
      if (sizeofMatch) {
        const operand = sizeofMatch[1];
        
        // Check for increment/decrement
        if (operand.includes('++') || operand.includes('--')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'sizeof operand contains side effects (++/--)',
              line
            )
          );
        }
        
        // Check for assignment
        if (operand.match(/\w+\s*[+\-*/%&|^]?=/)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'sizeof operand contains assignment',
              line
            )
          );
        }
        
        // Check for function calls (may have side effects)
        if (operand.match(/\w+\s*\(/)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'sizeof operand contains function call with potential side effects',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 13.5
 * The right hand operand of a logical && or || operator shall not contain persistent side effects.
 */
export class Rule_C_13_5 implements MISRARule {
  id = 'MISRA-C-13.5';
  description = 'The right hand operand of a logical && or || operator shall not contain persistent side effects';
  severity = 'required' as const;
  category = 'Side effects';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for side effects after && or ||
      const logicalOpMatch = line.match(/(&&|\|\|)\s*(.+)/);
      if (logicalOpMatch) {
        const rightOperand = logicalOpMatch[2];
        
        // Check for increment/decrement operators
        if (rightOperand.includes('++') || rightOperand.includes('--')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Right operand of logical operator contains side effects (++/--)',
              line
            )
          );
        }
        
        // Check for assignment operators
        if (rightOperand.match(/\w+\s*[+\-*/%&|^]?=/)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Right operand of logical operator contains assignment',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

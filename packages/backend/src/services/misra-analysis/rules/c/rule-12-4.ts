import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 12.4
 * Evaluation of constant expressions should not lead to unsigned integer wrap-around.
 */
export class Rule_C_12_4 implements MISRARule {
  id = 'MISRA-C-12.4';
  description = 'Evaluation of constant expressions should not lead to unsigned integer wrap-around';
  severity = 'advisory' as const;
  category = 'Expressions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for unsigned arithmetic that might wrap
      const unsignedMatch = line.match(/unsigned\s+\w+\s+\w+\s*=\s*(.+);/);
      if (unsignedMatch) {
        const expr = unsignedMatch[1];
        
        // Check for large constant additions/multiplications
        const largeConstMatch = expr.match(/(\d+)\s*[\+\*]\s*(\d+)/);
        if (largeConstMatch) {
          const val1 = parseInt(largeConstMatch[1]);
          const val2 = parseInt(largeConstMatch[2]);
          
          // Check if result might exceed UINT_MAX (simplified check)
          if (val1 > 1000000 || val2 > 1000000) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                'Constant expression may lead to unsigned integer wrap-around',
                line
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

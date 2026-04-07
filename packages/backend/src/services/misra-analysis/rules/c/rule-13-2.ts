import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 13.2
 * The value of an expression and its persistent side effects shall be the same under all permitted evaluation orders.
 */
export class Rule_C_13_2 implements MISRARule {
  id = 'MISRA-C-13.2';
  description = 'The value of an expression and its persistent side effects shall be the same under all permitted evaluation orders';
  severity = 'required' as const;
  category = 'Side effects';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for multiple modifications of same variable in expression
      // e.g., x = x++ or a[i] = i++
      const varModPattern = /(\w+)\s*=.*\1\s*(\+\+|--)/;
      if (varModPattern.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Variable modified multiple times in expression with undefined evaluation order',
            line
          )
        );
      }
      
      // Check for function calls with side effects in same expression
      // e.g., f(x++) + g(x)
      const funcCallsWithSideEffects = line.match(/\w+\([^)]*(\+\+|--)[^)]*\).*\w+\(/);
      if (funcCallsWithSideEffects) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Expression contains side effects with undefined evaluation order',
            line
          )
        );
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-1
 * Each operand of a logical && or || shall be a postfix-expression.
 */
export class Rule_CPP_5_2_1 implements MISRARule {
  id = 'MISRA-CPP-5.2.1';
  description = 'Logical operators shall have postfix-expression operands';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Check for assignment in logical expressions
      if (/&&|\|\|/.test(line) && /=(?!=)/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Assignment used in logical expression',
            line
          )
        );
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-3-1
 * Each operand of the ! operator, the logical && or the logical || operators shall have type bool.
 */
export class Rule_CPP_5_3_1 implements MISRARule {
  id = 'MISRA-CPP-5.3.1';
  description = 'Logical operators shall have bool operands';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Logical operators with non-bool operands: if (ptr), if (x && y) where x,y are int
      if (/\bif\s*\(\s*\w+\s*\)/.test(line) && !/==|!=|<|>|<=|>=/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Non-boolean expression in logical context',
            line
          )
        );
      }
    }

    return violations;
  }
}

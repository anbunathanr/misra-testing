import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-3-4
 * Evaluation of the operand to the sizeof operator shall not contain side effects.
 */
export class Rule_CPP_5_3_4 implements MISRARule {
  id = 'MISRA-CPP-5.3.4';
  description = 'sizeof operand shall not have side effects';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // sizeof with side effects: sizeof(x++), sizeof(func())
      if (/sizeof\s*\([^)]*(\+\+|--|=|func\()/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'sizeof operand contains side effects',
            line
          )
        );
      }
    }

    return violations;
  }
}

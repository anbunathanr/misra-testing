import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-3-2
 * The unary minus operator shall not be applied to an expression whose underlying type is unsigned.
 */
export class Rule_CPP_5_3_2 implements MISRARule {
  id = 'MISRA-CPP-5.3.2';
  description = 'Unary minus shall not be applied to unsigned types';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Unary minus on unsigned: -unsigned_var
      if (/\bunsigned\b/.test(line) && /-\s*\w+/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Unary minus applied to unsigned type',
            line
          )
        );
      }
    }

    return violations;
  }
}

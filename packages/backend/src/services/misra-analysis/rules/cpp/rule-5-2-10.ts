import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-10
 * The increment (++) and decrement (--) operators should not be mixed with other operators in an expression.
 */
export class Rule_CPP_5_2_10 implements MISRARule {
  id = 'MISRA-CPP-5.2.10';
  description = 'Increment/decrement operators shall not be mixed with other operators';
  severity = 'advisory' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // ++ or -- mixed with other operators: a = b++; x = ++y + z;
      if (/(\+\+|--)/.test(line) && /[+\-*\/=]/.test(line) && !/^\s*\w+\s*(\+\+|--)\s*;/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Increment/decrement operator mixed with other operators',
            line
          )
        );
      }
    }

    return violations;
  }
}

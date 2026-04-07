import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-3-3
 * The unary & operator shall not be overloaded.
 */
export class Rule_CPP_5_3_3 implements MISRARule {
  id = 'MISRA-CPP-5.3.3';
  description = 'The unary & operator shall not be overloaded';
  severity = 'required' as const;
  category = 'Operators';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // operator& overloading
      if (/operator\s*&\s*\(/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Unary & operator overloading detected',
            line
          )
        );
      }
    }

    return violations;
  }
}

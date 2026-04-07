import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 4-5-3
 * Expressions with type (plain) char and wchar_t shall not be used as operands to built-in operators other than the assignment operator =, the equality operators == and !=, and the unary & operator.
 */
export class Rule_CPP_4_5_3 implements MISRARule {
  id = 'MISRA-CPP-4.5.3';
  description = 'char and wchar_t shall not be used with arithmetic operators';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      if (/\b(char|wchar_t)\b/.test(line) && /[+\-*\/%<>]/.test(line) && !/==|!=/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'char/wchar_t used with arithmetic or relational operator',
            line
          )
        );
      }
    }

    return violations;
  }
}

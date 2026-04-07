import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 4-5-1
 * Expressions with type bool shall not be used as operands to built-in operators other than the assignment operator =, the logical operators &&, ||, !, the equality operators == and !=, the unary & operator, and the conditional operator.
 * Prevents misuse of boolean expressions.
 */
export class Rule_CPP_4_5_1 implements MISRARule {
  id = 'MISRA-CPP-4.5.1';
  description = 'Boolean expressions shall not be used with arithmetic operators';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Check for bool used with arithmetic operators: +, -, *, /, %, <<, >>
      if (/\bbool\b/.test(line)) {
        if (/[+\-*\/%]|<<|>>/.test(line) && !/==|!=|&&|\|\||!/.test(line)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Boolean expression used with arithmetic operator',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

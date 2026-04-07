import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 4-5-2
 * Expressions with type enum shall not be used as operands to built-in operators other than the subscript operator [ ], the assignment operator =, the equality operators == and !=, the unary & operator, and the relational operators <, <=, >, >=.
 * Prevents misuse of enum expressions.
 */
export class Rule_CPP_4_5_2 implements MISRARule {
  id = 'MISRA-CPP-4.5.2';
  description = 'Enum expressions shall not be used with arithmetic operators';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track enum declarations
    const enums = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Track enum declarations
      const enumMatch = line.match(/\benum\s+(\w+)/);
      if (enumMatch) {
        enums.add(enumMatch[1]);
      }

      // Check for enum used with arithmetic operators
      for (const enumName of enums) {
        if (line.includes(enumName)) {
          if (/[+\-*\/%]|<<|>>|\^|\||&(?!&)/.test(line) && !/==|!=|<=|>=|<|>/.test(line)) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `Enum '${enumName}' used with arithmetic operator`,
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

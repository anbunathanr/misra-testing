import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 7.4
 * A string literal shall not be assigned to an object unless the object's type is pointer to const-qualified char.
 */
export class Rule_C_7_4 implements MISRARule {
  id = 'MISRA-C-7.4';
  description = 'A string literal shall not be assigned to an object unless the object\'s type is pointer to const-qualified char';
  severity = 'required' as const;
  category = 'Literals';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for char* (non-const) assigned string literal
      const nonConstMatch = line.match(/char\s*\*\s*\w+\s*=\s*"[^"]*"/);
      if (nonConstMatch && !line.includes('const')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'String literal assigned to non-const char pointer',
            line
          )
        );
      }
    }

    return violations;
  }
}

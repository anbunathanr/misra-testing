import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 11.8
 * A cast shall not remove any const or volatile qualification from the type pointed to by a pointer.
 */
export class Rule_C_11_8 implements MISRARule {
  id = 'MISRA-C-11.8';
  description = 'A cast shall not remove any const or volatile qualification from the type pointed to by a pointer';
  severity = 'required' as const;
  category = 'Pointers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for cast that removes const
      if (line.includes('const') && line.includes('(')) {
        const castMatch = line.match(/\((\w+\s*\*)\)\s*\w+/);
        if (castMatch && !castMatch[1].includes('const')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Cast removes const qualification from pointer',
              line
            )
          );
        }
      }
      
      // Check for cast that removes volatile
      if (line.includes('volatile') && line.includes('(')) {
        const castMatch = line.match(/\((\w+\s*\*)\)\s*\w+/);
        if (castMatch && !castMatch[1].includes('volatile')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Cast removes volatile qualification from pointer',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 9.2
 * The initializer for an aggregate or union shall be enclosed in braces.
 */
export class Rule_C_9_2 implements MISRARule {
  id = 'MISRA-C-9.2';
  description = 'The initializer for an aggregate or union shall be enclosed in braces';
  severity = 'required' as const;
  category = 'Initialization';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for array initialization without braces
      const arrayMatch = line.match(/\w+\s+\w+\[\d*\]\s*=\s*([^{][^;]*)/);
      if (arrayMatch && !arrayMatch[1].includes('{')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Array initializer should be enclosed in braces',
            line
          )
        );
      }
      
      // Check for struct initialization without braces
      const structMatch = line.match(/struct\s+\w+\s+\w+\s*=\s*([^{][^;]*)/);
      if (structMatch && !structMatch[1].includes('{')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Struct initializer should be enclosed in braces',
            line
          )
        );
      }
    }

    return violations;
  }
}

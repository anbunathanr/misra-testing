import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.10
 * An inline function shall be declared with the static storage class.
 */
export class Rule_C_8_10 implements MISRARule {
  id = 'MISRA-C-8.10';
  description = 'An inline function shall be declared with the static storage class';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for inline functions without static
      if (line.includes('inline') && !line.includes('static')) {
        const funcMatch = line.match(/inline\s+\w+\s+(\w+)\s*\(/);
        if (funcMatch) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Inline function '${funcMatch[1]}' should be declared static`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

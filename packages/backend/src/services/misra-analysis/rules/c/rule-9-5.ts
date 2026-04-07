import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 9.5
 * Where designated initializers are used to initialize an array object the size of the array shall be specified explicitly.
 */
export class Rule_C_9_5 implements MISRARule {
  id = 'MISRA-C-9.5';
  description = 'Where designated initializers are used to initialize an array object the size of the array shall be specified explicitly';
  severity = 'required' as const;
  category = 'Initialization';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for array with designated initializers but no size
      if (line.includes('[') && line.includes(']') && line.includes('=')) {
        const arrayMatch = line.match(/\w+\s+\w+\[\s*\]\s*=\s*\{[^}]*\[/);
        if (arrayMatch) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Array with designated initializers should have explicit size',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

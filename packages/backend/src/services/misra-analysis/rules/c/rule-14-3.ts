import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 14.3
 * Controlling expressions shall not be invariant.
 */
export class Rule_C_14_3 implements MISRARule {
  id = 'MISRA-C-14.3';
  description = 'Controlling expressions shall not be invariant';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for constant conditions in if statements
      const ifMatch = line.match(/if\s*\(\s*(true|false|0|1|NULL)\s*\)/);
      if (ifMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Invariant condition in if statement: ${ifMatch[1]}`,
            line
          )
        );
      }
      
      // Check for constant conditions in while loops
      const whileMatch = line.match(/while\s*\(\s*(true|false|0|1)\s*\)/);
      if (whileMatch && whileMatch[1] !== '1' && whileMatch[1] !== 'true') {
        // while(1) and while(true) are acceptable for infinite loops
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Invariant condition in while loop: ${whileMatch[1]}`,
            line
          )
        );
      }
      
      // Check for constant conditions in for loops
      const forMatch = line.match(/for\s*\([^;]*;\s*(true|false|0|1)\s*;/);
      if (forMatch) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Invariant condition in for loop: ${forMatch[1]}`,
            line
          )
        );
      }
    }

    return violations;
  }
}

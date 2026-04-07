import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 7.1
 * Octal constants shall not be used.
 */
export class Rule_C_7_1 implements MISRARule {
  id = 'MISRA-C-7.1';
  description = 'Octal constants shall not be used';
  severity = 'required' as const;
  category = 'Literals';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i];
      
      // Match octal constants (0 followed by digits)
      const octalMatch = line.match(/\b0[0-7]+\b/g);
      if (octalMatch) {
        for (const octal of octalMatch) {
          // Exclude single 0
          if (octal !== '0') {
            violations.push(
              createViolation(
                this,
                i + 1,
                line.indexOf(octal),
                `Octal constant '${octal}' used`,
                line.trim()
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

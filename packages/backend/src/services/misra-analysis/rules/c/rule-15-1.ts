import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 15.1
 * The goto statement shall not be used.
 * Detects any use of the goto keyword.
 */
export class Rule_C_15_1 implements MISRARule {
  id = 'MISRA-C-15.1';
  description = 'The goto statement shall not be used';
  severity = 'advisory' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect goto keyword usage
    const gotoRegex = /\bgoto\s+\w+/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      if (gotoRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Use of goto statement detected',
            line
          )
        );
      }
    }

    return violations;
  }
}

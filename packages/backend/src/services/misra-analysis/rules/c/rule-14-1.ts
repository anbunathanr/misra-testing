import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 14.1
 * A loop counter shall not have essentially floating-point type.
 * Detects for loop counters declared as float or double.
 */
export class Rule_C_14_1 implements MISRARule {
  id = 'MISRA-C-14.1';
  description = 'A loop counter shall not have essentially floating-point type';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect for loops with float/double counter: for (float f = ...) or for (double d = ...)
    const floatLoopCounterRegex = /\bfor\s*\(\s*(?:float|double)\s+\w+/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      if (floatLoopCounterRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Loop counter has floating-point type; use integer type for loop counters',
            line
          )
        );
      }
    }

    return violations;
  }
}

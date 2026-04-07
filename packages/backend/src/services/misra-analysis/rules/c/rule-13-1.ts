import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 13.1
 * Initializer lists shall not contain persistent side effects.
 * Detects comma operator usage in initializer lists.
 */
export class Rule_C_13_1 implements MISRARule {
  id = 'MISRA-C-13.1';
  description = 'Initializer lists shall not contain persistent side effects';
  severity = 'required' as const;
  category = 'Side effects';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect comma operator in initializer: int arr[] = {(a++, b), c};
    // or variable initializer: int x = (a++, b);
    const commaOpInInitRegex = /=\s*\([^)]*(?:\+\+|--)[^)]*,[^)]*\)/;
    const commaOpSimpleRegex = /=\s*\([^)]+,[^)]+\)\s*;/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      if (commaOpInInitRegex.test(line) || commaOpSimpleRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Initializer list contains comma operator which may have persistent side effects',
            line
          )
        );
      }
    }

    return violations;
  }
}

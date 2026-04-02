import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 20.4
 * A macro shall not be defined with the same name as a keyword.
 * Also: #undef should not be used (common interpretation).
 */
export class Rule_C_20_4 implements MISRARule {
  id = 'MISRA-C-20.4';
  description = '#undef should not be used';
  severity = 'required' as const;
  category = 'Preprocessing';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    const undefRegex = /^\s*#\s*undef\s+(\w+)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(undefRegex);
      if (match) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `#undef '${match[1]}' should not be used`,
            line.trim()
          )
        );
      }
    }

    return violations;
  }
}

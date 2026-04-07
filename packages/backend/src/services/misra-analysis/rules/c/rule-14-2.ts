import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 14.2
 * A for loop shall be well-formed.
 * Detects for loops that don't follow the standard pattern:
 * for (init; condition; update) where each clause is present.
 */
export class Rule_C_14_2 implements MISRARule {
  id = 'MISRA-C-14.2';
  description = 'A for loop shall be well-formed';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect for loops with empty clauses: for(;;), for(;cond;), for(init;;), for(;;update)
    // A well-formed for loop should have all three clauses non-empty
    const emptyForClauseRegex = /\bfor\s*\(\s*;|;\s*;|\bfor\s*\(\s*[^;]*;\s*\)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      if (emptyForClauseRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'For loop is not well-formed; all three clauses (init; condition; update) should be present',
            line
          )
        );
      }
    }

    return violations;
  }
}

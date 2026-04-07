import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 13.4
 * The result of an assignment operator shall not be used.
 * Detects assignment operators used as sub-expressions (e.g., if (x = y)).
 */
export class Rule_C_13_4 implements MISRARule {
  id = 'MISRA-C-13.4';
  description = 'The result of an assignment operator shall not be used';
  severity = 'required' as const;
  category = 'Side effects';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect assignment inside controlling expressions: if (x = y), while (x = y)
    const assignInCondRegex = /\b(?:if|while|for)\s*\([^)]*(?<!=|!|<|>)=(?!=)[^)]*\)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      if (assignInCondRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Assignment operator used as sub-expression in controlling expression',
            line
          )
        );
      }
    }

    return violations;
  }
}

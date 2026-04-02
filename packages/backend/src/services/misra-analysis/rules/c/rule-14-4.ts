import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 14.4
 * The controlling expression of an if statement and the controlling expression
 * of an iteration-statement shall have essentially Boolean type.
 * Detects if conditions that are not boolean comparisons.
 */
export class Rule_C_14_4 implements MISRARule {
  id = 'MISRA-C-14.4';
  description = 'The controlling expression of an if statement shall have essentially Boolean type';
  severity = 'mandatory' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect: if (x) where x is not a comparison/boolean expression
    // Boolean operators: ==, !=, <, >, <=, >=, &&, ||, !
    const ifRegex = /\bif\s*\(([^)]+)\)/;
    const booleanOps = /[=!<>]=|[<>]|&&|\|\||!/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      const match = line.match(ifRegex);
      if (!match) continue;

      const condition = match[1].trim();

      // Skip if condition contains boolean operators
      if (booleanOps.test(condition)) continue;

      // Skip if condition is a function call that likely returns bool
      // (we can't know for sure, so we flag simple variable names)
      if (/^[a-zA-Z_]\w*$/.test(condition)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `if condition '${condition}' is not an essentially Boolean expression`,
            line
          )
        );
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 2.7
 * There should be no unused parameters in functions.
 */
export class Rule_C_2_7 implements MISRARule {
  id = 'MISRA-C-2.7';
  description = 'There should be no unused parameters in functions';
  severity = 'advisory' as const;
  category = 'Unused code';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (const func of ast.functions) {
      if (!func.params || func.params.length === 0) continue;

      for (const param of func.params) {
        let used = false;
        
        // Check if parameter is used anywhere in the source
        const funcLine = func.line;
        for (let i = funcLine; i < Math.min(funcLine + 50, ast.lines.length); i++) {
          const line = ast.lines[i - 1];
          if (line && line.includes(param)) {
            used = true;
            break;
          }
        }

        if (!used) {
          violations.push(
            createViolation(
              this,
              func.line,
              0,
              `Unused parameter '${param}' in function '${func.name}'`,
              ast.lines[func.line - 1] || ''
            )
          );
        }
      }
    }

    return violations;
  }
}

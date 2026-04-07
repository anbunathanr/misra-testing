import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.13
 * A pointer should point to a const-qualified type whenever possible.
 */
export class Rule_C_8_13 implements MISRARule {
  id = 'MISRA-C-8.13';
  description = 'A pointer should point to a const-qualified type whenever possible';
  severity = 'advisory' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (const func of ast.functions) {
      if (!func.params) continue;

      for (const param of func.params) {
        // Check if parameter is a pointer but not const
        if (param.includes('*') && !param.includes('const')) {
          // Check if parameter is modified in function body
          let modified = false;
          const funcLine = func.line;
          for (let i = funcLine; i < Math.min(funcLine + 50, ast.lines.length); i++) {
            const line = ast.lines[i - 1];
            if (line && line.match(new RegExp(`${param.split('*')[0].trim()}\\s*=`))) {
              modified = true;
              break;
            }
          }
          
          if (!modified) {
            violations.push(
              createViolation(
                this,
                func.line,
                0,
                `Pointer parameter '${param}' should be const-qualified`,
                ast.lines[func.line - 1] || ''
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

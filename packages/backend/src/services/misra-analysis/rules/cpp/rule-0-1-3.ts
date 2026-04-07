import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 0-1-3
 * A project shall not contain unused local variables.
 * Detects local variables that are declared but never read.
 */
export class Rule_CPP_0_1_3 implements MISRARule {
  id = 'MISRA-CPP-0.1.3';
  description = 'A project shall not contain unused local variables';
  severity = 'required' as const;
  category = 'Unused code';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect local variable declarations inside function bodies (indented lines)
    const localVarRegex = /^\s{2,}(?:(?:const|static|volatile|auto)\s+)*(?:[a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+([a-zA-Z_]\w*)\s*(?:=.*?)?;\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('#') || !line.trim()) continue;

      const match = line.match(localVarRegex);
      if (!match) continue;

      const varName = match[1];
      const skipNames = ['return', 'break', 'continue', 'else', 'public', 'private', 'protected'];
      if (skipNames.includes(varName)) continue;

      // Check if varName is used anywhere after declaration
      const restOfCode = lines.slice(i + 1).join('\n');
      const usageRegex = new RegExp(`\\b${varName}\\b`);
      if (!usageRegex.test(restOfCode)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Local variable '${varName}' is declared but never used`,
            line.trim()
          )
        );
      }
    }

    return violations;
  }
}

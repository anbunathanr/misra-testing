import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 0-1-1
 * A project shall not contain unreachable code.
 * Detects unused variables (declared but never referenced after declaration).
 */
export class Rule_CPP_0_1_1 implements MISRARule {
  id = 'MISRA-CPP-0.1.1';
  description = 'A project shall not contain unused variables';
  severity = 'required' as const;
  category = 'Unused code';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Find variable declarations and check if they are referenced later
    const varDeclRegex = /^\s*(?:(?:const|static|volatile|mutable|auto|register)\s+)*(?:[a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+([a-zA-Z_]\w*)\s*(?:=.*?)?;\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      const match = line.match(varDeclRegex);
      if (!match) continue;

      const varName = match[1];
      // Skip common keywords that look like variable names
      const skipNames = ['return', 'break', 'continue', 'else', 'public', 'private', 'protected'];
      if (skipNames.includes(varName)) continue;

      // Check if varName is referenced in any subsequent line
      const restOfCode = lines.slice(i + 1).join('\n');
      const usageRegex = new RegExp(`\\b${varName}\\b`);
      if (!usageRegex.test(restOfCode)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Variable '${varName}' is declared but never used`,
            line
          )
        );
      }
    }

    return violations;
  }
}

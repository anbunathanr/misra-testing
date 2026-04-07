import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 0-1-4
 * A project shall not contain non-volatile POD variables having only one use.
 * Detects variables that are assigned once but never read.
 */
export class Rule_CPP_0_1_4 implements MISRARule {
  id = 'MISRA-CPP-0.1.4';
  description = 'A project shall not contain non-volatile POD variables having only one use';
  severity = 'required' as const;
  category = 'Unused code';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Find variable declarations with initialization
    const varDeclRegex = /^\s*(?:(?:const|static|mutable|auto|register)\s+)*(?:[a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+([a-zA-Z_]\w*)\s*=\s*.*;\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line || line.includes('volatile')) continue;

      const match = line.match(varDeclRegex);
      if (!match) continue;

      const varName = match[1];
      
      // Check if varName is used (read) in any subsequent line
      const restOfCode = lines.slice(i + 1).join('\n');
      const usageRegex = new RegExp(`\\b${varName}\\b`);
      
      // Count occurrences - if only in assignment (=), it's write-only
      const matches = restOfCode.match(new RegExp(`\\b${varName}\\b`, 'g'));
      if (!matches || matches.length === 0) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Variable '${varName}' is assigned but never read`,
            line
          )
        );
      }
    }

    return violations;
  }
}

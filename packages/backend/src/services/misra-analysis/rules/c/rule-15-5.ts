import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 15.5
 * A function shall have a single point of exit at the end of the function.
 * Detects functions with multiple return statements.
 */
export class Rule_C_15_5 implements MISRARule {
  id = 'MISRA-C-15.5';
  description = 'A function shall have a single point of exit at the end of the function';
  severity = 'advisory' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // For each function, count return statements
    for (const func of ast.functions) {
      const funcStartLine = func.line;

      // Find the end of the function by tracking braces
      let braceDepth = 0;
      let funcEndLine = funcStartLine;
      let foundOpenBrace = false;

      for (let i = funcStartLine - 1; i < lines.length; i++) {
        const line = lines[i];
        for (const ch of line) {
          if (ch === '{') { braceDepth++; foundOpenBrace = true; }
          if (ch === '}') { braceDepth--; }
        }
        if (foundOpenBrace && braceDepth === 0) {
          funcEndLine = i + 1;
          break;
        }
      }

      // Count return statements in function body
      const returnLines: number[] = [];
      for (let i = funcStartLine; i < funcEndLine; i++) {
        const line = lines[i]?.trim() || '';
        if (/\breturn\b/.test(line) && !line.startsWith('//')) {
          returnLines.push(i + 1);
        }
      }

      // If more than one return, report all but the last
      if (returnLines.length > 1) {
        for (let r = 0; r < returnLines.length - 1; r++) {
          const lineIdx = returnLines[r] - 1;
          violations.push(
            createViolation(
              this,
              returnLines[r],
              0,
              `Function '${func.name}' has multiple exit points`,
              lines[lineIdx]?.trim() || ''
            )
          );
        }
      }
    }

    return violations;
  }
}

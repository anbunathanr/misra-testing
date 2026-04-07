import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 15.4
 * There shall be no more than one break or goto statement used to terminate
 * any iteration statement.
 * Detects multiple break statements in a single loop.
 */
export class Rule_C_15_4 implements MISRARule {
  id = 'MISRA-C-15.4';
  description = 'There shall be no more than one break or goto statement used to terminate any iteration statement';
  severity = 'advisory' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track loop nesting and break counts
    // We look for for/while/do loops and count break statements within them
    const loopKeywords = /\b(for|while|do)\b/;
    const breakRegex = /\bbreak\s*;/;

    let depth = 0;
    const loopStack: { startLine: number; depth: number; breakLines: number[] }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      // Check for loop start
      if (loopKeywords.test(line)) {
        loopStack.push({ startLine: i + 1, depth, breakLines: [] });
      }

      // Track brace depth
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          // Check if we're closing a loop
          if (loopStack.length > 0 && depth === loopStack[loopStack.length - 1].depth + 1) {
            const loop = loopStack.pop()!;
            if (loop.breakLines.length > 1) {
              violations.push(
                createViolation(
                  this,
                  loop.startLine,
                  0,
                  `Loop has ${loop.breakLines.length} break statements; only one break per loop is allowed`,
                  lines[loop.startLine - 1].trim()
                )
              );
            }
          }
          depth--;
        }
      }

      // Count break statements within current loop
      if (breakRegex.test(line) && loopStack.length > 0) {
        loopStack[loopStack.length - 1].breakLines.push(i + 1);
      }
    }

    return violations;
  }
}

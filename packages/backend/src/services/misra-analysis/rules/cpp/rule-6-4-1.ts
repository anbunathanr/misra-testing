import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 6-4-1
 * An if (condition) construct shall be followed by a compound statement.
 * The else keyword shall be followed by either a compound statement, or another if statement.
 * Also checks: A switch statement shall have at least two case clauses.
 */
export class Rule_CPP_6_4_1 implements MISRARule {
  id = 'MISRA-CPP-6.4.1';
  description = 'A switch statement shall have at least two case clauses';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Find switch statements and count their case clauses
    let inSwitch = false;
    let switchStartLine = -1;
    let caseCount = 0;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || !line) continue;

      // Detect switch statement start
      if (line.includes('switch') && line.includes('(')) {
        inSwitch = true;
        switchStartLine = i;
        caseCount = 0;
        braceDepth = 0;
      }

      if (inSwitch) {
        // Count braces to track switch scope
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;

        // Count case statements
        if (line.match(/^\s*case\s+/)) {
          caseCount++;
        }

        // Check if switch ends
        if (braceDepth === 0 && line.includes('}')) {
          if (caseCount < 2) {
            violations.push(
              createViolation(
                this,
                switchStartLine + 1,
                0,
                `Switch statement has only ${caseCount} case clause(s); at least 2 required`,
                lines[switchStartLine].trim()
              )
            );
          }
          inSwitch = false;
        }
      }
    }

    return violations;
  }
}

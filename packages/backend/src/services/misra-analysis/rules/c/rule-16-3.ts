import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 16.3
 * An unconditional break statement shall terminate every switch-clause.
 * Detects switch cases without break or fallthrough comment.
 */
export class Rule_C_16_3 implements MISRARule {
  id = 'MISRA-C-16.3';
  description = 'An unconditional break statement shall terminate every switch-clause';
  severity = 'required' as const;
  category = 'Switch statements';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    let inSwitch = false;
    let switchDepth = 0;
    let caseStartLine = -1;
    let caseLabel = '';
    let hasBreak = false;
    let hasFallthrough = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (/\bswitch\s*\(/.test(line)) {
        inSwitch = true;
        switchDepth = 0;
      }

      if (inSwitch) {
        for (const ch of lines[i]) {
          if (ch === '{') switchDepth++;
          if (ch === '}') switchDepth--;
        }

        if (switchDepth <= 0 && inSwitch) {
          // End of switch - check last case
          if (caseStartLine >= 0 && !hasBreak && !hasFallthrough) {
            violations.push(
              createViolation(
                this,
                caseStartLine,
                0,
                `Switch case '${caseLabel}' does not end with break or fallthrough comment`,
                lines[caseStartLine - 1]?.trim() || ''
              )
            );
          }
          inSwitch = false;
          caseStartLine = -1;
          continue;
        }

        // Detect case/default labels
        if (/^\s*(?:case\s+\S+|default)\s*:/.test(lines[i])) {
          // Check previous case
          if (caseStartLine >= 0 && !hasBreak && !hasFallthrough) {
            violations.push(
              createViolation(
                this,
                caseStartLine,
                0,
                `Switch case '${caseLabel}' does not end with break or fallthrough comment`,
                lines[caseStartLine - 1]?.trim() || ''
              )
            );
          }
          caseStartLine = i + 1;
          caseLabel = line.replace(':', '').trim();
          hasBreak = false;
          hasFallthrough = false;
        }

        if (/\bbreak\s*;/.test(line) || /\breturn\b/.test(line)) {
          hasBreak = true;
        }

        // Allow explicit fallthrough comments
        if (/\/\*\s*falls?\s*through\s*\*\//i.test(line) ||
            /\/\/\s*falls?\s*through/i.test(line) ||
            /\/\*\s*fallthrough\s*\*\//i.test(line)) {
          hasFallthrough = true;
        }
      }
    }

    return violations;
  }
}

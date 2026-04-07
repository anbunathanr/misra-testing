import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 2.5
 * A project should not contain unused macro declarations.
 */
export class Rule_C_2_5 implements MISRARule {
  id = 'MISRA-C-2.5';
  description = 'A project should not contain unused macro declarations';
  severity = 'advisory' as const;
  category = 'Unused code';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;
    const macros = new Map<string, number>();
    const usedMacros = new Set<string>();

    // Find macro definitions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const macroMatch = line.match(/^#define\s+(\w+)/);
      if (macroMatch) {
        macros.set(macroMatch[1], i);
      }
    }

    // Find macro usage
    for (const line of lines) {
      if (line.trim().startsWith('#define')) continue;
      for (const macroName of macros.keys()) {
        if (line.includes(macroName)) {
          usedMacros.add(macroName);
        }
      }
    }

    // Report unused macros
    for (const [macroName, lineNum] of macros) {
      if (!usedMacros.has(macroName)) {
        violations.push(
          createViolation(
            this,
            lineNum + 1,
            0,
            `Unused macro '${macroName}'`,
            lines[lineNum]
          )
        );
      }
    }

    return violations;
  }
}

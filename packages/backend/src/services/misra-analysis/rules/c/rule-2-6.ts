import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 2.6
 * A function should not contain unused label declarations.
 */
export class Rule_C_2_6 implements MISRARule {
  id = 'MISRA-C-2.6';
  description = 'A function should not contain unused label declarations';
  severity = 'advisory' as const;
  category = 'Unused code';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;
    const labels = new Map<string, number>();
    const usedLabels = new Set<string>();

    // Find label declarations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const labelMatch = line.match(/^(\w+):\s*$/);
      if (labelMatch && labelMatch[1] !== 'case' && labelMatch[1] !== 'default') {
        labels.set(labelMatch[1], i);
      }
    }

    // Find goto statements
    for (const line of lines) {
      const gotoMatch = line.match(/goto\s+(\w+)/);
      if (gotoMatch) {
        usedLabels.add(gotoMatch[1]);
      }
    }

    // Report unused labels
    for (const [labelName, lineNum] of labels) {
      if (!usedLabels.has(labelName)) {
        violations.push(
          createViolation(
            this,
            lineNum + 1,
            0,
            `Unused label '${labelName}'`,
            lines[lineNum]
          )
        );
      }
    }

    return violations;
  }
}

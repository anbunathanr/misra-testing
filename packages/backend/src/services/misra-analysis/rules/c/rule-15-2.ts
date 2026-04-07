import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 15.2
 * The goto statement shall jump to a label declared later in the same function.
 * Detects goto jumping forward over declarations (backward jumps are violations).
 */
export class Rule_C_15_2 implements MISRARule {
  id = 'MISRA-C-15.2';
  description = 'The goto statement shall jump to a label declared later in the same function';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Collect all goto statements and labels
    const gotoStatements: { label: string; line: number }[] = [];
    const labelDefinitions: { label: string; line: number }[] = [];

    const gotoRegex = /\bgoto\s+(\w+)\s*;/;
    const labelRegex = /^(\w+)\s*:/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      const gotoMatch = line.match(gotoRegex);
      if (gotoMatch) {
        gotoStatements.push({ label: gotoMatch[1], line: i + 1 });
      }

      const labelMatch = line.match(labelRegex);
      if (labelMatch && !['case', 'default'].includes(labelMatch[1])) {
        labelDefinitions.push({ label: labelMatch[1], line: i + 1 });
      }
    }

    // Check for backward gotos (goto to a label that appears before the goto)
    for (const gotoStmt of gotoStatements) {
      const targetLabel = labelDefinitions.find(l => l.label === gotoStmt.label);
      if (targetLabel && targetLabel.line < gotoStmt.line) {
        violations.push(
          createViolation(
            this,
            gotoStmt.line,
            0,
            `goto '${gotoStmt.label}' jumps backward to line ${targetLabel.line}, which may jump over declarations`,
            lines[gotoStmt.line - 1].trim()
          )
        );
      }
    }

    return violations;
  }
}

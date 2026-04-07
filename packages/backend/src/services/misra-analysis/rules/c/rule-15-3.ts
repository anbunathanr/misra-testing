import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 15.3
 * Any label referenced by a goto statement shall be declared in the same block,
 * or in any block enclosing the goto statement.
 * Detects goto jumping to a label that is not in the same or enclosing block.
 */
export class Rule_C_15_3 implements MISRARule {
  id = 'MISRA-C-15.3';
  description = 'Any label referenced by a goto statement shall be declared in the same block or an enclosing block';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Collect goto statements and label definitions with their brace depth
    const gotoStatements: { label: string; line: number; depth: number }[] = [];
    const labelDefinitions: { label: string; line: number; depth: number }[] = [];

    const gotoRegex = /\bgoto\s+(\w+)\s*;/;
    const labelRegex = /^(\w+)\s*:/;

    let depth = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      // Track brace depth
      for (const ch of line) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }

      const gotoMatch = line.match(gotoRegex);
      if (gotoMatch) {
        gotoStatements.push({ label: gotoMatch[1], line: i + 1, depth });
      }

      const labelMatch = line.match(labelRegex);
      if (labelMatch && !['case', 'default'].includes(labelMatch[1])) {
        labelDefinitions.push({ label: labelMatch[1], line: i + 1, depth });
      }
    }

    // Check for gotos jumping to labels at a deeper nesting level (outside enclosing block)
    for (const gotoStmt of gotoStatements) {
      const targetLabel = labelDefinitions.find(l => l.label === gotoStmt.label);
      if (targetLabel && targetLabel.depth > gotoStmt.depth) {
        violations.push(
          createViolation(
            this,
            gotoStmt.line,
            0,
            `goto '${gotoStmt.label}' jumps to a label outside the current block scope`,
            lines[gotoStmt.line - 1].trim()
          )
        );
      }
    }

    return violations;
  }
}

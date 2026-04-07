import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 13.3
 * A full expression containing an increment (++) or decrement (--) operator
 * should have no other potential side effects other than that caused by the
 * increment or decrement operator.
 * Detects ++ or -- used as sub-expressions (e.g., a = b++).
 */
export class Rule_C_13_3 implements MISRARule {
  id = 'MISRA-C-13.3';
  description = 'A full expression containing an increment or decrement operator should have no other potential side effects';
  severity = 'advisory' as const;
  category = 'Side effects';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect ++ or -- used as part of a larger expression (not standalone statement)
    // e.g.: a = b++; x = ++y + 1; foo(i++);
    const incDecInExprRegex = /(?:=\s*[^;]*(?:\+\+|--)|(?:\+\+|--)[^;]*=|[^;]*(?:\+\+|--)[^;]*[+\-*\/&|])/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      // Skip standalone increment/decrement statements like: i++; or ++i;
      if (/^\w+\s*(?:\+\+|--);\s*$/.test(line) || /^(?:\+\+|--)\s*\w+;\s*$/.test(line)) continue;

      if (incDecInExprRegex.test(line) && (line.includes('++') || line.includes('--'))) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Increment/decrement operator used within a larger expression',
            line
          )
        );
      }
    }

    return violations;
  }
}

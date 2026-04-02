import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 22.1
 * All resources obtained dynamically by means of Standard Library functions
 * shall be explicitly released.
 * Detects fopen() calls without a corresponding fclose().
 */
export class Rule_C_22_1 implements MISRARule {
  id = 'MISRA-C-22.1';
  description = 'All resources obtained dynamically shall be explicitly released';
  severity = 'required' as const;
  category = 'Resources';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track fopen calls and check for matching fclose
    const fopenRegex = /\bfopen\s*\(/;
    const fcloseRegex = /\bfclose\s*\(/;

    let fopenCount = 0;
    let fcloseCount = 0;
    const fopenLines: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (fopenRegex.test(line)) {
        fopenCount++;
        fopenLines.push(i + 1);
      }
      if (fcloseRegex.test(line)) {
        fcloseCount++;
      }
    }

    // Simple heuristic: if more fopen than fclose, report
    if (fopenCount > fcloseCount) {
      for (let i = fcloseCount; i < fopenLines.length; i++) {
        const lineIdx = fopenLines[i] - 1;
        violations.push(
          createViolation(
            this,
            fopenLines[i],
            0,
            'Resource opened with fopen() may not be released before function exit',
            lines[lineIdx]?.trim() || ''
          )
        );
      }
    }

    return violations;
  }
}

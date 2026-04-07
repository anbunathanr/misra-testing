import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 4.2
 * Trigraphs should not be used.
 */
export class Rule_C_4_2 implements MISRARule {
  id = 'MISRA-C-4.2';
  description = 'Trigraphs should not be used';
  severity = 'advisory' as const;
  category = 'Character sets';
  language = 'C' as const;

  private readonly trigraphs = [
    '??=', '??/', "??'", '??(', '??)', '??!', '??<', '??>', '??-'
  ];

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const trigraph of this.trigraphs) {
        if (line.includes(trigraph)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              line.indexOf(trigraph),
              `Trigraph '${trigraph}' used`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

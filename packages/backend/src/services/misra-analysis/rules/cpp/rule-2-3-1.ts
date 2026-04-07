import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 2-3-1
 * Trigraphs shall not be used.
 * Detects trigraph sequences which can cause unexpected behavior.
 */
export class Rule_CPP_2_3_1 implements MISRARule {
  id = 'MISRA-CPP-2.3.1';
  description = 'Trigraphs shall not be used';
  severity = 'required' as const;
  category = 'Lexical conventions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Trigraph sequences: ??=, ??/, ??', ??(, ??), ??!, ??<, ??>, ??-
    const trigraphs = ['??=', '??/', "??'", '??(', '??)', '??!', '??<', '??>', '??-'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const trigraph of trigraphs) {
        if (line.includes(trigraph)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              line.indexOf(trigraph),
              `Trigraph '${trigraph}' detected`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

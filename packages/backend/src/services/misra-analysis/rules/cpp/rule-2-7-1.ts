import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 2-7-1
 * The character sequence /* shall not be used within a C-style comment.
 * Also: Trigraphs shall not be used.
 * Detects trigraph sequences like ??=, ??/, ??', etc.
 */
export class Rule_CPP_2_7_1 implements MISRARule {
  id = 'MISRA-CPP-2.7.1';
  description = 'Trigraphs shall not be used';
  severity = 'required' as const;
  category = 'Lexical conventions';
  language = 'CPP' as const;

  private readonly trigraphs = ['??=', '??/', "??'", '??(', '??)', '??!', '??<', '??>', '??-'];

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
              `Trigraph '${trigraph}' shall not be used`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

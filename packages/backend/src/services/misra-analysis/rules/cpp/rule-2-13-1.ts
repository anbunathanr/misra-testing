import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 2-13-1
 * Only those escape sequences that are defined in ISO/IEC 14882:2003 shall be used.
 * Detects invalid or non-standard escape sequences.
 */
export class Rule_CPP_2_13_1 implements MISRARule {
  id = 'MISRA-CPP-2.13.1';
  description = 'Only standard escape sequences shall be used';
  severity = 'required' as const;
  category = 'Lexical conventions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Valid escape sequences: \n, \t, \r, \b, \f, \v, \\, \', \", \?, \0, \xHH, \ooo
    const validEscapes = /\\[ntrfvb\\'"?0]|\\x[0-9a-fA-F]{1,2}|\\[0-7]{1,3}/g;
    const escapeRegex = /\\./g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;
      
      // Find all escape sequences
      const escapes = line.match(escapeRegex);
      if (!escapes) continue;
      
      for (const escape of escapes) {
        if (!validEscapes.test(escape)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              line.indexOf(escape),
              `Invalid escape sequence '${escape}' detected`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

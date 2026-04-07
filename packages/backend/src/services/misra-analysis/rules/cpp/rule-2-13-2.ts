import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 2-13-2
 * Octal constants (other than zero) and octal escape sequences shall not be used.
 * Detects octal literals which can be confusing.
 */
export class Rule_CPP_2_13_2 implements MISRARule {
  id = 'MISRA-CPP-2.13.2';
  description = 'Octal constants and escape sequences shall not be used';
  severity = 'required' as const;
  category = 'Lexical conventions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Octal literals: 0123, 077 (but not 0, 0x, 0X, 0b, 0B)
    const octalLiteralRegex = /\b0[1-7][0-7]*\b/g;
    
    // Octal escape sequences: \123, \77
    const octalEscapeRegex = /\\[0-7]{1,3}/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;
      
      // Check for octal literals
      const octalLiterals = line.match(octalLiteralRegex);
      if (octalLiterals) {
        for (const literal of octalLiterals) {
          violations.push(
            createViolation(
              this,
              i + 1,
              line.indexOf(literal),
              `Octal literal '${literal}' detected`,
              line.trim()
            )
          );
        }
      }
      
      // Check for octal escape sequences
      const octalEscapes = line.match(octalEscapeRegex);
      if (octalEscapes) {
        for (const escape of octalEscapes) {
          violations.push(
            createViolation(
              this,
              i + 1,
              line.indexOf(escape),
              `Octal escape sequence '${escape}' detected`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

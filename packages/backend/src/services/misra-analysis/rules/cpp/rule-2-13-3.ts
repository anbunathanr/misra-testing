import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 2-13-3
 * A "U" suffix shall be applied to all octal or hexadecimal integer literals of unsigned type.
 * Ensures unsigned literals are explicitly marked.
 */
export class Rule_CPP_2_13_3 implements MISRARule {
  id = 'MISRA-CPP-2.13.3';
  description = 'Unsigned integer literals shall have a "U" suffix';
  severity = 'required' as const;
  category = 'Lexical conventions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Hex literals without U suffix: 0xFF, 0x1234 (but not 0xFFu, 0xFFU)
    const hexWithoutURegex = /\b0[xX][0-9a-fA-F]+(?![uUlL])\b/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;
      
      // Check for unsigned type declarations with hex literals
      if (/\b(unsigned|uint\d+_t)\b/.test(line)) {
        const hexLiterals = line.match(hexWithoutURegex);
        if (hexLiterals) {
          for (const literal of hexLiterals) {
            violations.push(
              createViolation(
                this,
                i + 1,
                line.indexOf(literal),
                `Unsigned literal '${literal}' should have 'U' suffix`,
                line.trim()
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

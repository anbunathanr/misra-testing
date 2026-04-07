import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-0-4
 * An implicit integral conversion shall not change the signedness of the underlying type.
 */
export class Rule_CPP_5_0_4 implements MISRARule {
  id = 'MISRA-CPP-5.0.4';
  description = 'Implicit integral conversions shall not change signedness';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // unsigned to signed or vice versa
      if (/\bunsigned\s+\w+\s*=\s*-\d+/.test(line)) {
        if (!line.includes('cast')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Implicit conversion changes signedness (negative to unsigned)',
              line
            )
          );
        }
      }
      
      if (/\bint\s+\w+\s*=\s*\d+[uU]\b/.test(line)) {
        if (!line.includes('cast')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Implicit conversion changes signedness (unsigned to signed)',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

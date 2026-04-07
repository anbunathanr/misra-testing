import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-0-6
 * An implicit integral or floating-point conversion shall not reduce the size of the underlying type.
 */
export class Rule_CPP_5_0_6 implements MISRARule {
  id = 'MISRA-CPP-5.0.6';
  description = 'Implicit conversions shall not reduce type size';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // long to int, double to float, etc.
      if (/\b(short|char)\s+\w+\s*=\s*.*\b(int|long)\b/.test(line) && !line.includes('cast')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Implicit conversion reduces type size',
            line
          )
        );
      }

      if (/\bfloat\s+\w+\s*=\s*.*\bdouble\b/.test(line) && !line.includes('cast')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Implicit conversion from double to float',
            line
          )
        );
      }
    }

    return violations;
  }
}

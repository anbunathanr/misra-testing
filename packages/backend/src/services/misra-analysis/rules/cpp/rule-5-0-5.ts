import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-0-5
 * There shall be no implicit floating-integral conversions.
 */
export class Rule_CPP_5_0_5 implements MISRARule {
  id = 'MISRA-CPP-5.0.5';
  description = 'No implicit floating-integral conversions';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // float/double = int or int = float/double
      if ((/\b(float|double)\s+\w+\s*=\s*\d+\b/.test(line) || /\b(int|long|short)\s+\w+\s*=\s*\d+\.\d+/.test(line)) && !line.includes('cast')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Implicit floating-integral conversion',
            line
          )
        );
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-7
 * An object with pointer type shall not be converted to an unrelated pointer type, either directly or indirectly.
 */
export class Rule_CPP_5_2_7 implements MISRARule {
  id = 'MISRA-CPP-5.2.7';
  description = 'Pointers shall not be cast to unrelated types';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // reinterpret_cast with pointers
      if (/reinterpret_cast\s*<\s*\w+\s*\*\s*>/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'reinterpret_cast to unrelated pointer type',
            line
          )
        );
      }
    }

    return violations;
  }
}

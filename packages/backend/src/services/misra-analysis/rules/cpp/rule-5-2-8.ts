import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-8
 * An object with integer type or pointer to void type shall not be converted to an object with pointer type.
 */
export class Rule_CPP_5_2_8 implements MISRARule {
  id = 'MISRA-CPP-5.2.8';
  description = 'Integer or void* shall not be converted to pointer type';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Cast from integer to pointer
      if (/\(\s*\w+\s*\*\s*\)\s*\d+/.test(line) || /reinterpret_cast\s*<\s*\w+\s*\*\s*>\s*\(\s*\d+/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Integer converted to pointer type',
            line
          )
        );
      }
    }

    return violations;
  }
}

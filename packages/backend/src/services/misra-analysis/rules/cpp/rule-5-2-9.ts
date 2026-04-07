import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-9
 * A cast should not convert a pointer type to an integral type.
 */
export class Rule_CPP_5_2_9 implements MISRARule {
  id = 'MISRA-CPP-5.2.9';
  description = 'Pointer shall not be converted to integral type';
  severity = 'advisory' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Cast from pointer to integer
      if (/\(\s*(int|long|size_t)\s*\)\s*\w+/.test(line) && /\*/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Pointer converted to integral type',
            line
          )
        );
      }
    }

    return violations;
  }
}

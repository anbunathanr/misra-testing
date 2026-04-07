import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 4-10-2
 * Literal zero (0) shall not be used as the null-pointer-constant.
 */
export class Rule_CPP_4_10_2 implements MISRARule {
  id = 'MISRA-CPP-4.10.2';
  description = 'Literal zero shall not be used as null-pointer-constant';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Pointer assignment or comparison with 0
      if (/\*\s*\w+\s*=\s*0\b/.test(line) || /\w+\s*==\s*0\b/.test(line) && /\*/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Use nullptr instead of 0 for null pointer',
            line
          )
        );
      }
    }

    return violations;
  }
}

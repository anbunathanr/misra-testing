import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-5
 * A cast shall not remove any const or volatile qualification from the type of a pointer or reference.
 */
export class Rule_CPP_5_2_5 implements MISRARule {
  id = 'MISRA-CPP-5.2.5';
  description = 'Casts shall not remove const or volatile qualification';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // const_cast usage
      if (/const_cast\s*</.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'const_cast removes const/volatile qualification',
            line
          )
        );
      }

      // C-style cast removing const
      if (/\(\s*\w+\s*\*\s*\)/.test(line) && /const/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Cast may remove const qualification',
            line
          )
        );
      }
    }

    return violations;
  }
}

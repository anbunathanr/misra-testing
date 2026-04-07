import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-3
 * Casts from a base class to a derived class should not be performed on polymorphic types.
 */
export class Rule_CPP_5_2_3 implements MISRARule {
  id = 'MISRA-CPP-5.2.3';
  description = 'Downcasts on polymorphic types should use dynamic_cast';
  severity = 'advisory' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // static_cast downcast
      if (/static_cast\s*<\s*\w+\s*\*\s*>/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Consider using dynamic_cast for polymorphic downcasts',
            line
          )
        );
      }
    }

    return violations;
  }
}

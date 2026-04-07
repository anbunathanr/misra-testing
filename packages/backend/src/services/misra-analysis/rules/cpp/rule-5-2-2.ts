import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-2
 * A pointer to a virtual base class shall only be cast to a pointer to a derived class by means of dynamic_cast.
 */
export class Rule_CPP_5_2_2 implements MISRARule {
  id = 'MISRA-CPP-5.2.2';
  description = 'Virtual base class pointers shall use dynamic_cast';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // C-style cast or static_cast with pointers
      if (/\(\s*\w+\s*\*\s*\)/.test(line) || /static_cast\s*<\s*\w+\s*\*\s*>/.test(line)) {
        if (/virtual/.test(sourceCode)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Use dynamic_cast for virtual base class pointers',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

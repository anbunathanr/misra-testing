import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 4-10-1
 * NULL shall not be used as an integer value.
 */
export class Rule_CPP_4_10_1 implements MISRARule {
  id = 'MISRA-CPP-4.10.1';
  description = 'NULL shall not be used as an integer value';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // NULL used in arithmetic or comparison with integers
      if (/\bNULL\b/.test(line)) {
        if (/NULL\s*[+\-*\/%]|[+\-*\/%]\s*NULL/.test(line) || /\bint\b.*NULL|NULL.*\bint\b/.test(line)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'NULL used as an integer value',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

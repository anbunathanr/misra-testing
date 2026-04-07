import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-0-2
 * Limited dependence should be placed on C++ operator precedence rules in expressions.
 */
export class Rule_CPP_5_0_2 implements MISRARule {
  id = 'MISRA-CPP-5.0.2';
  description = 'Use parentheses to clarify operator precedence';
  severity = 'advisory' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Mixed operators without parentheses: a + b * c, a && b || c
      if (/[+\-]\s*\w+\s*[*\/]/.test(line) && !/\(.*[*\/].*\)/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Mixed arithmetic operators without parentheses',
            line
          )
        );
      }

      if (/&&.*\|\||&&.*\|\|/.test(line) && !/\(.*&&.*\)|\(.*\|\|.*\)/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Mixed logical operators without parentheses',
            line
          )
        );
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 6-2-1
 * Assignment operators shall not be used in sub-expressions.
 * Detects assignment operators (=, +=, -=, etc.) used within larger expressions.
 */
export class Rule_CPP_6_2_1 implements MISRARule {
  id = 'MISRA-CPP-6.2.1';
  description = 'Assignment operators shall not be used in sub-expressions';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect assignment in conditions: if (x = y), while (x = y)
    const assignInConditionRegex = /\b(if|while|for)\s*\([^)]*\b\w+\s*=\s*[^=]/;
    
    // Detect assignment in expressions: z = (x = y), func(x = y)
    const assignInExprRegex = /[^=!<>]=\s*\([^)]*\b\w+\s*=\s*[^=]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Check for assignment in conditions
      if (assignInConditionRegex.test(line)) {
        // Exclude comparison operators (==, !=, <=, >=)
        if (!line.includes('==') || line.indexOf('=') < line.indexOf('==')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Assignment operator used in sub-expression (condition)',
              line
            )
          );
        }
      }

      // Check for assignment in expressions
      if (assignInExprRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Assignment operator used in sub-expression',
            line
          )
        );
      }
    }

    return violations;
  }
}

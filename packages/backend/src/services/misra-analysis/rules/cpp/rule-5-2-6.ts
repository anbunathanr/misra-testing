import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-6
 * A cast shall not convert a pointer to a function to any other pointer type,
 * including a pointer to function type.
 * Detects C-style casts (type) expression.
 */
export class Rule_CPP_5_2_6 implements MISRARule {
  id = 'MISRA-CPP-5.2.6';
  description = 'C-style casts shall not be used';
  severity = 'required' as const;
  category = 'Expressions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect C-style casts: (type)expression
    // Look for patterns like (int), (float*), (MyClass&), etc.
    const cStyleCastRegex = /\(\s*(?:const\s+|volatile\s+|static\s+)*[a-zA-Z_][\w:]*\s*[*&]*\s*\)\s*[a-zA-Z_0-9]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Skip function declarations/definitions (they have parentheses but aren't casts)
      if (line.includes('(') && (line.includes('{') || line.includes(';') && line.match(/^\s*\w+\s+\w+\s*\(/))) {
        continue;
      }

      if (cStyleCastRegex.test(line)) {
        // Exclude false positives: function calls, sizeof, etc.
        if (!line.includes('sizeof') && !line.match(/\b(if|while|for|switch)\s*\(/)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'C-style cast detected; use static_cast, dynamic_cast, const_cast, or reinterpret_cast instead',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

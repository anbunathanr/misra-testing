import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-1-1
 * It shall be possible to include any header file in multiple translation units
 * without violating the one definition rule.
 * Detects multiple declarations on one line (e.g., `int a, b;`).
 */
export class Rule_CPP_3_1_1 implements MISRARule {
  id = 'MISRA-CPP-3.1.1';
  description = 'Multiple declarations on one line shall not be used';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect lines like: int a, b; or int* p, q; or int x = 1, y = 2;
    // Look for comma-separated declarations ending with semicolon
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;
      // Skip function parameters and for-loop headers
      if (line.includes('for') && line.includes('(')) continue;
      if (line.includes('(') && line.includes(')') && !line.includes(';')) continue;

      // Check if line contains comma and ends with semicolon (declaration)
      if (line.includes(',') && line.endsWith(';')) {
        // Check if it looks like a variable declaration
        const declRegex = /^\s*(?:const\s+|static\s+|volatile\s+|extern\s+|mutable\s+|auto\s+)*(?:[a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+[a-zA-Z_]\w*\s*(?:=\s*[^,;]+)?\s*,/;
        if (declRegex.test(line)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Multiple declarations on one line',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

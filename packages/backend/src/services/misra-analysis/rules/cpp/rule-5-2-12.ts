import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-12
 * An identifier with array type passed as a function argument shall not decay to a pointer.
 */
export class Rule_CPP_5_2_12 implements MISRARule {
  id = 'MISRA-CPP-5.2.12';
  description = 'Array arguments shall not decay to pointers';
  severity = 'required' as const;
  category = 'Functions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Function parameter with array notation: void func(int arr[])
      if (/\w+\s+\w+\s*\([^)]*\w+\s+\w+\s*\[\s*\]/.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Array parameter decays to pointer, use reference or std::array',
            line
          )
        );
      }
    }

    return violations;
  }
}

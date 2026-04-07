import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-0-3
 * A cvalue expression shall not be implicitly converted to a different underlying type.
 */
export class Rule_CPP_5_0_3 implements MISRARule {
  id = 'MISRA-CPP-5.0.3';
  description = 'Cvalue expressions shall not be implicitly converted';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Detect implicit conversions in assignments
      if (/\b(int|short|long)\s+\w+\s*=\s*\d+\.\d+/.test(line) && !line.includes('cast')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Implicit conversion from floating-point to integer',
            line
          )
        );
      }
    }

    return violations;
  }
}

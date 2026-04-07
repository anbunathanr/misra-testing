import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 5-2-4
 * C-style casts (other than void casts) and functional notation casts (other than explicit constructor calls) shall not be used.
 */
export class Rule_CPP_5_2_4 implements MISRARule {
  id = 'MISRA-CPP-5.2.4';
  description = 'C-style casts shall not be used';
  severity = 'required' as const;
  category = 'Conversions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Skip C++ cast operators
      if (line.includes('static_cast') || line.includes('dynamic_cast') || 
          line.includes('const_cast') || line.includes('reinterpret_cast')) {
        continue;
      }

      // C-style cast: (type)expr
      if (/\(\s*\w+\s*\)/.test(line) && !line.includes('void')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'C-style cast detected, use C++ cast operators',
            line
          )
        );
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 17.1
 * The features of <stdarg.h> shall not be used.
 */
export class Rule_C_17_1 implements MISRARule {
  id = 'MISRA-C-17.1';
  description = 'The features of <stdarg.h> shall not be used';
  severity = 'required' as const;
  category = 'Functions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for stdarg.h include
      if (line.includes('<stdarg.h>') || line.includes('"stdarg.h"')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Use of <stdarg.h> is not permitted',
            line
          )
        );
      }
      
      // Check for variadic function macros
      if (line.includes('va_start') || line.includes('va_arg') || 
          line.includes('va_end') || line.includes('va_list') ||
          line.includes('va_copy')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Use of stdarg.h features (va_*) is not permitted',
            line
          )
        );
      }
      
      // Check for variadic function declarations
      if (line.match(/\w+\s*\([^)]*\.\.\.\)/)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Variadic function declaration is not permitted',
            line
          )
        );
      }
    }

    return violations;
  }
}

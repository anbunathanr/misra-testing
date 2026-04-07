import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 7-1-1
 * A variable which is not modified shall be const qualified.
 * Detects pointer and reference parameters that could be const.
 */
export class Rule_CPP_7_1_1 implements MISRARule {
  id = 'MISRA-CPP-7.1.1';
  description = 'A variable which is not modified shall be const qualified';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Find function parameters that are pointers or references without const
    const funcParamRegex = /\b(\w+)\s+(\w+)\s*\(([^)]*)\)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      const match = line.match(funcParamRegex);
      if (!match) continue;

      const params = match[3];
      
      // Check each parameter
      const paramList = params.split(',').map(p => p.trim());
      for (const param of paramList) {
        // Check for pointer or reference parameters without const
        if ((param.includes('*') || param.includes('&')) && !param.includes('const')) {
          // Extract parameter name
          const paramMatch = param.match(/([*&])\s*(\w+)$/);
          if (paramMatch) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `Pointer/reference parameter should be const qualified if not modified`,
                line
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

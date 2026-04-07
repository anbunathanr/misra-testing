import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 0-1-7
 * The value returned by a function having a non-void return type shall always be used.
 * Detects function calls where the return value is discarded.
 */
export class Rule_CPP_0_1_7 implements MISRARule {
  id = 'MISRA-CPP-0.1.7';
  description = 'The value returned by a function having a non-void return type shall be used';
  severity = 'required' as const;
  category = 'Functions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect function calls not assigned or used: functionName(...);
    const unusedCallRegex = /^\s*([a-zA-Z_]\w*)\s*\([^)]*\)\s*;\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      const match = line.match(unusedCallRegex);
      if (!match) continue;

      const funcName = match[1];
      
      // Skip known void functions and constructors
      const voidFunctions = ['printf', 'cout', 'cerr', 'free', 'delete'];
      if (voidFunctions.includes(funcName)) continue;
      
      violations.push(
        createViolation(
          this,
          i + 1,
          0,
          `Return value of function '${funcName}' is not used`,
          line
        )
      );
    }

    return violations;
  }
}

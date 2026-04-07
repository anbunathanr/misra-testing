import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-1-2
 * Functions shall not be declared at block scope.
 * Detects function declarations inside function bodies.
 */
export class Rule_CPP_3_1_2 implements MISRARule {
  id = 'MISRA-CPP-3.1.2';
  description = 'Functions shall not be declared at block scope';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    let braceDepth = 0;
    let inFunction = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Track brace depth
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // Detect function definition start
      if (/\b\w+\s+\w+\s*\([^)]*\)\s*{/.test(line)) {
        inFunction = true;
      }

      // Detect function declaration inside function (braceDepth > 1)
      if (braceDepth > 1 && inFunction) {
        // Function declaration pattern: type name(params);
        if (/\b\w+\s+\w+\s*\([^)]*\)\s*;/.test(line)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Function declared at block scope',
              line
            )
          );
        }
      }

      if (braceDepth === 0) {
        inFunction = false;
      }
    }

    return violations;
  }
}

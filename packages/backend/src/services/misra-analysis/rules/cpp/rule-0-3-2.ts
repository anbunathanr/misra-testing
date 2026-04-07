import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 0-3-2
 * If a function generates error information, then that error information shall be tested.
 * Detects unchecked error returns from functions.
 */
export class Rule_CPP_0_3_2 implements MISRARule {
  id = 'MISRA-CPP-0.3.2';
  description = 'Error information from functions shall be tested';
  severity = 'required' as const;
  category = 'Error handling';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Common error-returning functions
    const errorFunctions = ['malloc', 'calloc', 'realloc', 'fopen', 'open', 'read', 'write'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      for (const func of errorFunctions) {
        const callRegex = new RegExp(`\\b${func}\\s*\\(`);
        if (!callRegex.test(line)) continue;
        
        // Check if result is checked in next few lines
        let foundCheck = false;
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          const checkLine = lines[j].trim();
          if (/\b(if|while|assert|throw)\b/.test(checkLine) || /==\s*(NULL|nullptr|0)/.test(checkLine)) {
            foundCheck = true;
            break;
          }
        }
        
        if (!foundCheck) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Return value of '${func}' should be checked for errors`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 17.3
 * A function shall not be declared implicitly.
 */
export class Rule_C_17_3 implements MISRARule {
  id = 'MISRA-C-17.3';
  description = 'A function shall not be declared implicitly';
  severity = 'mandatory' as const;
  category = 'Functions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const declaredFunctions = new Set<string>();

    // Collect all declared functions
    for (const func of ast.functions) {
      declaredFunctions.add(func.name);
    }

    // Check for function calls without declarations
    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Look for function calls
      const callMatch = line.match(/\b(\w+)\s*\(/);
      if (callMatch) {
        const funcName = callMatch[1];
        
        // Skip standard library functions and keywords
        const stdFunctions = ['printf', 'scanf', 'malloc', 'free', 'sizeof', 'if', 'while', 'for', 'switch'];
        if (stdFunctions.includes(funcName)) continue;
        
        // Check if function was declared
        if (!declaredFunctions.has(funcName)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Function '${funcName}' called without explicit declaration`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

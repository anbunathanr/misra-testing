import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.8
 * The static storage class specifier shall be used in all declarations of objects and functions that have internal linkage.
 */
export class Rule_C_8_8 implements MISRARule {
  id = 'MISRA-C-8.8';
  description = 'The static storage class specifier shall be used in all declarations of objects and functions that have internal linkage';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const internalFuncs = new Map<string, number>();

    // First pass: find function definitions
    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      if (line.includes('{') && !line.includes(';')) {
        const funcMatch = line.match(/\w+\s+(\w+)\s*\(/);
        if (funcMatch && !line.includes('extern')) {
          internalFuncs.set(funcMatch[1], i);
        }
      }
    }

    // Second pass: check declarations
    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      if (line.endsWith(';') && !line.includes('static')) {
        const declMatch = line.match(/\w+\s+(\w+)\s*\(/);
        if (declMatch && internalFuncs.has(declMatch[1])) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Internal function '${declMatch[1]}' declaration should be static`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

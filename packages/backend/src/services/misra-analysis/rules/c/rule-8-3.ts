import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.3
 * All declarations of an object or function shall use the same names and type qualifiers.
 */
export class Rule_C_8_3 implements MISRARule {
  id = 'MISRA-C-8.3';
  description = 'All declarations of an object or function shall use the same names and type qualifiers';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const declarations = new Map<string, string>();

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Match function declarations
      const funcMatch = line.match(/((?:const\s+|volatile\s+)*\w+\s+\*?\s*)(\w+)\s*\(/);
      if (funcMatch) {
        const type = funcMatch[1].trim();
        const name = funcMatch[2];
        
        if (declarations.has(name)) {
          if (declarations.get(name) !== type) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `Declaration of '${name}' has different type qualifiers`,
                line
              )
            );
          }
        } else {
          declarations.set(name, type);
        }
      }
    }

    return violations;
  }
}

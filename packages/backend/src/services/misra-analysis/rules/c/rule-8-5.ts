import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.5
 * An external object or function shall be declared once in one and only one file.
 */
export class Rule_C_8_5 implements MISRARule {
  id = 'MISRA-C-8.5';
  description = 'An external object or function shall be declared once in one and only one file';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const externDecls = new Map<string, number>();

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Match extern declarations
      const externMatch = line.match(/extern\s+\w+\s+(\w+)/);
      if (externMatch) {
        const name = externMatch[1];
        
        if (externDecls.has(name)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `External declaration '${name}' already declared at line ${externDecls.get(name)}`,
              line
            )
          );
        } else {
          externDecls.set(name, i + 1);
        }
      }
    }

    return violations;
  }
}

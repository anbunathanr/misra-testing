import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 5.4
 * Macro identifiers shall be distinct.
 */
export class Rule_C_5_4 implements MISRARule {
  id = 'MISRA-C-5.4';
  description = 'Macro identifiers shall be distinct';
  severity = 'required' as const;
  category = 'Identifiers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const macros = new Map<string, number>();

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      const macroMatch = line.match(/^#define\s+(\w+)/);
      
      if (macroMatch) {
        const id = macroMatch[1];
        const prefix = id.substring(0, 63);
        
        if (macros.has(prefix)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Macro '${id}' not distinct from macro at line ${macros.get(prefix)}`,
              line
            )
          );
        } else {
          macros.set(prefix, i + 1);
        }
      }
    }

    return violations;
  }
}

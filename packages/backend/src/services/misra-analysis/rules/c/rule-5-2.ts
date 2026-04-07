import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 5.2
 * Identifiers declared in the same scope shall be distinct.
 */
export class Rule_C_5_2 implements MISRARule {
  id = 'MISRA-C-5.2';
  description = 'Identifiers declared in the same scope shall be distinct';
  severity = 'required' as const;
  category = 'Identifiers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const identifiers = new Map<string, number>();

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Find variable declarations
      const declMatch = line.match(/(?:int|char|float|double|long|short|void)\s+(\w+)/);
      if (declMatch) {
        const id = declMatch[1];
        const prefix = id.substring(0, 63); // Internal identifiers: 63 chars
        
        if (identifiers.has(prefix)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Identifier '${id}' not distinct from identifier at line ${identifiers.get(prefix)}`,
              line
            )
          );
        } else {
          identifiers.set(prefix, i + 1);
        }
      }
    }

    return violations;
  }
}

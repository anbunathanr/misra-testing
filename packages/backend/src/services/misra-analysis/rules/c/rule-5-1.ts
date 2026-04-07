import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 5.1
 * External identifiers shall be distinct.
 */
export class Rule_C_5_1 implements MISRARule {
  id = 'MISRA-C-5.1';
  description = 'External identifiers shall be distinct';
  severity = 'required' as const;
  category = 'Identifiers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const externalIds = new Map<string, number>();

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Find external declarations
      const externMatch = line.match(/extern\s+(?:\w+\s+)*(\w+)\s*[;(]/);
      if (externMatch) {
        const id = externMatch[1];
        const prefix = id.substring(0, 31); // C99 requires 31 char significance
        
        if (externalIds.has(prefix)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `External identifier '${id}' not distinct from identifier at line ${externalIds.get(prefix)}`,
              line
            )
          );
        } else {
          externalIds.set(prefix, i + 1);
        }
      }
    }

    return violations;
  }
}

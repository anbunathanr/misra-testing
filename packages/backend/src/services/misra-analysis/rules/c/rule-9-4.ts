import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 9.4
 * An element of an object shall not be initialized more than once.
 */
export class Rule_C_9_4 implements MISRARule {
  id = 'MISRA-C-9.4';
  description = 'An element of an object shall not be initialized more than once';
  severity = 'required' as const;
  category = 'Initialization';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for designated initializers with duplicate indices
      const initMatch = line.match(/\{([^}]*)\}/);
      if (initMatch) {
        const initializers = initMatch[1];
        const indices = new Set<string>();
        const designatedMatches = initializers.matchAll(/\[(\d+)\]/g);
        
        for (const match of designatedMatches) {
          const index = match[1];
          if (indices.has(index)) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `Array element [${index}] initialized more than once`,
                line
              )
            );
          }
          indices.add(index);
        }
      }
    }

    return violations;
  }
}

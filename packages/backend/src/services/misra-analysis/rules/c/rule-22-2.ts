import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 22.2
 * A block of memory shall only be freed if it was allocated by means of a
 * Standard Library function.
 * Detects free() calls on variables that were not allocated with malloc/calloc/realloc.
 */
export class Rule_C_22_2 implements MISRARule {
  id = 'MISRA-C-22.2';
  description = 'A block of memory shall only be freed if it was allocated by means of a Standard Library function';
  severity = 'mandatory' as const;
  category = 'Resources';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track variables allocated with malloc/calloc/realloc
    const allocatedVars = new Set<string>();
    const allocRegex = /\b(\w+)\s*=\s*(?:malloc|calloc|realloc)\s*\(/;
    const freeRegex = /\bfree\s*\(\s*(\w+)\s*\)/;

    for (const line of lines) {
      const allocMatch = line.match(allocRegex);
      if (allocMatch) {
        allocatedVars.add(allocMatch[1]);
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const freeMatch = line.match(freeRegex);
      if (freeMatch) {
        const varName = freeMatch[1];
        if (!allocatedVars.has(varName) && varName !== 'NULL' && varName !== '0') {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `free() called on '${varName}' which may not have been dynamically allocated`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

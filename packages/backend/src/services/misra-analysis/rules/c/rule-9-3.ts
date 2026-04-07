import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 9.3
 * Arrays shall not be partially initialized.
 */
export class Rule_C_9_3 implements MISRARule {
  id = 'MISRA-C-9.3';
  description = 'Arrays shall not be partially initialized';
  severity = 'required' as const;
  category = 'Initialization';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for array with explicit size but fewer initializers
      const arrayMatch = line.match(/\w+\s+\w+\[(\d+)\]\s*=\s*\{([^}]*)\}/);
      if (arrayMatch) {
        const size = parseInt(arrayMatch[1]);
        const initializers = arrayMatch[2].split(',').filter(s => s.trim());
        
        if (initializers.length > 0 && initializers.length < size) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Array partially initialized (${initializers.length} of ${size} elements)`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

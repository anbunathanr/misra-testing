import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.7
 * Functions and objects should not be defined with external linkage if they are referenced in only one translation unit.
 */
export class Rule_C_8_7 implements MISRARule {
  id = 'MISRA-C-8.7';
  description = 'Functions and objects should not be defined with external linkage if they are referenced in only one translation unit';
  severity = 'advisory' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for non-static function definitions
      if (line.includes('{') && !line.includes('static') && !line.includes(';')) {
        const funcMatch = line.match(/\w+\s+(\w+)\s*\(/);
        if (funcMatch && funcMatch[1] !== 'main') {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Function '${funcMatch[1]}' should be static if only used in this file`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

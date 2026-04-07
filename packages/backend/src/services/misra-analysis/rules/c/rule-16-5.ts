import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 16.5
 * A default label shall appear as either the first or the last switch label of a switch statement.
 */
export class Rule_C_16_5 implements MISRARule {
  id = 'MISRA-C-16.5';
  description = 'A default label shall appear as either the first or the last switch label of a switch statement';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      if (line.startsWith('switch')) {
        let braceCount = 0;
        let defaultLine = -1;
        let firstCaseLine = -1;
        let lastCaseLine = -1;
        let switchEndLine = -1;
        
        // Find all case labels and default
        for (let j = i; j < ast.lines.length; j++) {
          const switchLine = ast.lines[j].trim();
          
          if (switchLine.includes('{')) braceCount++;
          if (switchLine.includes('}')) {
            braceCount--;
            if (braceCount === 0 && j > i) {
              switchEndLine = j;
              break;
            }
          }
          
          if (switchLine.startsWith('case')) {
            if (firstCaseLine === -1) firstCaseLine = j;
            lastCaseLine = j;
          }
          
          if (switchLine.startsWith('default')) {
            defaultLine = j;
          }
        }
        
        // Check if default is in the middle
        if (defaultLine !== -1 && firstCaseLine !== -1 && lastCaseLine !== -1) {
          if (defaultLine > firstCaseLine && defaultLine < lastCaseLine) {
            violations.push(
              createViolation(
                this,
                defaultLine + 1,
                0,
                'Default label should be first or last in switch statement',
                ast.lines[defaultLine]
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

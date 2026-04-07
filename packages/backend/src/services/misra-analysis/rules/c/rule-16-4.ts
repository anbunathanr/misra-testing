import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 16.4
 * Every switch statement shall have a default label.
 */
export class Rule_C_16_4 implements MISRARule {
  id = 'MISRA-C-16.4';
  description = 'Every switch statement shall have a default label';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      if (line.startsWith('switch')) {
        let braceCount = 0;
        let foundDefault = false;
        
        // Check lines within switch statement
        for (let j = i; j < ast.lines.length; j++) {
          const switchLine = ast.lines[j].trim();
          
          if (switchLine.includes('{')) braceCount++;
          if (switchLine.includes('}')) braceCount--;
          
          if (switchLine.startsWith('default')) {
            foundDefault = true;
          }
          
          if (braceCount === 0 && j > i) break;
        }
        
        if (!foundDefault) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Switch statement missing default label',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

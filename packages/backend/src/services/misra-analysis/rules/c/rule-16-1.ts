import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 16.1
 * All switch statements shall be well-formed.
 */
export class Rule_C_16_1 implements MISRARule {
  id = 'MISRA-C-16.1';
  description = 'All switch statements shall be well-formed';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      if (line.startsWith('switch')) {
        let braceCount = 0;
        let foundCase = false;
        let foundDefault = false;
        let codeBeforeCase = false;
        
        // Check lines within switch statement
        for (let j = i; j < ast.lines.length; j++) {
          const switchLine = ast.lines[j].trim();
          
          if (switchLine.includes('{')) braceCount++;
          if (switchLine.includes('}')) braceCount--;
          
          if (braceCount === 0 && j > i) break;
          
          // Check for code before first case
          if (!foundCase && !switchLine.startsWith('case') && !switchLine.startsWith('default') && 
              !switchLine.startsWith('switch') && !switchLine.startsWith('{') && 
              switchLine.length > 0 && !switchLine.startsWith('//')) {
            codeBeforeCase = true;
          }
          
          if (switchLine.startsWith('case')) foundCase = true;
          if (switchLine.startsWith('default')) foundDefault = true;
        }
        
        if (codeBeforeCase) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Switch statement contains code before first case label',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

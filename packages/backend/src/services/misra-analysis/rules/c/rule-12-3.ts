import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 12.3
 * The comma operator should not be used.
 */
export class Rule_C_12_3 implements MISRARule {
  id = 'MISRA-C-12.3';
  description = 'The comma operator should not be used';
  severity = 'advisory' as const;
  category = 'Expressions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Skip for loops (comma is allowed in for loop initialization/increment)
      if (line.startsWith('for')) continue;
      
      // Check for comma operator usage (not in function calls or declarations)
      // Look for comma outside of parentheses
      let parenDepth = 0;
      let inString = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
          inString = !inString;
        }
        
        if (!inString) {
          if (char === '(') parenDepth++;
          if (char === ')') parenDepth--;
          
          // Comma outside parentheses (not in function call/declaration)
          if (char === ',' && parenDepth === 0 && !line.includes('=')) {
            violations.push(
              createViolation(
                this,
                i + 1,
                j,
                'Comma operator should not be used',
                line
              )
            );
            break;
          }
        }
      }
    }

    return violations;
  }
}

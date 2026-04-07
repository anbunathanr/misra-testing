import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 16.7
 * A switch-expression shall not have essentially Boolean type.
 */
export class Rule_C_16_7 implements MISRARule {
  id = 'MISRA-C-16.7';
  description = 'A switch-expression shall not have essentially Boolean type';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Check for switch on boolean expressions
      const switchMatch = line.match(/switch\s*\(([^)]+)\)/);
      if (switchMatch) {
        const expr = switchMatch[1].trim();
        
        // Check for boolean variables or expressions
        if (expr === 'true' || expr === 'false' || 
            expr.includes('==') || expr.includes('!=') || 
            expr.includes('&&') || expr.includes('||') ||
            expr.includes('<') || expr.includes('>') ||
            expr.includes('<=') || expr.includes('>=')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Switch expression has Boolean type',
              line
            )
          );
        }
        
        // Check for _Bool type
        if (expr.match(/\b_Bool\b/)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'Switch expression has _Bool type',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

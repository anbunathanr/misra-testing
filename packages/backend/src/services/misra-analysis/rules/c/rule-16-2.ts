import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 16.2
 * A switch label shall only be used when the most closely-enclosing compound statement is the body of a switch statement.
 */
export class Rule_C_16_2 implements MISRARule {
  id = 'MISRA-C-16.2';
  description = 'A switch label shall only be used when the most closely-enclosing compound statement is the body of a switch statement';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    let inSwitch = false;
    let switchDepth = 0;

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      if (line.startsWith('switch')) {
        inSwitch = true;
        switchDepth = 0;
      }
      
      if (inSwitch) {
        if (line.includes('{')) switchDepth++;
        if (line.includes('}')) {
          switchDepth--;
          if (switchDepth === 0) inSwitch = false;
        }
        
        // Check for case/default labels nested in other control structures
        if ((line.startsWith('case') || line.startsWith('default:')) && switchDepth > 1) {
          // Check if there's a nested control structure
          for (let j = i - 1; j >= 0 && switchDepth > 0; j--) {
            const prevLine = ast.lines[j].trim();
            if (prevLine.startsWith('if') || prevLine.startsWith('for') || 
                prevLine.startsWith('while') || prevLine.startsWith('do')) {
              violations.push(
                createViolation(
                  this,
                  i + 1,
                  0,
                  'Switch label used within nested control structure',
                  line
                )
              );
              break;
            }
          }
        }
      }
      
      // Check for case/default outside switch
      if (!inSwitch && (line.startsWith('case') || line.startsWith('default:'))) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Switch label used outside switch statement',
            line
          )
        );
      }
    }

    return violations;
  }
}

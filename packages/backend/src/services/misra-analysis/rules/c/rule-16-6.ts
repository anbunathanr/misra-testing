import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 16.6
 * Every switch statement shall have at least two switch-clauses.
 */
export class Rule_C_16_6 implements MISRARule {
  id = 'MISRA-C-16.6';
  description = 'Every switch statement shall have at least two switch-clauses';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      if (line.startsWith('switch')) {
        let braceCount = 0;
        let caseCount = 0;
        
        // Count case labels (including default)
        for (let j = i; j < ast.lines.length; j++) {
          const switchLine = ast.lines[j].trim();
          
          if (switchLine.includes('{')) braceCount++;
          if (switchLine.includes('}')) {
            braceCount--;
            if (braceCount === 0 && j > i) break;
          }
          
          if (switchLine.startsWith('case') || switchLine.startsWith('default')) {
            caseCount++;
          }
        }
        
        if (caseCount < 2) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Switch statement has only ${caseCount} clause(s), requires at least 2`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

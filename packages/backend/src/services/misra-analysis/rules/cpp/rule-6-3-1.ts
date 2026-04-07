import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 6-3-1
 * The statement forming the body of a switch, while, do...while or for statement shall be a compound statement.
 */
export class Rule_CPP_6_3_1 implements MISRARule {
  id = 'MISRA-CPP-6.3.1';
  description = 'The statement forming the body of a switch, while, do...while or for statement shall be a compound statement';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for while/for/do control structures
      const controlFlowRegex = /^\s*(while|for|do)\s*\([^)]*\)\s*(.*)$/;
      const match = line.match(controlFlowRegex);
      
      if (match) {
        const rest = match[2].trim();
        
        // If there's content on the same line and it doesn't start with {, it's a violation
        if (rest && !rest.startsWith('{')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `${match[1]} statement body must be a compound statement (use braces)`,
              line
            )
          );
        }
        // If nothing on the same line, check the next line
        else if (!rest && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !nextLine.startsWith('{')) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `${match[1]} statement body must be a compound statement (use braces)`,
                line
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

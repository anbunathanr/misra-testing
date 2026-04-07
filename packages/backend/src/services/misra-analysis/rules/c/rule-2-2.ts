import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 2.2
 * There shall be no dead code.
 */
export class Rule_C_2_2 implements MISRARule {
  id = 'MISRA-C-2.2';
  description = 'There shall be no dead code';
  severity = 'required' as const;
  category = 'Unused code';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for code after return statement
      if (line.startsWith('return')) {
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (!nextLine || nextLine.startsWith('//') || nextLine.startsWith('/*')) continue;
          if (nextLine === '}') break;
          
          violations.push(
            createViolation(
              this,
              j + 1,
              0,
              'Dead code after return statement',
              nextLine
            )
          );
          break;
        }
      }
    }

    return violations;
  }
}

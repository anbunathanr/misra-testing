import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 3.2
 * Line-splicing shall not be used in // comments.
 */
export class Rule_C_3_2 implements MISRARule {
  id = 'MISRA-C-3.2';
  description = 'Line-splicing shall not be used in // comments';
  severity = 'required' as const;
  category = 'Comments';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for backslash at end of // comment
      if (line.includes('//')) {
        const commentStart = line.indexOf('//');
        const afterComment = line.substring(commentStart);
        if (afterComment.trimEnd().endsWith('\\')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              line.length - 1,
              'Line-splicing (backslash) used in // comment',
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

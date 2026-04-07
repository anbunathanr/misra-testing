import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 3.1
 * The character sequences /* and // shall not be used within a comment.
 */
export class Rule_C_3_1 implements MISRARule {
  id = 'MISRA-C-3.1';
  description = 'The character sequences /* and // shall not be used within a comment';
  severity = 'required' as const;
  category = 'Comments';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for // within /* */ comment
      if (line.includes('/*') && line.includes('//')) {
        const commentStart = line.indexOf('/*');
        const slashSlash = line.indexOf('//');
        if (slashSlash > commentStart) {
          violations.push(
            createViolation(
              this,
              i + 1,
              slashSlash,
              'Character sequence // used within comment',
              line.trim()
            )
          );
        }
      }

      // Check for /* within // comment
      if (line.includes('//')) {
        const commentStart = line.indexOf('//');
        const slashStar = line.indexOf('/*', commentStart);
        if (slashStar > commentStart) {
          violations.push(
            createViolation(
              this,
              i + 1,
              slashStar,
              'Character sequence /* used within comment',
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

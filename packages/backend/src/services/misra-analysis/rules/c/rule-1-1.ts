import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 1.1
 * All code shall conform to ISO 9899:2011 C standard.
 * Detects use of non-standard compiler extensions.
 */
export class Rule_C_1_1 implements MISRARule {
  id = 'MISRA-C-1.1';
  description = 'All code shall conform to ISO 9899:2011 C standard';
  severity = 'mandatory' as const;
  category = 'Language';
  language = 'C' as const;

  private readonly nonStandardExtensions = [
    '__attribute__',
    '__declspec',
    '__asm',
    '__volatile__',
    '__inline__',
    '__typeof__',
    '__builtin_',
    '__extension__',
  ];

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (const token of ast.tokens) {
      if (token.type === 'identifier') {
        for (const ext of this.nonStandardExtensions) {
          if (token.value === ext || token.value.startsWith('__builtin_')) {
            const line = ast.lines[token.line - 1] || '';
            violations.push(
              createViolation(
                this,
                token.line,
                token.column,
                `Non-standard extension '${token.value}' detected`,
                line.trim()
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

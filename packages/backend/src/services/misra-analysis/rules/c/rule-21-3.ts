import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 21.3
 * The memory allocation and deallocation functions of <stdlib.h> shall not be used.
 * Detects use of malloc, calloc, realloc, free.
 */
export class Rule_C_21_3 implements MISRARule {
  id = 'MISRA-C-21.3';
  description = 'The memory allocation and deallocation functions of <stdlib.h> shall not be used';
  severity = 'required' as const;
  category = 'Standard libraries';
  language = 'C' as const;

  private readonly forbiddenFunctions = ['malloc', 'calloc', 'realloc', 'free'];

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (const token of ast.tokens) {
      if (token.type === 'identifier' && this.forbiddenFunctions.includes(token.value)) {
        const line = ast.lines[token.line - 1] || '';
        // Make sure it's a function call (followed by '(')
        const lineAfter = line.slice(line.indexOf(token.value) + token.value.length).trim();
        if (lineAfter.startsWith('(')) {
          violations.push(
            createViolation(
              this,
              token.line,
              token.column,
              `Use of '${token.value}' is not permitted (MISRA C 21.3)`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

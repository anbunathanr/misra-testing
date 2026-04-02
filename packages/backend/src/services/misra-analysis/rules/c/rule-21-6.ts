import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 21.6
 * The Standard Library input/output functions shall not be used.
 * Detects use of printf, scanf, fprintf, fscanf, sprintf, sscanf, etc.
 */
export class Rule_C_21_6 implements MISRARule {
  id = 'MISRA-C-21.6';
  description = 'The Standard Library input/output functions shall not be used';
  severity = 'required' as const;
  category = 'Standard libraries';
  language = 'C' as const;

  private readonly forbiddenFunctions = [
    'printf', 'scanf', 'fprintf', 'fscanf', 'sprintf', 'sscanf',
    'vprintf', 'vscanf', 'vfprintf', 'vfscanf', 'vsprintf', 'vsscanf',
    'snprintf', 'vsnprintf', 'gets', 'puts', 'fgets', 'fputs',
    'getchar', 'putchar', 'getc', 'putc', 'fgetc', 'fputc',
  ];

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (const token of ast.tokens) {
      if (token.type === 'identifier' && this.forbiddenFunctions.includes(token.value)) {
        const line = ast.lines[token.line - 1] || '';
        // Make sure it's a function call
        const lineAfter = line.slice(line.indexOf(token.value) + token.value.length).trim();
        if (lineAfter.startsWith('(')) {
          violations.push(
            createViolation(
              this,
              token.line,
              token.column,
              `Use of I/O function '${token.value}' is not permitted (MISRA C 21.6)`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

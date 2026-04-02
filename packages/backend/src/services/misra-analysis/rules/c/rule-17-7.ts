import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 17.7
 * The value returned by a function having non-void return type shall be used.
 * Detects function calls whose return values are discarded.
 */
export class Rule_C_17_7 implements MISRARule {
  id = 'MISRA-C-17.7';
  description = 'The value returned by a function having non-void return type shall be used';
  severity = 'required' as const;
  category = 'Functions';
  language = 'C' as const;

  // Common non-void functions whose return values are often ignored
  private readonly nonVoidFunctions = [
    'malloc', 'calloc', 'realloc', 'fopen', 'fclose', 'fread', 'fwrite',
    'fprintf', 'sprintf', 'snprintf', 'scanf', 'sscanf', 'fscanf',
    'strlen', 'strcpy', 'strncpy', 'strcat', 'strncat', 'strcmp',
    'memcpy', 'memmove', 'memset', 'memcmp',
    'atoi', 'atol', 'atof', 'strtol', 'strtod',
  ];

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      for (const funcName of this.nonVoidFunctions) {
        // Match: funcName(...); — standalone call without assignment
        const callRegex = new RegExp(`^\\s*${funcName}\\s*\\(`);
        if (callRegex.test(line) && line.endsWith(';')) {
          // Make sure it's not assigned
          if (!line.includes('=') && !line.startsWith('if') && !line.startsWith('while')) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `Return value of '${funcName}' is discarded`,
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

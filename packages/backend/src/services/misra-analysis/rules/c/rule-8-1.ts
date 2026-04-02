import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.1
 * Types shall be explicitly specified.
 * Detects implicit int (old-style C function declarations without explicit return type).
 */
export class Rule_C_8_1 implements MISRARule {
  id = 'MISRA-C-8.1';
  description = 'Types shall be explicitly specified';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  private readonly typeKeywords = new Set([
    'int', 'char', 'short', 'long', 'float', 'double', 'void',
    'unsigned', 'signed', 'struct', 'union', 'enum', 'typedef',
    'const', 'volatile', 'static', 'extern', 'inline', 'auto',
    'register', '_Bool', '_Complex',
  ]);

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Look for function definitions without explicit return type
    // Pattern: name(params) { — no type keyword before name
    const implicitFuncRegex = /^([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{?\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip preprocessor, comments, empty lines
      if (line.startsWith('#') || line.startsWith('//') || line.startsWith('*') || !line) continue;

      const match = line.match(implicitFuncRegex);
      if (match) {
        const name = match[1];
        // If the name is not a keyword and there's no type before it, it's implicit int
        if (!this.typeKeywords.has(name) && !['if', 'for', 'while', 'switch', 'do', 'else'].includes(name)) {
          // Check previous line for a type
          const prevLine = i > 0 ? lines[i - 1].trim() : '';
          const hasTypeOnPrevLine = [...this.typeKeywords].some(t => prevLine.includes(t));

          if (!hasTypeOnPrevLine) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `Function '${name}' declared without explicit return type (implicit int)`,
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

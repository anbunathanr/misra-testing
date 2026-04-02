import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 20.9
 * All macros used in #if or #elif preprocessing directives shall be defined
 * before use.
 * Detects macros used in #if/#elif that are not defined before that point.
 */
export class Rule_C_20_9 implements MISRARule {
  id = 'MISRA-C-20.9';
  description = 'All macros used in #if or #elif preprocessing directives shall be defined before use';
  severity = 'required' as const;
  category = 'Preprocessing';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    const definedMacros = new Set<string>();
    const ifRegex = /^\s*#\s*(?:if|elif)\s+(.+)/;
    const defineRegex = /^\s*#\s*define\s+(\w+)/;
    const identRegex = /\b([A-Z_][A-Z0-9_]{2,})\b/g; // Macro-like identifiers (all caps)

    // Built-in macros that are always defined
    const builtins = new Set([
      '__LINE__', '__FILE__', '__DATE__', '__TIME__', '__STDC__',
      '__STDC_VERSION__', '__cplusplus', 'NULL', 'EOF', 'TRUE', 'FALSE',
      'NDEBUG', 'INT_MAX', 'INT_MIN', 'UINT_MAX',
    ]);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track #define
      const defineMatch = line.match(defineRegex);
      if (defineMatch) {
        definedMacros.add(defineMatch[1]);
        continue;
      }

      // Check #if/#elif
      const ifMatch = line.match(ifRegex);
      if (ifMatch) {
        const expr = ifMatch[1];
        // Skip defined() operator — that's the proper way to check
        if (expr.includes('defined(')) continue;

        let m: RegExpExecArray | null;
        identRegex.lastIndex = 0;
        while ((m = identRegex.exec(expr)) !== null) {
          const macroName = m[1];
          if (!definedMacros.has(macroName) && !builtins.has(macroName)) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `Macro '${macroName}' used in #if/#elif before being defined`,
                line.trim()
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

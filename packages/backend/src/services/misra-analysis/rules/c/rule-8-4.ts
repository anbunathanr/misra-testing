import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.4
 * A compatible declaration shall be visible when an object or function with
 * external linkage is defined.
 * Detects function definitions without a prior prototype declaration.
 */
export class Rule_C_8_4 implements MISRARule {
  id = 'MISRA-C-8.4';
  description = 'A compatible declaration shall be visible when an object or function with external linkage is defined';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    // Collect all prototype declarations (lines ending with ;)
    const declaredFunctions = new Set<string>();
    const lines = ast.lines;

    const protoRegex = /^(?:(?:static|extern|inline)\s+)*[\w\s*]+\s+(\w+)\s*\([^)]*\)\s*;/;
    for (const line of lines) {
      const match = line.trim().match(protoRegex);
      if (match) {
        declaredFunctions.add(match[1]);
      }
    }

    // Check function definitions against declarations
    for (const func of ast.functions) {
      // Skip static functions (internal linkage) and main
      if (func.name === 'main') continue;

      const funcLine = lines[func.line - 1] || '';
      if (funcLine.includes('static')) continue;

      if (!declaredFunctions.has(func.name)) {
        violations.push(
          createViolation(
            this,
            func.line,
            0,
            `Function '${func.name}' defined without a prior declaration`,
            funcLine.trim()
          )
        );
      }
    }

    return violations;
  }
}

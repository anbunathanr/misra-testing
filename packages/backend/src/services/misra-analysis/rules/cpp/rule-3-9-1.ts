import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-9-1
 * The types used for an object, a function return type, or a function parameter
 * shall be token-for-token identical in all declarations and re-declarations.
 * Detects inconsistent typedef usage (same name redefined to different type).
 */
export class Rule_CPP_3_9_1 implements MISRARule {
  id = 'MISRA-CPP-3.9.1';
  description = 'Types used across translation units shall be identical';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect typedef redefinitions
    const typedefRegex = /^\s*typedef\s+(.+?)\s+(\w+)\s*;/;
    const typedefs = new Map<string, { type: string; line: number }>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('typedef')) continue;

      const match = line.match(typedefRegex);
      if (!match) continue;

      const typeName = match[2];
      const typeValue = match[1].trim();

      if (typedefs.has(typeName)) {
        const existing = typedefs.get(typeName)!;
        if (existing.type !== typeValue) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `typedef '${typeName}' redefined with different type (was '${existing.type}' at line ${existing.line})`,
              line
            )
          );
        }
      } else {
        typedefs.set(typeName, { type: typeValue, line: i + 1 });
      }
    }

    return violations;
  }
}

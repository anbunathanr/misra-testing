import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-2-1
 * All declarations of an object or function shall have compatible types.
 * Detects inconsistent declarations.
 */
export class Rule_CPP_3_2_1 implements MISRARule {
  id = 'MISRA-CPP-3.2.1';
  description = 'All declarations shall have compatible types';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track declarations: type name;
    const declarations = new Map<string, { type: string; line: number }>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Match declarations: type name; or extern type name;
      const declMatch = line.match(/^\s*(?:extern\s+)?(\w+(?:\s*[*&])?)\s+(\w+)\s*[;(]/);
      if (!declMatch) continue;

      const type = declMatch[1].trim();
      const name = declMatch[2];

      if (declarations.has(name)) {
        const prev = declarations.get(name)!;
        if (prev.type !== type) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Incompatible declaration of '${name}': '${type}' vs '${prev.type}' (line ${prev.line})`,
              line
            )
          );
        }
      } else {
        declarations.set(name, { type, line: i + 1 });
      }
    }

    return violations;
  }
}

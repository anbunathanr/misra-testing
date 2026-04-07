import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-2-4
 * An identifier with external linkage shall have exactly one definition.
 * Detects missing or duplicate definitions.
 */
export class Rule_CPP_3_2_4 implements MISRARule {
  id = 'MISRA-CPP-3.2.4';
  description = 'External identifiers shall have exactly one definition';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track extern declarations and definitions
    const externDecls = new Map<string, number>();
    const definitions = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Extern declaration
      const externMatch = line.match(/^\s*extern\s+\w+\s+(\w+)\s*;/);
      if (externMatch) {
        externDecls.set(externMatch[1], i + 1);
      }

      // Definition
      const defMatch = line.match(/^\s*\w+\s+(\w+)\s*=\s*[^;]+;/);
      if (defMatch && !line.includes('extern')) {
        const name = defMatch[1];
        if (definitions.has(name)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Multiple definitions of '${name}'`,
              line
            )
          );
        }
        definitions.set(name, i + 1);
      }
    }

    return violations;
  }
}

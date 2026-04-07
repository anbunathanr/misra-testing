import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-2-2
 * The One Definition Rule shall not be violated.
 * Detects multiple definitions of the same entity.
 */
export class Rule_CPP_3_2_2 implements MISRARule {
  id = 'MISRA-CPP-3.2.2';
  description = 'The One Definition Rule shall not be violated';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track function definitions
    const definitions = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Match function definitions: type name(...) {
      const defMatch = line.match(/^\s*\w+\s+(\w+)\s*\([^)]*\)\s*{/);
      if (!defMatch) continue;

      const name = defMatch[1];

      if (definitions.has(name)) {
        const prevLine = definitions.get(name)!;
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Multiple definitions of '${name}' (previously defined at line ${prevLine})`,
            line
          )
        );
      } else {
        definitions.set(name, i + 1);
      }
    }

    return violations;
  }
}

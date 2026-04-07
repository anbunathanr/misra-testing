import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-3-2
 * If a function has internal linkage then all re-declarations shall include the static storage class specifier.
 * Ensures consistent static declarations.
 */
export class Rule_CPP_3_3_2 implements MISRARule {
  id = 'MISRA-CPP-3.3.2';
  description = 'Static functions shall be consistently declared with static';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track static function declarations
    const staticFunctions = new Set<string>();
    const allFunctions = new Map<string, { isStatic: boolean; line: number }>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Function declaration or definition
      const funcMatch = line.match(/^\s*(static\s+)?\w+\s+(\w+)\s*\([^)]*\)/);
      if (!funcMatch) continue;

      const isStatic = !!funcMatch[1];
      const name = funcMatch[2];

      if (allFunctions.has(name)) {
        const prev = allFunctions.get(name)!;
        if (prev.isStatic !== isStatic) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Inconsistent static declaration for '${name}' (line ${prev.line} ${prev.isStatic ? 'has' : 'lacks'} static)`,
              line
            )
          );
        }
      } else {
        allFunctions.set(name, { isStatic, line: i + 1 });
      }
    }

    return violations;
  }
}

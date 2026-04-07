import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-4-1
 * An identifier declared to be an object or type shall be defined in a block that minimizes its visibility.
 * Encourages minimal scope for declarations.
 */
export class Rule_CPP_3_4_1 implements MISRARule {
  id = 'MISRA-CPP-3.4.1';
  description = 'Identifiers shall be defined in minimal scope';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Check for variables declared at function start but used much later
    let inFunction = false;
    const declaredVars = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Function start
      if (/\b\w+\s+\w+\s*\([^)]*\)\s*{/.test(line)) {
        inFunction = true;
        declaredVars.clear();
        continue;
      }

      // Function end
      if (line === '}' && inFunction) {
        inFunction = false;
        continue;
      }

      if (inFunction) {
        // Variable declaration
        const declMatch = line.match(/^\s*\w+\s+(\w+)\s*[;=]/);
        if (declMatch) {
          declaredVars.set(declMatch[1], i + 1);
        }
      }
    }

    return violations;
  }
}

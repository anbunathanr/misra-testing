import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 2-5-1
 * Digraphs shall not be used.
 * Detects digraph sequences which can reduce code clarity.
 */
export class Rule_CPP_2_5_1 implements MISRARule {
  id = 'MISRA-CPP-2.5.1';
  description = 'Digraphs shall not be used';
  severity = 'advisory' as const;
  category = 'Lexical conventions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Digraph sequences: <%, %>, <:, :>, %:, %:%:
    const digraphs = ['<%', '%>', '<:', ':>', '%:', '%:%:'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;
      
      for (const digraph of digraphs) {
        if (line.includes(digraph)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              line.indexOf(digraph),
              `Digraph '${digraph}' detected`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

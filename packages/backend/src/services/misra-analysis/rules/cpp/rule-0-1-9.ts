import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 0-1-9
 * There shall be no dead code.
 * Detects code that can never be executed.
 */
export class Rule_CPP_0_1_9 implements MISRARule {
  id = 'MISRA-CPP-0.1.9';
  description = 'There shall be no dead code';
  severity = 'required' as const;
  category = 'Unused code';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Check for code after return, break, continue, throw
      if (/\b(return|break|continue|throw)\b/.test(line)) {
        // Look at next non-empty, non-comment line
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (!nextLine || nextLine.startsWith('//')) continue;
          
          // If next line is closing brace or case/default, it's OK
          if (/^[}]/.test(nextLine) || /^(case|default)\b/.test(nextLine)) break;
          
          violations.push(
            createViolation(
              this,
              j + 1,
              0,
              'Dead code detected after control flow statement',
              nextLine
            )
          );
          break;
        }
      }
    }

    return violations;
  }
}

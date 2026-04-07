import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 0-1-2
 * A project shall not contain infeasible paths.
 * Detects non-reachable code (statements after return/break/continue/throw).
 */
export class Rule_CPP_0_1_2 implements MISRARule {
  id = 'MISRA-CPP-0.1.2';
  description = 'A project shall not contain non-reachable code';
  severity = 'required' as const;
  category = 'Unused code';
  language = 'CPP' as const;

  private readonly terminators = ['return', 'break', 'continue', 'goto', 'throw'];

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();

      const hasTerminator = this.terminators.some(t => {
        const regex = new RegExp(`\\b${t}\\b`);
        return regex.test(line) && line.endsWith(';');
      });

      if (!hasTerminator) continue;

      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();

        if (nextLine === '' || nextLine === '}' || nextLine === '};') continue;
        if (nextLine.startsWith('}')) break;

        // Skip labels (case/default/goto targets)
        if (/^[a-zA-Z_]\w*\s*:/.test(nextLine) || nextLine.startsWith('case ') || nextLine === 'default:') break;

        violations.push(
          createViolation(
            this,
            j + 1,
            0,
            'Non-reachable code detected after control flow statement',
            nextLine
          )
        );
        break;
      }
    }

    return violations;
  }
}

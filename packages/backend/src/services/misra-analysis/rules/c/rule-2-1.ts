import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 2.1
 * A project shall not contain unreachable code.
 * Detects statements after return/break/continue/goto at the same block level.
 */
export class Rule_C_2_1 implements MISRARule {
  id = 'MISRA-C-2.1';
  description = 'A project shall not contain unreachable code';
  severity = 'mandatory' as const;
  category = 'Unused code';
  language = 'C' as const;

  private readonly terminators = ['return', 'break', 'continue', 'goto'];

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();

      // Check if this line ends with a terminator statement
      const hasTerminator = this.terminators.some(t => {
        const regex = new RegExp(`\\b${t}\\b`);
        return regex.test(line) && line.endsWith(';');
      });

      if (!hasTerminator) continue;

      // Look ahead for unreachable code (non-empty, non-closing-brace lines)
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();

        // Stop at closing brace (end of block)
        if (nextLine === '}' || nextLine === '};' || nextLine === '') continue;
        if (nextLine.startsWith('}')) break;

        // Skip labels (case/default/goto targets)
        if (/^[a-zA-Z_]\w*\s*:/.test(nextLine) || nextLine.startsWith('case ') || nextLine === 'default:') break;

        // This is unreachable code
        violations.push(
          createViolation(
            this,
            j + 1,
            0,
            'Unreachable code detected after control flow statement',
            nextLine
          )
        );
        break; // Only report first unreachable statement per block
      }
    }

    return violations;
  }
}

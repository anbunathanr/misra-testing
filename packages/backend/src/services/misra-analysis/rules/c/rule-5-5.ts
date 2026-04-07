import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 5.5
 * Identifiers shall be distinct from macro names.
 */
export class Rule_C_5_5 implements MISRARule {
  id = 'MISRA-C-5.5';
  description = 'Identifiers shall be distinct from macro names';
  severity = 'required' as const;
  category = 'Identifiers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const macros = new Set<string>();
    const identifiers = new Map<string, number>();

    // Collect macros
    for (const line of ast.lines) {
      const macroMatch = line.match(/^#define\s+(\w+)/);
      if (macroMatch) {
        macros.add(macroMatch[1]);
      }
    }

    // Check identifiers
    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      const declMatch = line.match(/(?:int|char|float|double|long|short|void)\s+(\w+)/);
      
      if (declMatch && macros.has(declMatch[1])) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Identifier '${declMatch[1]}' conflicts with macro name`,
            line
          )
        );
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 11.3
 * A cast shall not be performed between a pointer to object type and a
 * pointer to a different object type.
 * Detects C-style casts between pointer types.
 */
export class Rule_C_11_3 implements MISRARule {
  id = 'MISRA-C-11.3';
  description = 'A cast shall not be performed between a pointer to object type and a pointer to a different object type';
  severity = 'required' as const;
  category = 'Pointer conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect C-style pointer casts: (type*) or (type *)
    const ptrCastRegex = /\(\s*(?:const\s+|volatile\s+)?[a-zA-Z_]\w*\s*\*+\s*\)/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      const matches = line.match(ptrCastRegex);
      if (matches) {
        for (const match of matches) {
          // Skip void* casts (those are handled by rule 11.5)
          if (match.includes('void')) continue;

          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `C-style pointer cast '${match.trim()}' detected`,
              line
            )
          );
          break; // Report once per line
        }
      }
    }

    return violations;
  }
}

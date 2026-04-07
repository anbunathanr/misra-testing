import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 2-10-1
 * Different identifiers shall be typographically unambiguous.
 * Detects identifiers starting with underscore (reserved) and identifiers that differ only in case.
 */
export class Rule_CPP_2_10_1 implements MISRARule {
  id = 'MISRA-CPP-2.10.1';
  description = 'Different identifiers shall be typographically unambiguous';
  severity = 'required' as const;
  category = 'Identifiers';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Check for identifiers starting with underscore (reserved)
    const underscoreRegex = /\b_[a-zA-Z_]\w*/g;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;
      
      const matches = line.matchAll(underscoreRegex);
      for (const match of matches) {
        violations.push(
          createViolation(
            this,
            i + 1,
            match.index || 0,
            `Identifier '${match[0]}' starts with underscore (reserved)`,
            line.trim()
          )
        );
      }
    }

    // Collect all unique identifiers with their first occurrence line
    const identifiers = new Map<string, { value: string; line: number }>();
    const reported = new Set<string>();

    for (const token of ast.tokens) {
      if (token.type !== 'identifier') continue;
      const lower = token.value.toLowerCase();

      if (identifiers.has(lower)) {
        const existing = identifiers.get(lower)!;
        // Only report if they differ in case (not the same identifier)
        if (existing.value !== token.value) {
          const key = [existing.value, token.value].sort().join('|');
          if (!reported.has(key)) {
            reported.add(key);
            const line = ast.lines[token.line - 1] || '';
            violations.push(
              createViolation(
                this,
                token.line,
                token.column,
                `Identifier '${token.value}' differs only in case from '${existing.value}' (line ${existing.line})`,
                line.trim()
              )
            );
          }
        }
      } else {
        identifiers.set(lower, { value: token.value, line: token.line });
      }
    }

    return violations;
  }
}

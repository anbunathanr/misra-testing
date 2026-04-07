import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 5.3
 * An identifier declared in an inner scope shall not hide an identifier in an outer scope.
 */
export class Rule_C_5_3 implements MISRARule {
  id = 'MISRA-C-5.3';
  description = 'An identifier declared in an inner scope shall not hide an identifier in an outer scope';
  severity = 'required' as const;
  category = 'Identifiers';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const outerScope = new Set<string>();
    let braceDepth = 0;

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      const declMatch = line.match(/(?:int|char|float|double|long|short|void)\s+(\w+)/);
      if (declMatch) {
        const id = declMatch[1];
        
        if (braceDepth > 1 && outerScope.has(id)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Identifier '${id}' hides outer scope identifier`,
              line
            )
          );
        } else if (braceDepth <= 1) {
          outerScope.add(id);
        }
      }
    }

    return violations;
  }
}

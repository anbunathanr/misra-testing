import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 2.3
 * A project should not contain unused type declarations.
 */
export class Rule_C_2_3 implements MISRARule {
  id = 'MISRA-C-2.3';
  description = 'A project should not contain unused type declarations';
  severity = 'advisory' as const;
  category = 'Unused code';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;
    const typedefNames = new Set<string>();
    const usedTypes = new Set<string>();

    // Find typedef declarations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const typedefMatch = line.match(/typedef\s+(?:struct|union|enum)?\s*\w*\s+(\w+)\s*;/);
      if (typedefMatch) {
        typedefNames.add(typedefMatch[1]);
      }
    }

    // Find type usage
    for (const line of lines) {
      for (const typeName of typedefNames) {
        if (line.includes(typeName) && !line.startsWith('typedef')) {
          usedTypes.add(typeName);
        }
      }
    }

    // Report unused types
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const typedefMatch = line.match(/typedef\s+(?:struct|union|enum)?\s*\w*\s+(\w+)\s*;/);
      if (typedefMatch && !usedTypes.has(typedefMatch[1])) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Unused type declaration '${typedefMatch[1]}'`,
            line
          )
        );
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 7-2-1
 * An expression with enum underlying type shall only have values corresponding to the enumerators of the enumeration.
 */
export class Rule_CPP_7_2_1 implements MISRARule {
  id = 'MISRA-CPP-7.2.1';
  description = 'An expression with enum underlying type shall only have values corresponding to the enumerators of the enumeration';
  severity = 'required' as const;
  category = 'Types';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track enum definitions
    const enums = new Map<string, Set<string>>();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect enum definitions
      const enumDefRegex = /enum\s+(?:class\s+)?([a-zA-Z_]\w*)\s*{([^}]*)}/;
      const enumMatch = line.match(enumDefRegex);
      
      if (enumMatch) {
        const enumName = enumMatch[1];
        const enumBody = enumMatch[2];
        const enumerators = new Set(
          enumBody.split(',').map(e => e.trim().split('=')[0].trim()).filter(e => e)
        );
        enums.set(enumName, enumerators);
      }
    }

    // Check for invalid enum assignments
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      for (const [enumName, enumerators] of enums) {
        const assignRegex = new RegExp(`${enumName}\\s+\\w+\\s*=\\s*(\\d+|0x[0-9a-fA-F]+)`);
        const match = line.match(assignRegex);
        
        if (match) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Enum ${enumName} assigned a value not in its enumerator list`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

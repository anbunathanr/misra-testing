import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.12
 * Within an enumerator list, the value of an implicitly-specified enumeration constant shall be unique.
 */
export class Rule_C_8_12 implements MISRARule {
  id = 'MISRA-C-8.12';
  description = 'Within an enumerator list, the value of an implicitly-specified enumeration constant shall be unique';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    let inEnum = false;
    let enumValues = new Set<number>();
    let currentValue = 0;

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      if (line.includes('enum')) {
        inEnum = true;
        enumValues.clear();
        currentValue = 0;
      }
      
      if (inEnum && line.includes('}')) {
        inEnum = false;
      }
      
      if (inEnum && line.includes(',')) {
        const enumMatch = line.match(/(\w+)\s*=\s*(\d+)/);
        if (enumMatch) {
          currentValue = parseInt(enumMatch[2]);
        }
        
        if (enumValues.has(currentValue)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Duplicate enum value ${currentValue}`,
              line
            )
          );
        }
        enumValues.add(currentValue);
        currentValue++;
      }
    }

    return violations;
  }
}

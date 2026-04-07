import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 6.1
 * Bit-fields shall only be declared with an appropriate type.
 */
export class Rule_C_6_1 implements MISRARule {
  id = 'MISRA-C-6.1';
  description = 'Bit-fields shall only be declared with an appropriate type';
  severity = 'required' as const;
  category = 'Types';
  language = 'C' as const;

  private readonly allowedTypes = new Set([
    'unsigned int', 'signed int', '_Bool', 'unsigned', 'signed'
  ]);

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Match bit-field declarations: type name : width;
      const bitfieldMatch = line.match(/(\w+(?:\s+\w+)?)\s+\w+\s*:\s*\d+/);
      if (bitfieldMatch) {
        const type = bitfieldMatch[1].trim();
        
        if (!this.allowedTypes.has(type)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Bit-field declared with inappropriate type '${type}'`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.6
 * An identifier with external linkage shall have exactly one external definition.
 */
export class Rule_C_8_6 implements MISRARule {
  id = 'MISRA-C-8.6';
  description = 'An identifier with external linkage shall have exactly one external definition';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const definitions = new Map<string, number>();

    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      // Match function definitions (not declarations)
      if (line.includes('{') && !line.includes(';')) {
        const funcMatch = line.match(/\w+\s+(\w+)\s*\(/);
        if (funcMatch) {
          const name = funcMatch[1];
          
          if (definitions.has(name)) {
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `Multiple definitions of '${name}' (first at line ${definitions.get(name)})`,
                line
              )
            );
          } else {
            definitions.set(name, i + 1);
          }
        }
      }
    }

    return violations;
  }
}

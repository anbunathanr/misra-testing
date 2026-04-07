import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 0-2-1
 * An object shall not be assigned to an overlapping object.
 * Detects potential aliasing issues in assignments.
 */
export class Rule_CPP_0_2_1 implements MISRARule {
  id = 'MISRA-CPP-0.2.1';
  description = 'An object shall not be assigned to an overlapping object';
  severity = 'required' as const;
  category = 'Memory';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect self-assignment: x = x;
    const selfAssignRegex = /^\s*([a-zA-Z_]\w*)\s*=\s*\1\s*;/;
    
    // Detect array element self-copy: arr[i] = arr[i];
    const arraySelfCopyRegex = /^\s*([a-zA-Z_]\w*)\[([^\]]+)\]\s*=\s*\1\[\2\]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      if (selfAssignRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Self-assignment detected',
            line
          )
        );
      }
      
      if (arraySelfCopyRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Array element self-copy detected',
            line
          )
        );
      }
    }

    return violations;
  }
}

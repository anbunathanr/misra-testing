import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 0-1-6
 * A project shall not contain instances of non-volatile variables being given values that are never subsequently used.
 * Detects dead stores - assignments that are overwritten before being read.
 */
export class Rule_CPP_0_1_6 implements MISRARule {
  id = 'MISRA-CPP-0.1.6';
  description = 'Variables shall not be assigned values that are never subsequently used';
  severity = 'required' as const;
  category = 'Unused code';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track assignments: var = value;
    const assignmentRegex = /^\s*([a-zA-Z_]\w*)\s*=\s*[^=]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      const match = line.match(assignmentRegex);
      if (!match) continue;

      const varName = match[1];
      
      // Look ahead to see if variable is reassigned before being read
      let foundRead = false;
      let foundReassign = false;
      
      for (let j = i + 1; j < lines.length && j < i + 20; j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('//') || nextLine.startsWith('#')) continue;
        
        // Check for reassignment
        if (new RegExp(`^\\s*${varName}\\s*=\\s*[^=]`).test(nextLine)) {
          foundReassign = true;
          break;
        }
        
        // Check for read (not in assignment context)
        if (new RegExp(`\\b${varName}\\b`).test(nextLine) && !new RegExp(`^\\s*${varName}\\s*=`).test(nextLine)) {
          foundRead = true;
          break;
        }
      }
      
      if (foundReassign && !foundRead) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Value assigned to '${varName}' is never used before being overwritten`,
            line
          )
        );
      }
    }

    return violations;
  }
}

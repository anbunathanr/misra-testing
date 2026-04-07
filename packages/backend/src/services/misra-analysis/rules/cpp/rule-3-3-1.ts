import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-3-1
 * Objects or functions with external linkage shall be declared in a header file.
 * Ensures proper declaration organization.
 */
export class Rule_CPP_3_3_1 implements MISRARule {
  id = 'MISRA-CPP-3.3.1';
  description = 'External linkage entities shall be declared in a header file';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // In .cpp files, check for extern declarations (should be in .h)
    const isCppFile = sourceCode.includes('.cpp') || sourceCode.includes('.cc');
    
    if (isCppFile) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('//') || line.startsWith('#') || !line) continue;

        // Extern declaration in .cpp file
        if (line.startsWith('extern') && line.includes(';')) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              'External declaration should be in a header file, not in .cpp',
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

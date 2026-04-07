import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-2-3
 * A type, object or function that is used in multiple translation units shall be declared in one and only one file.
 * Detects missing extern declarations.
 */
export class Rule_CPP_3_2_3 implements MISRARule {
  id = 'MISRA-CPP-3.2.3';
  description = 'Entities used in multiple translation units shall be declared in one file';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Check for global variables without extern in .cpp files
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Global variable declaration without extern
      const globalVarMatch = line.match(/^\s*(\w+)\s+(\w+)\s*=\s*[^;]+;/);
      if (globalVarMatch && !line.includes('extern') && !line.includes('static') && !line.includes('const')) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Global variable '${globalVarMatch[2]}' should be declared with 'extern' or 'static'`,
            line
          )
        );
      }
    }

    return violations;
  }
}

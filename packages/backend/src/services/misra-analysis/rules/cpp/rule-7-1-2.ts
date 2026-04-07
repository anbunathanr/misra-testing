import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 7-1-2
 * A pointer or reference parameter in a function shall be declared as pointer to const or reference to const if the corresponding object is not modified.
 */
export class Rule_CPP_7_1_2 implements MISRARule {
  id = 'MISRA-CPP-7.1.2';
  description = 'A pointer or reference parameter in a function shall be declared as pointer to const or reference to const if the corresponding object is not modified';
  severity = 'required' as const;
  category = 'Functions';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip lines that already have const
      if (line.includes('const')) {
        continue;
      }
      
      // Check for function parameters with pointers/references without const
      const funcParamRegex = /\b([a-zA-Z_]\w*)\s*\(\s*([^)]+)\s*\)/;
      const match = line.match(funcParamRegex);
      
      if (match) {
        const params = match[2];
        // Check for pointer or reference parameters
        const ptrRefRegex = /([a-zA-Z_]\w*)\s*[*&]\s*([a-zA-Z_]\w*)/g;
        let paramMatch;
        
        while ((paramMatch = ptrRefRegex.exec(params)) !== null) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Parameter '${paramMatch[2]}' should be declared as pointer/reference to const if not modified`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

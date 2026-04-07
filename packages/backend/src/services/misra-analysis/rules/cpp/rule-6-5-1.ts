import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 6-5-1
 * A for loop shall contain a single loop-counter which shall not have floating-point type.
 * Detects modification of loop counter within the loop body.
 */
export class Rule_CPP_6_5_1 implements MISRARule {
  id = 'MISRA-CPP-6.5.1';
  description = 'A for loop counter shall not be modified within the loop body';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Find for loops and track their counter variables
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.includes('for') || !line.includes('(')) continue;

      // Extract loop counter from for statement
      const forMatch = line.match(/for\s*\(\s*(?:int|size_t|unsigned|long)?\s*(\w+)\s*=/);
      if (!forMatch) continue;

      const counter = forMatch[1];
      let braceDepth = 0;
      let inLoop = false;

      // Scan loop body for counter modifications
      for (let j = i; j < lines.length; j++) {
        const bodyLine = lines[j].trim();
        
        // Track brace depth
        braceDepth += (bodyLine.match(/{/g) || []).length;
        if (braceDepth > 0) inLoop = true;
        braceDepth -= (bodyLine.match(/}/g) || []).length;

        // Exit when loop ends
        if (inLoop && braceDepth === 0) break;

        // Skip the for statement line itself
        if (j === i) continue;

        // Check for counter modification in loop body
        const modificationRegex = new RegExp(`\\b${counter}\\s*(?:=|\\+\\+|--|\\+=|-=|\\*=|/=)`, 'g');
        if (modificationRegex.test(bodyLine)) {
          // Exclude the increment part of the for statement
          if (j !== i) {
            violations.push(
              createViolation(
                this,
                j + 1,
                0,
                `Loop counter '${counter}' is modified within the loop body`,
                bodyLine
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

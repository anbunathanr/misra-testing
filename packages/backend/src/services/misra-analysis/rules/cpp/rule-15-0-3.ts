import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 15-0-3
 * Control shall not be transferred into a try or catch block using a goto or a switch statement.
 * Detects goto or switch that jumps into try/catch blocks.
 */
export class Rule_CPP_15_0_3 implements MISRARule {
  id = 'MISRA-CPP-15.0.3';
  description = 'Control shall not be transferred into a try or catch block';
  severity = 'required' as const;
  category = 'Exception handling';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track try/catch blocks and look for goto/switch that could jump into them
    const tryBlocks: Array<{ start: number; end: number }> = [];
    let braceDepth = 0;
    let tryStart = -1;

    // First pass: identify try/catch blocks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('try') && line.includes('{')) {
        tryStart = i;
        braceDepth = 1;
      } else if (tryStart >= 0) {
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        
        if (braceDepth === 0) {
          tryBlocks.push({ start: tryStart, end: i });
          tryStart = -1;
        }
      }
    }

    // Second pass: look for goto statements or labels inside try blocks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || !line) continue;

      // Check for goto statements
      if (line.includes('goto')) {
        const gotoMatch = line.match(/goto\s+(\w+)/);
        if (gotoMatch) {
          const label = gotoMatch[1];
          
          // Check if the label is inside a try block
          for (const block of tryBlocks) {
            // Look for the label
            for (let j = block.start; j <= block.end; j++) {
              if (lines[j].includes(`${label}:`)) {
                // goto is outside, label is inside
                if (i < block.start || i > block.end) {
                  violations.push(
                    createViolation(
                      this,
                      i + 1,
                      0,
                      `goto statement transfers control into a try/catch block`,
                      line
                    )
                  );
                }
              }
            }
          }
        }
      }

      // Check for switch statements that might jump into try blocks
      if (line.includes('switch')) {
        for (const block of tryBlocks) {
          if (i < block.start && i + 10 > block.start) {
            // Switch is close to a try block - potential violation
            violations.push(
              createViolation(
                this,
                i + 1,
                0,
                `switch statement may transfer control into a try/catch block`,
                line
              )
            );
          }
        }
      }
    }

    return violations;
  }
}

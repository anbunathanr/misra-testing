import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 6-4-2
 * All if...else if constructs shall be terminated with an else clause.
 */
export class Rule_CPP_6_4_2 implements MISRARule {
  id = 'MISRA-CPP-6.4.2';
  description = 'All if...else if constructs shall be terminated with an else clause';
  severity = 'required' as const;
  category = 'Control flow';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Track if we're in an if-else if chain
    let inElseIfChain = false;
    let elseIfLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Start tracking when we see else if
      if (line.startsWith('else if') || line.includes('} else if')) {
        inElseIfChain = true;
        elseIfLine = i;
      }
      // Found a final else - chain is properly terminated
      else if (inElseIfChain && (line.startsWith('else {') || line === 'else' || line.includes('} else {'))) {
        inElseIfChain = false;
      }
      // Found something else that ends the chain without else
      else if (inElseIfChain && line.startsWith('}') && !line.includes('else')) {
        // Check if the next non-empty line is else
        let foundElse = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (!nextLine) continue;
          if (nextLine.startsWith('else') && !nextLine.startsWith('else if')) {
            foundElse = true;
          }
          break;
        }
        
        if (!foundElse) {
          violations.push(
            createViolation(
              this,
              elseIfLine + 1,
              0,
              'if...else if construct must be terminated with an else clause',
              lines[elseIfLine]
            )
          );
        }
        inElseIfChain = false;
      }
    }

    return violations;
  }
}

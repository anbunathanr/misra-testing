import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 17.2
 * Functions shall not call themselves, either directly or indirectly.
 */
export class Rule_C_17_2 implements MISRARule {
  id = 'MISRA-C-17.2';
  description = 'Functions shall not call themselves, either directly or indirectly';
  severity = 'required' as const;
  category = 'Functions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];

    // Extract function names from source code
    const functionPattern = /(\w+)\s*\([^)]*\)\s*\{/g;
    const functions: { name: string; startLine: number; endLine: number }[] = [];
    
    let match;
    while ((match = functionPattern.exec(sourceCode)) !== null) {
      const funcName = match[1];
      const startPos = match.index;
      const startLine = sourceCode.substring(0, startPos).split('\n').length;
      
      // Find end of function (simplified - count braces)
      let braceCount = 1;
      let pos = startPos + match[0].length;
      while (braceCount > 0 && pos < sourceCode.length) {
        if (sourceCode[pos] === '{') braceCount++;
        if (sourceCode[pos] === '}') braceCount--;
        pos++;
      }
      const endLine = sourceCode.substring(0, pos).split('\n').length;
      
      functions.push({ name: funcName, startLine, endLine });
    }

    // Check for direct recursion
    for (const func of functions) {
      const funcName = func.name;
      
      // Check for function calls to itself
      for (let i = func.startLine - 1; i < func.endLine && i < ast.lines.length; i++) {
        const line = ast.lines[i];
        
        // Look for function calls to itself
        const callMatch = line.match(new RegExp(`\\b${funcName}\\s*\\(`));
        if (callMatch) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Function '${funcName}' calls itself (direct recursion)`,
              line.trim()
            )
          );
        }
      }
    }

    return violations;
  }
}

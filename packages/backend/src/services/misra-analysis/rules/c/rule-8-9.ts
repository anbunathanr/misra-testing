import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.9
 * An object should be defined at block scope if its identifier only appears in a single function.
 */
export class Rule_C_8_9 implements MISRARule {
  id = 'MISRA-C-8.9';
  description = 'An object should be defined at block scope if its identifier only appears in a single function';
  severity = 'advisory' as const;
  category = 'Declarations';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const globalVars = new Map<string, number>();

    // Find global variable declarations
    let inFunction = false;
    for (let i = 0; i < ast.lines.length; i++) {
      const line = ast.lines[i].trim();
      
      if (line.includes('{')) inFunction = true;
      if (line.includes('}')) inFunction = false;
      
      if (!inFunction && !line.startsWith('#')) {
        const varMatch = line.match(/(?:int|char|float|double|long|short)\s+(\w+)\s*[;=]/);
        if (varMatch && !line.includes('static')) {
          globalVars.set(varMatch[1], i + 1);
        }
      }
    }

    // Check if global vars are only used in one function
    for (const [varName, lineNum] of globalVars) {
      let usageCount = 0;
      for (const func of ast.functions) {
        const funcLine = func.line;
        for (let i = funcLine; i < Math.min(funcLine + 50, ast.lines.length); i++) {
          if (ast.lines[i - 1] && ast.lines[i - 1].includes(varName)) {
            usageCount++;
            break;
          }
        }
      }
      
      if (usageCount === 1) {
        violations.push(
          createViolation(
            this,
            lineNum,
            0,
            `Variable '${varName}' should be defined at block scope`,
            ast.lines[lineNum - 1]
          )
        );
      }
    }

    return violations;
  }
}

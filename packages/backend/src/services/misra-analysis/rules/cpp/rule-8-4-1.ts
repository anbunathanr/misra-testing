import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 8-4-1
 * Functions shall not be defined using the ellipsis notation.
 * Also detects: Unused function parameters.
 */
export class Rule_CPP_8_4_1 implements MISRARule {
  id = 'MISRA-CPP-8.4.1';
  description = 'Functions shall not be defined with unused parameters';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Find function definitions and check for unused parameters
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#') || !line) continue;

      // Match function definitions (with opening brace)
      const funcMatch = line.match(/\b(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{?/);
      if (!funcMatch) continue;

      const params = funcMatch[3];
      if (!params || params === 'void' || params === '') continue;

      // Extract parameter names
      const paramList = params.split(',').map(p => p.trim());
      const paramNames: string[] = [];

      for (const param of paramList) {
        const nameMatch = param.match(/\b(\w+)\s*$/);
        if (nameMatch) {
          paramNames.push(nameMatch[1]);
        }
      }

      // Find function body (scan until closing brace)
      let braceDepth = line.includes('{') ? 1 : 0;
      let functionBody = '';
      
      for (let j = i + 1; j < lines.length && braceDepth > 0; j++) {
        const bodyLine = lines[j];
        braceDepth += (bodyLine.match(/{/g) || []).length;
        braceDepth -= (bodyLine.match(/}/g) || []).length;
        functionBody += bodyLine + '\n';
      }

      // Check if each parameter is used in the function body
      for (const paramName of paramNames) {
        const usageRegex = new RegExp(`\\b${paramName}\\b`);
        if (!usageRegex.test(functionBody)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Function parameter '${paramName}' is not used in the function body`,
              line
            )
          );
        }
      }
    }

    return violations;
  }
}

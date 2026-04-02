import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 8.2
 * Function types shall be in prototype form with named parameters.
 * Detects function declarations where parameters are types without names.
 */
export class Rule_C_8_2 implements MISRARule {
  id = 'MISRA-C-8.2';
  description = 'Function types shall be in prototype form with named parameters';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'C' as const;

  private readonly typeKeywords = new Set([
    'int', 'char', 'short', 'long', 'float', 'double', 'void',
    'unsigned', 'signed', 'struct', 'union', 'enum',
    'const', 'volatile', '_Bool', '_Complex',
  ]);

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Match function declarations (ending with ;)
    const protoRegex = /^(?:(?:static|extern|inline)\s+)*[\w\s*]+\s+(\w+)\s*\(([^)]*)\)\s*;/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line.endsWith(';') || line.startsWith('#') || line.startsWith('//')) continue;

      const match = line.match(protoRegex);
      if (!match) continue;

      const funcName = match[1];
      const paramsStr = match[2].trim();

      // Skip if no params or void
      if (!paramsStr || paramsStr === 'void' || paramsStr === '') continue;

      // Skip control flow keywords
      if (['if', 'for', 'while', 'switch'].includes(funcName)) continue;

      const params = paramsStr.split(',').map(p => p.trim());

      for (const param of params) {
        if (!param) continue;
        // A param with no name is just a type (e.g., "int", "char*", "const int")
        // A named param has at least two tokens: type + name
        const tokens = param.replace(/\*/g, ' * ').trim().split(/\s+/).filter(Boolean);

        // Check if last token is a type keyword (meaning no name was given)
        const lastToken = tokens[tokens.length - 1].replace(/[*&]/, '');
        if (tokens.length === 1 || this.typeKeywords.has(lastToken)) {
          violations.push(
            createViolation(
              this,
              i + 1,
              0,
              `Function '${funcName}' prototype parameter '${param}' has no name`,
              line
            )
          );
          break; // Report once per function
        }
      }
    }

    return violations;
  }
}

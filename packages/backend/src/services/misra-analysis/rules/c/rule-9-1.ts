import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 9.1
 * The value of an object with automatic storage duration shall not be read
 * before it has been set.
 * Detects variable declarations without initialization.
 */
export class Rule_C_9_1 implements MISRARule {
  id = 'MISRA-C-9.1';
  description = 'The value of an object with automatic storage duration shall not be read before it has been set';
  severity = 'mandatory' as const;
  category = 'Initialization';
  language = 'C' as const;

  private readonly typeKeywords = new Set([
    'int', 'char', 'short', 'long', 'float', 'double',
    'unsigned', 'signed', '_Bool',
  ]);

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Look for variable declarations without initialization
    // Pattern: type name; (no = sign)
    const uninitRegex = /^(?:(?:const|volatile|register)\s+)*([a-zA-Z_]\w*(?:\s*[*]+)?)\s+([a-zA-Z_]\w*)\s*;\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || line.startsWith('*') || !line) continue;
      if (line.includes('(') || line.includes(')')) continue; // Skip function-like lines

      const match = line.match(uninitRegex);
      if (!match) continue;

      const typeName = match[1].replace(/\*/g, '').trim();
      const varName = match[2];

      // Only flag primitive types (not structs/pointers which may be intentionally uninitialized)
      if (!this.typeKeywords.has(typeName)) continue;

      // Skip extern declarations
      if (lines[i].includes('extern')) continue;

      violations.push(
        createViolation(
          this,
          i + 1,
          0,
          `Variable '${varName}' declared without initialization`,
          line
        )
      );
    }

    return violations;
  }
}

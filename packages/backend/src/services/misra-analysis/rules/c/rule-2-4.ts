import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 2.4
 * A project should not contain unused tag declarations.
 */
export class Rule_C_2_4 implements MISRARule {
  id = 'MISRA-C-2.4';
  description = 'A project should not contain unused tag declarations';
  severity = 'advisory' as const;
  category = 'Unused code';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;
    const tagNames = new Set<string>();
    const usedTags = new Set<string>();

    // Find struct/union/enum tag declarations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const tagMatch = line.match(/(?:struct|union|enum)\s+(\w+)\s*\{/);
      if (tagMatch) {
        tagNames.add(tagMatch[1]);
      }
    }

    // Find tag usage
    for (const line of lines) {
      for (const tagName of tagNames) {
        if (line.includes(`struct ${tagName}`) || line.includes(`union ${tagName}`) || line.includes(`enum ${tagName}`)) {
          usedTags.add(tagName);
        }
      }
    }

    // Report unused tags
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const tagMatch = line.match(/(?:struct|union|enum)\s+(\w+)\s*\{/);
      if (tagMatch && !usedTags.has(tagMatch[1])) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            `Unused tag declaration '${tagMatch[1]}'`,
            line
          )
        );
      }
    }

    return violations;
  }
}

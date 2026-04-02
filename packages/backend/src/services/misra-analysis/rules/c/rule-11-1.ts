import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C:2012 Rule 11.1
 * Conversions shall not be performed between a pointer to a function and
 * any other type.
 * Detects casts involving function pointer types.
 */
export class Rule_C_11_1 implements MISRARule {
  id = 'MISRA-C-11.1';
  description = 'Conversions shall not be performed between a pointer to a function and any other type';
  severity = 'mandatory' as const;
  category = 'Pointer conversions';
  language = 'C' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Detect function pointer casts: (type (*)(params)) or casting to/from void*
    // Pattern: (returnType (*)(params))
    const funcPtrCastRegex = /\(\s*\w[\w\s*]*\(\s*\*\s*\)\s*\([^)]*\)\s*\)/;
    // Pattern: casting a function pointer to void* or other pointer
    const voidPtrFuncRegex = /\(\s*void\s*\*\s*\)\s*\w+/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#') || line.startsWith('//') || !line) continue;

      if (funcPtrCastRegex.test(line) || voidPtrFuncRegex.test(line)) {
        violations.push(
          createViolation(
            this,
            i + 1,
            0,
            'Conversion between function pointer and other type detected',
            line
          )
        );
      }
    }

    return violations;
  }
}

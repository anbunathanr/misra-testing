import { MISRARule, createViolation } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';

/**
 * MISRA C++:2008 Rule 3-1-3
 * It shall be possible to include any header file in multiple translation units without violating the One Definition Rule.
 * Detects missing include guards.
 */
export class Rule_CPP_3_1_3 implements MISRARule {
  id = 'MISRA-CPP-3.1.3';
  description = 'Header files shall have include guards';
  severity = 'required' as const;
  category = 'Declarations';
  language = 'CPP' as const;

  async check(ast: AST, sourceCode: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lines = ast.lines;

    // Only check header files
    if (!sourceCode.includes('.h') && !sourceCode.includes('.hpp')) {
      return violations;
    }

    // Check for include guard pattern: #ifndef, #define, #endif
    let hasIfndef = false;
    let hasDefine = false;
    let hasEndif = false;

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('#ifndef')) hasIfndef = true;
      if (line.startsWith('#define')) hasDefine = true;
    }

    for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#endif')) hasEndif = true;
    }

    if (!hasIfndef || !hasDefine || !hasEndif) {
      violations.push(
        createViolation(
          this,
          1,
          0,
          'Header file missing include guards (#ifndef/#define/#endif)',
          lines[0] || ''
        )
      );
    }

    return violations;
  }
}

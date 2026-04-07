import { describe, it, expect } from '@jest/globals';
import { CodeParser } from '../code-parser';
import {
  Rule_C_12_2,
  Rule_C_12_3,
  Rule_C_12_4,
  Rule_C_13_2,
  Rule_C_13_5,
  Rule_C_13_6,
  Rule_C_14_3,
  Rule_C_16_1,
  Rule_C_16_2,
  Rule_C_16_4,
  Rule_C_16_5,
  Rule_C_16_6,
  Rule_C_16_7,
  Rule_C_17_1,
  Rule_C_17_2,
  Rule_C_17_3,
} from '../rules/c';

describe('MISRA C P3/P4 Rules', () => {
  const parser = new CodeParser();

  describe('Rule 12.2 - Shift operator range', () => {
    it('should detect shift amount exceeding integer width', async () => {
      const code = `
        int main() {
          int x = 5 << 32;
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_12_2();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-12.2');
    });

    it('should not flag valid shift operations', async () => {
      const code = `
        int main() {
          int x = 5 << 3;
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_12_2();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBe(0);
    });
  });

  describe('Rule 12.3 - Comma operator', () => {
    it('should detect comma operator usage', async () => {
      const code = `
        int main() {
          int x, y;
          x = (y = 5, y + 1);
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_12_3();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-12.3');
    });

    it('should allow comma in for loops', async () => {
      const code = `
        int main() {
          for (int i = 0, j = 0; i < 10; i++, j++) {
            // loop body
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_12_3();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBe(0);
    });
  });

  describe('Rule 13.2 - Expression evaluation order', () => {
    it('should detect multiple modifications of same variable', async () => {
      const code = `
        int main() {
          int x = 5;
          x = x++;
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_13_2();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-13.2');
    });
  });

  describe('Rule 13.5 - Logical operator side effects', () => {
    it('should detect side effects in right operand of &&', async () => {
      const code = `
        int main() {
          int x = 5, y = 10;
          if (x > 0 && y++) {
            // body
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_13_5();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-13.5');
    });

    it('should detect assignment in right operand of ||', async () => {
      const code = `
        int main() {
          int x = 5, y = 10;
          if (x == 0 || (y = 20)) {
            // body
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_13_5();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('Rule 13.6 - sizeof operator side effects', () => {
    it('should detect increment in sizeof operand', async () => {
      const code = `
        int main() {
          int x = 5;
          size_t s = sizeof(x++);
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_13_6();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-13.6');
    });

    it('should detect function call in sizeof operand', async () => {
      const code = `
        int main() {
          size_t s = sizeof(getValue());
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_13_6();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('Rule 14.3 - Invariant controlling expressions', () => {
    it('should detect constant condition in if statement', async () => {
      const code = `
        int main() {
          if (true) {
            // body
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_14_3();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-14.3');
    });

    it('should allow while(1) for infinite loops', async () => {
      const code = `
        int main() {
          while (1) {
            // infinite loop
            break;
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_14_3();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBe(0);
    });
  });

  describe('Rule 16.1 - Well-formed switch statements', () => {
    it('should detect code before first case', async () => {
      const code = `
        int main() {
          int x = 5;
          switch (x) {
            int y = 10;
            case 1:
              break;
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_16_1();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-16.1');
    });
  });

  describe('Rule 16.2 - Switch label placement', () => {
    it('should detect case label outside switch', async () => {
      const code = `
        int main() {
          case 1:
            break;
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_16_2();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-16.2');
    });
  });

  describe('Rule 16.4 - Switch default label', () => {
    it('should detect missing default label', async () => {
      const code = `
        int main() {
          int x = 5;
          switch (x) {
            case 1:
              break;
            case 2:
              break;
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_16_4();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-16.4');
    });

    it('should not flag switch with default', async () => {
      const code = `
        int main() {
          int x = 5;
          switch (x) {
            case 1:
              break;
            default:
              break;
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_16_4();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBe(0);
    });
  });

  describe('Rule 16.5 - Default label position', () => {
    it('should detect default in middle of switch', async () => {
      const code = `
        int main() {
          int x = 5;
          switch (x) {
            case 1:
              break;
            default:
              break;
            case 2:
              break;
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_16_5();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-16.5');
    });
  });

  describe('Rule 16.6 - Minimum switch clauses', () => {
    it('should detect switch with only one clause', async () => {
      const code = `
        int main() {
          int x = 5;
          switch (x) {
            case 1:
              break;
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_16_6();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-16.6');
    });
  });

  describe('Rule 16.7 - Boolean switch expressions', () => {
    it('should detect switch on boolean expression', async () => {
      const code = `
        int main() {
          int x = 5;
          switch (x > 0) {
            case 1:
              break;
            default:
              break;
          }
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_16_7();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-16.7');
    });
  });

  describe('Rule 17.1 - stdarg.h usage', () => {
    it('should detect stdarg.h include', async () => {
      const code = `
        #include <stdarg.h>
        int main() {
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_17_1();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-17.1');
    });

    it('should detect variadic function declaration', async () => {
      const code = `
        int printf(const char *format, ...);
        int main() {
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_17_1();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('Rule 17.2 - Recursive functions', () => {
    it('should detect direct recursion', async () => {
      const code = `
        int factorial(int n) {
          if (n <= 1) return 1;
          return n * factorial(n - 1);
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_17_2();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-17.2');
    });
  });

  describe('Rule 17.3 - Implicit function declarations', () => {
    it('should detect function call without declaration', async () => {
      const code = `
        int main() {
          undeclaredFunction();
          return 0;
        }
      `;
      const ast = await parser.parse(code, 'C');
      const rule = new Rule_C_17_3();
      const violations = await rule.check(ast, code);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].ruleId).toBe('MISRA-C-17.3');
    });
  });
});

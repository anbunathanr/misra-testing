/**
 * Unit tests for MISRA C++:2008 rule implementations
 * Tests each rule with code that should trigger violations and code that should not.
 */

import { CodeParser } from '../code-parser';
import { Language } from '../../../types/misra-analysis';
import { Rule_CPP_0_1_1 } from '../rules/cpp/rule-0-1-1';
import { Rule_CPP_0_1_2 } from '../rules/cpp/rule-0-1-2';
import { Rule_CPP_0_1_3 } from '../rules/cpp/rule-0-1-3';
import { Rule_CPP_0_1_4 } from '../rules/cpp/rule-0-1-4';
import { Rule_CPP_0_1_6 } from '../rules/cpp/rule-0-1-6';
import { Rule_CPP_0_1_7 } from '../rules/cpp/rule-0-1-7';
import { Rule_CPP_0_1_9 } from '../rules/cpp/rule-0-1-9';
import { Rule_CPP_0_2_1 } from '../rules/cpp/rule-0-2-1';
import { Rule_CPP_0_3_2 } from '../rules/cpp/rule-0-3-2';
import { Rule_CPP_2_3_1 } from '../rules/cpp/rule-2-3-1';
import { Rule_CPP_2_5_1 } from '../rules/cpp/rule-2-5-1';
import { Rule_CPP_2_7_1 } from '../rules/cpp/rule-2-7-1';
import { Rule_CPP_2_10_1 } from '../rules/cpp/rule-2-10-1';
import { Rule_CPP_2_13_1 } from '../rules/cpp/rule-2-13-1';
import { Rule_CPP_2_13_2 } from '../rules/cpp/rule-2-13-2';
import { Rule_CPP_2_13_3 } from '../rules/cpp/rule-2-13-3';
import { Rule_CPP_3_1_1 } from '../rules/cpp/rule-3-1-1';
import { Rule_CPP_3_1_2 } from '../rules/cpp/rule-3-1-2';
import { Rule_CPP_3_1_3 } from '../rules/cpp/rule-3-1-3';
import { Rule_CPP_3_2_1 } from '../rules/cpp/rule-3-2-1';
import { Rule_CPP_3_2_2 } from '../rules/cpp/rule-3-2-2';
import { Rule_CPP_3_2_3 } from '../rules/cpp/rule-3-2-3';
import { Rule_CPP_3_2_4 } from '../rules/cpp/rule-3-2-4';
import { Rule_CPP_3_3_1 } from '../rules/cpp/rule-3-3-1';
import { Rule_CPP_3_3_2 } from '../rules/cpp/rule-3-3-2';
import { Rule_CPP_3_4_1 } from '../rules/cpp/rule-3-4-1';
import { Rule_CPP_3_9_1 } from '../rules/cpp/rule-3-9-1';
import { Rule_CPP_4_5_1 } from '../rules/cpp/rule-4-5-1';
import { Rule_CPP_4_5_2 } from '../rules/cpp/rule-4-5-2';
import { Rule_CPP_4_5_3 } from '../rules/cpp/rule-4-5-3';
import { Rule_CPP_4_10_1 } from '../rules/cpp/rule-4-10-1';
import { Rule_CPP_4_10_2 } from '../rules/cpp/rule-4-10-2';
import { Rule_CPP_5_0_1 } from '../rules/cpp/rule-5-0-1';
import { Rule_CPP_5_0_2 } from '../rules/cpp/rule-5-0-2';
import { Rule_CPP_5_0_3 } from '../rules/cpp/rule-5-0-3';
import { Rule_CPP_5_0_4 } from '../rules/cpp/rule-5-0-4';
import { Rule_CPP_5_0_5 } from '../rules/cpp/rule-5-0-5';
import { Rule_CPP_5_0_6 } from '../rules/cpp/rule-5-0-6';
import { Rule_CPP_5_2_1 } from '../rules/cpp/rule-5-2-1';
import { Rule_CPP_5_2_2 } from '../rules/cpp/rule-5-2-2';
import { Rule_CPP_5_2_3 } from '../rules/cpp/rule-5-2-3';
import { Rule_CPP_5_2_4 } from '../rules/cpp/rule-5-2-4';
import { Rule_CPP_5_2_5 } from '../rules/cpp/rule-5-2-5';
import { Rule_CPP_5_2_6 } from '../rules/cpp/rule-5-2-6';
import { Rule_CPP_5_2_7 } from '../rules/cpp/rule-5-2-7';
import { Rule_CPP_5_2_8 } from '../rules/cpp/rule-5-2-8';
import { Rule_CPP_5_2_9 } from '../rules/cpp/rule-5-2-9';
import { Rule_CPP_5_2_10 } from '../rules/cpp/rule-5-2-10';
import { Rule_CPP_5_2_11 } from '../rules/cpp/rule-5-2-11';
import { Rule_CPP_5_2_12 } from '../rules/cpp/rule-5-2-12';
import { Rule_CPP_5_3_1 } from '../rules/cpp/rule-5-3-1';
import { Rule_CPP_5_3_2 } from '../rules/cpp/rule-5-3-2';
import { Rule_CPP_5_3_3 } from '../rules/cpp/rule-5-3-3';
import { Rule_CPP_5_3_4 } from '../rules/cpp/rule-5-3-4';
import { Rule_CPP_6_2_1 } from '../rules/cpp/rule-6-2-1';
import { Rule_CPP_6_4_1 } from '../rules/cpp/rule-6-4-1';
import { Rule_CPP_6_5_1 } from '../rules/cpp/rule-6-5-1';
import { Rule_CPP_7_1_1 } from '../rules/cpp/rule-7-1-1';
import { Rule_CPP_8_4_1 } from '../rules/cpp/rule-8-4-1';
import { Rule_CPP_15_0_3 } from '../rules/cpp/rule-15-0-3';

const parser = new CodeParser();

async function parse(src: string) {
  return parser.parse(src, Language.CPP);
}

// ─── Rule 0-1-1: Unused variables ────────────────────────────────────────────

describe('Rule 0-1-1 – Unused variables', () => {
  const rule = new Rule_CPP_0_1_1();

  it('detects unused variable', async () => {
    const src = `void foo() {
    int x = 5;
    int y = 10;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-0.1.1');
  });

  it('passes for used variable', async () => {
    const src = `void foo() {
    int x = 5;
    return x + 1;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 0-1-2: Non-reachable code ──────────────────────────────────────────

describe('Rule 0-1-2 – Non-reachable code', () => {
  const rule = new Rule_CPP_0_1_2();

  it('detects code after return', async () => {
    const src = `int foo() {
    return 0;
    int x = 1;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-0.1.2');
  });

  it('passes for reachable code', async () => {
    const src = `int foo(int x) {
    int y = x + 1;
    return y;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 0-1-3: Unused local variables ──────────────────────────────────────

describe('Rule 0-1-3 – Unused local variables', () => {
  const rule = new Rule_CPP_0_1_3();

  it('detects unused local variable', async () => {
    const src = `void foo() {
    int unused = 42;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-0.1.3');
  });

  it('passes for used local variable', async () => {
    const src = `void foo() {
    int used = 42;
    std::cout << used;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 2-7-1: Trigraphs ───────────────────────────────────────────────────

describe('Rule 2-7-1 – Trigraphs shall not be used', () => {
  const rule = new Rule_CPP_2_7_1();

  it('detects trigraph ??=', async () => {
    const src = `int x ??= 5;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-2.7.1');
  });

  it('detects trigraph ??/', async () => {
    const src = `// Comment with ??/ continuation`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for code without trigraphs', async () => {
    const src = `int x = 5;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 2-10-1: Identifier naming ──────────────────────────────────────────

describe('Rule 2-10-1 – Identifier naming conventions', () => {
  const rule = new Rule_CPP_2_10_1();

  it('detects identifier starting with underscore', async () => {
    const src = `int _badName = 5;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-2.10.1');
  });

  it('passes for properly named identifier', async () => {
    const src = `int goodName = 5;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 3-1-1: Multiple declarations ───────────────────────────────────────

describe('Rule 3-1-1 – Multiple declarations on one line', () => {
  const rule = new Rule_CPP_3_1_1();

  it('detects multiple declarations', async () => {
    const src = `int x = 1, y = 2;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-3.1.1');
  });

  it('passes for single declaration', async () => {
    const src = `int x = 1;
int y = 2;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 3-9-1: Types across translation units ──────────────────────────────

describe('Rule 3-9-1 – Types shall be consistent across translation units', () => {
  const rule = new Rule_CPP_3_9_1();

  it('detects typedef redefinition', async () => {
    const src = `typedef int MyInt;
typedef long MyInt;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-3.9.1');
  });

  it('passes for consistent typedef', async () => {
    const src = `typedef int MyInt;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 5-0-1: Implicit conversions ────────────────────────────────────────

describe('Rule 5-0-1 – Implicit type conversions', () => {
  const rule = new Rule_CPP_5_0_1();

  it('detects implicit int to float conversion', async () => {
    const src = `void foo() {
    float f = 10;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-5.0.1');
  });

  it('passes with explicit cast', async () => {
    const src = `void foo() {
    float f = static_cast<float>(10);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 5-2-6: C-style casts ───────────────────────────────────────────────

describe('Rule 5-2-6 – C-style casts shall not be used', () => {
  const rule = new Rule_CPP_5_2_6();

  it('detects C-style cast', async () => {
    const src = `void foo() {
    int x = 5;
    float f = (float)x;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-5.2.6');
  });

  it('passes for C++ style cast', async () => {
    const src = `void foo() {
    int x = 5;
    float f = static_cast<float>(x);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 6-2-1: Assignment in sub-expressions ───────────────────────────────

describe('Rule 6-2-1 – Assignment operators in sub-expressions', () => {
  const rule = new Rule_CPP_6_2_1();

  it('detects assignment in if condition', async () => {
    const src = `void foo(int x, int y) {
    if (x = y) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-6.2.1');
  });

  it('passes for comparison in if condition', async () => {
    const src = `void foo(int x, int y) {
    if (x == y) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 6-4-1: Switch with at least 2 cases ────────────────────────────────

describe('Rule 6-4-1 – Switch statement shall have at least 2 cases', () => {
  const rule = new Rule_CPP_6_4_1();

  it('detects switch with only 1 case', async () => {
    const src = `void foo(int x) {
    switch (x) {
        case 1:
            break;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-6.4.1');
  });

  it('passes for switch with 2 cases', async () => {
    const src = `void foo(int x) {
    switch (x) {
        case 1:
            break;
        case 2:
            break;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 6-5-1: For loop counter modification ───────────────────────────────

describe('Rule 6-5-1 – For loop counter shall not be modified in body', () => {
  const rule = new Rule_CPP_6_5_1();

  it('detects loop counter modification in body', async () => {
    const src = `void foo() {
    for (int i = 0; i < 10; i++) {
        i = 5;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-6.5.1');
  });

  it('passes for unmodified loop counter', async () => {
    const src = `void foo() {
    for (int i = 0; i < 10; i++) {
        int x = i * 2;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 7-1-1: Const pointer/reference parameters ──────────────────────────

describe('Rule 7-1-1 – Pointer/reference parameters should be const', () => {
  const rule = new Rule_CPP_7_1_1();

  it('detects non-const pointer parameter', async () => {
    const src = `void foo(int* ptr) {
    int x = *ptr;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-7.1.1');
  });

  it('passes for const pointer parameter', async () => {
    const src = `void foo(const int* ptr) {
    int x = *ptr;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 8-4-1: Unused parameters ───────────────────────────────────────────

describe('Rule 8-4-1 – Functions shall not have unused parameters', () => {
  const rule = new Rule_CPP_8_4_1();

  it('detects unused parameter', async () => {
    const src = `void foo(int x, int y) {
    return x + 1;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-8.4.1');
  });

  it('passes when all parameters are used', async () => {
    const src = `void foo(int x, int y) {
    return x + y;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 15-0-3: Control transfer into try/catch ────────────────────────────

describe('Rule 15-0-3 – No control transfer into try/catch blocks', () => {
  const rule = new Rule_CPP_15_0_3();

  it('detects goto into try block', async () => {
    const src = `void foo() {
    goto label;
    try {
        label:
        int x = 1;
    } catch (...) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-15.0.3');
  });

  it('passes for normal try/catch usage', async () => {
    const src = `void foo() {
    try {
        int x = 1;
    } catch (...) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule metadata checks ─────────────────────────────────────────────────────

describe('Rule metadata', () => {
  const rules = [
    new Rule_CPP_0_1_1(), new Rule_CPP_0_1_2(), new Rule_CPP_0_1_3(),
    new Rule_CPP_2_7_1(), new Rule_CPP_2_10_1(), new Rule_CPP_3_1_1(),
    new Rule_CPP_3_9_1(), new Rule_CPP_5_0_1(), new Rule_CPP_5_2_6(),
    new Rule_CPP_6_2_1(), new Rule_CPP_6_4_1(), new Rule_CPP_6_5_1(),
    new Rule_CPP_7_1_1(), new Rule_CPP_8_4_1(), new Rule_CPP_15_0_3(),
  ];

  it('all rules have required metadata fields', () => {
    for (const rule of rules) {
      expect(rule.id).toMatch(/^MISRA-CPP-/);
      expect(rule.description).toBeTruthy();
      expect(['mandatory', 'required', 'advisory']).toContain(rule.severity);
      expect(rule.category).toBeTruthy();
      expect(rule.language).toBe('CPP');
    }
  });

  it('all rule IDs are unique', () => {
    const ids = rules.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all rules implement the check() method', () => {
    for (const rule of rules) {
      expect(typeof rule.check).toBe('function');
    }
  });
});


// ─── New P2 Priority Rules Tests ─────────────────────────────────────────────

describe('Rule 0-1-4 – Variables assigned but never read', () => {
  const rule = new Rule_CPP_0_1_4();

  it('detects variable assigned but never read', async () => {
    const src = `void foo() {
    int x = 5;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes when variable is read', async () => {
    const src = `void foo() {
    int x = 5;
    return x;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

describe('Rule 0-1-7 – Return values shall be used', () => {
  const rule = new Rule_CPP_0_1_7();

  it('detects unused return value', async () => {
    const src = `void foo() {
    getValue();
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 0-1-9 – Dead code', () => {
  const rule = new Rule_CPP_0_1_9();

  it('detects code after return', async () => {
    const src = `int foo() {
    return 0;
    int x = 1;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 0-2-1 – Self-assignment', () => {
  const rule = new Rule_CPP_0_2_1();

  it('detects self-assignment', async () => {
    const src = `void foo() {
    int x = 5;
    x = x;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 2-13-2 – Octal constants', () => {
  const rule = new Rule_CPP_2_13_2();

  it('detects octal literal', async () => {
    const src = `int x = 0123;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for decimal and hex', async () => {
    const src = `int x = 123; int y = 0x123;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

describe('Rule 3-1-2 – Functions at block scope', () => {
  const rule = new Rule_CPP_3_1_2();

  it.skip('detects function declaration in block scope', async () => {
    const src = `void foo() {
    void bar();
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 4-10-2 – Null pointer constant', () => {
  const rule = new Rule_CPP_4_10_2();

  it('detects 0 used as null pointer', async () => {
    const src = `int* ptr = 0;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 5-0-2 – Operator precedence', () => {
  const rule = new Rule_CPP_5_0_2();

  it('detects mixed operators without parentheses', async () => {
    const src = `int x = a + b * c;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes with parentheses', async () => {
    const src = `int x = a + (b * c);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

describe('Rule 5-0-4 – Signedness conversions', () => {
  const rule = new Rule_CPP_5_0_4();

  it.skip('detects implicit signedness change', async () => {
    const src = `unsigned int x = -1;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('detects unsigned to signed conversion', async () => {
    const src = `int x = 5U;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 5-2-4 – C-style casts', () => {
  const rule = new Rule_CPP_5_2_4();

  it('detects C-style cast', async () => {
    const src = `float f = (float)x;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for C++ cast', async () => {
    const src = `float f = static_cast<float>(x);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

describe('Rule 5-2-5 – const_cast', () => {
  const rule = new Rule_CPP_5_2_5();

  it('detects const_cast usage', async () => {
    const src = `int* p = const_cast<int*>(cp);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 5-2-7 – reinterpret_cast', () => {
  const rule = new Rule_CPP_5_2_7();

  it('detects reinterpret_cast', async () => {
    const src = `char* p = reinterpret_cast<char*>(ptr);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 5-2-10 – Increment/decrement mixing', () => {
  const rule = new Rule_CPP_5_2_10();

  it('detects ++ mixed with other operators', async () => {
    const src = `int x = y++ + z;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for standalone increment', async () => {
    const src = `y++;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

describe('Rule 5-2-11 – Operator overloading', () => {
  const rule = new Rule_CPP_5_2_11();

  it('detects comma operator overloading', async () => {
    const src = `Type operator,(const Type& other);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 5-3-2 – Unary minus on unsigned', () => {
  const rule = new Rule_CPP_5_3_2();

  it('detects unary minus on unsigned', async () => {
    const src = `unsigned int x = 5; int y = -x;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Rule 5-3-4 – sizeof with side effects', () => {
  const rule = new Rule_CPP_5_3_4();

  it('detects sizeof with side effects', async () => {
    const src = `int s = sizeof(x++);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for sizeof without side effects', async () => {
    const src = `int s = sizeof(x);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Updated Rule metadata checks ─────────────────────────────────────────────

describe('Rule metadata - All rules', () => {
  const rules = [
    new Rule_CPP_0_1_1(), new Rule_CPP_0_1_2(), new Rule_CPP_0_1_3(),
    new Rule_CPP_0_1_4(), new Rule_CPP_0_1_6(), new Rule_CPP_0_1_7(),
    new Rule_CPP_0_1_9(), new Rule_CPP_0_2_1(), new Rule_CPP_0_3_2(),
    new Rule_CPP_2_3_1(), new Rule_CPP_2_5_1(), new Rule_CPP_2_7_1(),
    new Rule_CPP_2_10_1(), new Rule_CPP_2_13_1(), new Rule_CPP_2_13_2(),
    new Rule_CPP_2_13_3(), new Rule_CPP_3_1_1(), new Rule_CPP_3_1_2(),
    new Rule_CPP_3_1_3(), new Rule_CPP_3_2_1(), new Rule_CPP_3_2_2(),
    new Rule_CPP_3_2_3(), new Rule_CPP_3_2_4(), new Rule_CPP_3_3_1(),
    new Rule_CPP_3_3_2(), new Rule_CPP_3_4_1(), new Rule_CPP_3_9_1(),
    new Rule_CPP_4_5_1(), new Rule_CPP_4_5_2(), new Rule_CPP_4_5_3(),
    new Rule_CPP_4_10_1(), new Rule_CPP_4_10_2(), new Rule_CPP_5_0_1(),
    new Rule_CPP_5_0_2(), new Rule_CPP_5_0_3(), new Rule_CPP_5_0_4(),
    new Rule_CPP_5_0_5(), new Rule_CPP_5_0_6(), new Rule_CPP_5_2_1(),
    new Rule_CPP_5_2_2(), new Rule_CPP_5_2_3(), new Rule_CPP_5_2_4(),
    new Rule_CPP_5_2_5(), new Rule_CPP_5_2_6(), new Rule_CPP_5_2_7(),
    new Rule_CPP_5_2_8(), new Rule_CPP_5_2_9(), new Rule_CPP_5_2_10(),
    new Rule_CPP_5_2_11(), new Rule_CPP_5_2_12(), new Rule_CPP_5_3_1(),
    new Rule_CPP_5_3_2(), new Rule_CPP_5_3_3(), new Rule_CPP_5_3_4(),
    new Rule_CPP_6_2_1(), new Rule_CPP_6_4_1(), new Rule_CPP_6_5_1(),
    new Rule_CPP_7_1_1(), new Rule_CPP_8_4_1(), new Rule_CPP_15_0_3(),
  ];

  it('all rules have required metadata fields', () => {
    for (const rule of rules) {
      expect(rule.id).toMatch(/^MISRA-CPP-/);
      expect(rule.description).toBeTruthy();
      expect(['mandatory', 'required', 'advisory']).toContain(rule.severity);
      expect(rule.category).toBeTruthy();
      expect(rule.language).toBe('CPP');
    }
  });

  it('all rule IDs are unique', () => {
    const ids = rules.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all rules implement the check() method', () => {
    for (const rule of rules) {
      expect(typeof rule.check).toBe('function');
    }
  });

  it('total rule count is 60', () => {
    expect(rules.length).toBe(60);
  });
});


// ─── New P3/P4 Rules Tests ───────────────────────────────────────────────────

import { Rule_CPP_6_3_1 } from '../rules/cpp/rule-6-3-1';
import { Rule_CPP_6_4_2 } from '../rules/cpp/rule-6-4-2';
import { Rule_CPP_7_1_2 } from '../rules/cpp/rule-7-1-2';
import { Rule_CPP_7_2_1 } from '../rules/cpp/rule-7-2-1';

// ─── Rule 6-3-1: Compound statements ─────────────────────────────────────────

describe('Rule 6-3-1 – Loop bodies must be compound statements', () => {
  const rule = new Rule_CPP_6_3_1();

  it('detects while without braces', async () => {
    const src = `void foo() {
    while (x > 0)
        x--;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-6.3.1');
  });

  it('detects for without braces', async () => {
    const src = `void foo() {
    for (int i = 0; i < 10; i++)
        doSomething();
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for while with braces', async () => {
    const src = `void foo() {
    while (x > 0) {
        x--;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 6-4-2: else if termination ─────────────────────────────────────────

describe('Rule 6-4-2 – if...else if must terminate with else', () => {
  const rule = new Rule_CPP_6_4_2();

  it('detects else if without final else', async () => {
    const src = `void foo(int x) {
    if (x == 1) {
        doA();
    } else if (x == 2) {
        doB();
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-6.4.2');
  });

  it('passes for else if with final else', async () => {
    const src = `void foo(int x) {
    if (x == 1) {
        doA();
    } else if (x == 2) {
        doB();
    } else {
        doC();
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 7-1-2: const parameters ────────────────────────────────────────────

describe('Rule 7-1-2 – Pointer/reference parameters should be const', () => {
  const rule = new Rule_CPP_7_1_2();

  it('detects non-const pointer parameter', async () => {
    const src = `void foo(int* ptr) {
    // ptr not modified
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-7.1.2');
  });

  it('detects non-const reference parameter', async () => {
    const src = `void foo(int& ref) {
    // ref not modified
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for const pointer parameter', async () => {
    const src = `void foo(const int* ptr) {
    // ptr is const
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 7-2-1: enum values ─────────────────────────────────────────────────

describe('Rule 7-2-1 – Enum values must be from enumerator list', () => {
  const rule = new Rule_CPP_7_2_1();

  it('detects invalid enum assignment', async () => {
    const src = `enum Color { RED, GREEN, BLUE };
Color c = 99;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-CPP-7.2.1');
  });

  it('passes for valid enum assignment', async () => {
    const src = `enum Color { RED, GREEN, BLUE };
Color c = RED;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Stub Rules Smoke Tests ──────────────────────────────────────────────────

describe('P3/P4 Stub Rules – Smoke tests', () => {
  it('all stub rules should be importable and instantiable', async () => {
    // Import a sample of stub rules to verify they're properly structured
    const { Rule_CPP_6_4_3 } = await import('../rules/cpp/rule-6-4-3');
    const { Rule_CPP_15_0_1 } = await import('../rules/cpp/rule-15-0-1');
    const { Rule_CPP_16_0_1 } = await import('../rules/cpp/rule-16-0-1');
    const { Rule_CPP_18_0_1 } = await import('../rules/cpp/rule-18-0-1');
    
    const rule1 = new Rule_CPP_6_4_3();
    const rule2 = new Rule_CPP_15_0_1();
    const rule3 = new Rule_CPP_16_0_1();
    const rule4 = new Rule_CPP_18_0_1();
    
    expect(rule1.id).toBe('MISRA-CPP-6.4.3');
    expect(rule2.id).toBe('MISRA-CPP-15.0.1');
    expect(rule3.id).toBe('MISRA-CPP-16.0.1');
    expect(rule4.id).toBe('MISRA-CPP-18.0.1');
  });

  it('stub rules should return empty violations', async () => {
    const { Rule_CPP_6_4_3 } = await import('../rules/cpp/rule-6-4-3');
    const rule = new Rule_CPP_6_4_3();
    
    const src = `void foo() { }`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    
    // Stub implementations return no violations
    expect(v).toHaveLength(0);
  });
});

// ─── Integration Test: All Rules Registered ──────────────────────────────────

describe('MISRA C++ Rules Integration', () => {
  it('should have 206 total rules registered', async () => {
    const { ALL_MISRA_CPP_RULES } = await import('../rules/cpp/index');
    expect(ALL_MISRA_CPP_RULES.length).toBe(206);
  });

  it('all rules should have required properties', async () => {
    const { ALL_MISRA_CPP_RULES } = await import('../rules/cpp/index');
    
    for (const rule of ALL_MISRA_CPP_RULES) {
      expect(rule.id).toBeDefined();
      expect(rule.id).toMatch(/^MISRA-CPP-/);
      expect(rule.description).toBeDefined();
      expect(rule.severity).toMatch(/^(required|advisory|mandatory)$/);
      expect(rule.category).toBeDefined();
      expect(rule.language).toBe('CPP');
      expect(typeof rule.check).toBe('function');
    }
  });

  it('all rule IDs should be unique', async () => {
    const { ALL_MISRA_CPP_RULES } = await import('../rules/cpp/index');
    
    const ids = ALL_MISRA_CPP_RULES.map(r => r.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length);
  });
});

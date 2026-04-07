/**
 * Unit tests for MISRA C:2012 rule implementations
 * Tests each rule with code that should trigger violations and code that should not.
 */

import { CodeParser } from '../code-parser';
import { Language } from '../../../types/misra-analysis';
import { Rule_C_1_1 } from '../rules/c/rule-1-1';
import { Rule_C_2_1 } from '../rules/c/rule-2-1';
import { Rule_C_8_1 } from '../rules/c/rule-8-1';
import { Rule_C_8_2 } from '../rules/c/rule-8-2';
import { Rule_C_8_4 } from '../rules/c/rule-8-4';
import { Rule_C_9_1 } from '../rules/c/rule-9-1';
import { Rule_C_10_1 } from '../rules/c/rule-10-1';
import { Rule_C_10_3 } from '../rules/c/rule-10-3';
import { Rule_C_11_1 } from '../rules/c/rule-11-1';
import { Rule_C_11_3 } from '../rules/c/rule-11-3';
import { Rule_C_14_4 } from '../rules/c/rule-14-4';
import { Rule_C_15_5 } from '../rules/c/rule-15-5';
import { Rule_C_16_3 } from '../rules/c/rule-16-3';
import { Rule_C_17_7 } from '../rules/c/rule-17-7';
import { Rule_C_20_4 } from '../rules/c/rule-20-4';
import { Rule_C_20_9 } from '../rules/c/rule-20-9';
import { Rule_C_21_3 } from '../rules/c/rule-21-3';
import { Rule_C_21_6 } from '../rules/c/rule-21-6';
import { Rule_C_22_1 } from '../rules/c/rule-22-1';
import { Rule_C_22_2 } from '../rules/c/rule-22-2';

const parser = new CodeParser();

async function parse(src: string) {
  return parser.parse(src, Language.C);
}

// ─── Rule 1.1: ISO compliance ─────────────────────────────────────────────────

describe('Rule 1.1 – ISO compliance (non-standard extensions)', () => {
  const rule = new Rule_C_1_1();

  it('detects __attribute__ extension', async () => {
    const ast = await parse('void foo(void) __attribute__((noreturn));');
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-1.1');
  });

  it('detects __declspec extension', async () => {
    const ast = await parse('__declspec(dllexport) int bar(void);');
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('detects __builtin_ prefix', async () => {
    const ast = await parse('int x = __builtin_clz(n);');
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for standard C code', async () => {
    const ast = await parse('int add(int a, int b) { return a + b; }');
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 2.1: Unreachable code ───────────────────────────────────────────────

describe('Rule 2.1 – Unreachable code', () => {
  const rule = new Rule_C_2_1();

  it('detects code after return', async () => {
    const src = `int foo(void) {
    return 0;
    int x = 1;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-2.1');
  });

  it('detects code after break', async () => {
    const src = `void foo(void) {
    for (int i = 0; i < 10; i++) {
        break;
        i++;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
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

// ─── Rule 8.1: Explicit types ─────────────────────────────────────────────────

describe('Rule 8.1 – Types shall be explicitly specified', () => {
  const rule = new Rule_C_8_1();

  it('detects implicit int function definition', async () => {
    const src = `foo(int a) {
    return a;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-8.1');
  });

  it('passes for explicitly typed function', async () => {
    const src = `int foo(int a) {
    return a;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 8.2: Function prototypes ───────────────────────────────────────────

describe('Rule 8.2 – Function prototypes with named parameters', () => {
  const rule = new Rule_C_8_2();

  it('detects prototype with unnamed parameter', async () => {
    const src = `int add(int, int);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-8.2');
  });

  it('passes for prototype with named parameters', async () => {
    const src = `int add(int a, int b);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });

  it('passes for void parameter', async () => {
    const src = `void foo(void);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 8.4: External linkage declaration ───────────────────────────────────

describe('Rule 8.4 – Compatible declaration visible for external linkage', () => {
  const rule = new Rule_C_8_4();

  it('detects function defined without prior declaration', async () => {
    const src = `int add(int a, int b) {
    return a + b;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-8.4');
  });

  it('passes when prototype is declared before definition', async () => {
    const src = `int add(int a, int b);
int add(int a, int b) {
    return a + b;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });

  it('passes for static functions (internal linkage)', async () => {
    const src = `static int helper(int x) {
    return x * 2;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });

  it('passes for main', async () => {
    const src = `int main(void) {
    return 0;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 9.1: Uninitialized variables ───────────────────────────────────────

describe('Rule 9.1 – Variables shall be initialized before use', () => {
  const rule = new Rule_C_9_1();

  it('detects uninitialized int variable', async () => {
    const src = `void foo(void) {
    int x;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-9.1');
  });

  it('detects uninitialized char variable', async () => {
    const src = `void foo(void) {
    char c;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for initialized variable', async () => {
    const src = `void foo(void) {
    int x = 0;
    char c = 'a';
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 10.1: Implicit type conversions ─────────────────────────────────────

describe('Rule 10.1 – Operands shall not be of inappropriate essential type', () => {
  const rule = new Rule_C_10_1();

  it('detects implicit int-to-float assignment', async () => {
    const src = `void foo(void) {
    float f = 1;
    int x = f + 1.0;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-10.1');
  });

  it('passes with explicit cast', async () => {
    const src = `void foo(void) {
    double d = 3.14;
    int x = (int)d;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 10.3: Narrowing conversions ────────────────────────────────────────

describe('Rule 10.3 – No assignment to narrower essential type', () => {
  const rule = new Rule_C_10_3();

  it('detects narrowing from long to int', async () => {
    const src = `void foo(void) {
    long bigVal = 100000L;
    int x = bigVal;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-10.3');
  });

  it('passes with explicit cast', async () => {
    const src = `void foo(void) {
    long bigVal = 100000L;
    int x = (int)bigVal;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 11.1: Function pointer conversions ──────────────────────────────────

describe('Rule 11.1 – No conversion between function pointer and other types', () => {
  const rule = new Rule_C_11_1();

  it('detects function pointer cast', async () => {
    const src = `typedef int (*FuncPtr)(int);
void* p = (void*)myFunc;`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-11.1');
  });

  it('passes for normal pointer usage', async () => {
    const src = `int add(int a, int b) { return a + b; }
int result = add(1, 2);`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 11.3: Pointer type casts ───────────────────────────────────────────

describe('Rule 11.3 – No cast between pointer to different object types', () => {
  const rule = new Rule_C_11_3();

  it('detects C-style pointer cast', async () => {
    const src = `void foo(void) {
    int arr[4] = {1,2,3,4};
    char* p = (char*)arr;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-11.3');
  });

  it('passes for code without pointer casts', async () => {
    const src = `void foo(void) {
    int x = 5;
    int y = x + 1;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 14.4: Boolean controlling expressions ───────────────────────────────

describe('Rule 14.4 – Controlling expression shall have Boolean type', () => {
  const rule = new Rule_C_14_4();

  it('detects non-boolean if condition (plain variable)', async () => {
    const src = `void foo(int x) {
    if (x) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-14.4');
  });

  it('passes for boolean comparison', async () => {
    const src = `void foo(int x) {
    if (x != 0) { }
    if (x > 5) { }
    if (x == 1) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 15.5: Single exit point ────────────────────────────────────────────

describe('Rule 15.5 – Function shall have single exit point', () => {
  const rule = new Rule_C_15_5();

  it('detects multiple return statements', async () => {
    const src = `int foo(int x) {
    if (x > 0) {
        return 1;
    }
    return 0;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-15.5');
  });

  it('passes for single return', async () => {
    const src = `int foo(int x) {
    int result = 0;
    if (x > 0) {
        result = 1;
    }
    return result;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 16.3: Switch break ──────────────────────────────────────────────────

describe('Rule 16.3 – Switch clause shall end with break', () => {
  const rule = new Rule_C_16_3();

  it('detects missing break in switch case', async () => {
    const src = `void foo(int x) {
    switch (x) {
        case 1:
            x = 2;
        case 2:
            x = 3;
            break;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-16.3');
  });

  it('passes when all cases have break', async () => {
    const src = `void foo(int x) {
    switch (x) {
        case 1:
            x = 2;
            break;
        case 2:
            x = 3;
            break;
        default:
            break;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });

  it('passes with explicit fallthrough comment', async () => {
    const src = `void foo(int x) {
    switch (x) {
        case 1:
            x = 2;
            /* falls through */
        case 2:
            x = 3;
            break;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 17.7: Return value used ────────────────────────────────────────────

describe('Rule 17.7 – Return value of non-void function shall be used', () => {
  const rule = new Rule_C_17_7();

  it('detects discarded malloc return value', async () => {
    const src = `void foo(void) {
    malloc(100);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-17.7');
  });

  it('detects discarded strlen return value', async () => {
    const src = `void foo(const char* s) {
    strlen(s);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes when return value is used', async () => {
    const src = `void foo(void) {
    void* p = malloc(100);
    size_t len = strlen("hello");
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 20.4: #undef ────────────────────────────────────────────────────────

describe('Rule 20.4 – #undef should not be used', () => {
  const rule = new Rule_C_20_4();

  it('detects #undef directive', async () => {
    const src = `#define FOO 1
#undef FOO`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-20.4');
  });

  it('passes for code without #undef', async () => {
    const src = `#define MAX 100
int arr[MAX];`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 20.9: Macros defined before use in #if ──────────────────────────────

describe('Rule 20.9 – Macros shall be defined before use in #if', () => {
  const rule = new Rule_C_20_9();

  it('detects undefined macro in #if', async () => {
    const src = `#if UNDEFINED_MACRO
int x = 1;
#endif`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-20.9');
  });

  it('passes when macro is defined before #if', async () => {
    const src = `#define MY_FEATURE 1
#if MY_FEATURE
int x = 1;
#endif`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });

  it('passes for defined() operator', async () => {
    const src = `#if defined(SOME_MACRO)
int x = 1;
#endif`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 21.3: No dynamic memory allocation ──────────────────────────────────

describe('Rule 21.3 – Memory allocation functions shall not be used', () => {
  const rule = new Rule_C_21_3();

  it('detects malloc call', async () => {
    const src = `void foo(void) {
    void* p = malloc(100);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-21.3');
  });

  it('detects free call', async () => {
    const src = `void foo(void* p) {
    free(p);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('detects calloc call', async () => {
    const src = `void foo(void) {
    int* arr = calloc(10, sizeof(int));
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for code without dynamic allocation', async () => {
    const src = `void foo(void) {
    int arr[10];
    arr[0] = 1;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 21.6: No stdio I/O functions ───────────────────────────────────────

describe('Rule 21.6 – Standard Library I/O functions shall not be used', () => {
  const rule = new Rule_C_21_6();

  it('detects printf call', async () => {
    const src = `void foo(void) {
    printf("hello\\n");
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-21.6');
  });

  it('detects scanf call', async () => {
    const src = `void foo(void) {
    int x;
    scanf("%d", &x);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('detects fprintf call', async () => {
    const src = `void foo(FILE* f) {
    fprintf(f, "error\\n");
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for code without I/O functions', async () => {
    const src = `int add(int a, int b) {
    return a + b;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 22.1: Resources shall be released ──────────────────────────────────

describe('Rule 22.1 – Resources shall be explicitly released', () => {
  const rule = new Rule_C_22_1();

  it('detects fopen without fclose', async () => {
    const src = `void foo(void) {
    FILE* f = fopen("test.txt", "r");
    int x = 1;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-22.1');
  });

  it('passes when fopen is matched with fclose', async () => {
    const src = `void foo(void) {
    FILE* f = fopen("test.txt", "r");
    fclose(f);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });

  it('passes for code without file operations', async () => {
    const src = `int add(int a, int b) {
    return a + b;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 22.2: Only free dynamically allocated memory ───────────────────────

describe('Rule 22.2 – Only free dynamically allocated memory', () => {
  const rule = new Rule_C_22_2();

  it('detects free on non-malloc variable', async () => {
    const src = `void foo(void) {
    int x = 5;
    free(&x);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-22.2');
  });

  it('passes when freeing malloc-allocated memory', async () => {
    const src = `void foo(void) {
    void* p = malloc(100);
    free(p);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });

  it('passes for code without free', async () => {
    const src = `int add(int a, int b) {
    return a + b;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule metadata checks ─────────────────────────────────────────────────────

describe('Rule metadata', () => {
  const rules = [
    new Rule_C_1_1(), new Rule_C_2_1(), new Rule_C_8_1(), new Rule_C_8_2(),
    new Rule_C_8_4(), new Rule_C_9_1(), new Rule_C_10_1(), new Rule_C_10_3(),
    new Rule_C_11_1(), new Rule_C_11_3(), new Rule_C_14_4(), new Rule_C_15_5(),
    new Rule_C_16_3(), new Rule_C_17_7(), new Rule_C_20_4(), new Rule_C_20_9(),
    new Rule_C_21_3(), new Rule_C_21_6(), new Rule_C_22_1(), new Rule_C_22_2(),
  ];

  it('all rules have required metadata fields', () => {
    for (const rule of rules) {
      expect(rule.id).toMatch(/^MISRA-C-/);
      expect(rule.description).toBeTruthy();
      expect(['mandatory', 'required', 'advisory']).toContain(rule.severity);
      expect(rule.category).toBeTruthy();
      expect(rule.language).toBe('C');
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

// ─── New rules imports ────────────────────────────────────────────────────────

import { Rule_C_12_1 } from '../rules/c/rule-12-1';
import { Rule_C_13_1 } from '../rules/c/rule-13-1';
import { Rule_C_13_3 } from '../rules/c/rule-13-3';
import { Rule_C_13_4 } from '../rules/c/rule-13-4';
import { Rule_C_14_1 } from '../rules/c/rule-14-1';
import { Rule_C_14_2 } from '../rules/c/rule-14-2';
import { Rule_C_15_1 } from '../rules/c/rule-15-1';
import { Rule_C_15_2 } from '../rules/c/rule-15-2';
import { Rule_C_15_3 } from '../rules/c/rule-15-3';
import { Rule_C_15_4 } from '../rules/c/rule-15-4';

// ─── Rule 12.1: Operator precedence ──────────────────────────────────────────

describe('Rule 12.1 – Operator precedence should be explicit', () => {
  const rule = new Rule_C_12_1();

  it('detects mixed arithmetic without parentheses', async () => {
    const src = `int foo(int a, int b, int c) {
    return a + b * c;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-12.1');
  });

  it('detects mixed bitwise without parentheses', async () => {
    const src = `int foo(int a, int b, int c) {
    return a | b & c;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for simple arithmetic', async () => {
    const src = `int foo(int a, int b) {
    return a + b;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 13.1: Side effects in initializer lists ────────────────────────────

describe('Rule 13.1 – Initializer lists shall not contain persistent side effects', () => {
  const rule = new Rule_C_13_1();

  it('detects comma operator with side effect in initializer', async () => {
    const src = `void foo(int a, int b) {
    int x = (a++, b);
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-13.1');
  });

  it('passes for normal initializer', async () => {
    const src = `void foo(int a) {
    int x = a;
    int y = a + 1;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 13.3: Increment/decrement in expressions ───────────────────────────

describe('Rule 13.3 – Increment/decrement should not be used in larger expressions', () => {
  const rule = new Rule_C_13_3();

  it('detects post-increment in assignment expression', async () => {
    const src = `void foo(int a, int b) {
    int x = a + b++;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-13.3');
  });

  it('passes for standalone increment statement', async () => {
    const src = `void foo(int i) {
    i++;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 13.4: Assignment in expressions ────────────────────────────────────

describe('Rule 13.4 – Assignment operator result shall not be used', () => {
  const rule = new Rule_C_13_4();

  it('detects assignment in if condition', async () => {
    const src = `void foo(int x, int y) {
    if (x = y) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-13.4');
  });

  it('detects assignment in while condition', async () => {
    const src = `void foo(int x, int y) {
    while (x = y) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for comparison in if condition', async () => {
    const src = `void foo(int x, int y) {
    if (x == y) { }
    if (x != y) { }
    if (x >= y) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 14.1: Float loop counter ───────────────────────────────────────────

describe('Rule 14.1 – Loop counter shall not have floating-point type', () => {
  const rule = new Rule_C_14_1();

  it('detects float loop counter', async () => {
    const src = `void foo(void) {
    for (float f = 0.0f; f < 10.0f; f += 1.0f) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-14.1');
  });

  it('detects double loop counter', async () => {
    const src = `void foo(void) {
    for (double d = 0.0; d < 1.0; d += 0.1) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for integer loop counter', async () => {
    const src = `void foo(void) {
    for (int i = 0; i < 10; i++) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 14.2: For loop structure ───────────────────────────────────────────

describe('Rule 14.2 – For loop shall be well-formed', () => {
  const rule = new Rule_C_14_2();

  it('detects infinite for loop (empty clauses)', async () => {
    const src = `void foo(void) {
    for (;;) { break; }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-14.2');
  });

  it('detects for loop with missing init clause', async () => {
    const src = `void foo(int i) {
    for (; i < 10; i++) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
  });

  it('passes for well-formed for loop', async () => {
    const src = `void foo(void) {
    for (int i = 0; i < 10; i++) { }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 15.1: No goto ───────────────────────────────────────────────────────

describe('Rule 15.1 – The goto statement shall not be used', () => {
  const rule = new Rule_C_15_1();

  it('detects goto statement', async () => {
    const src = `void foo(void) {
    goto end;
    end:
    return;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-15.1');
  });

  it('passes for code without goto', async () => {
    const src = `int foo(int x) {
    if (x > 0) {
        return 1;
    }
    return 0;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 15.2: goto label scope (backward jump) ─────────────────────────────

describe('Rule 15.2 – goto shall jump to a label declared later in the same function', () => {
  const rule = new Rule_C_15_2();

  it('detects backward goto jump', async () => {
    const src = `void foo(void) {
    start:
    int x = 0;
    goto start;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-15.2');
  });

  it('passes for forward goto jump', async () => {
    const src = `void foo(void) {
    goto end;
    int x = 0;
    end:
    return;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 15.3: goto target scope ────────────────────────────────────────────

describe('Rule 15.3 – goto label shall be in the same or enclosing block', () => {
  const rule = new Rule_C_15_3();

  it('detects goto jumping to label in deeper scope', async () => {
    const src = `void foo(void) {
    goto inner;
    {
        inner:
        int x = 0;
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-15.3');
  });

  it('passes for goto to label in same scope', async () => {
    const src = `void foo(void) {
    goto end;
    end:
    return;
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── Rule 15.4: Single break per loop ────────────────────────────────────────

describe('Rule 15.4 – No more than one break per iteration statement', () => {
  const rule = new Rule_C_15_4();

  it('detects multiple break statements in a loop', async () => {
    const src = `void foo(int x) {
    for (int i = 0; i < 10; i++) {
        if (x > 5) {
            break;
        }
        if (x < 0) {
            break;
        }
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].ruleId).toBe('MISRA-C-15.4');
  });

  it('passes for single break in loop', async () => {
    const src = `void foo(int x) {
    for (int i = 0; i < 10; i++) {
        if (x > 5) {
            break;
        }
    }
}`;
    const ast = await parse(src);
    const v = await rule.check(ast, ast.source);
    expect(v).toHaveLength(0);
  });
});

// ─── New rules metadata checks ────────────────────────────────────────────────

describe('New rules metadata (12.1, 13.1, 13.3, 13.4, 14.1, 14.2, 15.1, 15.2, 15.3, 15.4)', () => {
  const newRules = [
    new Rule_C_12_1(), new Rule_C_13_1(), new Rule_C_13_3(), new Rule_C_13_4(),
    new Rule_C_14_1(), new Rule_C_14_2(), new Rule_C_15_1(), new Rule_C_15_2(),
    new Rule_C_15_3(), new Rule_C_15_4(),
  ];

  it('all new rules have required metadata fields', () => {
    for (const rule of newRules) {
      expect(rule.id).toMatch(/^MISRA-C-/);
      expect(rule.description).toBeTruthy();
      expect(['mandatory', 'required', 'advisory']).toContain(rule.severity);
      expect(rule.category).toBeTruthy();
      expect(rule.language).toBe('C');
    }
  });

  it('all new rule IDs are unique', () => {
    const ids = newRules.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all new rules implement the check() method', () => {
    for (const rule of newRules) {
      expect(typeof rule.check).toBe('function');
    }
  });
});

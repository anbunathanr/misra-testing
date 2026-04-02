import { CodeParser, AST } from '../code-parser';
import { Language } from '../../../types/misra-analysis';

describe('CodeParser', () => {
  let parser: CodeParser;

  beforeEach(() => {
    parser = new CodeParser();
  });

  // ─── Basic structure ───────────────────────────────────────────────────────

  describe('parse() – AST structure', () => {
    it('returns a TranslationUnit with all required fields', async () => {
      const src = 'int x = 1;';
      const ast = await parser.parse(src, Language.C);

      expect(ast.type).toBe('TranslationUnit');
      expect(ast.language).toBe(Language.C);
      expect(ast.source).toBe(src);
      expect(Array.isArray(ast.lines)).toBe(true);
      expect(Array.isArray(ast.tokens)).toBe(true);
      expect(Array.isArray(ast.functions)).toBe(true);
      expect(Array.isArray(ast.variables)).toBe(true);
      expect(Array.isArray(ast.includes)).toBe(true);
      expect(Array.isArray(ast.macros)).toBe(true);
      expect(Array.isArray(ast.syntaxErrors)).toBe(true);
    });

    it('splits source into lines correctly', async () => {
      const src = 'int a;\nint b;\nint c;';
      const ast = await parser.parse(src, Language.C);
      expect(ast.lines).toHaveLength(3);
    });
  });

  // ─── C code parsing ────────────────────────────────────────────────────────

  describe('parse() – valid C code', () => {
    const cSource = `
#include <stdio.h>
#include "myheader.h"
#define MAX_SIZE 100
#define PI 3.14159

int globalVar;
static float ratio = 0.5f;

int add(int a, int b) {
    int result = a + b;
    return result;
}

void printHello(void) {
    printf("Hello, World!\\n");
}
`.trim();

    let ast: AST;

    beforeAll(async () => {
      ast = await new CodeParser().parse(cSource, Language.C);
    });

    it('detects #include directives', () => {
      expect(ast.includes).toHaveLength(2);
      expect(ast.includes[0]).toMatchObject({ path: 'stdio.h', isSystem: true });
      expect(ast.includes[1]).toMatchObject({ path: 'myheader.h', isSystem: false });
    });

    it('detects #define macros', () => {
      expect(ast.macros).toHaveLength(2);
      expect(ast.macros[0]).toMatchObject({ name: 'MAX_SIZE', value: '100' });
      expect(ast.macros[1]).toMatchObject({ name: 'PI', value: '3.14159' });
    });

    it('detects function definitions', () => {
      const names = ast.functions.map(f => f.name);
      expect(names).toContain('add');
      expect(names).toContain('printHello');
    });

    it('records function parameters', () => {
      const addFn = ast.functions.find(f => f.name === 'add');
      expect(addFn).toBeDefined();
      expect(addFn!.params).toHaveLength(2);
    });

    it('records function line numbers', () => {
      const addFn = ast.functions.find(f => f.name === 'add');
      expect(addFn!.line).toBeGreaterThan(0);
    });

    it('detects variable declarations', () => {
      const names = ast.variables.map(v => v.name);
      expect(names).toContain('globalVar');
    });

    it('produces tokens including keywords and identifiers', () => {
      const keywords = ast.tokens.filter(t => t.type === 'keyword').map(t => t.value);
      expect(keywords).toContain('int');
      expect(keywords).toContain('void');
      expect(keywords).toContain('static');
    });

    it('produces identifier tokens', () => {
      const identifiers = ast.tokens.filter(t => t.type === 'identifier').map(t => t.value);
      expect(identifiers).toContain('add');
      expect(identifiers).toContain('printHello');
    });

    it('produces literal tokens for strings', () => {
      const literals = ast.tokens.filter(t => t.type === 'literal').map(t => t.value);
      expect(literals.some(l => l.includes('Hello'))).toBe(true);
    });

    it('has no syntax errors for valid code', () => {
      expect(ast.syntaxErrors).toHaveLength(0);
    });
  });

  // ─── C++ code parsing ──────────────────────────────────────────────────────

  describe('parse() – valid C++ code', () => {
    const cppSource = `
#include <iostream>
#include <string>

namespace MyApp {

class Calculator {
public:
    int add(int a, int b) {
        return a + b;
    }

    double multiply(double x, double y) {
        return x * y;
    }
};

} // namespace MyApp

int main() {
    MyApp::Calculator calc;
    int result = calc.add(3, 4);
    std::cout << result << std::endl;
    return 0;
}
`.trim();

    let ast: AST;

    beforeAll(async () => {
      ast = await new CodeParser().parse(cppSource, Language.CPP);
    });

    it('sets language to CPP', () => {
      expect(ast.language).toBe(Language.CPP);
    });

    it('detects C++ includes', () => {
      const paths = ast.includes.map(i => i.path);
      expect(paths).toContain('iostream');
      expect(paths).toContain('string');
    });

    it('detects C++ keywords like class and namespace', () => {
      const keywords = ast.tokens.filter(t => t.type === 'keyword').map(t => t.value);
      expect(keywords).toContain('class');
      expect(keywords).toContain('namespace');
      expect(keywords).toContain('public');
    });

    it('detects function definitions inside class', () => {
      const names = ast.functions.map(f => f.name);
      expect(names).toContain('add');
      expect(names).toContain('multiply');
      expect(names).toContain('main');
    });

    it('has no syntax errors for valid C++ code', () => {
      expect(ast.syntaxErrors).toHaveLength(0);
    });
  });

  // ─── Includes and macros ───────────────────────────────────────────────────

  describe('includes and macros', () => {
    it('distinguishes system includes (<>) from local includes ("")', async () => {
      const src = '#include <stdlib.h>\n#include "local.h"';
      const ast = await parser.parse(src, Language.C);
      expect(ast.includes[0].isSystem).toBe(true);
      expect(ast.includes[1].isSystem).toBe(false);
    });

    it('records macro line numbers', async () => {
      const src = 'int x;\n#define FOO 42\n';
      const ast = await parser.parse(src, Language.C);
      expect(ast.macros[0].line).toBe(2);
    });

    it('handles macros with no value', async () => {
      const src = '#define GUARD_H\n';
      const ast = await parser.parse(src, Language.C);
      expect(ast.macros[0]).toMatchObject({ name: 'GUARD_H', value: '' });
    });
  });

  // ─── Tokenizer ─────────────────────────────────────────────────────────────

  describe('tokenizer', () => {
    it('tokenizes line comments as comment tokens', async () => {
      const src = '// this is a comment\nint x;';
      const ast = await parser.parse(src, Language.C);
      const comments = ast.tokens.filter(t => t.type === 'comment');
      expect(comments).toHaveLength(1);
      expect(comments[0].value).toContain('this is a comment');
    });

    it('tokenizes block comments as comment tokens', async () => {
      const src = '/* block comment */\nint y;';
      const ast = await parser.parse(src, Language.C);
      const comments = ast.tokens.filter(t => t.type === 'comment');
      expect(comments).toHaveLength(1);
    });

    it('tokenizes numeric literals', async () => {
      const src = 'int a = 42;';
      const ast = await parser.parse(src, Language.C);
      const literals = ast.tokens.filter(t => t.type === 'literal');
      expect(literals.some(l => l.value === '42')).toBe(true);
    });

    it('records correct line numbers for tokens', async () => {
      const src = 'int a;\nfloat b;';
      const ast = await parser.parse(src, Language.C);
      const floatToken = ast.tokens.find(t => t.value === 'float');
      expect(floatToken?.line).toBe(2);
    });
  });

  // ─── Syntax error detection ────────────────────────────────────────────────

  describe('syntax error detection – unmatched braces', () => {
    it('detects unmatched opening brace', async () => {
      const src = 'int main() {\n    int x = 1;\n// missing closing brace';
      const ast = await parser.parse(src, Language.C);
      const braceErrors = ast.syntaxErrors.filter(e => e.message.includes('brace'));
      expect(braceErrors.length).toBeGreaterThan(0);
      expect(braceErrors[0].message).toMatch(/unmatched opening brace/i);
    });

    it('detects unmatched closing brace', async () => {
      const src = 'int x = 1;\n}\n';
      const ast = await parser.parse(src, Language.C);
      const braceErrors = ast.syntaxErrors.filter(e => e.message.includes('brace'));
      expect(braceErrors.length).toBeGreaterThan(0);
      expect(braceErrors[0].message).toMatch(/unmatched closing brace/i);
    });

    it('reports the line number of the unmatched brace', async () => {
      const src = 'int main() {\n    int x;\n';
      const ast = await parser.parse(src, Language.C);
      const braceErrors = ast.syntaxErrors.filter(e => e.message.includes('brace'));
      expect(braceErrors[0].line).toBeDefined();
      expect(braceErrors[0].line).toBeGreaterThan(0);
    });

    it('does not flag braces inside strings', async () => {
      const src = 'const char* s = "{ not a brace }";\n';
      const ast = await parser.parse(src, Language.C);
      expect(ast.syntaxErrors).toHaveLength(0);
    });

    it('does not flag braces inside comments', async () => {
      const src = '// { this is a comment }\nint x;';
      const ast = await parser.parse(src, Language.C);
      expect(ast.syntaxErrors).toHaveLength(0);
    });
  });

  describe('syntax error detection – unmatched parentheses', () => {
    it('detects unmatched opening parenthesis', async () => {
      const src = 'int x = (1 + 2;\n';
      const ast = await parser.parse(src, Language.C);
      const parenErrors = ast.syntaxErrors.filter(e => e.message.includes('parenthesis'));
      expect(parenErrors.length).toBeGreaterThan(0);
      expect(parenErrors[0].message).toMatch(/unmatched opening parenthesis/i);
    });

    it('detects unmatched closing parenthesis', async () => {
      const src = 'int x = 1 + 2);\n';
      const ast = await parser.parse(src, Language.C);
      const parenErrors = ast.syntaxErrors.filter(e => e.message.includes('parenthesis'));
      expect(parenErrors.length).toBeGreaterThan(0);
      expect(parenErrors[0].message).toMatch(/unmatched closing parenthesis/i);
    });

    it('does not flag parentheses inside strings', async () => {
      const src = 'const char* s = "(not a paren)";\n';
      const ast = await parser.parse(src, Language.C);
      expect(ast.syntaxErrors).toHaveLength(0);
    });
  });

  describe('syntax error detection – valid code has no errors', () => {
    it('returns empty syntaxErrors for well-formed C code', async () => {
      const src = `
int add(int a, int b) {
    return a + b;
}
int main(void) {
    int r = add(1, 2);
    return 0;
}
`.trim();
      const ast = await parser.parse(src, Language.C);
      expect(ast.syntaxErrors).toHaveLength(0);
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles empty source code', async () => {
      const ast = await parser.parse('', Language.C);
      expect(ast.type).toBe('TranslationUnit');
      expect(ast.tokens).toHaveLength(0);
      expect(ast.functions).toHaveLength(0);
      expect(ast.variables).toHaveLength(0);
      expect(ast.syntaxErrors).toHaveLength(0);
    });

    it('handles source with only comments', async () => {
      const src = '// just a comment\n/* another comment */\n';
      const ast = await parser.parse(src, Language.C);
      expect(ast.syntaxErrors).toHaveLength(0);
      const comments = ast.tokens.filter(t => t.type === 'comment');
      expect(comments).toHaveLength(2);
    });

    it('getLanguageExtension returns c for C', () => {
      expect(parser.getLanguageExtension(Language.C)).toBe('c');
    });

    it('getLanguageExtension returns cpp for CPP', () => {
      expect(parser.getLanguageExtension(Language.CPP)).toBe('cpp');
    });
  });
});

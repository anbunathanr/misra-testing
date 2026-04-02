import { Language } from '../../types/misra-analysis';

export interface Token {
  type: 'identifier' | 'keyword' | 'operator' | 'literal' | 'comment';
  value: string;
  line: number;
  column: number;
}

export interface FunctionDef {
  name: string;
  line: number;
  params: string[];
  returnType: string;
}

export interface VariableDecl {
  name: string;
  type: string;
  line: number;
}

export interface IncludeDirective {
  path: string;
  isSystem: boolean;
  line: number;
}

export interface MacroDefinition {
  name: string;
  value: string;
  line: number;
}

export interface SyntaxError {
  message: string;
  line?: number;
}

export interface AST {
  type: 'TranslationUnit';
  language: Language;
  source: string;
  lines: string[];
  tokens: Token[];
  functions: FunctionDef[];
  variables: VariableDecl[];
  includes: IncludeDirective[];
  macros: MacroDefinition[];
  syntaxErrors: SyntaxError[];
  [key: string]: unknown;
}

// C/C++ keywords
const C_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'inline', 'int', 'long', 'register', 'restrict', 'return', 'short',
  'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union',
  'unsigned', 'void', 'volatile', 'while', '_Bool', '_Complex', '_Imaginary',
]);

const CPP_KEYWORDS = new Set([
  ...C_KEYWORDS,
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'bitand', 'bitor', 'bool',
  'catch', 'class', 'compl', 'concept', 'consteval', 'constexpr', 'constinit',
  'co_await', 'co_return', 'co_yield', 'decltype', 'delete', 'explicit',
  'export', 'false', 'friend', 'mutable', 'namespace', 'new', 'noexcept',
  'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq', 'private',
  'protected', 'public', 'requires', 'static_assert', 'static_cast',
  'dynamic_cast', 'reinterpret_cast', 'const_cast', 'template', 'this',
  'thread_local', 'throw', 'true', 'try', 'typeid', 'typename', 'using',
  'virtual', 'wchar_t', 'xor', 'xor_eq', 'override', 'final',
]);

export class CodeParser {
  async parse(sourceCode: string, language: Language): Promise<AST> {
    const lines = sourceCode.split('\n');
    const keywords = language === Language.CPP ? CPP_KEYWORDS : C_KEYWORDS;

    const includes = this.extractIncludes(lines);
    const macros = this.extractMacros(lines);
    const tokens = this.tokenize(sourceCode, lines, keywords);
    const functions = this.extractFunctions(lines);
    const variables = this.extractVariables(lines);
    const syntaxErrors = this.detectSyntaxErrors(sourceCode, lines);

    return {
      type: 'TranslationUnit',
      language,
      source: sourceCode,
      lines,
      tokens,
      functions,
      variables,
      includes,
      macros,
      syntaxErrors,
    };
  }

  private extractIncludes(lines: string[]): IncludeDirective[] {
    const includes: IncludeDirective[] = [];
    const includeRegex = /^\s*#\s*include\s*([<"])(.*?)[>"]/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(includeRegex);
      if (match) {
        includes.push({
          path: match[2],
          isSystem: match[1] === '<',
          line: i + 1,
        });
      }
    }

    return includes;
  }

  private extractMacros(lines: string[]): MacroDefinition[] {
    const macros: MacroDefinition[] = [];
    const defineRegex = /^\s*#\s*define\s+(\w+)(?:\([^)]*\))?\s*(.*)/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(defineRegex);
      if (match) {
        macros.push({
          name: match[1],
          value: match[2].trim(),
          line: i + 1,
        });
      }
    }

    return macros;
  }

  private tokenize(sourceCode: string, lines: string[], keywords: Set<string>): Token[] {
    const tokens: Token[] = [];

    // Strip block comments first to avoid false positives, but track positions
    let lineNum = 1;
    let colNum = 1;
    let i = 0;

    while (i < sourceCode.length) {
      const ch = sourceCode[i];

      // Track line/column
      if (ch === '\n') {
        lineNum++;
        colNum = 1;
        i++;
        continue;
      }

      // Block comment
      if (ch === '/' && sourceCode[i + 1] === '*') {
        const startLine = lineNum;
        const startCol = colNum;
        let value = '/*';
        i += 2;
        colNum += 2;
        while (i < sourceCode.length && !(sourceCode[i] === '*' && sourceCode[i + 1] === '/')) {
          if (sourceCode[i] === '\n') { lineNum++; colNum = 1; }
          else { colNum++; }
          value += sourceCode[i];
          i++;
        }
        if (i < sourceCode.length) {
          value += '*/';
          i += 2;
          colNum += 2;
        }
        tokens.push({ type: 'comment', value, line: startLine, column: startCol });
        continue;
      }

      // Line comment
      if (ch === '/' && sourceCode[i + 1] === '/') {
        const startLine = lineNum;
        const startCol = colNum;
        let value = '';
        while (i < sourceCode.length && sourceCode[i] !== '\n') {
          value += sourceCode[i];
          i++;
          colNum++;
        }
        tokens.push({ type: 'comment', value, line: startLine, column: startCol });
        continue;
      }

      // String literal
      if (ch === '"' || ch === '\'') {
        const startLine = lineNum;
        const startCol = colNum;
        const quote = ch;
        let value = ch;
        i++;
        colNum++;
        while (i < sourceCode.length && sourceCode[i] !== quote) {
          if (sourceCode[i] === '\\') {
            value += sourceCode[i];
            i++;
            colNum++;
          }
          if (i < sourceCode.length) {
            value += sourceCode[i];
            if (sourceCode[i] === '\n') { lineNum++; colNum = 1; }
            else { colNum++; }
            i++;
          }
        }
        if (i < sourceCode.length) {
          value += sourceCode[i];
          i++;
          colNum++;
        }
        tokens.push({ type: 'literal', value, line: startLine, column: startCol });
        continue;
      }

      // Number literal
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(sourceCode[i + 1] || ''))) {
        const startLine = lineNum;
        const startCol = colNum;
        let value = '';
        while (i < sourceCode.length && /[0-9a-fA-FxX._uUlLfF]/.test(sourceCode[i])) {
          value += sourceCode[i];
          i++;
          colNum++;
        }
        tokens.push({ type: 'literal', value, line: startLine, column: startCol });
        continue;
      }

      // Identifier or keyword
      if (/[a-zA-Z_]/.test(ch)) {
        const startLine = lineNum;
        const startCol = colNum;
        let value = '';
        while (i < sourceCode.length && /[a-zA-Z0-9_]/.test(sourceCode[i])) {
          value += sourceCode[i];
          i++;
          colNum++;
        }
        tokens.push({
          type: keywords.has(value) ? 'keyword' : 'identifier',
          value,
          line: startLine,
          column: startCol,
        });
        continue;
      }

      // Operators and punctuation
      if (/[+\-*/%=<>!&|^~?:;,.()\[\]{}]/.test(ch)) {
        const startLine = lineNum;
        const startCol = colNum;
        // Try two-char operators
        const twoChar = sourceCode.slice(i, i + 2);
        const twoCharOps = ['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=',
          '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '->', '::', '...'];
        if (twoCharOps.includes(twoChar)) {
          tokens.push({ type: 'operator', value: twoChar, line: startLine, column: startCol });
          i += 2;
          colNum += 2;
        } else {
          tokens.push({ type: 'operator', value: ch, line: startLine, column: startCol });
          i++;
          colNum++;
        }
        continue;
      }

      // Skip whitespace
      i++;
      colNum++;
    }

    return tokens;
  }

  private extractFunctions(lines: string[]): FunctionDef[] {
    const functions: FunctionDef[] = [];

    // Match function definitions: returnType name(params) {
    // Handles: int foo(int a, char b), void bar(), static int baz(void)
    const funcRegex = /^(?:(?:static|inline|extern|virtual|explicit|constexpr|override|final)\s+)*([a-zA-Z_][\w:*&\s]*?)\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?(?:final\s*)?(?:->.*?)?\s*(?:\{(?:\})?)?\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip preprocessor, comments, and pure declarations (ending with ;)
      if (line.startsWith('#') || line.startsWith('//') || line.endsWith(';')) continue;

      const match = line.match(funcRegex);
      if (match) {
        const returnType = match[1].trim();
        const name = match[2].trim();
        const paramsStr = match[3].trim();

        // Skip if looks like a control flow statement
        if (['if', 'for', 'while', 'switch', 'catch'].includes(name)) continue;
        // Skip if return type is empty or looks wrong
        if (!returnType || returnType === 'return' || returnType === 'else') continue;

        const params = paramsStr
          ? paramsStr.split(',').map(p => p.trim()).filter(p => p && p !== 'void')
          : [];

        functions.push({ name, line: i + 1, params, returnType });
      }
    }

    return functions;
  }

  private extractVariables(lines: string[]): VariableDecl[] {
    const variables: VariableDecl[] = [];

    // Match variable declarations: type name; or type name = value;
    // Handles: int x; char* p = NULL; static float f = 1.0f;
    const varRegex = /^(?:(?:static|extern|const|volatile|register|mutable)\s+)*([a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+([a-zA-Z_]\w*)\s*(?:=.*?)?;\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip preprocessor, comments, and function-like lines
      if (line.startsWith('#') || line.startsWith('//') || line.includes('(')) continue;

      const match = line.match(varRegex);
      if (match) {
        const type = match[1].trim();
        const name = match[2].trim();

        // Skip keywords that look like types but aren't variable declarations
        const skipTypes = ['return', 'break', 'continue', 'goto', 'case', 'default'];
        if (skipTypes.includes(type) || skipTypes.includes(name)) continue;

        variables.push({ name, type, line: i + 1 });
      }
    }

    return variables;
  }

  private detectSyntaxErrors(sourceCode: string, lines: string[]): SyntaxError[] {
    const errors: SyntaxError[] = [];

    // Check unmatched braces
    const braceErrors = this.checkUnmatchedBraces(sourceCode, lines);
    errors.push(...braceErrors);

    // Check unmatched parentheses
    const parenErrors = this.checkUnmatchedParentheses(sourceCode, lines);
    errors.push(...parenErrors);

    return errors;
  }

  private checkUnmatchedBraces(sourceCode: string, lines: string[]): SyntaxError[] {
    const errors: SyntaxError[] = [];
    const stack: { char: string; line: number }[] = [];
    let inString = false;
    let inChar = false;
    let inLineComment = false;
    let inBlockComment = false;
    let lineNum = 1;

    for (let i = 0; i < sourceCode.length; i++) {
      const ch = sourceCode[i];
      const next = sourceCode[i + 1];

      if (ch === '\n') {
        lineNum++;
        inLineComment = false;
        continue;
      }

      if (inLineComment) continue;
      if (inBlockComment) {
        if (ch === '*' && next === '/') { inBlockComment = false; i++; }
        continue;
      }

      if (!inString && !inChar) {
        if (ch === '/' && next === '/') { inLineComment = true; continue; }
        if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
        if (ch === '"') { inString = true; continue; }
        if (ch === '\'') { inChar = true; continue; }
      } else if (inString) {
        if (ch === '\\') { i++; continue; }
        if (ch === '"') { inString = false; }
        continue;
      } else if (inChar) {
        if (ch === '\\') { i++; continue; }
        if (ch === '\'') { inChar = false; }
        continue;
      }

      if (ch === '{') {
        stack.push({ char: '{', line: lineNum });
      } else if (ch === '}') {
        if (stack.length === 0 || stack[stack.length - 1].char !== '{') {
          errors.push({ message: `Unmatched closing brace '}'`, line: lineNum });
        } else {
          stack.pop();
        }
      }
    }

    for (const unmatched of stack) {
      errors.push({ message: `Unmatched opening brace '{'`, line: unmatched.line });
    }

    return errors;
  }

  private checkUnmatchedParentheses(sourceCode: string, lines: string[]): SyntaxError[] {
    const errors: SyntaxError[] = [];
    const stack: { char: string; line: number }[] = [];
    let inString = false;
    let inChar = false;
    let inLineComment = false;
    let inBlockComment = false;
    let lineNum = 1;

    for (let i = 0; i < sourceCode.length; i++) {
      const ch = sourceCode[i];
      const next = sourceCode[i + 1];

      if (ch === '\n') {
        lineNum++;
        inLineComment = false;
        continue;
      }

      if (inLineComment) continue;
      if (inBlockComment) {
        if (ch === '*' && next === '/') { inBlockComment = false; i++; }
        continue;
      }

      if (!inString && !inChar) {
        if (ch === '/' && next === '/') { inLineComment = true; continue; }
        if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
        if (ch === '"') { inString = true; continue; }
        if (ch === '\'') { inChar = true; continue; }
      } else if (inString) {
        if (ch === '\\') { i++; continue; }
        if (ch === '"') { inString = false; }
        continue;
      } else if (inChar) {
        if (ch === '\\') { i++; continue; }
        if (ch === '\'') { inChar = false; }
        continue;
      }

      if (ch === '(') {
        stack.push({ char: '(', line: lineNum });
      } else if (ch === ')') {
        if (stack.length === 0 || stack[stack.length - 1].char !== '(') {
          errors.push({ message: `Unmatched closing parenthesis ')'`, line: lineNum });
        } else {
          stack.pop();
        }
      }
    }

    for (const unmatched of stack) {
      errors.push({ message: `Unmatched opening parenthesis '('`, line: unmatched.line });
    }

    return errors;
  }

  getLanguageExtension(language: Language): string {
    return language === Language.C ? 'c' : 'cpp';
  }
}

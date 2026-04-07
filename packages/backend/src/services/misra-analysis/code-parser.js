"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeParser = void 0;
const misra_analysis_1 = require("../../types/misra-analysis");
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
class CodeParser {
    async parse(sourceCode, language) {
        const lines = sourceCode.split('\n');
        const keywords = language === misra_analysis_1.Language.CPP ? CPP_KEYWORDS : C_KEYWORDS;
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
    extractIncludes(lines) {
        const includes = [];
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
    extractMacros(lines) {
        const macros = [];
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
    tokenize(sourceCode, lines, keywords) {
        const tokens = [];
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
                    if (sourceCode[i] === '\n') {
                        lineNum++;
                        colNum = 1;
                    }
                    else {
                        colNum++;
                    }
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
                        if (sourceCode[i] === '\n') {
                            lineNum++;
                            colNum = 1;
                        }
                        else {
                            colNum++;
                        }
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
                }
                else {
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
    extractFunctions(lines) {
        const functions = [];
        // Match function definitions: returnType name(params) {
        // Handles: int foo(int a, char b), void bar(), static int baz(void)
        const funcRegex = /^(?:(?:static|inline|extern|virtual|explicit|constexpr|override|final)\s+)*([a-zA-Z_][\w:*&\s]*?)\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?(?:final\s*)?(?:->.*?)?\s*(?:\{(?:\})?)?\s*$/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip preprocessor, comments, and pure declarations (ending with ;)
            if (line.startsWith('#') || line.startsWith('//') || line.endsWith(';'))
                continue;
            const match = line.match(funcRegex);
            if (match) {
                const returnType = match[1].trim();
                const name = match[2].trim();
                const paramsStr = match[3].trim();
                // Skip if looks like a control flow statement
                if (['if', 'for', 'while', 'switch', 'catch'].includes(name))
                    continue;
                // Skip if return type is empty or looks wrong
                if (!returnType || returnType === 'return' || returnType === 'else')
                    continue;
                const params = paramsStr
                    ? paramsStr.split(',').map(p => p.trim()).filter(p => p && p !== 'void')
                    : [];
                functions.push({ name, line: i + 1, params, returnType });
            }
        }
        return functions;
    }
    extractVariables(lines) {
        const variables = [];
        // Match variable declarations: type name; or type name = value;
        // Handles: int x; char* p = NULL; static float f = 1.0f;
        const varRegex = /^(?:(?:static|extern|const|volatile|register|mutable)\s+)*([a-zA-Z_][\w:]*(?:\s*[*&]+)?)\s+([a-zA-Z_]\w*)\s*(?:=.*?)?;\s*$/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip preprocessor, comments, and function-like lines
            if (line.startsWith('#') || line.startsWith('//') || line.includes('('))
                continue;
            const match = line.match(varRegex);
            if (match) {
                const type = match[1].trim();
                const name = match[2].trim();
                // Skip keywords that look like types but aren't variable declarations
                const skipTypes = ['return', 'break', 'continue', 'goto', 'case', 'default'];
                if (skipTypes.includes(type) || skipTypes.includes(name))
                    continue;
                variables.push({ name, type, line: i + 1 });
            }
        }
        return variables;
    }
    detectSyntaxErrors(sourceCode, lines) {
        const errors = [];
        // Check unmatched braces
        const braceErrors = this.checkUnmatchedBraces(sourceCode, lines);
        errors.push(...braceErrors);
        // Check unmatched parentheses
        const parenErrors = this.checkUnmatchedParentheses(sourceCode, lines);
        errors.push(...parenErrors);
        return errors;
    }
    checkUnmatchedBraces(sourceCode, lines) {
        const errors = [];
        const stack = [];
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
            if (inLineComment)
                continue;
            if (inBlockComment) {
                if (ch === '*' && next === '/') {
                    inBlockComment = false;
                    i++;
                }
                continue;
            }
            if (!inString && !inChar) {
                if (ch === '/' && next === '/') {
                    inLineComment = true;
                    continue;
                }
                if (ch === '/' && next === '*') {
                    inBlockComment = true;
                    i++;
                    continue;
                }
                if (ch === '"') {
                    inString = true;
                    continue;
                }
                if (ch === '\'') {
                    inChar = true;
                    continue;
                }
            }
            else if (inString) {
                if (ch === '\\') {
                    i++;
                    continue;
                }
                if (ch === '"') {
                    inString = false;
                }
                continue;
            }
            else if (inChar) {
                if (ch === '\\') {
                    i++;
                    continue;
                }
                if (ch === '\'') {
                    inChar = false;
                }
                continue;
            }
            if (ch === '{') {
                stack.push({ char: '{', line: lineNum });
            }
            else if (ch === '}') {
                if (stack.length === 0 || stack[stack.length - 1].char !== '{') {
                    errors.push({ message: `Unmatched closing brace '}'`, line: lineNum });
                }
                else {
                    stack.pop();
                }
            }
        }
        for (const unmatched of stack) {
            errors.push({ message: `Unmatched opening brace '{'`, line: unmatched.line });
        }
        return errors;
    }
    checkUnmatchedParentheses(sourceCode, lines) {
        const errors = [];
        const stack = [];
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
            if (inLineComment)
                continue;
            if (inBlockComment) {
                if (ch === '*' && next === '/') {
                    inBlockComment = false;
                    i++;
                }
                continue;
            }
            if (!inString && !inChar) {
                if (ch === '/' && next === '/') {
                    inLineComment = true;
                    continue;
                }
                if (ch === '/' && next === '*') {
                    inBlockComment = true;
                    i++;
                    continue;
                }
                if (ch === '"') {
                    inString = true;
                    continue;
                }
                if (ch === '\'') {
                    inChar = true;
                    continue;
                }
            }
            else if (inString) {
                if (ch === '\\') {
                    i++;
                    continue;
                }
                if (ch === '"') {
                    inString = false;
                }
                continue;
            }
            else if (inChar) {
                if (ch === '\\') {
                    i++;
                    continue;
                }
                if (ch === '\'') {
                    inChar = false;
                }
                continue;
            }
            if (ch === '(') {
                stack.push({ char: '(', line: lineNum });
            }
            else if (ch === ')') {
                if (stack.length === 0 || stack[stack.length - 1].char !== '(') {
                    errors.push({ message: `Unmatched closing parenthesis ')'`, line: lineNum });
                }
                else {
                    stack.pop();
                }
            }
        }
        for (const unmatched of stack) {
            errors.push({ message: `Unmatched opening parenthesis '('`, line: unmatched.line });
        }
        return errors;
    }
    getLanguageExtension(language) {
        return language === misra_analysis_1.Language.C ? 'c' : 'cpp';
    }
}
exports.CodeParser = CodeParser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2RlLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrREFBc0Q7QUFxRHRELGlCQUFpQjtBQUNqQixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUN6QixNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSTtJQUNyRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSTtJQUNoRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxPQUFPO0lBQ2xFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU87SUFDcEUsVUFBVSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWTtDQUMzRSxDQUFDLENBQUM7QUFFSCxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUMzQixHQUFHLFVBQVU7SUFDYixTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTTtJQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxXQUFXO0lBQzNFLFVBQVUsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsVUFBVTtJQUNyRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxVQUFVO0lBQ3RF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QUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDL0QsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDL0UsQ0FBQztxQkFBTSxDQUFDO29CQUNOLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxLQUFLLE1BQU0sU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQsb0JBQW9CLENBQUMsUUFBa0I7UUFDckMsT0FBTyxRQUFRLEtBQUsseUJBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQy9DLENBQUM7Q0FDRjtBQXJaRCxnQ0FxWkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMYW5ndWFnZSB9IGZyb20gJy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW4ge1xyXG4gIHR5cGU6ICdpZGVudGlmaWVyJyB8ICdrZXl3b3JkJyB8ICdvcGVyYXRvcicgfCAnbGl0ZXJhbCcgfCAnY29tbWVudCc7XHJcbiAgdmFsdWU6IHN0cmluZztcclxuICBsaW5lOiBudW1iZXI7XHJcbiAgY29sdW1uOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRnVuY3Rpb25EZWYge1xyXG4gIG5hbWU6IHN0cmluZztcclxuICBsaW5lOiBudW1iZXI7XHJcbiAgcGFyYW1zOiBzdHJpbmdbXTtcclxuICByZXR1cm5UeXBlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmFyaWFibGVEZWNsIHtcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgdHlwZTogc3RyaW5nO1xyXG4gIGxpbmU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJbmNsdWRlRGlyZWN0aXZlIHtcclxuICBwYXRoOiBzdHJpbmc7XHJcbiAgaXNTeXN0ZW06IGJvb2xlYW47XHJcbiAgbGluZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1hY3JvRGVmaW5pdGlvbiB7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIHZhbHVlOiBzdHJpbmc7XHJcbiAgbGluZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFN5bnRheEVycm9yIHtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgbGluZT86IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBU1Qge1xyXG4gIHR5cGU6ICdUcmFuc2xhdGlvblVuaXQnO1xyXG4gIGxhbmd1YWdlOiBMYW5ndWFnZTtcclxuICBzb3VyY2U6IHN0cmluZztcclxuICBsaW5lczogc3RyaW5nW107XHJcbiAgdG9rZW5zOiBUb2tlbltdO1xyXG4gIGZ1bmN0aW9uczogRnVuY3Rpb25EZWZbXTtcclxuICB2YXJpYWJsZXM6IFZhcmlhYmxlRGVjbFtdO1xyXG4gIGluY2x1ZGVzOiBJbmNsdWRlRGlyZWN0aXZlW107XHJcbiAgbWFjcm9zOiBNYWNyb0RlZmluaXRpb25bXTtcclxuICBzeW50YXhFcnJvcnM6IFN5bnRheEVycm9yW107XHJcbiAgW2tleTogc3RyaW5nXTogdW5rbm93bjtcclxufVxyXG5cclxuLy8gQy9DKysga2V5d29yZHNcclxuY29uc3QgQ19LRVlXT1JEUyA9IG5ldyBTZXQoW1xyXG4gICdhdXRvJywgJ2JyZWFrJywgJ2Nhc2UnLCAnY2hhcicsICdjb25zdCcsICdjb250aW51ZScsICdkZWZhdWx0JywgJ2RvJyxcclxuICAnZG91YmxlJywgJ2Vsc2UnLCAnZW51bScsICdleHRlcm4nLCAnZmxvYXQnLCAnZm9yJywgJ2dvdG8nLCAnaWYnLFxyXG4gICdpbmxpbmUnLCAnaW50JywgJ2xvbmcnLCAncmVnaXN0ZXInLCAncmVzdHJpY3QnLCAncmV0dXJuJywgJ3Nob3J0JyxcclxuICAnc2lnbmVkJywgJ3NpemVvZicsICdzdGF0aWMnLCAnc3RydWN0JywgJ3N3aXRjaCcsICd0eXBlZGVmJywgJ3VuaW9uJyxcclxuICAndW5zaWduZWQnLCAndm9pZCcsICd2b2xhdGlsZScsICd3aGlsZScsICdfQm9vbCcsICdfQ29tcGxleCcsICdfSW1hZ2luYXJ5JyxcclxuXSk7XHJcblxyXG5jb25zdCBDUFBfS0VZV09SRFMgPSBuZXcgU2V0KFtcclxuICAuLi5DX0tFWVdPUkRTLFxyXG4gICdhbGlnbmFzJywgJ2FsaWdub2YnLCAnYW5kJywgJ2FuZF9lcScsICdhc20nLCAnYml0YW5kJywgJ2JpdG9yJywgJ2Jvb2wnLFxyXG4gICdjYXRjaCcsICdjbGFzcycsICdjb21wbCcsICdjb25jZXB0JywgJ2NvbnN0ZXZhbCcsICdjb25zdGV4cHInLCAnY29uc3Rpbml0JyxcclxuICAnY29fYXdhaXQnLCAnY29fcmV0dXJuJywgJ2NvX3lpZWxkJywgJ2RlY2x0eXBlJywgJ2RlbGV0ZScsICdleHBsaWNpdCcsXHJcbiAgJ2V4cG9ydCcsICdmYWxzZScsICdmcmllbmQnLCAnbXV0YWJsZScsICduYW1lc3BhY2UnLCAnbmV3JywgJ25vZXhjZXB0JyxcclxuICAnbm90JywgJ25vdF9lcScsICdudWxscHRyJywgJ29wZXJhdG9yJywgJ29yJywgJ29yX2VxJywgJ3ByaXZhdGUnLFxyXG4gICdwcm90ZWN0ZWQnLCAncHVibGljJywgJ3JlcXVpcmVzJywgJ3N0YXRpY19hc3NlcnQnLCAnc3RhdGljX2Nhc3QnLFxyXG4gICdkeW5hbWljX2Nhc3QnLCAncmVpbnRlcnByZXRfY2FzdCcsICdjb25zdF9jYXN0JywgJ3RlbXBsYXRlJywgJ3RoaXMnLFxyXG4gICd0aHJlYWRfbG9jYWwnLCAndGhyb3cnLCAndHJ1ZScsICd0cnknLCAndHlwZWlkJywgJ3R5cGVuYW1lJywgJ3VzaW5nJyxcclxuICAndmlydHVhbCcsICd3Y2hhcl90JywgJ3hvcicsICd4b3JfZXEnLCAnb3ZlcnJpZGUnLCAnZmluYWwnLFxyXG5dKTtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb2RlUGFyc2VyIHtcclxuICBhc3luYyBwYXJzZShzb3VyY2VDb2RlOiBzdHJpbmcsIGxhbmd1YWdlOiBMYW5ndWFnZSk6IFByb21pc2U8QVNUPiB7XHJcbiAgICBjb25zdCBsaW5lcyA9IHNvdXJjZUNvZGUuc3BsaXQoJ1xcbicpO1xyXG4gICAgY29uc3Qga2V5d29yZHMgPSBsYW5ndWFnZSA9PT0gTGFuZ3VhZ2UuQ1BQID8gQ1BQX0tFWVdPUkRTIDogQ19LRVlXT1JEUztcclxuXHJcbiAgICBjb25zdCBpbmNsdWRlcyA9IHRoaXMuZXh0cmFjdEluY2x1ZGVzKGxpbmVzKTtcclxuICAgIGNvbnN0IG1hY3JvcyA9IHRoaXMuZXh0cmFjdE1hY3JvcyhsaW5lcyk7XHJcbiAgICBjb25zdCB0b2tlbnMgPSB0aGlzLnRva2VuaXplKHNvdXJjZUNvZGUsIGxpbmVzLCBrZXl3b3Jkcyk7XHJcbiAgICBjb25zdCBmdW5jdGlvbnMgPSB0aGlzLmV4dHJhY3RGdW5jdGlvbnMobGluZXMpO1xyXG4gICAgY29uc3QgdmFyaWFibGVzID0gdGhpcy5leHRyYWN0VmFyaWFibGVzKGxpbmVzKTtcclxuICAgIGNvbnN0IHN5bnRheEVycm9ycyA9IHRoaXMuZGV0ZWN0U3ludGF4RXJyb3JzKHNvdXJjZUNvZGUsIGxpbmVzKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiAnVHJhbnNsYXRpb25Vbml0JyxcclxuICAgICAgbGFuZ3VhZ2UsXHJcbiAgICAgIHNvdXJjZTogc291cmNlQ29kZSxcclxuICAgICAgbGluZXMsXHJcbiAgICAgIHRva2VucyxcclxuICAgICAgZnVuY3Rpb25zLFxyXG4gICAgICB2YXJpYWJsZXMsXHJcbiAgICAgIGluY2x1ZGVzLFxyXG4gICAgICBtYWNyb3MsXHJcbiAgICAgIHN5bnRheEVycm9ycyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGV4dHJhY3RJbmNsdWRlcyhsaW5lczogc3RyaW5nW10pOiBJbmNsdWRlRGlyZWN0aXZlW10ge1xyXG4gICAgY29uc3QgaW5jbHVkZXM6IEluY2x1ZGVEaXJlY3RpdmVbXSA9IFtdO1xyXG4gICAgY29uc3QgaW5jbHVkZVJlZ2V4ID0gL15cXHMqI1xccyppbmNsdWRlXFxzKihbPFwiXSkoLio/KVs+XCJdLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZXNbaV0ubWF0Y2goaW5jbHVkZVJlZ2V4KTtcclxuICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgaW5jbHVkZXMucHVzaCh7XHJcbiAgICAgICAgICBwYXRoOiBtYXRjaFsyXSxcclxuICAgICAgICAgIGlzU3lzdGVtOiBtYXRjaFsxXSA9PT0gJzwnLFxyXG4gICAgICAgICAgbGluZTogaSArIDEsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaW5jbHVkZXM7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGV4dHJhY3RNYWNyb3MobGluZXM6IHN0cmluZ1tdKTogTWFjcm9EZWZpbml0aW9uW10ge1xyXG4gICAgY29uc3QgbWFjcm9zOiBNYWNyb0RlZmluaXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgZGVmaW5lUmVnZXggPSAvXlxccyojXFxzKmRlZmluZVxccysoXFx3KykoPzpcXChbXildKlxcKSk/XFxzKiguKikvO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbWF0Y2ggPSBsaW5lc1tpXS5tYXRjaChkZWZpbmVSZWdleCk7XHJcbiAgICAgIGlmIChtYXRjaCkge1xyXG4gICAgICAgIG1hY3Jvcy5wdXNoKHtcclxuICAgICAgICAgIG5hbWU6IG1hdGNoWzFdLFxyXG4gICAgICAgICAgdmFsdWU6IG1hdGNoWzJdLnRyaW0oKSxcclxuICAgICAgICAgIGxpbmU6IGkgKyAxLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG1hY3JvcztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdG9rZW5pemUoc291cmNlQ29kZTogc3RyaW5nLCBsaW5lczogc3RyaW5nW10sIGtleXdvcmRzOiBTZXQ8c3RyaW5nPik6IFRva2VuW10ge1xyXG4gICAgY29uc3QgdG9rZW5zOiBUb2tlbltdID0gW107XHJcblxyXG4gICAgLy8gU3RyaXAgYmxvY2sgY29tbWVudHMgZmlyc3QgdG8gYXZvaWQgZmFsc2UgcG9zaXRpdmVzLCBidXQgdHJhY2sgcG9zaXRpb25zXHJcbiAgICBsZXQgbGluZU51bSA9IDE7XHJcbiAgICBsZXQgY29sTnVtID0gMTtcclxuICAgIGxldCBpID0gMDtcclxuXHJcbiAgICB3aGlsZSAoaSA8IHNvdXJjZUNvZGUubGVuZ3RoKSB7XHJcbiAgICAgIGNvbnN0IGNoID0gc291cmNlQ29kZVtpXTtcclxuXHJcbiAgICAgIC8vIFRyYWNrIGxpbmUvY29sdW1uXHJcbiAgICAgIGlmIChjaCA9PT0gJ1xcbicpIHtcclxuICAgICAgICBsaW5lTnVtKys7XHJcbiAgICAgICAgY29sTnVtID0gMTtcclxuICAgICAgICBpKys7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEJsb2NrIGNvbW1lbnRcclxuICAgICAgaWYgKGNoID09PSAnLycgJiYgc291cmNlQ29kZVtpICsgMV0gPT09ICcqJykge1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0TGluZSA9IGxpbmVOdW07XHJcbiAgICAgICAgY29uc3Qgc3RhcnRDb2wgPSBjb2xOdW07XHJcbiAgICAgICAgbGV0IHZhbHVlID0gJy8qJztcclxuICAgICAgICBpICs9IDI7XHJcbiAgICAgICAgY29sTnVtICs9IDI7XHJcbiAgICAgICAgd2hpbGUgKGkgPCBzb3VyY2VDb2RlLmxlbmd0aCAmJiAhKHNvdXJjZUNvZGVbaV0gPT09ICcqJyAmJiBzb3VyY2VDb2RlW2kgKyAxXSA9PT0gJy8nKSkge1xyXG4gICAgICAgICAgaWYgKHNvdXJjZUNvZGVbaV0gPT09ICdcXG4nKSB7IGxpbmVOdW0rKzsgY29sTnVtID0gMTsgfVxyXG4gICAgICAgICAgZWxzZSB7IGNvbE51bSsrOyB9XHJcbiAgICAgICAgICB2YWx1ZSArPSBzb3VyY2VDb2RlW2ldO1xyXG4gICAgICAgICAgaSsrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaSA8IHNvdXJjZUNvZGUubGVuZ3RoKSB7XHJcbiAgICAgICAgICB2YWx1ZSArPSAnKi8nO1xyXG4gICAgICAgICAgaSArPSAyO1xyXG4gICAgICAgICAgY29sTnVtICs9IDI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogJ2NvbW1lbnQnLCB2YWx1ZSwgbGluZTogc3RhcnRMaW5lLCBjb2x1bW46IHN0YXJ0Q29sIH0pO1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBMaW5lIGNvbW1lbnRcclxuICAgICAgaWYgKGNoID09PSAnLycgJiYgc291cmNlQ29kZVtpICsgMV0gPT09ICcvJykge1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0TGluZSA9IGxpbmVOdW07XHJcbiAgICAgICAgY29uc3Qgc3RhcnRDb2wgPSBjb2xOdW07XHJcbiAgICAgICAgbGV0IHZhbHVlID0gJyc7XHJcbiAgICAgICAgd2hpbGUgKGkgPCBzb3VyY2VDb2RlLmxlbmd0aCAmJiBzb3VyY2VDb2RlW2ldICE9PSAnXFxuJykge1xyXG4gICAgICAgICAgdmFsdWUgKz0gc291cmNlQ29kZVtpXTtcclxuICAgICAgICAgIGkrKztcclxuICAgICAgICAgIGNvbE51bSsrO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0b2tlbnMucHVzaCh7IHR5cGU6ICdjb21tZW50JywgdmFsdWUsIGxpbmU6IHN0YXJ0TGluZSwgY29sdW1uOiBzdGFydENvbCB9KTtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU3RyaW5nIGxpdGVyYWxcclxuICAgICAgaWYgKGNoID09PSAnXCInIHx8IGNoID09PSAnXFwnJykge1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0TGluZSA9IGxpbmVOdW07XHJcbiAgICAgICAgY29uc3Qgc3RhcnRDb2wgPSBjb2xOdW07XHJcbiAgICAgICAgY29uc3QgcXVvdGUgPSBjaDtcclxuICAgICAgICBsZXQgdmFsdWUgPSBjaDtcclxuICAgICAgICBpKys7XHJcbiAgICAgICAgY29sTnVtKys7XHJcbiAgICAgICAgd2hpbGUgKGkgPCBzb3VyY2VDb2RlLmxlbmd0aCAmJiBzb3VyY2VDb2RlW2ldICE9PSBxdW90ZSkge1xyXG4gICAgICAgICAgaWYgKHNvdXJjZUNvZGVbaV0gPT09ICdcXFxcJykge1xyXG4gICAgICAgICAgICB2YWx1ZSArPSBzb3VyY2VDb2RlW2ldO1xyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIGNvbE51bSsrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKGkgPCBzb3VyY2VDb2RlLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB2YWx1ZSArPSBzb3VyY2VDb2RlW2ldO1xyXG4gICAgICAgICAgICBpZiAoc291cmNlQ29kZVtpXSA9PT0gJ1xcbicpIHsgbGluZU51bSsrOyBjb2xOdW0gPSAxOyB9XHJcbiAgICAgICAgICAgIGVsc2UgeyBjb2xOdW0rKzsgfVxyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpIDwgc291cmNlQ29kZS5sZW5ndGgpIHtcclxuICAgICAgICAgIHZhbHVlICs9IHNvdXJjZUNvZGVbaV07XHJcbiAgICAgICAgICBpKys7XHJcbiAgICAgICAgICBjb2xOdW0rKztcclxuICAgICAgICB9XHJcbiAgICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiAnbGl0ZXJhbCcsIHZhbHVlLCBsaW5lOiBzdGFydExpbmUsIGNvbHVtbjogc3RhcnRDb2wgfSk7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIE51bWJlciBsaXRlcmFsXHJcbiAgICAgIGlmICgvWzAtOV0vLnRlc3QoY2gpIHx8IChjaCA9PT0gJy4nICYmIC9bMC05XS8udGVzdChzb3VyY2VDb2RlW2kgKyAxXSB8fCAnJykpKSB7XHJcbiAgICAgICAgY29uc3Qgc3RhcnRMaW5lID0gbGluZU51bTtcclxuICAgICAgICBjb25zdCBzdGFydENvbCA9IGNvbE51bTtcclxuICAgICAgICBsZXQgdmFsdWUgPSAnJztcclxuICAgICAgICB3aGlsZSAoaSA8IHNvdXJjZUNvZGUubGVuZ3RoICYmIC9bMC05YS1mQS1GeFguX3VVbExmRl0vLnRlc3Qoc291cmNlQ29kZVtpXSkpIHtcclxuICAgICAgICAgIHZhbHVlICs9IHNvdXJjZUNvZGVbaV07XHJcbiAgICAgICAgICBpKys7XHJcbiAgICAgICAgICBjb2xOdW0rKztcclxuICAgICAgICB9XHJcbiAgICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiAnbGl0ZXJhbCcsIHZhbHVlLCBsaW5lOiBzdGFydExpbmUsIGNvbHVtbjogc3RhcnRDb2wgfSk7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElkZW50aWZpZXIgb3Iga2V5d29yZFxyXG4gICAgICBpZiAoL1thLXpBLVpfXS8udGVzdChjaCkpIHtcclxuICAgICAgICBjb25zdCBzdGFydExpbmUgPSBsaW5lTnVtO1xyXG4gICAgICAgIGNvbnN0IHN0YXJ0Q29sID0gY29sTnVtO1xyXG4gICAgICAgIGxldCB2YWx1ZSA9ICcnO1xyXG4gICAgICAgIHdoaWxlIChpIDwgc291cmNlQ29kZS5sZW5ndGggJiYgL1thLXpBLVowLTlfXS8udGVzdChzb3VyY2VDb2RlW2ldKSkge1xyXG4gICAgICAgICAgdmFsdWUgKz0gc291cmNlQ29kZVtpXTtcclxuICAgICAgICAgIGkrKztcclxuICAgICAgICAgIGNvbE51bSsrO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0b2tlbnMucHVzaCh7XHJcbiAgICAgICAgICB0eXBlOiBrZXl3b3Jkcy5oYXModmFsdWUpID8gJ2tleXdvcmQnIDogJ2lkZW50aWZpZXInLFxyXG4gICAgICAgICAgdmFsdWUsXHJcbiAgICAgICAgICBsaW5lOiBzdGFydExpbmUsXHJcbiAgICAgICAgICBjb2x1bW46IHN0YXJ0Q29sLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBPcGVyYXRvcnMgYW5kIHB1bmN0dWF0aW9uXHJcbiAgICAgIGlmICgvWytcXC0qLyU9PD4hJnxefj86OywuKClcXFtcXF17fV0vLnRlc3QoY2gpKSB7XHJcbiAgICAgICAgY29uc3Qgc3RhcnRMaW5lID0gbGluZU51bTtcclxuICAgICAgICBjb25zdCBzdGFydENvbCA9IGNvbE51bTtcclxuICAgICAgICAvLyBUcnkgdHdvLWNoYXIgb3BlcmF0b3JzXHJcbiAgICAgICAgY29uc3QgdHdvQ2hhciA9IHNvdXJjZUNvZGUuc2xpY2UoaSwgaSArIDIpO1xyXG4gICAgICAgIGNvbnN0IHR3b0NoYXJPcHMgPSBbJz09JywgJyE9JywgJzw9JywgJz49JywgJyYmJywgJ3x8JywgJysrJywgJy0tJywgJys9JywgJy09JyxcclxuICAgICAgICAgICcqPScsICcvPScsICclPScsICcmPScsICd8PScsICdePScsICc8PCcsICc+PicsICctPicsICc6OicsICcuLi4nXTtcclxuICAgICAgICBpZiAodHdvQ2hhck9wcy5pbmNsdWRlcyh0d29DaGFyKSkge1xyXG4gICAgICAgICAgdG9rZW5zLnB1c2goeyB0eXBlOiAnb3BlcmF0b3InLCB2YWx1ZTogdHdvQ2hhciwgbGluZTogc3RhcnRMaW5lLCBjb2x1bW46IHN0YXJ0Q29sIH0pO1xyXG4gICAgICAgICAgaSArPSAyO1xyXG4gICAgICAgICAgY29sTnVtICs9IDI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRva2Vucy5wdXNoKHsgdHlwZTogJ29wZXJhdG9yJywgdmFsdWU6IGNoLCBsaW5lOiBzdGFydExpbmUsIGNvbHVtbjogc3RhcnRDb2wgfSk7XHJcbiAgICAgICAgICBpKys7XHJcbiAgICAgICAgICBjb2xOdW0rKztcclxuICAgICAgICB9XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNraXAgd2hpdGVzcGFjZVxyXG4gICAgICBpKys7XHJcbiAgICAgIGNvbE51bSsrO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0b2tlbnM7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGV4dHJhY3RGdW5jdGlvbnMobGluZXM6IHN0cmluZ1tdKTogRnVuY3Rpb25EZWZbXSB7XHJcbiAgICBjb25zdCBmdW5jdGlvbnM6IEZ1bmN0aW9uRGVmW10gPSBbXTtcclxuXHJcbiAgICAvLyBNYXRjaCBmdW5jdGlvbiBkZWZpbml0aW9uczogcmV0dXJuVHlwZSBuYW1lKHBhcmFtcykge1xyXG4gICAgLy8gSGFuZGxlczogaW50IGZvbyhpbnQgYSwgY2hhciBiKSwgdm9pZCBiYXIoKSwgc3RhdGljIGludCBiYXoodm9pZClcclxuICAgIGNvbnN0IGZ1bmNSZWdleCA9IC9eKD86KD86c3RhdGljfGlubGluZXxleHRlcm58dmlydHVhbHxleHBsaWNpdHxjb25zdGV4cHJ8b3ZlcnJpZGV8ZmluYWwpXFxzKykqKFthLXpBLVpfXVtcXHc6KiZcXHNdKj8pXFxzKyhbYS16QS1aX11cXHcqKVxccypcXCgoW14pXSopXFwpXFxzKig/OmNvbnN0XFxzKik/KD86bm9leGNlcHRcXHMqKT8oPzpvdmVycmlkZVxccyopPyg/OmZpbmFsXFxzKik/KD86LT4uKj8pP1xccyooPzpcXHsoPzpcXH0pPyk/XFxzKiQvO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuXHJcbiAgICAgIC8vIFNraXAgcHJlcHJvY2Vzc29yLCBjb21tZW50cywgYW5kIHB1cmUgZGVjbGFyYXRpb25zIChlbmRpbmcgd2l0aCA7KVxyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcjJykgfHwgbGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuZW5kc1dpdGgoJzsnKSkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goZnVuY1JlZ2V4KTtcclxuICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgY29uc3QgcmV0dXJuVHlwZSA9IG1hdGNoWzFdLnRyaW0oKTtcclxuICAgICAgICBjb25zdCBuYW1lID0gbWF0Y2hbMl0udHJpbSgpO1xyXG4gICAgICAgIGNvbnN0IHBhcmFtc1N0ciA9IG1hdGNoWzNdLnRyaW0oKTtcclxuXHJcbiAgICAgICAgLy8gU2tpcCBpZiBsb29rcyBsaWtlIGEgY29udHJvbCBmbG93IHN0YXRlbWVudFxyXG4gICAgICAgIGlmIChbJ2lmJywgJ2ZvcicsICd3aGlsZScsICdzd2l0Y2gnLCAnY2F0Y2gnXS5pbmNsdWRlcyhuYW1lKSkgY29udGludWU7XHJcbiAgICAgICAgLy8gU2tpcCBpZiByZXR1cm4gdHlwZSBpcyBlbXB0eSBvciBsb29rcyB3cm9uZ1xyXG4gICAgICAgIGlmICghcmV0dXJuVHlwZSB8fCByZXR1cm5UeXBlID09PSAncmV0dXJuJyB8fCByZXR1cm5UeXBlID09PSAnZWxzZScpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICBjb25zdCBwYXJhbXMgPSBwYXJhbXNTdHJcclxuICAgICAgICAgID8gcGFyYW1zU3RyLnNwbGl0KCcsJykubWFwKHAgPT4gcC50cmltKCkpLmZpbHRlcihwID0+IHAgJiYgcCAhPT0gJ3ZvaWQnKVxyXG4gICAgICAgICAgOiBbXTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb25zLnB1c2goeyBuYW1lLCBsaW5lOiBpICsgMSwgcGFyYW1zLCByZXR1cm5UeXBlIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZ1bmN0aW9ucztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZXh0cmFjdFZhcmlhYmxlcyhsaW5lczogc3RyaW5nW10pOiBWYXJpYWJsZURlY2xbXSB7XHJcbiAgICBjb25zdCB2YXJpYWJsZXM6IFZhcmlhYmxlRGVjbFtdID0gW107XHJcblxyXG4gICAgLy8gTWF0Y2ggdmFyaWFibGUgZGVjbGFyYXRpb25zOiB0eXBlIG5hbWU7IG9yIHR5cGUgbmFtZSA9IHZhbHVlO1xyXG4gICAgLy8gSGFuZGxlczogaW50IHg7IGNoYXIqIHAgPSBOVUxMOyBzdGF0aWMgZmxvYXQgZiA9IDEuMGY7XHJcbiAgICBjb25zdCB2YXJSZWdleCA9IC9eKD86KD86c3RhdGljfGV4dGVybnxjb25zdHx2b2xhdGlsZXxyZWdpc3RlcnxtdXRhYmxlKVxccyspKihbYS16QS1aX11bXFx3Ol0qKD86XFxzKlsqJl0rKT8pXFxzKyhbYS16QS1aX11cXHcqKVxccyooPzo9Lio/KT87XFxzKiQvO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuXHJcbiAgICAgIC8vIFNraXAgcHJlcHJvY2Vzc29yLCBjb21tZW50cywgYW5kIGZ1bmN0aW9uLWxpa2UgbGluZXNcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLmluY2x1ZGVzKCcoJykpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKHZhclJlZ2V4KTtcclxuICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgY29uc3QgdHlwZSA9IG1hdGNoWzFdLnRyaW0oKTtcclxuICAgICAgICBjb25zdCBuYW1lID0gbWF0Y2hbMl0udHJpbSgpO1xyXG5cclxuICAgICAgICAvLyBTa2lwIGtleXdvcmRzIHRoYXQgbG9vayBsaWtlIHR5cGVzIGJ1dCBhcmVuJ3QgdmFyaWFibGUgZGVjbGFyYXRpb25zXHJcbiAgICAgICAgY29uc3Qgc2tpcFR5cGVzID0gWydyZXR1cm4nLCAnYnJlYWsnLCAnY29udGludWUnLCAnZ290bycsICdjYXNlJywgJ2RlZmF1bHQnXTtcclxuICAgICAgICBpZiAoc2tpcFR5cGVzLmluY2x1ZGVzKHR5cGUpIHx8IHNraXBUeXBlcy5pbmNsdWRlcyhuYW1lKSkgY29udGludWU7XHJcblxyXG4gICAgICAgIHZhcmlhYmxlcy5wdXNoKHsgbmFtZSwgdHlwZSwgbGluZTogaSArIDEgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFyaWFibGVzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBkZXRlY3RTeW50YXhFcnJvcnMoc291cmNlQ29kZTogc3RyaW5nLCBsaW5lczogc3RyaW5nW10pOiBTeW50YXhFcnJvcltdIHtcclxuICAgIGNvbnN0IGVycm9yczogU3ludGF4RXJyb3JbXSA9IFtdO1xyXG5cclxuICAgIC8vIENoZWNrIHVubWF0Y2hlZCBicmFjZXNcclxuICAgIGNvbnN0IGJyYWNlRXJyb3JzID0gdGhpcy5jaGVja1VubWF0Y2hlZEJyYWNlcyhzb3VyY2VDb2RlLCBsaW5lcyk7XHJcbiAgICBlcnJvcnMucHVzaCguLi5icmFjZUVycm9ycyk7XHJcblxyXG4gICAgLy8gQ2hlY2sgdW5tYXRjaGVkIHBhcmVudGhlc2VzXHJcbiAgICBjb25zdCBwYXJlbkVycm9ycyA9IHRoaXMuY2hlY2tVbm1hdGNoZWRQYXJlbnRoZXNlcyhzb3VyY2VDb2RlLCBsaW5lcyk7XHJcbiAgICBlcnJvcnMucHVzaCguLi5wYXJlbkVycm9ycyk7XHJcblxyXG4gICAgcmV0dXJuIGVycm9ycztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2hlY2tVbm1hdGNoZWRCcmFjZXMoc291cmNlQ29kZTogc3RyaW5nLCBsaW5lczogc3RyaW5nW10pOiBTeW50YXhFcnJvcltdIHtcclxuICAgIGNvbnN0IGVycm9yczogU3ludGF4RXJyb3JbXSA9IFtdO1xyXG4gICAgY29uc3Qgc3RhY2s6IHsgY2hhcjogc3RyaW5nOyBsaW5lOiBudW1iZXIgfVtdID0gW107XHJcbiAgICBsZXQgaW5TdHJpbmcgPSBmYWxzZTtcclxuICAgIGxldCBpbkNoYXIgPSBmYWxzZTtcclxuICAgIGxldCBpbkxpbmVDb21tZW50ID0gZmFsc2U7XHJcbiAgICBsZXQgaW5CbG9ja0NvbW1lbnQgPSBmYWxzZTtcclxuICAgIGxldCBsaW5lTnVtID0gMTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNvdXJjZUNvZGUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgY2ggPSBzb3VyY2VDb2RlW2ldO1xyXG4gICAgICBjb25zdCBuZXh0ID0gc291cmNlQ29kZVtpICsgMV07XHJcblxyXG4gICAgICBpZiAoY2ggPT09ICdcXG4nKSB7XHJcbiAgICAgICAgbGluZU51bSsrO1xyXG4gICAgICAgIGluTGluZUNvbW1lbnQgPSBmYWxzZTtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGluTGluZUNvbW1lbnQpIGNvbnRpbnVlO1xyXG4gICAgICBpZiAoaW5CbG9ja0NvbW1lbnQpIHtcclxuICAgICAgICBpZiAoY2ggPT09ICcqJyAmJiBuZXh0ID09PSAnLycpIHsgaW5CbG9ja0NvbW1lbnQgPSBmYWxzZTsgaSsrOyB9XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghaW5TdHJpbmcgJiYgIWluQ2hhcikge1xyXG4gICAgICAgIGlmIChjaCA9PT0gJy8nICYmIG5leHQgPT09ICcvJykgeyBpbkxpbmVDb21tZW50ID0gdHJ1ZTsgY29udGludWU7IH1cclxuICAgICAgICBpZiAoY2ggPT09ICcvJyAmJiBuZXh0ID09PSAnKicpIHsgaW5CbG9ja0NvbW1lbnQgPSB0cnVlOyBpKys7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgaWYgKGNoID09PSAnXCInKSB7IGluU3RyaW5nID0gdHJ1ZTsgY29udGludWU7IH1cclxuICAgICAgICBpZiAoY2ggPT09ICdcXCcnKSB7IGluQ2hhciA9IHRydWU7IGNvbnRpbnVlOyB9XHJcbiAgICAgIH0gZWxzZSBpZiAoaW5TdHJpbmcpIHtcclxuICAgICAgICBpZiAoY2ggPT09ICdcXFxcJykgeyBpKys7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgaWYgKGNoID09PSAnXCInKSB7IGluU3RyaW5nID0gZmFsc2U7IH1cclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfSBlbHNlIGlmIChpbkNoYXIpIHtcclxuICAgICAgICBpZiAoY2ggPT09ICdcXFxcJykgeyBpKys7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgaWYgKGNoID09PSAnXFwnJykgeyBpbkNoYXIgPSBmYWxzZTsgfVxyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoY2ggPT09ICd7Jykge1xyXG4gICAgICAgIHN0YWNrLnB1c2goeyBjaGFyOiAneycsIGxpbmU6IGxpbmVOdW0gfSk7XHJcbiAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICd9Jykge1xyXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPT09IDAgfHwgc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0uY2hhciAhPT0gJ3snKSB7XHJcbiAgICAgICAgICBlcnJvcnMucHVzaCh7IG1lc3NhZ2U6IGBVbm1hdGNoZWQgY2xvc2luZyBicmFjZSAnfSdgLCBsaW5lOiBsaW5lTnVtIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBzdGFjay5wb3AoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmb3IgKGNvbnN0IHVubWF0Y2hlZCBvZiBzdGFjaykge1xyXG4gICAgICBlcnJvcnMucHVzaCh7IG1lc3NhZ2U6IGBVbm1hdGNoZWQgb3BlbmluZyBicmFjZSAneydgLCBsaW5lOiB1bm1hdGNoZWQubGluZSB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZXJyb3JzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjaGVja1VubWF0Y2hlZFBhcmVudGhlc2VzKHNvdXJjZUNvZGU6IHN0cmluZywgbGluZXM6IHN0cmluZ1tdKTogU3ludGF4RXJyb3JbXSB7XHJcbiAgICBjb25zdCBlcnJvcnM6IFN5bnRheEVycm9yW10gPSBbXTtcclxuICAgIGNvbnN0IHN0YWNrOiB7IGNoYXI6IHN0cmluZzsgbGluZTogbnVtYmVyIH1bXSA9IFtdO1xyXG4gICAgbGV0IGluU3RyaW5nID0gZmFsc2U7XHJcbiAgICBsZXQgaW5DaGFyID0gZmFsc2U7XHJcbiAgICBsZXQgaW5MaW5lQ29tbWVudCA9IGZhbHNlO1xyXG4gICAgbGV0IGluQmxvY2tDb21tZW50ID0gZmFsc2U7XHJcbiAgICBsZXQgbGluZU51bSA9IDE7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzb3VyY2VDb2RlLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGNoID0gc291cmNlQ29kZVtpXTtcclxuICAgICAgY29uc3QgbmV4dCA9IHNvdXJjZUNvZGVbaSArIDFdO1xyXG5cclxuICAgICAgaWYgKGNoID09PSAnXFxuJykge1xyXG4gICAgICAgIGxpbmVOdW0rKztcclxuICAgICAgICBpbkxpbmVDb21tZW50ID0gZmFsc2U7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChpbkxpbmVDb21tZW50KSBjb250aW51ZTtcclxuICAgICAgaWYgKGluQmxvY2tDb21tZW50KSB7XHJcbiAgICAgICAgaWYgKGNoID09PSAnKicgJiYgbmV4dCA9PT0gJy8nKSB7IGluQmxvY2tDb21tZW50ID0gZmFsc2U7IGkrKzsgfVxyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoIWluU3RyaW5nICYmICFpbkNoYXIpIHtcclxuICAgICAgICBpZiAoY2ggPT09ICcvJyAmJiBuZXh0ID09PSAnLycpIHsgaW5MaW5lQ29tbWVudCA9IHRydWU7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgaWYgKGNoID09PSAnLycgJiYgbmV4dCA9PT0gJyonKSB7IGluQmxvY2tDb21tZW50ID0gdHJ1ZTsgaSsrOyBjb250aW51ZTsgfVxyXG4gICAgICAgIGlmIChjaCA9PT0gJ1wiJykgeyBpblN0cmluZyA9IHRydWU7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgaWYgKGNoID09PSAnXFwnJykgeyBpbkNoYXIgPSB0cnVlOyBjb250aW51ZTsgfVxyXG4gICAgICB9IGVsc2UgaWYgKGluU3RyaW5nKSB7XHJcbiAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHsgaSsrOyBjb250aW51ZTsgfVxyXG4gICAgICAgIGlmIChjaCA9PT0gJ1wiJykgeyBpblN0cmluZyA9IGZhbHNlOyB9XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH0gZWxzZSBpZiAoaW5DaGFyKSB7XHJcbiAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHsgaSsrOyBjb250aW51ZTsgfVxyXG4gICAgICAgIGlmIChjaCA9PT0gJ1xcJycpIHsgaW5DaGFyID0gZmFsc2U7IH1cclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGNoID09PSAnKCcpIHtcclxuICAgICAgICBzdGFjay5wdXNoKHsgY2hhcjogJygnLCBsaW5lOiBsaW5lTnVtIH0pO1xyXG4gICAgICB9IGVsc2UgaWYgKGNoID09PSAnKScpIHtcclxuICAgICAgICBpZiAoc3RhY2subGVuZ3RoID09PSAwIHx8IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdLmNoYXIgIT09ICcoJykge1xyXG4gICAgICAgICAgZXJyb3JzLnB1c2goeyBtZXNzYWdlOiBgVW5tYXRjaGVkIGNsb3NpbmcgcGFyZW50aGVzaXMgJyknYCwgbGluZTogbGluZU51bSB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgc3RhY2sucG9wKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZm9yIChjb25zdCB1bm1hdGNoZWQgb2Ygc3RhY2spIHtcclxuICAgICAgZXJyb3JzLnB1c2goeyBtZXNzYWdlOiBgVW5tYXRjaGVkIG9wZW5pbmcgcGFyZW50aGVzaXMgJygnYCwgbGluZTogdW5tYXRjaGVkLmxpbmUgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVycm9ycztcclxuICB9XHJcblxyXG4gIGdldExhbmd1YWdlRXh0ZW5zaW9uKGxhbmd1YWdlOiBMYW5ndWFnZSk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gbGFuZ3VhZ2UgPT09IExhbmd1YWdlLkMgPyAnYycgOiAnY3BwJztcclxuICB9XHJcbn1cclxuIl19
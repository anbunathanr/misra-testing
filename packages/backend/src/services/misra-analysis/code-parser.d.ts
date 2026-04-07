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
export declare class CodeParser {
    parse(sourceCode: string, language: Language): Promise<AST>;
    private extractIncludes;
    private extractMacros;
    private tokenize;
    private extractFunctions;
    private extractVariables;
    private detectSyntaxErrors;
    private checkUnmatchedBraces;
    private checkUnmatchedParentheses;
    getLanguageExtension(language: Language): string;
}

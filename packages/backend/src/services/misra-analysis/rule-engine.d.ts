import { Language, Violation } from '../../types/misra-analysis';
import { AST, Token, FunctionDef } from './code-parser';
import { RuleConfig, RuleProfile } from './rule-config';
export interface MISRARule {
    id: string;
    description: string;
    severity: 'mandatory' | 'required' | 'advisory';
    category: string;
    language: 'C' | 'CPP' | 'BOTH';
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare function createViolation(rule: MISRARule, line: number, column: number, message: string, codeSnippet: string): Violation;
export declare function findTokensByType(ast: AST, type: Token['type']): Token[];
export declare function findTokensByValue(ast: AST, value: string): Token[];
export declare function findKeywords(ast: AST, keywords: string[]): Token[];
export declare function findFunctions(ast: AST): FunctionDef[];
export declare function findFunctionsByName(ast: AST, predicate: (name: string) => boolean): FunctionDef[];
export declare function findIdentifiers(ast: AST): Token[];
export declare function getSourceLine(ast: AST, lineNumber: number): string;
export declare class RuleEngine {
    private rules;
    registerRule(rule: MISRARule): void;
    getRule(id: string): MISRARule | undefined;
    getRuleCount(): number;
    getRulesForLanguage(language: Language): MISRARule[];
    getEnabledRules(language: Language, profile: RuleProfile): MISRARule[];
    getConfiguredRules(language: Language, config: RuleConfig): MISRARule[];
    loadRules(): void;
}

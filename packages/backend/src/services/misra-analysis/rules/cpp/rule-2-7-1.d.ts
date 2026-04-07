import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 2-7-1
 * The character sequence /* shall not be used within a C-style comment.
 * Also: Trigraphs shall not be used.
 * Detects trigraph sequences like ??=, ??/, ??', etc.
 */
export declare class Rule_CPP_2_7_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    private readonly trigraphs;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

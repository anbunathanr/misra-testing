import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 9.1
 * The value of an object with automatic storage duration shall not be read
 * before it has been set.
 * Detects variable declarations without initialization.
 */
export declare class Rule_C_9_1 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    private readonly typeKeywords;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

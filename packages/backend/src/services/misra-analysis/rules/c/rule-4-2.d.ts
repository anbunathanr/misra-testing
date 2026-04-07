import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 4.2
 * Trigraphs should not be used.
 */
export declare class Rule_C_4_2 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    private readonly trigraphs;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

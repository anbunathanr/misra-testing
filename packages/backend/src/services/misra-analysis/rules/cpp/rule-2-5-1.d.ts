import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 2-5-1
 * Digraphs shall not be used.
 * Detects digraph sequences which can reduce code clarity.
 */
export declare class Rule_CPP_2_5_1 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

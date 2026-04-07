import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 10.5
 * The value of an expression should not be cast to an inappropriate essential type.
 */
export declare class Rule_C_10_5 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

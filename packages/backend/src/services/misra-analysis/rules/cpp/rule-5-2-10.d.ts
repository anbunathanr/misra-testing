import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 5-2-10
 * The increment (++) and decrement (--) operators should not be mixed with other operators in an expression.
 */
export declare class Rule_CPP_5_2_10 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

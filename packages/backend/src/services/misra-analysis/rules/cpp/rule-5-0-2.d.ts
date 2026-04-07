import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 5-0-2
 * Limited dependence should be placed on C++ operator precedence rules in expressions.
 */
export declare class Rule_CPP_5_0_2 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 6-5-1
 * A for loop shall contain a single loop-counter which shall not have floating-point type.
 * Detects modification of loop counter within the loop body.
 */
export declare class Rule_CPP_6_5_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

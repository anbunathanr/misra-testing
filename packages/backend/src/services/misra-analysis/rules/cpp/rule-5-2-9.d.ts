import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 5-2-9
 * A cast should not convert a pointer type to an integral type.
 */
export declare class Rule_CPP_5_2_9 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

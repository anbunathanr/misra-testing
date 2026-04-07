import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 0-1-2
 * A project shall not contain infeasible paths.
 * Detects non-reachable code (statements after return/break/continue/throw).
 */
export declare class Rule_CPP_0_1_2 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    private readonly terminators;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

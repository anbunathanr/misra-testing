import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 2.1
 * A project shall not contain unreachable code.
 * Detects statements after return/break/continue/goto at the same block level.
 */
export declare class Rule_C_2_1 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    private readonly terminators;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

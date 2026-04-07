import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 15.3
 * Any label referenced by a goto statement shall be declared in the same block,
 * or in any block enclosing the goto statement.
 * Detects goto jumping to a label that is not in the same or enclosing block.
 */
export declare class Rule_C_15_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

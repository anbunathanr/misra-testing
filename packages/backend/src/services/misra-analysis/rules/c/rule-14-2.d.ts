import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 14.2
 * A for loop shall be well-formed.
 * Detects for loops that don't follow the standard pattern:
 * for (init; condition; update) where each clause is present.
 */
export declare class Rule_C_14_2 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

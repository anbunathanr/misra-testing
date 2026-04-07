import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 10.3
 * The value of an expression shall not be assigned to an object with a
 * narrower essential type or of a different essential type category.
 * Detects assignment of wider type (long) to narrower type (int).
 */
export declare class Rule_C_10_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

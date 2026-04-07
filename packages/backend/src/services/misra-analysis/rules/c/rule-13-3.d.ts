import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 13.3
 * A full expression containing an increment (++) or decrement (--) operator
 * should have no other potential side effects other than that caused by the
 * increment or decrement operator.
 * Detects ++ or -- used as sub-expressions (e.g., a = b++).
 */
export declare class Rule_C_13_3 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

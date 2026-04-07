import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 17.7
 * The value returned by a function having non-void return type shall be used.
 * Detects function calls whose return values are discarded.
 */
export declare class Rule_C_17_7 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    private readonly nonVoidFunctions;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

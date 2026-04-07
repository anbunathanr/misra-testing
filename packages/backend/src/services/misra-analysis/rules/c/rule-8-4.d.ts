import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 8.4
 * A compatible declaration shall be visible when an object or function with
 * external linkage is defined.
 * Detects function definitions without a prior prototype declaration.
 */
export declare class Rule_C_8_4 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

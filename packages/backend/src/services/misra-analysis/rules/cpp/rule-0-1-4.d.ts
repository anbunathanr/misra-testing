import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 0-1-4
 * A project shall not contain non-volatile POD variables having only one use.
 * Detects variables that are assigned once but never read.
 */
export declare class Rule_CPP_0_1_4 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

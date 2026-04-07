import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 0-1-7
 * The value returned by a function having a non-void return type shall always be used.
 * Detects function calls where the return value is discarded.
 */
export declare class Rule_CPP_0_1_7 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

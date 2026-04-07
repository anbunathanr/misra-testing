import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 13.4
 * The result of an assignment operator shall not be used.
 * Detects assignment operators used as sub-expressions (e.g., if (x = y)).
 */
export declare class Rule_C_13_4 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

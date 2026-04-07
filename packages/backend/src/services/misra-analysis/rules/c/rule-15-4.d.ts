import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 15.4
 * There shall be no more than one break or goto statement used to terminate
 * any iteration statement.
 * Detects multiple break statements in a single loop.
 */
export declare class Rule_C_15_4 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

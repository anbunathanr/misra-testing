import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 14.4
 * The controlling expression of an if statement and the controlling expression
 * of an iteration-statement shall have essentially Boolean type.
 * Detects if conditions that are not boolean comparisons.
 */
export declare class Rule_C_14_4 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

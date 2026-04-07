import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 22.1
 * All resources obtained dynamically by means of Standard Library functions
 * shall be explicitly released.
 * Detects fopen() calls without a corresponding fclose().
 */
export declare class Rule_C_22_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

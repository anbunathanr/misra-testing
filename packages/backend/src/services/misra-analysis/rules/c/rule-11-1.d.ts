import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 11.1
 * Conversions shall not be performed between a pointer to a function and
 * any other type.
 * Detects casts involving function pointer types.
 */
export declare class Rule_C_11_1 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 11.3
 * A cast shall not be performed between a pointer to object type and a
 * pointer to a different object type.
 * Detects C-style casts between pointer types.
 */
export declare class Rule_C_11_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

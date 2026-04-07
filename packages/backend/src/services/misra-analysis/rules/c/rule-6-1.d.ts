import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 6.1
 * Bit-fields shall only be declared with an appropriate type.
 */
export declare class Rule_C_6_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    private readonly allowedTypes;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

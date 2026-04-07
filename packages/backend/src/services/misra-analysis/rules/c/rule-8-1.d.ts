import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 8.1
 * Types shall be explicitly specified.
 * Detects implicit int (old-style C function declarations without explicit return type).
 */
export declare class Rule_C_8_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    private readonly typeKeywords;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

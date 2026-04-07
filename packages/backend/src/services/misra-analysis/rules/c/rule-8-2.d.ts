import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 8.2
 * Function types shall be in prototype form with named parameters.
 * Detects function declarations where parameters are types without names.
 */
export declare class Rule_C_8_2 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    private readonly typeKeywords;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

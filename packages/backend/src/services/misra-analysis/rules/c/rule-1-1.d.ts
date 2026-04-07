import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 1.1
 * All code shall conform to ISO 9899:2011 C standard.
 * Detects use of non-standard compiler extensions.
 */
export declare class Rule_C_1_1 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    private readonly nonStandardExtensions;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

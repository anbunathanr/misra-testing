import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 20.9
 * All macros used in #if or #elif preprocessing directives shall be defined
 * before use.
 * Detects macros used in #if/#elif that are not defined before that point.
 */
export declare class Rule_C_20_9 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

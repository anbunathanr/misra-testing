import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 22.2
 * A block of memory shall only be freed if it was allocated by means of a
 * Standard Library function.
 * Detects free() calls on variables that were not allocated with malloc/calloc/realloc.
 */
export declare class Rule_C_22_2 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

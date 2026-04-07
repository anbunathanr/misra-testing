import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 21.3
 * The memory allocation and deallocation functions of <stdlib.h> shall not be used.
 * Detects use of malloc, calloc, realloc, free.
 */
export declare class Rule_C_21_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    private readonly forbiddenFunctions;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

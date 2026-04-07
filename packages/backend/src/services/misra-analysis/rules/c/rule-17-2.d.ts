import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 17.2
 * Functions shall not call themselves, either directly or indirectly.
 */
export declare class Rule_C_17_2 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 21.6
 * The Standard Library input/output functions shall not be used.
 * Detects use of printf, scanf, fprintf, fscanf, sprintf, sscanf, etc.
 */
export declare class Rule_C_21_6 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    private readonly forbiddenFunctions;
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C:2012 Rule 2.3
 * A project should not contain unused type declarations.
 */
export declare class Rule_C_2_3 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

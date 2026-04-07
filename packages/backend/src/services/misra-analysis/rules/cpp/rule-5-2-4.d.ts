import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 5-2-4
 * C-style casts (other than void casts) and functional notation casts (other than explicit constructor calls) shall not be used.
 */
export declare class Rule_CPP_5_2_4 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

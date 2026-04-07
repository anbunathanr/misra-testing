import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 3-1-3
 * It shall be possible to include any header file in multiple translation units without violating the One Definition Rule.
 * Detects missing include guards.
 */
export declare class Rule_CPP_3_1_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

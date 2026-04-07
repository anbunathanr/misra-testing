import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 6-2-1
 * Assignment operators shall not be used in sub-expressions.
 * Detects assignment operators (=, +=, -=, etc.) used within larger expressions.
 */
export declare class Rule_CPP_6_2_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

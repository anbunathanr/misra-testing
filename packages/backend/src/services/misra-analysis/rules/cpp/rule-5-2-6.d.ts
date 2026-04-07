import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 5-2-6
 * A cast shall not convert a pointer to a function to any other pointer type,
 * including a pointer to function type.
 * Detects C-style casts (type) expression.
 */
export declare class Rule_CPP_5_2_6 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

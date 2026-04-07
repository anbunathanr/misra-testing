import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 3-9-1
 * The types used for an object, a function return type, or a function parameter
 * shall be token-for-token identical in all declarations and re-declarations.
 * Detects inconsistent typedef usage (same name redefined to different type).
 */
export declare class Rule_CPP_3_9_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

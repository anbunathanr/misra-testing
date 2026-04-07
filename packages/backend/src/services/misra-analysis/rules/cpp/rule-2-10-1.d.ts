import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 2-10-1
 * Different identifiers shall be typographically unambiguous.
 * Detects identifiers starting with underscore (reserved) and identifiers that differ only in case.
 */
export declare class Rule_CPP_2_10_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

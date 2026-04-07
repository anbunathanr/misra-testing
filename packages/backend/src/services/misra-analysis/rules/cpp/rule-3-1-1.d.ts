import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 3-1-1
 * It shall be possible to include any header file in multiple translation units
 * without violating the one definition rule.
 * Detects multiple declarations on one line (e.g., `int a, b;`).
 */
export declare class Rule_CPP_3_1_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

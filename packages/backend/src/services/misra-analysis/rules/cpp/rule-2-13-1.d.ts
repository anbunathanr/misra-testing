import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 2-13-1
 * Only those escape sequences that are defined in ISO/IEC 14882:2003 shall be used.
 * Detects invalid or non-standard escape sequences.
 */
export declare class Rule_CPP_2_13_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

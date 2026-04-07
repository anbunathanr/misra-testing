import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 1-0-1
 * All code shall conform to ISO/IEC 14882:2003 "The C++ Standard Incorporating Technical Corrigendum 1"
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
export declare class Rule_CPP_1_0_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 12-1-2
 * All constructors of a class should explicitly call a constructor for all of its immediate base classes and all virtual base classes
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
export declare class Rule_CPP_12_1_2 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

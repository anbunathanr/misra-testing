import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 6-4-1
 * An if (condition) construct shall be followed by a compound statement.
 * The else keyword shall be followed by either a compound statement, or another if statement.
 * Also checks: A switch statement shall have at least two case clauses.
 */
export declare class Rule_CPP_6_4_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 2-13-2
 * Octal constants (other than zero) and octal escape sequences shall not be used.
 * Detects octal literals which can be confusing.
 */
export declare class Rule_CPP_2_13_2 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

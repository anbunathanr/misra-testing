import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 2-13-3
 * A "U" suffix shall be applied to all octal or hexadecimal integer literals of unsigned type.
 * Ensures unsigned literals are explicitly marked.
 */
export declare class Rule_CPP_2_13_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

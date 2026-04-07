import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 0-1-6
 * A project shall not contain instances of non-volatile variables being given values that are never subsequently used.
 * Detects dead stores - assignments that are overwritten before being read.
 */
export declare class Rule_CPP_0_1_6 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

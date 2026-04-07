import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
/**
 * MISRA C++:2008 Rule 15-0-3
 * Control shall not be transferred into a try or catch block using a goto or a switch statement.
 * Detects goto or switch that jumps into try/catch blocks.
 */
export declare class Rule_CPP_15_0_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "CPP";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

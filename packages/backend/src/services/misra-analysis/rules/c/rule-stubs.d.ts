/**
 * Stub implementations for P3/P4 MISRA C rules
 * These provide the basic structure and can be enhanced with full detection logic as needed
 */
import { MISRARule } from '../../rule-engine';
import { AST } from '../../code-parser';
import { Violation } from '../../../../types/misra-analysis';
export declare class Rule_C_12_5 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_13_7 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_15_6 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_15_7 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_17_4 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_17_5 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_17_6 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_17_8 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_18_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_18_2 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_18_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_18_4 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_18_5 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_18_6 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_18_7 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_18_8 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_19_1 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_19_2 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_1 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_2 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_5 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_6 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_7 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_8 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_10 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_11 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_12 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_13 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_20_14 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_1 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_2 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_4 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_5 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_7 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_8 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_9 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_10 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_11 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_12 implements MISRARule {
    id: string;
    description: string;
    severity: "advisory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_13 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_14 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_15 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_16 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_17 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_18 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_19 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_20 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_21_21 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_22_3 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_22_4 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_22_5 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_22_6 implements MISRARule {
    id: string;
    description: string;
    severity: "mandatory";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_22_7 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_22_8 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_22_9 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}
export declare class Rule_C_22_10 implements MISRARule {
    id: string;
    description: string;
    severity: "required";
    category: string;
    language: "C";
    check(ast: AST, sourceCode: string): Promise<Violation[]>;
}

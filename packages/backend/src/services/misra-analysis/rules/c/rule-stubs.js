"use strict";
/**
 * Stub implementations for P3/P4 MISRA C rules
 * These provide the basic structure and can be enhanced with full detection logic as needed
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_22_3 = exports.Rule_C_21_21 = exports.Rule_C_21_20 = exports.Rule_C_21_19 = exports.Rule_C_21_18 = exports.Rule_C_21_17 = exports.Rule_C_21_16 = exports.Rule_C_21_15 = exports.Rule_C_21_14 = exports.Rule_C_21_13 = exports.Rule_C_21_12 = exports.Rule_C_21_11 = exports.Rule_C_21_10 = exports.Rule_C_21_9 = exports.Rule_C_21_8 = exports.Rule_C_21_7 = exports.Rule_C_21_5 = exports.Rule_C_21_4 = exports.Rule_C_21_2 = exports.Rule_C_21_1 = exports.Rule_C_20_14 = exports.Rule_C_20_13 = exports.Rule_C_20_12 = exports.Rule_C_20_11 = exports.Rule_C_20_10 = exports.Rule_C_20_8 = exports.Rule_C_20_7 = exports.Rule_C_20_6 = exports.Rule_C_20_5 = exports.Rule_C_20_3 = exports.Rule_C_20_2 = exports.Rule_C_20_1 = exports.Rule_C_19_2 = exports.Rule_C_19_1 = exports.Rule_C_18_8 = exports.Rule_C_18_7 = exports.Rule_C_18_6 = exports.Rule_C_18_5 = exports.Rule_C_18_4 = exports.Rule_C_18_3 = exports.Rule_C_18_2 = exports.Rule_C_18_1 = exports.Rule_C_17_8 = exports.Rule_C_17_6 = exports.Rule_C_17_5 = exports.Rule_C_17_4 = exports.Rule_C_15_7 = exports.Rule_C_15_6 = exports.Rule_C_13_7 = exports.Rule_C_12_5 = void 0;
exports.Rule_C_22_10 = exports.Rule_C_22_9 = exports.Rule_C_22_8 = exports.Rule_C_22_7 = exports.Rule_C_22_6 = exports.Rule_C_22_5 = exports.Rule_C_22_4 = void 0;
// Rule 12.5
class Rule_C_12_5 {
    id = 'MISRA-C-12.5';
    description = 'The sizeof operator shall not have an operand which is a function parameter declared as "array of type"';
    severity = 'required';
    category = 'Expressions';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_12_5 = Rule_C_12_5;
// Rule 13.7
class Rule_C_13_7 {
    id = 'MISRA-C-13.7';
    description = 'Boolean operations whose results are invariant shall not be permitted';
    severity = 'required';
    category = 'Side effects';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_13_7 = Rule_C_13_7;
// Rule 15.6
class Rule_C_15_6 {
    id = 'MISRA-C-15.6';
    description = 'The body of an iteration-statement or a selection-statement shall be a compound-statement';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_15_6 = Rule_C_15_6;
// Rule 15.7
class Rule_C_15_7 {
    id = 'MISRA-C-15.7';
    description = 'All if...else if constructs shall be terminated with an else statement';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_15_7 = Rule_C_15_7;
// Rule 17.4
class Rule_C_17_4 {
    id = 'MISRA-C-17.4';
    description = 'All exit paths from a function with non-void return type shall have an explicit return statement with an expression';
    severity = 'mandatory';
    category = 'Functions';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_17_4 = Rule_C_17_4;
// Rule 17-5
class Rule_C_17_5 {
    id = 'MISRA-C-17.5';
    description = 'The function argument corresponding to a parameter declared to have an array type shall have an appropriate number of elements';
    severity = 'advisory';
    category = 'Functions';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_17_5 = Rule_C_17_5;
// Rule 17.6
class Rule_C_17_6 {
    id = 'MISRA-C-17.6';
    description = 'The declaration of an array parameter shall not contain the static keyword between the [ ]';
    severity = 'mandatory';
    category = 'Functions';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_17_6 = Rule_C_17_6;
// Rule 17.8
class Rule_C_17_8 {
    id = 'MISRA-C-17.8';
    description = 'A function parameter should not be modified';
    severity = 'advisory';
    category = 'Functions';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_17_8 = Rule_C_17_8;
// Rule 18.1
class Rule_C_18_1 {
    id = 'MISRA-C-18.1';
    description = 'A pointer resulting from arithmetic on a pointer operand shall address an element of the same array as that pointer operand';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_18_1 = Rule_C_18_1;
// Rule 18.2
class Rule_C_18_2 {
    id = 'MISRA-C-18.2';
    description = 'Subtraction between pointers shall only be applied to pointers that address elements of the same array';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_18_2 = Rule_C_18_2;
// Rule 18.3
class Rule_C_18_3 {
    id = 'MISRA-C-18.3';
    description = 'The relational operators >, >=, < and <= shall not be applied to objects of pointer type except where they point into the same object';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_18_3 = Rule_C_18_3;
// Rule 18.4
class Rule_C_18_4 {
    id = 'MISRA-C-18.4';
    description = 'The +, -, += and -= operators should not be applied to an expression of pointer type';
    severity = 'advisory';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_18_4 = Rule_C_18_4;
// Rule 18.5
class Rule_C_18_5 {
    id = 'MISRA-C-18.5';
    description = 'Declarations should contain no more than two levels of pointer nesting';
    severity = 'advisory';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_18_5 = Rule_C_18_5;
// Rule 18.6
class Rule_C_18_6 {
    id = 'MISRA-C-18.6';
    description = 'The address of an object with automatic storage shall not be copied to another object that persists after the first object has ceased to exist';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_18_6 = Rule_C_18_6;
// Rule 18.7
class Rule_C_18_7 {
    id = 'MISRA-C-18.7';
    description = 'Flexible array members shall not be declared';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_18_7 = Rule_C_18_7;
// Rule 18.8
class Rule_C_18_8 {
    id = 'MISRA-C-18.8';
    description = 'Variable-length array types shall not be used';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_18_8 = Rule_C_18_8;
// Rule 19.1
class Rule_C_19_1 {
    id = 'MISRA-C-19.1';
    description = 'An object shall not be assigned or copied to an overlapping object';
    severity = 'mandatory';
    category = 'Overlapping storage';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_19_1 = Rule_C_19_1;
// Rule 19.2
class Rule_C_19_2 {
    id = 'MISRA-C-19.2';
    description = 'The union keyword should not be used';
    severity = 'advisory';
    category = 'Overlapping storage';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_19_2 = Rule_C_19_2;
// Rule 20.1
class Rule_C_20_1 {
    id = 'MISRA-C-20.1';
    description = '#include directives should only be preceded by preprocessor directives or comments';
    severity = 'advisory';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_1 = Rule_C_20_1;
// Rule 20.2
class Rule_C_20_2 {
    id = 'MISRA-C-20.2';
    description = 'The \', " or \\ characters and the /* or // character sequences shall not occur in a header file name';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_2 = Rule_C_20_2;
// Rule 20.3
class Rule_C_20_3 {
    id = 'MISRA-C-20.3';
    description = 'The #include directive shall be followed by either a <filename> or "filename" sequence';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_3 = Rule_C_20_3;
// Rule 20.5
class Rule_C_20_5 {
    id = 'MISRA-C-20.5';
    description = '#undef should not be used';
    severity = 'advisory';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_5 = Rule_C_20_5;
// Rule 20.6
class Rule_C_20_6 {
    id = 'MISRA-C-20.6';
    description = 'Tokens that look like a preprocessing directive shall not occur within a macro argument';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_6 = Rule_C_20_6;
// Rule 20.7
class Rule_C_20_7 {
    id = 'MISRA-C-20.7';
    description = 'Expressions resulting from the expansion of macro parameters shall be enclosed in parentheses';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_7 = Rule_C_20_7;
// Rule 20.8
class Rule_C_20_8 {
    id = 'MISRA-C-20.8';
    description = 'The controlling expression of a #if or #elif preprocessing directive shall evaluate to 0 or 1';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_8 = Rule_C_20_8;
// Rule 20.10
class Rule_C_20_10 {
    id = 'MISRA-C-20.10';
    description = 'The # and ## preprocessor operators should not be used';
    severity = 'advisory';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_10 = Rule_C_20_10;
// Rule 20.11
class Rule_C_20_11 {
    id = 'MISRA-C-20.11';
    description = 'A macro parameter immediately following a # operator shall not immediately be followed by a ## operator';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_11 = Rule_C_20_11;
// Rule 20.12
class Rule_C_20_12 {
    id = 'MISRA-C-20.12';
    description = 'A macro parameter used as an operand to the # or ## operators, which is itself subject to further macro replacement, shall only be used as an operand to these operators';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_12 = Rule_C_20_12;
// Rule 20.13
class Rule_C_20_13 {
    id = 'MISRA-C-20.13';
    description = 'A line whose first token is # shall be a valid preprocessing directive';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_13 = Rule_C_20_13;
// Rule 20.14
class Rule_C_20_14 {
    id = 'MISRA-C-20.14';
    description = 'All #else, #elif and #endif preprocessor directives shall reside in the same file as the #if, #ifdef or #ifndef directive to which they are related';
    severity = 'required';
    category = 'Preprocessing';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_20_14 = Rule_C_20_14;
// Rule 21.1
class Rule_C_21_1 {
    id = 'MISRA-C-21.1';
    description = '#define and #undef shall not be used on a reserved identifier or reserved macro name';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_1 = Rule_C_21_1;
// Rule 21.2
class Rule_C_21_2 {
    id = 'MISRA-C-21.2';
    description = 'A reserved identifier or macro name shall not be declared';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_2 = Rule_C_21_2;
// Rule 21.4
class Rule_C_21_4 {
    id = 'MISRA-C-21.4';
    description = 'The standard header file <setjmp.h> shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_4 = Rule_C_21_4;
// Rule 21.5
class Rule_C_21_5 {
    id = 'MISRA-C-21.5';
    description = 'The standard header file <signal.h> shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_5 = Rule_C_21_5;
// Rule 21.7
class Rule_C_21_7 {
    id = 'MISRA-C-21.7';
    description = 'The atof, atoi, atol and atoll functions of <stdlib.h> shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_7 = Rule_C_21_7;
// Rule 21.8
class Rule_C_21_8 {
    id = 'MISRA-C-21.8';
    description = 'The library functions abort, exit and system of <stdlib.h> shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_8 = Rule_C_21_8;
// Rule 21.9
class Rule_C_21_9 {
    id = 'MISRA-C-21.9';
    description = 'The library functions bsearch and qsort of <stdlib.h> shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_9 = Rule_C_21_9;
// Rule 21.10
class Rule_C_21_10 {
    id = 'MISRA-C-21.10';
    description = 'The Standard Library time and date functions shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_10 = Rule_C_21_10;
// Rule 21.11
class Rule_C_21_11 {
    id = 'MISRA-C-21.11';
    description = 'The standard header file <tgmath.h> shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_11 = Rule_C_21_11;
// Rule 21.12
class Rule_C_21_12 {
    id = 'MISRA-C-21.12';
    description = 'The exception handling features of <fenv.h> should not be used';
    severity = 'advisory';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_12 = Rule_C_21_12;
// Rule 21.13
class Rule_C_21_13 {
    id = 'MISRA-C-21.13';
    description = 'Any value passed to a function in <ctype.h> shall be representable as an unsigned char or be the value EOF';
    severity = 'mandatory';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_13 = Rule_C_21_13;
// Rule 21.14
class Rule_C_21_14 {
    id = 'MISRA-C-21.14';
    description = 'The Standard Library function memcmp shall not be used to compare null terminated strings';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_14 = Rule_C_21_14;
// Rule 21.15
class Rule_C_21_15 {
    id = 'MISRA-C-21.15';
    description = 'The pointer arguments to the Standard Library functions memcpy, memmove and memcmp shall be pointers to qualified or unqualified versions of compatible types';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_15 = Rule_C_21_15;
// Rule 21.16
class Rule_C_21_16 {
    id = 'MISRA-C-21.16';
    description = 'The pointer arguments to the Standard Library function memcmp shall point to either a pointer type, an essentially signed type, an essentially unsigned type, an essentially Boolean type or an essentially enum type';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_16 = Rule_C_21_16;
// Rule 21.17
class Rule_C_21_17 {
    id = 'MISRA-C-21.17';
    description = 'Use of the string handling functions from <string.h> shall not result in accesses beyond the bounds of the objects referenced by their pointer parameters';
    severity = 'mandatory';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_17 = Rule_C_21_17;
// Rule 21.18
class Rule_C_21_18 {
    id = 'MISRA-C-21.18';
    description = 'The size_t type of the standard library may not be used in arithmetic operations';
    severity = 'mandatory';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_18 = Rule_C_21_18;
// Rule 21.19
class Rule_C_21_19 {
    id = 'MISRA-C-21.19';
    description = 'The pointers returned by the Standard Library functions localeconv, getenv, setlocale or, strerror shall only be used as if they have pointer to const-qualified type';
    severity = 'mandatory';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_19 = Rule_C_21_19;
// Rule 21.20
class Rule_C_21_20 {
    id = 'MISRA-C-21.20';
    description = 'The pointer returned by the Standard Library functions asctime, ctime, gmtime, localtime, localeconv, getenv, setlocale or strerror shall not be used following a subsequent call to the same function';
    severity = 'mandatory';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_20 = Rule_C_21_20;
// Rule 21.21
class Rule_C_21_21 {
    id = 'MISRA-C-21.21';
    description = 'The Standard Library function system of <stdlib.h> shall not be used';
    severity = 'required';
    category = 'Standard libraries';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_21_21 = Rule_C_21_21;
// Rule 22.3
class Rule_C_22_3 {
    id = 'MISRA-C-22.3';
    description = 'A file shall not be opened more than once at any one time';
    severity = 'required';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_22_3 = Rule_C_22_3;
// Rule 22.4
class Rule_C_22_4 {
    id = 'MISRA-C-22.4';
    description = 'There shall be no attempt to write to a stream which has been opened as read-only';
    severity = 'mandatory';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_22_4 = Rule_C_22_4;
// Rule 22.5
class Rule_C_22_5 {
    id = 'MISRA-C-22.5';
    description = 'A pointer to a FILE object shall not be dereferenced';
    severity = 'mandatory';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_22_5 = Rule_C_22_5;
// Rule 22.6
class Rule_C_22_6 {
    id = 'MISRA-C-22.6';
    description = 'The value of a pointer to a FILE shall not be used after the associated stream has been closed';
    severity = 'mandatory';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_22_6 = Rule_C_22_6;
// Rule 22.7
class Rule_C_22_7 {
    id = 'MISRA-C-22.7';
    description = 'The macro EOF shall only be compared with the unmodified return value from any Standard Library function capable of returning EOF';
    severity = 'required';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_22_7 = Rule_C_22_7;
// Rule 22.8
class Rule_C_22_8 {
    id = 'MISRA-C-22.8';
    description = 'The value of errno shall be set to zero prior to a call to an errno-setting-function';
    severity = 'required';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_22_8 = Rule_C_22_8;
// Rule 22.9
class Rule_C_22_9 {
    id = 'MISRA-C-22.9';
    description = 'The value of errno shall be tested against zero after calling an errno-setting-function';
    severity = 'required';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_22_9 = Rule_C_22_9;
// Rule 22.10
class Rule_C_22_10 {
    id = 'MISRA-C-22.10';
    description = 'The value of errno shall only be tested when the last function to be called was an errno-setting-function';
    severity = 'required';
    category = 'Resources';
    language = 'C';
    async check(ast, sourceCode) {
        // Stub implementation - to be enhanced
        return [];
    }
}
exports.Rule_C_22_10 = Rule_C_22_10;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS1zdHVicy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtc3R1YnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7OztBQU1ILFlBQVk7QUFDWixNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcseUdBQXlHLENBQUM7SUFDeEgsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGFBQWEsQ0FBQztJQUN6QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBQ3hCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLHVDQUF1QztRQUN2QyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVZELGtDQVVDO0FBRUQsWUFBWTtBQUNaLE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyx1RUFBdUUsQ0FBQztJQUN0RixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFDeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsdUNBQXVDO1FBQ3ZDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBVkQsa0NBVUM7QUFFRCxZQUFZO0FBQ1osTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLDJGQUEyRixDQUFDO0lBQzFHLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUN4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0Qyx1Q0FBdUM7UUFDdkMsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0NBQ0Y7QUFWRCxrQ0FVQztB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O1FBQ3RDLHVDQUF1QztRQUN2QyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVZELGtDQVVDO0FBRUQsWUFBWTtBQUNaLE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyx5RkFBeUYsQ0FBQztJQUN4RyxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsV0FBVyxDQUFDO0lBQ3ZCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFDeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsdUNBQXVDO1FBQ3ZDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBVkQsa0NBVUM7QUFFRCxhQUFhO0FBQ2IsTUFBYSxZQUFZO0lBQ3ZCLEVBQUUsR0FBRyxlQUFlLENBQUM7SUFDckIsV0FBVyxHQUFHLDJHQUEyRyxDQUFDO0lBQzFILFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxXQUFXLENBQUM7SUFDdkIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUN4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0Qyx1Q0FBdUM7UUFDdkMsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0NBQ0Y7QUFWRCxvQ0FVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBTdHViIGltcGxlbWVudGF0aW9ucyBmb3IgUDMvUDQgTUlTUkEgQyBydWxlc1xyXG4gKiBUaGVzZSBwcm92aWRlIHRoZSBiYXNpYyBzdHJ1Y3R1cmUgYW5kIGNhbiBiZSBlbmhhbmNlZCB3aXRoIGZ1bGwgZGV0ZWN0aW9uIGxvZ2ljIGFzIG5lZWRlZFxyXG4gKi9cclxuXHJcbmltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8vIFJ1bGUgMTIuNVxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzEyXzUgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTIuNSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHNpemVvZiBvcGVyYXRvciBzaGFsbCBub3QgaGF2ZSBhbiBvcGVyYW5kIHdoaWNoIGlzIGEgZnVuY3Rpb24gcGFyYW1ldGVyIGRlY2xhcmVkIGFzIFwiYXJyYXkgb2YgdHlwZVwiJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRXhwcmVzc2lvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMTMuN1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzEzXzcgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTMuNyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQm9vbGVhbiBvcGVyYXRpb25zIHdob3NlIHJlc3VsdHMgYXJlIGludmFyaWFudCBzaGFsbCBub3QgYmUgcGVybWl0dGVkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU2lkZSBlZmZlY3RzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDE1LjZcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xNV82IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE1LjYnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBib2R5IG9mIGFuIGl0ZXJhdGlvbi1zdGF0ZW1lbnQgb3IgYSBzZWxlY3Rpb24tc3RhdGVtZW50IHNoYWxsIGJlIGEgY29tcG91bmQtc3RhdGVtZW50JztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udHJvbCBmbG93JztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDE1LjdcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xNV83IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE1LjcnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0FsbCBpZi4uLmVsc2UgaWYgY29uc3RydWN0cyBzaGFsbCBiZSB0ZXJtaW5hdGVkIHdpdGggYW4gZWxzZSBzdGF0ZW1lbnQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb250cm9sIGZsb3cnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMTcuNFxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE3XzQgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTcuNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQWxsIGV4aXQgcGF0aHMgZnJvbSBhIGZ1bmN0aW9uIHdpdGggbm9uLXZvaWQgcmV0dXJuIHR5cGUgc2hhbGwgaGF2ZSBhbiBleHBsaWNpdCByZXR1cm4gc3RhdGVtZW50IHdpdGggYW4gZXhwcmVzc2lvbic7XHJcbiAgc2V2ZXJpdHkgPSAnbWFuZGF0b3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdGdW5jdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMTctNVxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE3XzUgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTcuNSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIGZ1bmN0aW9uIGFyZ3VtZW50IGNvcnJlc3BvbmRpbmcgdG8gYSBwYXJhbWV0ZXIgZGVjbGFyZWQgdG8gaGF2ZSBhbiBhcnJheSB0eXBlIHNoYWxsIGhhdmUgYW4gYXBwcm9wcmlhdGUgbnVtYmVyIG9mIGVsZW1lbnRzJztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRnVuY3Rpb25zJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDE3LjZcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xN182IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE3LjYnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBkZWNsYXJhdGlvbiBvZiBhbiBhcnJheSBwYXJhbWV0ZXIgc2hhbGwgbm90IGNvbnRhaW4gdGhlIHN0YXRpYyBrZXl3b3JkIGJldHdlZW4gdGhlIFsgXSc7XHJcbiAgc2V2ZXJpdHkgPSAnbWFuZGF0b3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdGdW5jdGlvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMTcuOFxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE3XzggaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTcuOCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSBmdW5jdGlvbiBwYXJhbWV0ZXIgc2hvdWxkIG5vdCBiZSBtb2RpZmllZCc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0Z1bmN0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAxOC4xXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMThfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xOC4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdBIHBvaW50ZXIgcmVzdWx0aW5nIGZyb20gYXJpdGhtZXRpYyBvbiBhIHBvaW50ZXIgb3BlcmFuZCBzaGFsbCBhZGRyZXNzIGFuIGVsZW1lbnQgb2YgdGhlIHNhbWUgYXJyYXkgYXMgdGhhdCBwb2ludGVyIG9wZXJhbmQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdQb2ludGVycyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAxOC4yXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMThfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xOC4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdTdWJ0cmFjdGlvbiBiZXR3ZWVuIHBvaW50ZXJzIHNoYWxsIG9ubHkgYmUgYXBwbGllZCB0byBwb2ludGVycyB0aGF0IGFkZHJlc3MgZWxlbWVudHMgb2YgdGhlIHNhbWUgYXJyYXknO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdQb2ludGVycyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAxOC4zXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMThfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xOC4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgcmVsYXRpb25hbCBvcGVyYXRvcnMgPiwgPj0sIDwgYW5kIDw9IHNoYWxsIG5vdCBiZSBhcHBsaWVkIHRvIG9iamVjdHMgb2YgcG9pbnRlciB0eXBlIGV4Y2VwdCB3aGVyZSB0aGV5IHBvaW50IGludG8gdGhlIHNhbWUgb2JqZWN0JztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUG9pbnRlcnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMTguNFxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE4XzQgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTguNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlICssIC0sICs9IGFuZCAtPSBvcGVyYXRvcnMgc2hvdWxkIG5vdCBiZSBhcHBsaWVkIHRvIGFuIGV4cHJlc3Npb24gb2YgcG9pbnRlciB0eXBlJztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUG9pbnRlcnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMTguNVxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE4XzUgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTguNSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnRGVjbGFyYXRpb25zIHNob3VsZCBjb250YWluIG5vIG1vcmUgdGhhbiB0d28gbGV2ZWxzIG9mIHBvaW50ZXIgbmVzdGluZyc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1BvaW50ZXJzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDE4LjZcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xOF82IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE4LjYnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBhZGRyZXNzIG9mIGFuIG9iamVjdCB3aXRoIGF1dG9tYXRpYyBzdG9yYWdlIHNoYWxsIG5vdCBiZSBjb3BpZWQgdG8gYW5vdGhlciBvYmplY3QgdGhhdCBwZXJzaXN0cyBhZnRlciB0aGUgZmlyc3Qgb2JqZWN0IGhhcyBjZWFzZWQgdG8gZXhpc3QnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdQb2ludGVycyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAxOC43XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMThfNyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xOC43JztcclxuICBkZXNjcmlwdGlvbiA9ICdGbGV4aWJsZSBhcnJheSBtZW1iZXJzIHNoYWxsIG5vdCBiZSBkZWNsYXJlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1BvaW50ZXJzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDE4LjhcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xOF84IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE4LjgnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1ZhcmlhYmxlLWxlbmd0aCBhcnJheSB0eXBlcyBzaGFsbCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1BvaW50ZXJzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDE5LjFcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xOV8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE5LjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0FuIG9iamVjdCBzaGFsbCBub3QgYmUgYXNzaWduZWQgb3IgY29waWVkIHRvIGFuIG92ZXJsYXBwaW5nIG9iamVjdCc7XHJcbiAgc2V2ZXJpdHkgPSAnbWFuZGF0b3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdPdmVybGFwcGluZyBzdG9yYWdlJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDE5LjJcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xOV8yIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE5LjInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSB1bmlvbiBrZXl3b3JkIHNob3VsZCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ092ZXJsYXBwaW5nIHN0b3JhZ2UnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjAuMVxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIwXzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjAuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnI2luY2x1ZGUgZGlyZWN0aXZlcyBzaG91bGQgb25seSBiZSBwcmVjZWRlZCBieSBwcmVwcm9jZXNzb3IgZGlyZWN0aXZlcyBvciBjb21tZW50cyc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1ByZXByb2Nlc3NpbmcnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjAuMlxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIwXzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjAuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIFxcJywgXCIgb3IgXFxcXCBjaGFyYWN0ZXJzIGFuZCB0aGUgLyogb3IgLy8gY2hhcmFjdGVyIHNlcXVlbmNlcyBzaGFsbCBub3Qgb2NjdXIgaW4gYSBoZWFkZXIgZmlsZSBuYW1lJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUHJlcHJvY2Vzc2luZyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMC4zXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjBfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMC4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgI2luY2x1ZGUgZGlyZWN0aXZlIHNoYWxsIGJlIGZvbGxvd2VkIGJ5IGVpdGhlciBhIDxmaWxlbmFtZT4gb3IgXCJmaWxlbmFtZVwiIHNlcXVlbmNlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUHJlcHJvY2Vzc2luZyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMC41XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjBfNSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMC41JztcclxuICBkZXNjcmlwdGlvbiA9ICcjdW5kZWYgc2hvdWxkIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUHJlcHJvY2Vzc2luZyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMC42XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjBfNiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMC42JztcclxuICBkZXNjcmlwdGlvbiA9ICdUb2tlbnMgdGhhdCBsb29rIGxpa2UgYSBwcmVwcm9jZXNzaW5nIGRpcmVjdGl2ZSBzaGFsbCBub3Qgb2NjdXIgd2l0aGluIGEgbWFjcm8gYXJndW1lbnQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdQcmVwcm9jZXNzaW5nJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIwLjdcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMF83IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTIwLjcnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0V4cHJlc3Npb25zIHJlc3VsdGluZyBmcm9tIHRoZSBleHBhbnNpb24gb2YgbWFjcm8gcGFyYW1ldGVycyBzaGFsbCBiZSBlbmNsb3NlZCBpbiBwYXJlbnRoZXNlcyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1ByZXByb2Nlc3NpbmcnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjAuOFxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIwXzggaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjAuOCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIGNvbnRyb2xsaW5nIGV4cHJlc3Npb24gb2YgYSAjaWYgb3IgI2VsaWYgcHJlcHJvY2Vzc2luZyBkaXJlY3RpdmUgc2hhbGwgZXZhbHVhdGUgdG8gMCBvciAxJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUHJlcHJvY2Vzc2luZyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMC4xMFxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIwXzEwIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTIwLjEwJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgIyBhbmQgIyMgcHJlcHJvY2Vzc29yIG9wZXJhdG9ycyBzaG91bGQgbm90IGJlIHVzZWQnO1xyXG4gIHNldmVyaXR5ID0gJ2Fkdmlzb3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdQcmVwcm9jZXNzaW5nJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIwLjExXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjBfMTEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjAuMTEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgbWFjcm8gcGFyYW1ldGVyIGltbWVkaWF0ZWx5IGZvbGxvd2luZyBhICMgb3BlcmF0b3Igc2hhbGwgbm90IGltbWVkaWF0ZWx5IGJlIGZvbGxvd2VkIGJ5IGEgIyMgb3BlcmF0b3InO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdQcmVwcm9jZXNzaW5nJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIwLjEyXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjBfMTIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjAuMTInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgbWFjcm8gcGFyYW1ldGVyIHVzZWQgYXMgYW4gb3BlcmFuZCB0byB0aGUgIyBvciAjIyBvcGVyYXRvcnMsIHdoaWNoIGlzIGl0c2VsZiBzdWJqZWN0IHRvIGZ1cnRoZXIgbWFjcm8gcmVwbGFjZW1lbnQsIHNoYWxsIG9ubHkgYmUgdXNlZCBhcyBhbiBvcGVyYW5kIHRvIHRoZXNlIG9wZXJhdG9ycyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1ByZXByb2Nlc3NpbmcnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjAuMTNcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMF8xMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMC4xMyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSBsaW5lIHdob3NlIGZpcnN0IHRva2VuIGlzICMgc2hhbGwgYmUgYSB2YWxpZCBwcmVwcm9jZXNzaW5nIGRpcmVjdGl2ZSc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1ByZXByb2Nlc3NpbmcnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjAuMTRcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMF8xNCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMC4xNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQWxsICNlbHNlLCAjZWxpZiBhbmQgI2VuZGlmIHByZXByb2Nlc3NvciBkaXJlY3RpdmVzIHNoYWxsIHJlc2lkZSBpbiB0aGUgc2FtZSBmaWxlIGFzIHRoZSAjaWYsICNpZmRlZiBvciAjaWZuZGVmIGRpcmVjdGl2ZSB0byB3aGljaCB0aGV5IGFyZSByZWxhdGVkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUHJlcHJvY2Vzc2luZyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMS4xXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMS4xJztcclxuICBkZXNjcmlwdGlvbiA9ICcjZGVmaW5lIGFuZCAjdW5kZWYgc2hhbGwgbm90IGJlIHVzZWQgb24gYSByZXNlcnZlZCBpZGVudGlmaWVyIG9yIHJlc2VydmVkIG1hY3JvIG5hbWUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdTdGFuZGFyZCBsaWJyYXJpZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjEuMlxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIxXzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjEuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSByZXNlcnZlZCBpZGVudGlmaWVyIG9yIG1hY3JvIG5hbWUgc2hhbGwgbm90IGJlIGRlY2xhcmVkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjRcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMV80IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTIxLjQnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBzdGFuZGFyZCBoZWFkZXIgZmlsZSA8c2V0am1wLmg+IHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjVcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMV81IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTIxLjUnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBzdGFuZGFyZCBoZWFkZXIgZmlsZSA8c2lnbmFsLmg+IHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjdcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMV83IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTIxLjcnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBhdG9mLCBhdG9pLCBhdG9sIGFuZCBhdG9sbCBmdW5jdGlvbnMgb2YgPHN0ZGxpYi5oPiBzaGFsbCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1N0YW5kYXJkIGxpYnJhcmllcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMS44XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfOCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMS44JztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgbGlicmFyeSBmdW5jdGlvbnMgYWJvcnQsIGV4aXQgYW5kIHN5c3RlbSBvZiA8c3RkbGliLmg+IHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjlcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMV85IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTIxLjknO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBsaWJyYXJ5IGZ1bmN0aW9ucyBic2VhcmNoIGFuZCBxc29ydCBvZiA8c3RkbGliLmg+IHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjEwXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMTAgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjEuMTAnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBTdGFuZGFyZCBMaWJyYXJ5IHRpbWUgYW5kIGRhdGUgZnVuY3Rpb25zIHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjExXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMTEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjEuMTEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBzdGFuZGFyZCBoZWFkZXIgZmlsZSA8dGdtYXRoLmg+IHNoYWxsIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjEyXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMTIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjEuMTInO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBleGNlcHRpb24gaGFuZGxpbmcgZmVhdHVyZXMgb2YgPGZlbnYuaD4gc2hvdWxkIG5vdCBiZSB1c2VkJztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjEzXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMTMgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjEuMTMnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0FueSB2YWx1ZSBwYXNzZWQgdG8gYSBmdW5jdGlvbiBpbiA8Y3R5cGUuaD4gc2hhbGwgYmUgcmVwcmVzZW50YWJsZSBhcyBhbiB1bnNpZ25lZCBjaGFyIG9yIGJlIHRoZSB2YWx1ZSBFT0YnO1xyXG4gIHNldmVyaXR5ID0gJ21hbmRhdG9yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjE0XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMTQgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjEuMTQnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBTdGFuZGFyZCBMaWJyYXJ5IGZ1bmN0aW9uIG1lbWNtcCBzaGFsbCBub3QgYmUgdXNlZCB0byBjb21wYXJlIG51bGwgdGVybWluYXRlZCBzdHJpbmdzJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjE1XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMTUgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjEuMTUnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBwb2ludGVyIGFyZ3VtZW50cyB0byB0aGUgU3RhbmRhcmQgTGlicmFyeSBmdW5jdGlvbnMgbWVtY3B5LCBtZW1tb3ZlIGFuZCBtZW1jbXAgc2hhbGwgYmUgcG9pbnRlcnMgdG8gcXVhbGlmaWVkIG9yIHVucXVhbGlmaWVkIHZlcnNpb25zIG9mIGNvbXBhdGlibGUgdHlwZXMnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdTdGFuZGFyZCBsaWJyYXJpZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjEuMTZcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMV8xNiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMS4xNic7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHBvaW50ZXIgYXJndW1lbnRzIHRvIHRoZSBTdGFuZGFyZCBMaWJyYXJ5IGZ1bmN0aW9uIG1lbWNtcCBzaGFsbCBwb2ludCB0byBlaXRoZXIgYSBwb2ludGVyIHR5cGUsIGFuIGVzc2VudGlhbGx5IHNpZ25lZCB0eXBlLCBhbiBlc3NlbnRpYWxseSB1bnNpZ25lZCB0eXBlLCBhbiBlc3NlbnRpYWxseSBCb29sZWFuIHR5cGUgb3IgYW4gZXNzZW50aWFsbHkgZW51bSB0eXBlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjE3XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMTcgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjEuMTcnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1VzZSBvZiB0aGUgc3RyaW5nIGhhbmRsaW5nIGZ1bmN0aW9ucyBmcm9tIDxzdHJpbmcuaD4gc2hhbGwgbm90IHJlc3VsdCBpbiBhY2Nlc3NlcyBiZXlvbmQgdGhlIGJvdW5kcyBvZiB0aGUgb2JqZWN0cyByZWZlcmVuY2VkIGJ5IHRoZWlyIHBvaW50ZXIgcGFyYW1ldGVycyc7XHJcbiAgc2V2ZXJpdHkgPSAnbWFuZGF0b3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdTdGFuZGFyZCBsaWJyYXJpZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjEuMThcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMV8xOCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMS4xOCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHNpemVfdCB0eXBlIG9mIHRoZSBzdGFuZGFyZCBsaWJyYXJ5IG1heSBub3QgYmUgdXNlZCBpbiBhcml0aG1ldGljIG9wZXJhdGlvbnMnO1xyXG4gIHNldmVyaXR5ID0gJ21hbmRhdG9yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU3RhbmRhcmQgbGlicmFyaWVzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIxLjE5XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjFfMTkgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjEuMTknO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSBwb2ludGVycyByZXR1cm5lZCBieSB0aGUgU3RhbmRhcmQgTGlicmFyeSBmdW5jdGlvbnMgbG9jYWxlY29udiwgZ2V0ZW52LCBzZXRsb2NhbGUgb3IsIHN0cmVycm9yIHNoYWxsIG9ubHkgYmUgdXNlZCBhcyBpZiB0aGV5IGhhdmUgcG9pbnRlciB0byBjb25zdC1xdWFsaWZpZWQgdHlwZSc7XHJcbiAgc2V2ZXJpdHkgPSAnbWFuZGF0b3J5JyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdTdGFuZGFyZCBsaWJyYXJpZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjEuMjBcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMV8yMCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMS4yMCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHBvaW50ZXIgcmV0dXJuZWQgYnkgdGhlIFN0YW5kYXJkIExpYnJhcnkgZnVuY3Rpb25zIGFzY3RpbWUsIGN0aW1lLCBnbXRpbWUsIGxvY2FsdGltZSwgbG9jYWxlY29udiwgZ2V0ZW52LCBzZXRsb2NhbGUgb3Igc3RyZXJyb3Igc2hhbGwgbm90IGJlIHVzZWQgZm9sbG93aW5nIGEgc3Vic2VxdWVudCBjYWxsIHRvIHRoZSBzYW1lIGZ1bmN0aW9uJztcclxuICBzZXZlcml0eSA9ICdtYW5kYXRvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1N0YW5kYXJkIGxpYnJhcmllcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMS4yMVxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIxXzIxIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTIxLjIxJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgU3RhbmRhcmQgTGlicmFyeSBmdW5jdGlvbiBzeXN0ZW0gb2YgPHN0ZGxpYi5oPiBzaGFsbCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1N0YW5kYXJkIGxpYnJhcmllcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMi4zXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjJfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMi4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdBIGZpbGUgc2hhbGwgbm90IGJlIG9wZW5lZCBtb3JlIHRoYW4gb25jZSBhdCBhbnkgb25lIHRpbWUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdSZXNvdXJjZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjIuNFxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIyXzQgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjIuNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlcmUgc2hhbGwgYmUgbm8gYXR0ZW1wdCB0byB3cml0ZSB0byBhIHN0cmVhbSB3aGljaCBoYXMgYmVlbiBvcGVuZWQgYXMgcmVhZC1vbmx5JztcclxuICBzZXZlcml0eSA9ICdtYW5kYXRvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1Jlc291cmNlcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMi41XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjJfNSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMi41JztcclxuICBkZXNjcmlwdGlvbiA9ICdBIHBvaW50ZXIgdG8gYSBGSUxFIG9iamVjdCBzaGFsbCBub3QgYmUgZGVyZWZlcmVuY2VkJztcclxuICBzZXZlcml0eSA9ICdtYW5kYXRvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1Jlc291cmNlcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMi42XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjJfNiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMi42JztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgdmFsdWUgb2YgYSBwb2ludGVyIHRvIGEgRklMRSBzaGFsbCBub3QgYmUgdXNlZCBhZnRlciB0aGUgYXNzb2NpYXRlZCBzdHJlYW0gaGFzIGJlZW4gY2xvc2VkJztcclxuICBzZXZlcml0eSA9ICdtYW5kYXRvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1Jlc291cmNlcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMi43XHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMjJfNyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0yMi43JztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgbWFjcm8gRU9GIHNoYWxsIG9ubHkgYmUgY29tcGFyZWQgd2l0aCB0aGUgdW5tb2RpZmllZCByZXR1cm4gdmFsdWUgZnJvbSBhbnkgU3RhbmRhcmQgTGlicmFyeSBmdW5jdGlvbiBjYXBhYmxlIG9mIHJldHVybmluZyBFT0YnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdSZXNvdXJjZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFJ1bGUgMjIuOFxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIyXzggaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMjIuOCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHZhbHVlIG9mIGVycm5vIHNoYWxsIGJlIHNldCB0byB6ZXJvIHByaW9yIHRvIGEgY2FsbCB0byBhbiBlcnJuby1zZXR0aW5nLWZ1bmN0aW9uJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUmVzb3VyY2VzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHRvIGJlIGVuaGFuY2VkXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG59XHJcblxyXG4vLyBSdWxlIDIyLjlcclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18yMl85IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTIyLjknO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSB2YWx1ZSBvZiBlcnJubyBzaGFsbCBiZSB0ZXN0ZWQgYWdhaW5zdCB6ZXJvIGFmdGVyIGNhbGxpbmcgYW4gZXJybm8tc2V0dGluZy1mdW5jdGlvbic7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1Jlc291cmNlcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSB0byBiZSBlbmhhbmNlZFxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxufVxyXG5cclxuLy8gUnVsZSAyMi4xMFxyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzIyXzEwIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTIyLjEwJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgdmFsdWUgb2YgZXJybm8gc2hhbGwgb25seSBiZSB0ZXN0ZWQgd2hlbiB0aGUgbGFzdCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2FzIGFuIGVycm5vLXNldHRpbmctZnVuY3Rpb24nO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdSZXNvdXJjZXMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gdG8gYmUgZW5oYW5jZWRcclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbn1cclxuIl19
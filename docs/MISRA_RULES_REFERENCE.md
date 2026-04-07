# MISRA Rules Reference

## Overview

This document provides a comprehensive reference for all MISRA C:2012 and MISRA C++:2008 rules implemented in the MISRA Platform. Each rule includes:

- Rule ID and description
- Severity level (Mandatory, Required, Advisory)
- Category
- Examples of compliant and non-compliant code
- Fix recommendations

## Table of Contents

- [MISRA C:2012 Rules](#misra-c2012-rules)
- [MISRA C++:2008 Rules](#misra-c2008-rules)
- [Severity Levels](#severity-levels)
- [Rule Categories](#rule-categories)

---

## Severity Levels

### Mandatory
Rules that must be followed without exception. Violations indicate serious safety or reliability issues.

### Required
Rules that should be followed unless there is a documented justification for deviation.

### Advisory
Rules that represent best practices. Deviations are acceptable with proper documentation.

---

## Rule Categories

- **Language**: Language compliance and standard conformance
- **Declarations**: Variable and function declarations
- **Types**: Type safety and conversions
- **Expressions**: Expression evaluation and operators
- **Control Flow**: Loops, conditionals, and control structures
- **Functions**: Function definitions and calls
- **Pointers**: Pointer usage and safety
- **Preprocessor**: Preprocessor directives
- **Standard Library**: Standard library usage
- **Exception Handling**: Exception safety (C++ only)
- **Templates**: Template usage (C++ only)

---

## MISRA C:2012 Rules

### Rule 1.1 - ISO C Standard Compliance
**Severity**: Mandatory  
**Category**: Language

**Description**: All code shall conform to ISO 9899:2011 C standard.

**Rationale**: Using non-standard compiler extensions reduces portability and may lead to undefined behavior.

**Non-Compliant Example**:
```c
// Using GCC extension
int x = 5;
typeof(x) y = 10;  // Violation: typeof is a GCC extension

// Using compiler-specific attributes
void func() __attribute__((noreturn));  // Violation
```

**Compliant Example**:
```c
// Standard C code
int x = 5;
int y = 10;  // Compliant: explicit type

// Standard function declaration
void func(void);  // Compliant
```

**Fix Recommendation**: Remove all compiler-specific extensions and use standard C syntax.

---

### Rule 2.1 - Unreachable Code
**Severity**: Required  
**Category**: Control Flow

**Description**: A project shall not contain unreachable code.

**Rationale**: Unreachable code indicates logic errors and wastes resources.

**Non-Compliant Example**:
```c
int func(int x) {
    return x + 1;
    x = 0;  // Violation: unreachable code
}

void test() {
    if (0) {
        printf("Never executed");  // Violation
    }
}
```

**Compliant Example**:
```c
int func(int x) {
    return x + 1;  // Compliant
}

void test() {
    if (condition) {
        printf("May be executed");  // Compliant
    }
}
```

**Fix Recommendation**: Remove unreachable statements or fix the logic that makes them unreachable.

---

### Rule 8.1 - Explicit Type Specifications
**Severity**: Required  
**Category**: Declarations

**Description**: Types shall be explicitly specified.

**Rationale**: Implicit types (like implicit int) reduce code clarity and may cause portability issues.

**Non-Compliant Example**:
```c
// Implicit int return type
func() {  // Violation: no return type specified
    return 42;
}

// Implicit int variable
static x = 10;  // Violation: no type specified
```

**Compliant Example**:
```c
// Explicit return type
int func(void) {  // Compliant
    return 42;
}

// Explicit variable type
static int x = 10;  // Compliant
```

**Fix Recommendation**: Always specify explicit types for all declarations.

---

### Rule 8.2 - Function Prototypes
**Severity**: Required  
**Category**: Declarations

**Description**: Function types shall be in prototype form with named parameters.

**Rationale**: Prototypes enable type checking and improve code documentation.

**Non-Compliant Example**:
```c
// Old-style declaration
int add();  // Violation: no parameter types

// Definition without prototype
int add(a, b)  // Violation
int a, b;
{
    return a + b;
}
```

**Compliant Example**:
```c
// Modern prototype
int add(int a, int b);  // Compliant

// Definition with prototype form
int add(int a, int b) {  // Compliant
    return a + b;
}
```

**Fix Recommendation**: Use modern function prototypes with explicit parameter types.

---

### Rule 8.4 - External Linkage Declarations
**Severity**: Required  
**Category**: Declarations

**Description**: A compatible declaration shall be visible when an object or function with external linkage is defined.

**Rationale**: Ensures consistency between declarations and definitions.

**Non-Compliant Example**:
```c
// file1.c
int global_var = 10;  // Violation: no declaration in header

// file2.c
extern int global_var;  // May have type mismatch
```

**Compliant Example**:
```c
// header.h
extern int global_var;  // Compliant: declaration in header

// file1.c
#include "header.h"
int global_var = 10;  // Compliant

// file2.c
#include "header.h"
extern int global_var;  // Compliant
```

**Fix Recommendation**: Declare all external objects in header files.

---

### Rule 9.1 - Uninitialized Variables
**Severity**: Mandatory  
**Category**: Declarations

**Description**: The value of an object with automatic storage duration shall not be read before it has been set.

**Rationale**: Reading uninitialized variables leads to undefined behavior.

**Non-Compliant Example**:
```c
void func() {
    int x;
    int y = x + 1;  // Violation: x is uninitialized
}

int compute(int flag) {
    int result;
    if (flag) {
        result = 10;
    }
    return result;  // Violation: result may be uninitialized
}
```

**Compliant Example**:
```c
void func() {
    int x = 0;
    int y = x + 1;  // Compliant
}

int compute(int flag) {
    int result = 0;  // Compliant: initialized
    if (flag) {
        result = 10;
    }
    return result;
}
```

**Fix Recommendation**: Initialize all variables at declaration or ensure they are set before use.

---

### Rule 10.1 - Implicit Type Conversions
**Severity**: Required  
**Category**: Types

**Description**: Operands shall not be implicitly converted to different essential type categories.

**Rationale**: Implicit conversions can lead to unexpected results and data loss.

**Non-Compliant Example**:
```c
unsigned int u = 10;
signed int s = -5;
int result = u + s;  // Violation: mixing signed and unsigned
```

**Compliant Example**:
```c
unsigned int u = 10;
signed int s = -5;
int result = (int)u + s;  // Compliant: explicit cast
```

**Fix Recommendation**: Use explicit casts when mixing different type categories.

---

### Rule 10.3 - Assignment Operators
**Severity**: Required  
**Category**: Expressions

**Description**: The value of an expression shall not be assigned to an object with a narrower essential type.

**Rationale**: Narrowing conversions can cause data loss.

**Non-Compliant Example**:
```c
int32_t large = 100000;
int16_t small = large;  // Violation: narrowing conversion
```

**Compliant Example**:
```c
int32_t large = 100000;
int16_t small = (int16_t)large;  // Compliant: explicit cast
// Or better: check range first
if (large <= INT16_MAX && large >= INT16_MIN) {
    int16_t small = (int16_t)large;
}
```

**Fix Recommendation**: Use explicit casts and validate ranges for narrowing conversions.

---

### Rule 11.1 - Pointer Conversions
**Severity**: Required  
**Category**: Pointers

**Description**: Conversions shall not be performed between a pointer to a function and any other type.

**Rationale**: Function pointers and data pointers have different representations on some platforms.

**Non-Compliant Example**:
```c
void func(void) {}
void *ptr = (void *)func;  // Violation: function pointer to void*
```

**Compliant Example**:
```c
void func(void) {}
void (*func_ptr)(void) = func;  // Compliant: function pointer type
```

**Fix Recommendation**: Use appropriate function pointer types instead of void*.

---

### Rule 11.3 - Pointer Casts
**Severity**: Required  
**Category**: Pointers

**Description**: A cast shall not be performed between a pointer to object type and a pointer to a different object type.

**Rationale**: Improper pointer casts can violate strict aliasing rules and cause undefined behavior.

**Non-Compliant Example**:
```c
int x = 42;
float *fp = (float *)&x;  // Violation: int* to float*
float f = *fp;  // Undefined behavior
```

**Compliant Example**:
```c
int x = 42;
int *ip = &x;  // Compliant: same type
int value = *ip;

// Or use union for type punning
union {
    int i;
    float f;
} u;
u.i = 42;
float f = u.f;  // Compliant
```

**Fix Recommendation**: Avoid pointer casts between different object types. Use unions for type punning if necessary.

---

## MISRA C++:2008 Rules

### Rule 0-1-1 - Unused Variables
**Severity**: Required  
**Category**: Unused code

**Description**: A project shall not contain unused variables.

**Rationale**: Unused variables indicate incomplete code or logic errors and waste resources.

**Non-Compliant Example**:
```cpp
void func() {
    int x = 10;  // Violation: x is never used
    int y = 20;
    std::cout << y << std::endl;
}
```

**Compliant Example**:
```cpp
void func() {
    int y = 20;  // Compliant: y is used
    std::cout << y << std::endl;
}
```

**Fix Recommendation**: Remove unused variables or use them in the code.

---

### Rule 0-1-2 - Infeasible Paths
**Severity**: Required  
**Category**: Control Flow

**Description**: A project shall not contain infeasible paths.

**Rationale**: Infeasible paths indicate logic errors.

**Non-Compliant Example**:
```cpp
void func(int x) {
    if (x > 10 && x < 5) {  // Violation: condition is always false
        std::cout << "Never executed" << std::endl;
    }
}
```

**Compliant Example**:
```cpp
void func(int x) {
    if (x > 10 || x < 5) {  // Compliant: feasible condition
        std::cout << "May be executed" << std::endl;
    }
}
```

**Fix Recommendation**: Fix logic errors that create infeasible paths.

---

### Rule 0-1-3 - Unused Type Declarations
**Severity**: Required  
**Category**: Unused code

**Description**: A project shall not contain unused type declarations.

**Rationale**: Unused types clutter the codebase and may indicate incomplete refactoring.

**Non-Compliant Example**:
```cpp
struct UnusedStruct {  // Violation: never used
    int x;
    int y;
};

class MyClass {
    int value;
};
```

**Compliant Example**:
```cpp
class MyClass {  // Compliant: used below
    int value;
};

MyClass obj;
```

**Fix Recommendation**: Remove unused type declarations.

---

### Rule 2-10-1 - Identifier Naming
**Severity**: Required  
**Category**: Naming

**Description**: Different identifiers shall be typographically unambiguous.

**Rationale**: Similar-looking identifiers can cause confusion and errors.

**Non-Compliant Example**:
```cpp
int l = 1;  // Violation: looks like 1
int I = 2;  // Violation: looks like l
int O = 0;  // Violation: looks like 0
```

**Compliant Example**:
```cpp
int count = 1;  // Compliant: clear name
int index = 2;  // Compliant
int offset = 0;  // Compliant
```

**Fix Recommendation**: Use descriptive names that are visually distinct.

---

### Rule 5-0-1 - Implicit Conversions
**Severity**: Required  
**Category**: Types

**Description**: The value of an expression shall be the same under any order of evaluation that the standard permits.

**Rationale**: Prevents undefined behavior from order-dependent expressions.

**Non-Compliant Example**:
```cpp
int i = 0;
int x = i++ + i++;  // Violation: undefined behavior
```

**Compliant Example**:
```cpp
int i = 0;
int temp1 = i++;
int temp2 = i++;
int x = temp1 + temp2;  // Compliant
```

**Fix Recommendation**: Avoid expressions with multiple side effects on the same variable.

---

### Rule 6-2-1 - Assignment in Sub-expressions
**Severity**: Required  
**Category**: Expressions

**Description**: Assignment operators shall not be used in sub-expressions.

**Rationale**: Assignments in sub-expressions reduce readability and can cause errors.

**Non-Compliant Example**:
```cpp
int x, y;
if ((x = getValue()) > 10) {  // Violation: assignment in condition
    y = x;
}
```

**Compliant Example**:
```cpp
int x, y;
x = getValue();  // Compliant: separate assignment
if (x > 10) {
    y = x;
}
```

**Fix Recommendation**: Separate assignments from conditional expressions.

---

### Rule 7-1-1 - Variable Initialization
**Severity**: Required  
**Category**: Declarations

**Description**: A variable which is not modified shall be const qualified.

**Rationale**: Const correctness improves code safety and clarity.

**Non-Compliant Example**:
```cpp
void func() {
    int x = 10;  // Violation: x is never modified
    std::cout << x << std::endl;
}
```

**Compliant Example**:
```cpp
void func() {
    const int x = 10;  // Compliant: const qualified
    std::cout << x << std::endl;
}
```

**Fix Recommendation**: Add const qualifier to variables that are not modified.

---

### Rule 15-0-3 - Exception Handling
**Severity**: Required  
**Category**: Exception Handling

**Description**: Control shall not be transferred into a try or catch block using a goto or switch statement.

**Rationale**: Jumping into exception handling blocks bypasses proper initialization.

**Non-Compliant Example**:
```cpp
void func(int x) {
    if (x > 0) {
        goto error_handler;  // Violation
    }
    
    try {
        error_handler:  // Violation: label inside try block
        throw std::runtime_error("Error");
    } catch (...) {
    }
}
```

**Compliant Example**:
```cpp
void func(int x) {
    try {
        if (x > 0) {
            throw std::runtime_error("Error");  // Compliant
        }
    } catch (...) {
    }
}
```

**Fix Recommendation**: Use exceptions for error handling instead of goto statements.

---

## Additional Resources

### Official MISRA Documentation
- [MISRA C:2012 Guidelines](https://www.misra.org.uk/misra-c/)
- [MISRA C++:2008 Guidelines](https://www.misra.org.uk/misra-cpp/)

### Related Standards
- ISO/IEC 9899:2011 (C11 Standard)
- ISO/IEC 14882:2011 (C++11 Standard)

### Tools and Resources
- Static analysis tools: Cppcheck, Clang-Tidy, PC-lint
- MISRA Compliance Matrix
- Deviation procedures and documentation

---

## Notes

This reference covers the most commonly implemented MISRA rules. For complete coverage of all 168 MISRA C:2012 rules and 228 MISRA C++:2008 rules, please refer to the official MISRA guidelines.

The examples provided are simplified for clarity. Real-world code may require more complex analysis to detect violations.

**Last Updated**: 2024

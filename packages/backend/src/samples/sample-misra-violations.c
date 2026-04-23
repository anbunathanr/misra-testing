/**
 * Sample C File with MISRA Violations
 * 
 * This file contains intentional MISRA C violations for testing purposes.
 * It demonstrates common coding issues that the MISRA analysis engine detects.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* MISRA C:2012 Rule 2.1 - Unreachable code */
void unreachable_code_example(void) {
    return;
    printf("This code is unreachable\n");  /* Violation: unreachable code */
}

/* MISRA C:2012 Rule 8.1 - Functions shall have prototypes */
int add_numbers(int a, int b) {  /* Violation: implicit int return type */
    return a + b;
}

/* MISRA C:2012 Rule 8.2 - Function types shall be in prototype form */
int multiply(x, y)  /* Violation: old-style function definition */
    int x;
    int y;
{
    return x * y;
}

/* MISRA C:2012 Rule 9.1 - Initialization of automatic variables */
void uninitialized_variable_example(void) {
    int uninitialized_var;  /* Violation: uninitialized variable */
    printf("Value: %d\n", uninitialized_var);
}

/* MISRA C:2012 Rule 10.1 - Operands shall not be of an inappropriate type */
void type_conversion_example(void) {
    int int_val = 10;
    float float_val = 3.14f;
    int result = int_val + float_val;  /* Violation: implicit type conversion */
}

/* MISRA C:2012 Rule 11.1 - Conversions shall not be performed between a pointer to a function and any other type */
void function_pointer_violation(void) {
    void (*func_ptr)(void);
    int *int_ptr;
    func_ptr = (void (*)(void))int_ptr;  /* Violation: invalid pointer conversion */
}

/* MISRA C:2012 Rule 13.3 - A full expression containing an increment (++) or decrement (--) operator should have no other potential side effects */
void side_effect_example(void) {
    int arr[10] = {0};
    int i = 0;
    arr[i++] = i++;  /* Violation: multiple side effects */
}

/* MISRA C:2012 Rule 14.4 - The controlling expression of an if statement and the controlling expression of an else if statement shall not be identical */
void identical_condition_example(int x) {
    if (x > 5) {
        printf("x is greater than 5\n");
    } else if (x > 5) {  /* Violation: identical condition */
        printf("This will never execute\n");
    }
}

/* MISRA C:2012 Rule 15.1 - The goto statement shall not be used */
void goto_example(void) {
    int i = 0;
    
loop_start:
    printf("i = %d\n", i);
    i++;
    if (i < 10) {
        goto loop_start;  /* Violation: goto statement */
    }
}

/* MISRA C:2012 Rule 15.4 - A switch statement shall be a well-formed switch statement */
void switch_example(int value) {
    switch (value) {
        case 1:
            printf("One\n");
            /* Violation: missing break statement */
        case 2:
            printf("Two\n");
            break;
        default:
            printf("Other\n");
    }
}

/* MISRA C:2012 Rule 16.3 - An unconditional break statement or return statement shall terminate every switch-clause */
void switch_no_break(int value) {
    switch (value) {
        case 1:
            printf("One\n");
        case 2:
            printf("Two\n");
            /* Violation: no break or return */
    }
}

/* MISRA C:2012 Rule 17.7 - The value returned by a function having non-void return type shall be used */
void unused_return_value(void) {
    int result = 42;
    malloc(100);  /* Violation: return value not used */
}

/* MISRA C:2012 Rule 20.9 - The input/output library <stdio.h> shall not be used in production code */
void stdio_usage(void) {
    printf("Using stdio in production\n");  /* Violation: stdio usage */
}

/* MISRA C:2012 Rule 21.3 - The memory allocation and deallocation functions of <stdlib.h> shall not be used */
void memory_allocation_example(void) {
    int *ptr = malloc(sizeof(int) * 10);  /* Violation: malloc usage */
    free(ptr);  /* Violation: free usage */
}

/* MISRA C:2012 Rule 22.1 - All resources obtained dynamically shall be explicitly released */
void resource_leak_example(void) {
    int *ptr = malloc(sizeof(int) * 100);
    /* Violation: memory not freed - resource leak */
}

/* MISRA C:2012 Rule 22.2 - A block of memory shall only be freed if the address of a single block of memory has been assigned to the pointer prior to deallocation */
void double_free_example(void) {
    int *ptr = malloc(sizeof(int));
    free(ptr);
    free(ptr);  /* Violation: double free */
}

/* Global variable with implicit type */
global_var = 10;  /* Violation: implicit int type */

/* MISRA C:2012 Rule 1.1 - Restricted characters in identifiers */
int _reserved_identifier = 5;  /* Violation: reserved identifier starting with underscore */

/* MISRA C:2012 Rule 3.1 - Comments shall not contain certain characters */
void comment_example(void) {
    /* This is a comment with // nested comment style */  /* Violation: nested comment style */
}

/* Main function */
int main(void) {
    printf("MISRA Violations Sample File\n");
    
    unreachable_code_example();
    uninitialized_variable_example();
    type_conversion_example();
    side_effect_example();
    identical_condition_example(10);
    goto_example();
    switch_example(1);
    switch_no_break(1);
    unused_return_value();
    stdio_usage();
    memory_allocation_example();
    resource_leak_example();
    
    return 0;
}

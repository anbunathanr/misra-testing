"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAMPLE_FILES_LIBRARY = void 0;
exports.initializeSampleFilesLibrary = initializeSampleFilesLibrary;
/**
 * Curated library of sample C/C++ files with known MISRA violations
 * These files are used for automatic file selection in the production SaaS platform
 */
exports.SAMPLE_FILES_LIBRARY = [
    // Basic C Files
    {
        sample_id: 'sample-c-basic-001',
        filename: 'basic_violations.c',
        file_content: Buffer.from(`#include <stdio.h>
#include <stdlib.h>

// MISRA C 2012 Rule 8.4 violation - function not declared before definition
int undeclared_function(int x) {
    return x * 2;
}

int main() {
    int result;
    int unused_var; // MISRA C 2012 Rule 2.2 violation - unused variable
    
    result = undeclared_function(5);
    printf("Result: %d\\n", result);
    
    return 0;
}`).toString('base64'),
        language: 'C',
        description: 'Basic C file with common MISRA violations including undeclared functions and unused variables',
        expected_violations: 2,
        file_size: 456,
        difficulty_level: 'basic',
        violation_categories: ['declarations', 'variables'],
        learning_objectives: [
            'Understanding function declaration requirements',
            'Identifying unused variable violations',
            'Basic MISRA C compliance principles'
        ],
        estimated_analysis_time: 15
    },
    {
        sample_id: 'sample-c-basic-002',
        filename: 'pointer_violations.c',
        file_content: Buffer.from(`#include <stdio.h>

int main() {
    int x = 10;
    int *ptr = &x;
    
    // MISRA C 2012 Rule 11.3 violation - cast between pointer and integer
    int addr = (int)ptr;
    
    // MISRA C 2012 Rule 17.7 violation - return value not used
    printf("Address: %d\\n", addr);
    
    // MISRA C 2012 Rule 1.1 violation - undefined behavior
    int arr[5];
    arr[10] = 42; // Array bounds violation
    
    return 0;
}`).toString('base64'),
        language: 'C',
        description: 'C file demonstrating pointer casting and array bounds violations',
        expected_violations: 3,
        file_size: 512,
        difficulty_level: 'basic',
        violation_categories: ['pointers', 'arrays', 'expressions'],
        learning_objectives: [
            'Understanding pointer casting restrictions',
            'Array bounds safety',
            'Return value usage requirements'
        ],
        estimated_analysis_time: 20
    },
    // Intermediate C Files
    {
        sample_id: 'sample-c-intermediate-001',
        filename: 'control_flow_violations.c',
        file_content: Buffer.from(`#include <stdio.h>

int main() {
    int i, j;
    
    // MISRA C 2012 Rule 15.4 violation - multiple break statements
    for (i = 0; i < 10; i++) {
        if (i == 3) {
            break;
        }
        if (i == 7) {
            break; // Second break in same loop
        }
        printf("%d ", i);
    }
    
    // MISRA C 2012 Rule 16.3 violation - switch without default
    switch (i) {
        case 1:
            printf("One\\n");
            break;
        case 2:
            printf("Two\\n");
            break;
        // Missing default case
    }
    
    // MISRA C 2012 Rule 14.4 violation - goto statement
    goto error_handler;
    
    return 0;
    
error_handler:
    printf("Error occurred\\n");
    return 1;
}`).toString('base64'),
        language: 'C',
        description: 'Intermediate C file with control flow violations including multiple breaks and goto statements',
        expected_violations: 3,
        file_size: 768,
        difficulty_level: 'intermediate',
        violation_categories: ['control_flow', 'statements', 'switch'],
        learning_objectives: [
            'Control flow best practices',
            'Switch statement completeness',
            'Avoiding goto statements'
        ],
        estimated_analysis_time: 30
    },
    // Basic C++ Files
    {
        sample_id: 'sample-cpp-basic-001',
        filename: 'namespace_violations.cpp',
        file_content: Buffer.from(`#include <iostream>
using namespace std; // MISRA C++ 2008 Rule 7-3-6 violation

class TestClass {
public:
    int getValue() { return value; } // MISRA C++ 2008 Rule 9-3-1 violation - member not initialized
    
private:
    int value; // Uninitialized member
};

int main() {
    TestClass obj;
    cout << obj.getValue() << endl;
    return 0;
}`).toString('base64'),
        language: 'CPP',
        description: 'Basic C++ file with namespace and class member initialization violations',
        expected_violations: 2,
        file_size: 412,
        difficulty_level: 'basic',
        violation_categories: ['namespaces', 'classes', 'initialization'],
        learning_objectives: [
            'Avoiding using namespace std',
            'Proper member initialization',
            'C++ class design principles'
        ],
        estimated_analysis_time: 18
    },
    {
        sample_id: 'sample-cpp-basic-002',
        filename: 'constructor_violations.cpp',
        file_content: Buffer.from(`#include <iostream>

class Vehicle {
public:
    // MISRA C++ 2008 Rule 12-1-1 violation - constructor without initialization list
    Vehicle(int w) {
        wheels = w; // Should use initialization list
    }
    
    // MISRA C++ 2008 Rule 12-8-1 violation - copy constructor not defined
    void setWheels(int w) { wheels = w; }
    int getWheels() const { return wheels; }
    
private:
    int wheels;
};

int main() {
    Vehicle car(4);
    Vehicle bike = car; // Implicit copy constructor used
    
    std::cout << "Car wheels: " << car.getWheels() << std::endl;
    std::cout << "Bike wheels: " << bike.getWheels() << std::endl;
    
    return 0;
}`).toString('base64'),
        language: 'CPP',
        description: 'C++ file demonstrating constructor and copy constructor violations',
        expected_violations: 2,
        file_size: 645,
        difficulty_level: 'basic',
        violation_categories: ['constructors', 'initialization', 'classes'],
        learning_objectives: [
            'Proper constructor initialization lists',
            'Explicit copy constructor definition',
            'C++ object lifecycle management'
        ],
        estimated_analysis_time: 25
    },
    // Advanced C Files
    {
        sample_id: 'sample-c-advanced-001',
        filename: 'complex_violations.c',
        file_content: Buffer.from(`#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// MISRA C 2012 Rule 8.2 violation - function parameter names missing
int process_data(int, char*, size_t);

// MISRA C 2012 Rule 21.6 violation - use of stdio functions
FILE* open_file(const char* filename) {
    return fopen(filename, "r"); // Should use safer alternatives
}

int process_data(int count, char* buffer, size_t size) {
    int i;
    
    // MISRA C 2012 Rule 21.3 violation - use of memory functions
    memset(buffer, 0, size); // Should use safer alternatives
    
    // MISRA C 2012 Rule 10.3 violation - assignment between different essential types
    unsigned int uval = -1; // Signed to unsigned conversion
    
    // MISRA C 2012 Rule 13.4 violation - side effects in controlling expression
    for (i = 0; i < count && (buffer[i++] = getchar()) != EOF; ) {
        // Side effect in loop condition
    }
    
    return i;
}

int main() {
    char buffer[100];
    FILE* file = open_file("test.txt");
    
    if (file != NULL) {
        int result = process_data(10, buffer, sizeof(buffer));
        printf("Processed %d characters\\n", result);
        fclose(file);
    }
    
    return 0;
}`).toString('base64'),
        language: 'C',
        description: 'Advanced C file with complex violations including function parameters, memory functions, and type conversions',
        expected_violations: 5,
        file_size: 1024,
        difficulty_level: 'advanced',
        violation_categories: ['functions', 'memory', 'types', 'expressions', 'io'],
        learning_objectives: [
            'Function parameter naming requirements',
            'Safe memory function alternatives',
            'Type conversion safety',
            'Side effect management in expressions'
        ],
        estimated_analysis_time: 45
    },
    // Advanced C++ Files
    {
        sample_id: 'sample-cpp-advanced-001',
        filename: 'template_violations.cpp',
        file_content: Buffer.from(`#include <iostream>
#include <vector>

// MISRA C++ 2008 Rule 14-6-1 violation - template specialization in wrong namespace
template<typename T>
class Container {
public:
    // MISRA C++ 2008 Rule 5-2-6 violation - cast operator without explicit
    operator bool() const { return !data.empty(); }
    
    // MISRA C++ 2008 Rule 6-4-1 violation - switch statement without compound statement
    void process(int type) {
        switch(type)
        case 1: std::cout << "Type 1" << std::endl; break;
        case 2: std::cout << "Type 2" << std::endl; break;
    }
    
    void add(const T& item) { data.push_back(item); }
    
private:
    std::vector<T> data;
};

// MISRA C++ 2008 Rule 3-9-1 violation - const member function modifying object
class Counter {
public:
    int getValue() const { 
        return ++count; // Modifying mutable member in const function
    }
    
private:
    mutable int count = 0;
};

int main() {
    Container<int> container;
    container.add(42);
    
    // MISRA C++ 2008 Rule 5-0-1 violation - implicit conversion in condition
    if (container) { // Uses implicit bool conversion
        container.process(1);
    }
    
    Counter counter;
    std::cout << "Count: " << counter.getValue() << std::endl;
    
    return 0;
}`).toString('base64'),
        language: 'CPP',
        description: 'Advanced C++ file with template, cast operator, and const correctness violations',
        expected_violations: 4,
        file_size: 1156,
        difficulty_level: 'advanced',
        violation_categories: ['templates', 'operators', 'const_correctness', 'control_flow'],
        learning_objectives: [
            'Template specialization best practices',
            'Explicit cast operators',
            'Const correctness principles',
            'Proper switch statement formatting'
        ],
        estimated_analysis_time: 50
    }
];
/**
 * Initialize the sample files library in DynamoDB
 */
async function initializeSampleFilesLibrary() {
    const { SampleFileService_export: SampleFileService } = await Promise.resolve().then(() => __importStar(require('../services/sample-file-service')));
    const sampleFileService = new SampleFileService();
    console.log('Initializing sample files library...');
    for (const sampleFile of exports.SAMPLE_FILES_LIBRARY) {
        try {
            await sampleFileService.addSampleFile(sampleFile);
            console.log(`Added sample file: ${sampleFile.filename}`);
        }
        catch (error) {
            console.error(`Failed to add sample file ${sampleFile.filename}:`, error);
        }
    }
    console.log('Sample files library initialization complete');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FtcGxlLWZpbGVzLWxpYnJhcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzYW1wbGUtZmlsZXMtbGlicmFyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFtVkEsb0VBZ0JDO0FBaldEOzs7R0FHRztBQUNVLFFBQUEsb0JBQW9CLEdBQW9EO0lBQ25GLGdCQUFnQjtJQUNoQjtRQUNFLFNBQVMsRUFBRSxvQkFBb0I7UUFDL0IsUUFBUSxFQUFFLG9CQUFvQjtRQUM5QixZQUFZLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7OztFQWdCNUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7UUFDbEIsUUFBUSxFQUFFLEdBQUc7UUFDYixXQUFXLEVBQUUsK0ZBQStGO1FBQzVHLG1CQUFtQixFQUFFLENBQUM7UUFDdEIsU0FBUyxFQUFFLEdBQUc7UUFDZCxnQkFBZ0IsRUFBRSxPQUFPO1FBQ3pCLG9CQUFvQixFQUFFLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztRQUNuRCxtQkFBbUIsRUFBRTtZQUNuQixpREFBaUQ7WUFDakQsd0NBQXdDO1lBQ3hDLHFDQUFxQztTQUN0QztRQUNELHVCQUF1QixFQUFFLEVBQUU7S0FDNUI7SUFFRDtRQUNFLFNBQVMsRUFBRSxvQkFBb0I7UUFDL0IsUUFBUSxFQUFFLHNCQUFzQjtRQUNoQyxZQUFZLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7RUFpQjVCLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1FBQ2xCLFFBQVEsRUFBRSxHQUFHO1FBQ2IsV0FBVyxFQUFFLGtFQUFrRTtRQUMvRSxtQkFBbUIsRUFBRSxDQUFDO1FBQ3RCLFNBQVMsRUFBRSxHQUFHO1FBQ2QsZ0JBQWdCLEVBQUUsT0FBTztRQUN6QixvQkFBb0IsRUFBRSxDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsYUFBYSxD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LEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUUsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7QUFDOUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNhbXBsZUZpbGUgfSBmcm9tICcuLi90eXBlcy9zYW1wbGUtZmlsZSc7XHJcblxyXG4vKipcclxuICogQ3VyYXRlZCBsaWJyYXJ5IG9mIHNhbXBsZSBDL0MrKyBmaWxlcyB3aXRoIGtub3duIE1JU1JBIHZpb2xhdGlvbnNcclxuICogVGhlc2UgZmlsZXMgYXJlIHVzZWQgZm9yIGF1dG9tYXRpYyBmaWxlIHNlbGVjdGlvbiBpbiB0aGUgcHJvZHVjdGlvbiBTYWFTIHBsYXRmb3JtXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgU0FNUExFX0ZJTEVTX0xJQlJBUlk6IE9taXQ8U2FtcGxlRmlsZSwgJ2NyZWF0ZWRfYXQnIHwgJ3VwZGF0ZWRfYXQnPltdID0gW1xyXG4gIC8vIEJhc2ljIEMgRmlsZXNcclxuICB7XHJcbiAgICBzYW1wbGVfaWQ6ICdzYW1wbGUtYy1iYXNpYy0wMDEnLFxyXG4gICAgZmlsZW5hbWU6ICdiYXNpY192aW9sYXRpb25zLmMnLFxyXG4gICAgZmlsZV9jb250ZW50OiBCdWZmZXIuZnJvbShgI2luY2x1ZGUgPHN0ZGlvLmg+XHJcbiNpbmNsdWRlIDxzdGRsaWIuaD5cclxuXHJcbi8vIE1JU1JBIEMgMjAxMiBSdWxlIDguNCB2aW9sYXRpb24gLSBmdW5jdGlvbiBub3QgZGVjbGFyZWQgYmVmb3JlIGRlZmluaXRpb25cclxuaW50IHVuZGVjbGFyZWRfZnVuY3Rpb24oaW50IHgpIHtcclxuICAgIHJldHVybiB4ICogMjtcclxufVxyXG5cclxuaW50IG1haW4oKSB7XHJcbiAgICBpbnQgcmVzdWx0O1xyXG4gICAgaW50IHVudXNlZF92YXI7IC8vIE1JU1JBIEMgMjAxMiBSdWxlIDIuMiB2aW9sYXRpb24gLSB1bnVzZWQgdmFyaWFibGVcclxuICAgIFxyXG4gICAgcmVzdWx0ID0gdW5kZWNsYXJlZF9mdW5jdGlvbig1KTtcclxuICAgIHByaW50ZihcIlJlc3VsdDogJWRcXFxcblwiLCByZXN1bHQpO1xyXG4gICAgXHJcbiAgICByZXR1cm4gMDtcclxufWApLnRvU3RyaW5nKCdiYXNlNjQnKSxcclxuICAgIGxhbmd1YWdlOiAnQycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0Jhc2ljIEMgZmlsZSB3aXRoIGNvbW1vbiBNSVNSQSB2aW9sYXRpb25zIGluY2x1ZGluZyB1bmRlY2xhcmVkIGZ1bmN0aW9ucyBhbmQgdW51c2VkIHZhcmlhYmxlcycsXHJcbiAgICBleHBlY3RlZF92aW9sYXRpb25zOiAyLFxyXG4gICAgZmlsZV9zaXplOiA0NTYsXHJcbiAgICBkaWZmaWN1bHR5X2xldmVsOiAnYmFzaWMnLFxyXG4gICAgdmlvbGF0aW9uX2NhdGVnb3JpZXM6IFsnZGVjbGFyYXRpb25zJywgJ3ZhcmlhYmxlcyddLFxyXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xyXG4gICAgICAnVW5kZXJzdGFuZGluZyBmdW5jdGlvbiBkZWNsYXJhdGlvbiByZXF1aXJlbWVudHMnLFxyXG4gICAgICAnSWRlbnRpZnlpbmcgdW51c2VkIHZhcmlhYmxlIHZpb2xhdGlvbnMnLFxyXG4gICAgICAnQmFzaWMgTUlTUkEgQyBjb21wbGlhbmNlIHByaW5jaXBsZXMnXHJcbiAgICBdLFxyXG4gICAgZXN0aW1hdGVkX2FuYWx5c2lzX3RpbWU6IDE1XHJcbiAgfSxcclxuXHJcbiAge1xyXG4gICAgc2FtcGxlX2lkOiAnc2FtcGxlLWMtYmFzaWMtMDAyJyxcclxuICAgIGZpbGVuYW1lOiAncG9pbnRlcl92aW9sYXRpb25zLmMnLFxyXG4gICAgZmlsZV9jb250ZW50OiBCdWZmZXIuZnJvbShgI2luY2x1ZGUgPHN0ZGlvLmg+XHJcblxyXG5pbnQgbWFpbigpIHtcclxuICAgIGludCB4ID0gMTA7XHJcbiAgICBpbnQgKnB0ciA9ICZ4O1xyXG4gICAgXHJcbiAgICAvLyBNSVNSQSBDIDIwMTIgUnVsZSAxMS4zIHZpb2xhdGlvbiAtIGNhc3QgYmV0d2VlbiBwb2ludGVyIGFuZCBpbnRlZ2VyXHJcbiAgICBpbnQgYWRkciA9IChpbnQpcHRyO1xyXG4gICAgXHJcbiAgICAvLyBNSVNSQSBDIDIwMTIgUnVsZSAxNy43IHZpb2xhdGlvbiAtIHJldHVybiB2YWx1ZSBub3QgdXNlZFxyXG4gICAgcHJpbnRmKFwiQWRkcmVzczogJWRcXFxcblwiLCBhZGRyKTtcclxuICAgIFxyXG4gICAgLy8gTUlTUkEgQyAyMDEyIFJ1bGUgMS4xIHZpb2xhdGlvbiAtIHVuZGVmaW5lZCBiZWhhdmlvclxyXG4gICAgaW50IGFycls1XTtcclxuICAgIGFyclsxMF0gPSA0MjsgLy8gQXJyYXkgYm91bmRzIHZpb2xhdGlvblxyXG4gICAgXHJcbiAgICByZXR1cm4gMDtcclxufWApLnRvU3RyaW5nKCdiYXNlNjQnKSxcclxuICAgIGxhbmd1YWdlOiAnQycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0MgZmlsZSBkZW1vbnN0cmF0aW5nIHBvaW50ZXIgY2FzdGluZyBhbmQgYXJyYXkgYm91bmRzIHZpb2xhdGlvbnMnLFxyXG4gICAgZXhwZWN0ZWRfdmlvbGF0aW9uczogMyxcclxuICAgIGZpbGVfc2l6ZTogNTEyLFxyXG4gICAgZGlmZmljdWx0eV9sZXZlbDogJ2Jhc2ljJyxcclxuICAgIHZpb2xhdGlvbl9jYXRlZ29yaWVzOiBbJ3BvaW50ZXJzJywgJ2FycmF5cycsICdleHByZXNzaW9ucyddLFxyXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xyXG4gICAgICAnVW5kZXJzdGFuZGluZyBwb2ludGVyIGNhc3RpbmcgcmVzdHJpY3Rpb25zJyxcclxuICAgICAgJ0FycmF5IGJvdW5kcyBzYWZldHknLFxyXG4gICAgICAnUmV0dXJuIHZhbHVlIHVzYWdlIHJlcXVpcmVtZW50cydcclxuICAgIF0sXHJcbiAgICBlc3RpbWF0ZWRfYW5hbHlzaXNfdGltZTogMjBcclxuICB9LFxyXG5cclxuICAvLyBJbnRlcm1lZGlhdGUgQyBGaWxlc1xyXG4gIHtcclxuICAgIHNhbXBsZV9pZDogJ3NhbXBsZS1jLWludGVybWVkaWF0ZS0wMDEnLFxyXG4gICAgZmlsZW5hbWU6ICdjb250cm9sX2Zsb3dfdmlvbGF0aW9ucy5jJyxcclxuICAgIGZpbGVfY29udGVudDogQnVmZmVyLmZyb20oYCNpbmNsdWRlIDxzdGRpby5oPlxyXG5cclxuaW50IG1haW4oKSB7XHJcbiAgICBpbnQgaSwgajtcclxuICAgIFxyXG4gICAgLy8gTUlTUkEgQyAyMDEyIFJ1bGUgMTUuNCB2aW9sYXRpb24gLSBtdWx0aXBsZSBicmVhayBzdGF0ZW1lbnRzXHJcbiAgICBmb3IgKGkgPSAwOyBpIDwgMTA7IGkrKykge1xyXG4gICAgICAgIGlmIChpID09IDMpIHtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpID09IDcpIHtcclxuICAgICAgICAgICAgYnJlYWs7IC8vIFNlY29uZCBicmVhayBpbiBzYW1lIGxvb3BcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJpbnRmKFwiJWQgXCIsIGkpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBNSVNSQSBDIDIwMTIgUnVsZSAxNi4zIHZpb2xhdGlvbiAtIHN3aXRjaCB3aXRob3V0IGRlZmF1bHRcclxuICAgIHN3aXRjaCAoaSkge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgcHJpbnRmKFwiT25lXFxcXG5cIik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgcHJpbnRmKFwiVHdvXFxcXG5cIik7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIC8vIE1pc3NpbmcgZGVmYXVsdCBjYXNlXHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIE1JU1JBIEMgMjAxMiBSdWxlIDE0LjQgdmlvbGF0aW9uIC0gZ290byBzdGF0ZW1lbnRcclxuICAgIGdvdG8gZXJyb3JfaGFuZGxlcjtcclxuICAgIFxyXG4gICAgcmV0dXJuIDA7XHJcbiAgICBcclxuZXJyb3JfaGFuZGxlcjpcclxuICAgIHByaW50ZihcIkVycm9yIG9jY3VycmVkXFxcXG5cIik7XHJcbiAgICByZXR1cm4gMTtcclxufWApLnRvU3RyaW5nKCdiYXNlNjQnKSxcclxuICAgIGxhbmd1YWdlOiAnQycsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0ludGVybWVkaWF0ZSBDIGZpbGUgd2l0aCBjb250cm9sIGZsb3cgdmlvbGF0aW9ucyBpbmNsdWRpbmcgbXVsdGlwbGUgYnJlYWtzIGFuZCBnb3RvIHN0YXRlbWVudHMnLFxyXG4gICAgZXhwZWN0ZWRfdmlvbGF0aW9uczogMyxcclxuICAgIGZpbGVfc2l6ZTogNzY4LFxyXG4gICAgZGlmZmljdWx0eV9sZXZlbDogJ2ludGVybWVkaWF0ZScsXHJcbiAgICB2aW9sYXRpb25fY2F0ZWdvcmllczogWydjb250cm9sX2Zsb3cnLCAnc3RhdGVtZW50cycsICdzd2l0Y2gnXSxcclxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcclxuICAgICAgJ0NvbnRyb2wgZmxvdyBiZXN0IHByYWN0aWNlcycsXHJcbiAgICAgICdTd2l0Y2ggc3RhdGVtZW50IGNvbXBsZXRlbmVzcycsXHJcbiAgICAgICdBdm9pZGluZyBnb3RvIHN0YXRlbWVudHMnXHJcbiAgICBdLFxyXG4gICAgZXN0aW1hdGVkX2FuYWx5c2lzX3RpbWU6IDMwXHJcbiAgfSxcclxuXHJcbiAgLy8gQmFzaWMgQysrIEZpbGVzXHJcbiAge1xyXG4gICAgc2FtcGxlX2lkOiAnc2FtcGxlLWNwcC1iYXNpYy0wMDEnLFxyXG4gICAgZmlsZW5hbWU6ICduYW1lc3BhY2VfdmlvbGF0aW9ucy5jcHAnLFxyXG4gICAgZmlsZV9jb250ZW50OiBCdWZmZXIuZnJvbShgI2luY2x1ZGUgPGlvc3RyZWFtPlxyXG51c2luZyBuYW1lc3BhY2Ugc3RkOyAvLyBNSVNSQSBDKysgMjAwOCBSdWxlIDctMy02IHZpb2xhdGlvblxyXG5cclxuY2xhc3MgVGVzdENsYXNzIHtcclxucHVibGljOlxyXG4gICAgaW50IGdldFZhbHVlKCkgeyByZXR1cm4gdmFsdWU7IH0gLy8gTUlTUkEgQysrIDIwMDggUnVsZSA5LTMtMSB2aW9sYXRpb24gLSBtZW1iZXIgbm90IGluaXRpYWxpemVkXHJcbiAgICBcclxucHJpdmF0ZTpcclxuICAgIGludCB2YWx1ZTsgLy8gVW5pbml0aWFsaXplZCBtZW1iZXJcclxufTtcclxuXHJcbmludCBtYWluKCkge1xyXG4gICAgVGVzdENsYXNzIG9iajtcclxuICAgIGNvdXQgPDwgb2JqLmdldFZhbHVlKCkgPDwgZW5kbDtcclxuICAgIHJldHVybiAwO1xyXG59YCkudG9TdHJpbmcoJ2Jhc2U2NCcpLFxyXG4gICAgbGFuZ3VhZ2U6ICdDUFAnLFxyXG4gICAgZGVzY3JpcHRpb246ICdCYXNpYyBDKysgZmlsZSB3aXRoIG5hbWVzcGFjZSBhbmQgY2xhc3MgbWVtYmVyIGluaXRpYWxpemF0aW9uIHZpb2xhdGlvbnMnLFxyXG4gICAgZXhwZWN0ZWRfdmlvbGF0aW9uczogMixcclxuICAgIGZpbGVfc2l6ZTogNDEyLFxyXG4gICAgZGlmZmljdWx0eV9sZXZlbDogJ2Jhc2ljJyxcclxuICAgIHZpb2xhdGlvbl9jYXRlZ29yaWVzOiBbJ25hbWVzcGFjZXMnLCAnY2xhc3NlcycsICdpbml0aWFsaXphdGlvbiddLFxyXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xyXG4gICAgICAnQXZvaWRpbmcgdXNpbmcgbmFtZXNwYWNlIHN0ZCcsXHJcbiAgICAgICdQcm9wZXIgbWVtYmVyIGluaXRpYWxpemF0aW9uJyxcclxuICAgICAgJ0MrKyBjbGFzcyBkZXNpZ24gcHJpbmNpcGxlcydcclxuICAgIF0sXHJcbiAgICBlc3RpbWF0ZWRfYW5hbHlzaXNfdGltZTogMThcclxuICB9LFxyXG5cclxuICB7XHJcbiAgICBzYW1wbGVfaWQ6ICdzYW1wbGUtY3BwLWJhc2ljLTAwMicsXHJcbiAgICBmaWxlbmFtZTogJ2NvbnN0cnVjdG9yX3Zpb2xhdGlvbnMuY3BwJyxcclxuICAgIGZpbGVfY29udGVudDogQnVmZmVyLmZyb20oYCNpbmNsdWRlIDxpb3N0cmVhbT5cclxuXHJcbmNsYXNzIFZlaGljbGUge1xyXG5wdWJsaWM6XHJcbiAgICAvLyBNSVNSQSBDKysgMjAwOCBSdWxlIDEyLTEtMSB2aW9sYXRpb24gLSBjb25zdHJ1Y3RvciB3aXRob3V0IGluaXRpYWxpemF0aW9uIGxpc3RcclxuICAgIFZlaGljbGUoaW50IHcpIHtcclxuICAgICAgICB3aGVlbHMgPSB3OyAvLyBTaG91bGQgdXNlIGluaXRpYWxpemF0aW9uIGxpc3RcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gTUlTUkEgQysrIDIwMDggUnVsZSAxMi04LTEgdmlvbGF0aW9uIC0gY29weSBjb25zdHJ1Y3RvciBub3QgZGVmaW5lZFxyXG4gICAgdm9pZCBzZXRXaGVlbHMoaW50IHcpIHsgd2hlZWxzID0gdzsgfVxyXG4gICAgaW50IGdldFdoZWVscygpIGNvbnN0IHsgcmV0dXJuIHdoZWVsczsgfVxyXG4gICAgXHJcbnByaXZhdGU6XHJcbiAgICBpbnQgd2hlZWxzO1xyXG59O1xyXG5cclxuaW50IG1haW4oKSB7XHJcbiAgICBWZWhpY2xlIGNhcig0KTtcclxuICAgIFZlaGljbGUgYmlrZSA9IGNhcjsgLy8gSW1wbGljaXQgY29weSBjb25zdHJ1Y3RvciB1c2VkXHJcbiAgICBcclxuICAgIHN0ZDo6Y291dCA8PCBcIkNhciB3aGVlbHM6IFwiIDw8IGNhci5nZXRXaGVlbHMoKSA8PCBzdGQ6OmVuZGw7XHJcbiAgICBzdGQ6OmNvdXQgPDwgXCJCaWtlIHdoZWVsczogXCIgPDwgYmlrZS5nZXRXaGVlbHMoKSA8PCBzdGQ6OmVuZGw7XHJcbiAgICBcclxuICAgIHJldHVybiAwO1xyXG59YCkudG9TdHJpbmcoJ2Jhc2U2NCcpLFxyXG4gICAgbGFuZ3VhZ2U6ICdDUFAnLFxyXG4gICAgZGVzY3JpcHRpb246ICdDKysgZmlsZSBkZW1vbnN0cmF0aW5nIGNvbnN0cnVjdG9yIGFuZCBjb3B5IGNvbnN0cnVjdG9yIHZpb2xhdGlvbnMnLFxyXG4gICAgZXhwZWN0ZWRfdmlvbGF0aW9uczogMixcclxuICAgIGZpbGVfc2l6ZTogNjQ1LFxyXG4gICAgZGlmZmljdWx0eV9sZXZlbDogJ2Jhc2ljJyxcclxuICAgIHZpb2xhdGlvbl9jYXRlZ29yaWVzOiBbJ2NvbnN0cnVjdG9ycycsICdpbml0aWFsaXphdGlvbicsICdjbGFzc2VzJ10sXHJcbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXHJcbiAgICAgICdQcm9wZXIgY29uc3RydWN0b3IgaW5pdGlhbGl6YXRpb24gbGlzdHMnLFxyXG4gICAgICAnRXhwbGljaXQgY29weSBjb25zdHJ1Y3RvciBkZWZpbml0aW9uJyxcclxuICAgICAgJ0MrKyBvYmplY3QgbGlmZWN5Y2xlIG1hbmFnZW1lbnQnXHJcbiAgICBdLFxyXG4gICAgZXN0aW1hdGVkX2FuYWx5c2lzX3RpbWU6IDI1XHJcbiAgfSxcclxuXHJcbiAgLy8gQWR2YW5jZWQgQyBGaWxlc1xyXG4gIHtcclxuICAgIHNhbXBsZV9pZDogJ3NhbXBsZS1jLWFkdmFuY2VkLTAwMScsXHJcbiAgICBmaWxlbmFtZTogJ2NvbXBsZXhfdmlvbGF0aW9ucy5jJyxcclxuICAgIGZpbGVfY29udGVudDogQnVmZmVyLmZyb20oYCNpbmNsdWRlIDxzdGRpby5oPlxyXG4jaW5jbHVkZSA8c3RkbGliLmg+XHJcbiNpbmNsdWRlIDxzdHJpbmcuaD5cclxuXHJcbi8vIE1JU1JBIEMgMjAxMiBSdWxlIDguMiB2aW9sYXRpb24gLSBmdW5jdGlvbiBwYXJhbWV0ZXIgbmFtZXMgbWlzc2luZ1xyXG5pbnQgcHJvY2Vzc19kYXRhKGludCwgY2hhciosIHNpemVfdCk7XHJcblxyXG4vLyBNSVNSQSBDIDIwMTIgUnVsZSAyMS42IHZpb2xhdGlvbiAtIHVzZSBvZiBzdGRpbyBmdW5jdGlvbnNcclxuRklMRSogb3Blbl9maWxlKGNvbnN0IGNoYXIqIGZpbGVuYW1lKSB7XHJcbiAgICByZXR1cm4gZm9wZW4oZmlsZW5hbWUsIFwiclwiKTsgLy8gU2hvdWxkIHVzZSBzYWZlciBhbHRlcm5hdGl2ZXNcclxufVxyXG5cclxuaW50IHByb2Nlc3NfZGF0YShpbnQgY291bnQsIGNoYXIqIGJ1ZmZlciwgc2l6ZV90IHNpemUpIHtcclxuICAgIGludCBpO1xyXG4gICAgXHJcbiAgICAvLyBNSVNSQSBDIDIwMTIgUnVsZSAyMS4zIHZpb2xhdGlvbiAtIHVzZSBvZiBtZW1vcnkgZnVuY3Rpb25zXHJcbiAgICBtZW1zZXQoYnVmZmVyLCAwLCBzaXplKTsgLy8gU2hvdWxkIHVzZSBzYWZlciBhbHRlcm5hdGl2ZXNcclxuICAgIFxyXG4gICAgLy8gTUlTUkEgQyAyMDEyIFJ1bGUgMTAuMyB2aW9sYXRpb24gLSBhc3NpZ25tZW50IGJldHdlZW4gZGlmZmVyZW50IGVzc2VudGlhbCB0eXBlc1xyXG4gICAgdW5zaWduZWQgaW50IHV2YWwgPSAtMTsgLy8gU2lnbmVkIHRvIHVuc2lnbmVkIGNvbnZlcnNpb25cclxuICAgIFxyXG4gICAgLy8gTUlTUkEgQyAyMDEyIFJ1bGUgMTMuNCB2aW9sYXRpb24gLSBzaWRlIGVmZmVjdHMgaW4gY29udHJvbGxpbmcgZXhwcmVzc2lvblxyXG4gICAgZm9yIChpID0gMDsgaSA8IGNvdW50ICYmIChidWZmZXJbaSsrXSA9IGdldGNoYXIoKSkgIT0gRU9GOyApIHtcclxuICAgICAgICAvLyBTaWRlIGVmZmVjdCBpbiBsb29wIGNvbmRpdGlvblxyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gaTtcclxufVxyXG5cclxuaW50IG1haW4oKSB7XHJcbiAgICBjaGFyIGJ1ZmZlclsxMDBdO1xyXG4gICAgRklMRSogZmlsZSA9IG9wZW5fZmlsZShcInRlc3QudHh0XCIpO1xyXG4gICAgXHJcbiAgICBpZiAoZmlsZSAhPSBOVUxMKSB7XHJcbiAgICAgICAgaW50IHJlc3VsdCA9IHByb2Nlc3NfZGF0YSgxMCwgYnVmZmVyLCBzaXplb2YoYnVmZmVyKSk7XHJcbiAgICAgICAgcHJpbnRmKFwiUHJvY2Vzc2VkICVkIGNoYXJhY3RlcnNcXFxcblwiLCByZXN1bHQpO1xyXG4gICAgICAgIGZjbG9zZShmaWxlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIDA7XHJcbn1gKS50b1N0cmluZygnYmFzZTY0JyksXHJcbiAgICBsYW5ndWFnZTogJ0MnLFxyXG4gICAgZGVzY3JpcHRpb246ICdBZHZhbmNlZCBDIGZpbGUgd2l0aCBjb21wbGV4IHZpb2xhdGlvbnMgaW5jbHVkaW5nIGZ1bmN0aW9uIHBhcmFtZXRlcnMsIG1lbW9yeSBmdW5jdGlvbnMsIGFuZCB0eXBlIGNvbnZlcnNpb25zJyxcclxuICAgIGV4cGVjdGVkX3Zpb2xhdGlvbnM6IDUsXHJcbiAgICBmaWxlX3NpemU6IDEwMjQsXHJcbiAgICBkaWZmaWN1bHR5X2xldmVsOiAnYWR2YW5jZWQnLFxyXG4gICAgdmlvbGF0aW9uX2NhdGVnb3JpZXM6IFsnZnVuY3Rpb25zJywgJ21lbW9yeScsICd0eXBlcycsICdleHByZXNzaW9ucycsICdpbyddLFxyXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xyXG4gICAgICAnRnVuY3Rpb24gcGFyYW1ldGVyIG5hbWluZyByZXF1aXJlbWVudHMnLFxyXG4gICAgICAnU2FmZSBtZW1vcnkgZnVuY3Rpb24gYWx0ZXJuYXRpdmVzJyxcclxuICAgICAgJ1R5cGUgY29udmVyc2lvbiBzYWZldHknLFxyXG4gICAgICAnU2lkZSBlZmZlY3QgbWFuYWdlbWVudCBpbiBleHByZXNzaW9ucydcclxuICAgIF0sXHJcbiAgICBlc3RpbWF0ZWRfYW5hbHlzaXNfdGltZTogNDVcclxuICB9LFxyXG5cclxuICAvLyBBZHZhbmNlZCBDKysgRmlsZXNcclxuICB7XHJcbiAgICBzYW1wbGVfaWQ6ICdzYW1wbGUtY3BwLWFkdmFuY2VkLTAwMScsXHJcbiAgICBmaWxlbmFtZTogJ3RlbXBsYXRlX3Zpb2xhdGlvbnMuY3BwJyxcclxuICAgIGZpbGVfY29udGVudDogQnVmZmVyLmZyb20oYCNpbmNsdWRlIDxpb3N0cmVhbT5cclxuI2luY2x1ZGUgPHZlY3Rvcj5cclxuXHJcbi8vIE1JU1JBIEMrKyAyMDA4IFJ1bGUgMTQtNi0xIHZpb2xhdGlvbiAtIHRlbXBsYXRlIHNwZWNpYWxpemF0aW9uIGluIHdyb25nIG5hbWVzcGFjZVxyXG50ZW1wbGF0ZTx0eXBlbmFtZSBUPlxyXG5jbGFzcyBDb250YWluZXIge1xyXG5wdWJsaWM6XHJcbiAgICAvLyBNSVNSQSBDKysgMjAwOCBSdWxlIDUtMi02IHZpb2xhdGlvbiAtIGNhc3Qgb3BlcmF0b3Igd2l0aG91dCBleHBsaWNpdFxyXG4gICAgb3BlcmF0b3IgYm9vbCgpIGNvbnN0IHsgcmV0dXJuICFkYXRhLmVtcHR5KCk7IH1cclxuICAgIFxyXG4gICAgLy8gTUlTUkEgQysrIDIwMDggUnVsZSA2LTQtMSB2aW9sYXRpb24gLSBzd2l0Y2ggc3RhdGVtZW50IHdpdGhvdXQgY29tcG91bmQgc3RhdGVtZW50XHJcbiAgICB2b2lkIHByb2Nlc3MoaW50IHR5cGUpIHtcclxuICAgICAgICBzd2l0Y2godHlwZSlcclxuICAgICAgICBjYXNlIDE6IHN0ZDo6Y291dCA8PCBcIlR5cGUgMVwiIDw8IHN0ZDo6ZW5kbDsgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOiBzdGQ6OmNvdXQgPDwgXCJUeXBlIDJcIiA8PCBzdGQ6OmVuZGw7IGJyZWFrO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2b2lkIGFkZChjb25zdCBUJiBpdGVtKSB7IGRhdGEucHVzaF9iYWNrKGl0ZW0pOyB9XHJcbiAgICBcclxucHJpdmF0ZTpcclxuICAgIHN0ZDo6dmVjdG9yPFQ+IGRhdGE7XHJcbn07XHJcblxyXG4vLyBNSVNSQSBDKysgMjAwOCBSdWxlIDMtOS0xIHZpb2xhdGlvbiAtIGNvbnN0IG1lbWJlciBmdW5jdGlvbiBtb2RpZnlpbmcgb2JqZWN0XHJcbmNsYXNzIENvdW50ZXIge1xyXG5wdWJsaWM6XHJcbiAgICBpbnQgZ2V0VmFsdWUoKSBjb25zdCB7IFxyXG4gICAgICAgIHJldHVybiArK2NvdW50OyAvLyBNb2RpZnlpbmcgbXV0YWJsZSBtZW1iZXIgaW4gY29uc3QgZnVuY3Rpb25cclxuICAgIH1cclxuICAgIFxyXG5wcml2YXRlOlxyXG4gICAgbXV0YWJsZSBpbnQgY291bnQgPSAwO1xyXG59O1xyXG5cclxuaW50IG1haW4oKSB7XHJcbiAgICBDb250YWluZXI8aW50PiBjb250YWluZXI7XHJcbiAgICBjb250YWluZXIuYWRkKDQyKTtcclxuICAgIFxyXG4gICAgLy8gTUlTUkEgQysrIDIwMDggUnVsZSA1LTAtMSB2aW9sYXRpb24gLSBpbXBsaWNpdCBjb252ZXJzaW9uIGluIGNvbmRpdGlvblxyXG4gICAgaWYgKGNvbnRhaW5lcikgeyAvLyBVc2VzIGltcGxpY2l0IGJvb2wgY29udmVyc2lvblxyXG4gICAgICAgIGNvbnRhaW5lci5wcm9jZXNzKDEpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBDb3VudGVyIGNvdW50ZXI7XHJcbiAgICBzdGQ6OmNvdXQgPDwgXCJDb3VudDogXCIgPDwgY291bnRlci5nZXRWYWx1ZSgpIDw8IHN0ZDo6ZW5kbDtcclxuICAgIFxyXG4gICAgcmV0dXJuIDA7XHJcbn1gKS50b1N0cmluZygnYmFzZTY0JyksXHJcbiAgICBsYW5ndWFnZTogJ0NQUCcsXHJcbiAgICBkZXNjcmlwdGlvbjogJ0FkdmFuY2VkIEMrKyBmaWxlIHdpdGggdGVtcGxhdGUsIGNhc3Qgb3BlcmF0b3IsIGFuZCBjb25zdCBjb3JyZWN0bmVzcyB2aW9sYXRpb25zJyxcclxuICAgIGV4cGVjdGVkX3Zpb2xhdGlvbnM6IDQsXHJcbiAgICBmaWxlX3NpemU6IDExNTYsXHJcbiAgICBkaWZmaWN1bHR5X2xldmVsOiAnYWR2YW5jZWQnLFxyXG4gICAgdmlvbGF0aW9uX2NhdGVnb3JpZXM6IFsndGVtcGxhdGVzJywgJ29wZXJhdG9ycycsICdjb25zdF9jb3JyZWN0bmVzcycsICdjb250cm9sX2Zsb3cnXSxcclxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcclxuICAgICAgJ1RlbXBsYXRlIHNwZWNpYWxpemF0aW9uIGJlc3QgcHJhY3RpY2VzJyxcclxuICAgICAgJ0V4cGxpY2l0IGNhc3Qgb3BlcmF0b3JzJyxcclxuICAgICAgJ0NvbnN0IGNvcnJlY3RuZXNzIHByaW5jaXBsZXMnLFxyXG4gICAgICAnUHJvcGVyIHN3aXRjaCBzdGF0ZW1lbnQgZm9ybWF0dGluZydcclxuICAgIF0sXHJcbiAgICBlc3RpbWF0ZWRfYW5hbHlzaXNfdGltZTogNTBcclxuICB9XHJcbl07XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSB0aGUgc2FtcGxlIGZpbGVzIGxpYnJhcnkgaW4gRHluYW1vREJcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0aWFsaXplU2FtcGxlRmlsZXNMaWJyYXJ5KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IHsgU2FtcGxlRmlsZVNlcnZpY2VfZXhwb3J0OiBTYW1wbGVGaWxlU2VydmljZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi9zZXJ2aWNlcy9zYW1wbGUtZmlsZS1zZXJ2aWNlJyk7XHJcbiAgY29uc3Qgc2FtcGxlRmlsZVNlcnZpY2UgPSBuZXcgU2FtcGxlRmlsZVNlcnZpY2UoKTtcclxuICBcclxuICBjb25zb2xlLmxvZygnSW5pdGlhbGl6aW5nIHNhbXBsZSBmaWxlcyBsaWJyYXJ5Li4uJyk7XHJcbiAgXHJcbiAgZm9yIChjb25zdCBzYW1wbGVGaWxlIG9mIFNBTVBMRV9GSUxFU19MSUJSQVJZKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBzYW1wbGVGaWxlU2VydmljZS5hZGRTYW1wbGVGaWxlKHNhbXBsZUZpbGUpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgQWRkZWQgc2FtcGxlIGZpbGU6ICR7c2FtcGxlRmlsZS5maWxlbmFtZX1gKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBhZGQgc2FtcGxlIGZpbGUgJHtzYW1wbGVGaWxlLmZpbGVuYW1lfTpgLCBlcnJvcik7XHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIGNvbnNvbGUubG9nKCdTYW1wbGUgZmlsZXMgbGlicmFyeSBpbml0aWFsaXphdGlvbiBjb21wbGV0ZScpO1xyXG59Il19
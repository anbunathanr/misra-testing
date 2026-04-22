import { SampleFile } from '../types/sample-file';

/**
 * Curated library of sample C/C++ files with known MISRA violations
 * These files are used for automatic file selection in the production SaaS platform
 */
export const SAMPLE_FILES_LIBRARY: Omit<SampleFile, 'created_at' | 'updated_at'>[] = [
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
export async function initializeSampleFilesLibrary(): Promise<void> {
  const { SampleFileService_export: SampleFileService } = await import('../services/sample-file-service');
  const sampleFileService = new SampleFileService();
  
  console.log('Initializing sample files library...');
  
  for (const sampleFile of SAMPLE_FILES_LIBRARY) {
    try {
      await sampleFileService.addSampleFile(sampleFile);
      console.log(`Added sample file: ${sampleFile.filename}`);
    } catch (error) {
      console.error(`Failed to add sample file ${sampleFile.filename}:`, error);
    }
  }
  
  console.log('Sample files library initialization complete');
}
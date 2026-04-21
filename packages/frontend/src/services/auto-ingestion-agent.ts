/**
 * Auto-Ingestion Agent
 * 
 * Automatically selects appropriate sample files from the internal library
 * for MISRA compliance analysis demonstrations. This service provides
 * intelligent file selection with varying compliance levels for professional
 * presentations and internship defense demonstrations.
 */

export interface SampleFile {
  id: string;
  name: string;
  language: 'c' | 'cpp';
  description: string;
  expectedCompliance: number;
  violationCount: number;
  size: number;
  content: string;
  metadata: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    primaryViolations: string[];
    demonstrationPurpose: string;
    estimatedAnalysisTime: number;
  };
}

export interface FileSelectionCriteria {
  preferredLanguage?: 'c' | 'cpp' | 'any';
  targetCompliance?: 'high' | 'medium' | 'low' | 'varied';
  demonstrationMode?: 'quick' | 'detailed' | 'comprehensive';
  maxAnalysisTime?: number;
}

export class AutoIngestionAgent {
  private sampleLibrary: SampleFile[] = [];

  constructor() {
    this.initializeSampleLibrary();
  }

  /**
   * Initialize the sample file library with curated C/C++ files
   * Each file has different MISRA compliance characteristics
   */
  private initializeSampleLibrary(): void {
    this.sampleLibrary = [
      {
        id: 'perfect-c-sample',
        name: 'perfect_compliance.c',
        language: 'c',
        description: 'Perfect MISRA C compliance example',
        expectedCompliance: 100,
        violationCount: 0,
        size: 1024,
        content: this.generatePerfectCCode(),
        metadata: {
          difficulty: 'beginner',
          primaryViolations: [],
          demonstrationPurpose: 'Show perfect compliance scenario',
          estimatedAnalysisTime: 15
        }
      },
      {
        id: 'high-compliance-cpp',
        name: 'high_compliance.cpp',
        language: 'cpp',
        description: 'High compliance C++ with minor violations',
        expectedCompliance: 92,
        violationCount: 3,
        size: 2048,
        content: this.generateHighComplianceCppCode(),
        metadata: {
          difficulty: 'intermediate',
          primaryViolations: ['Rule 5-0-1', 'Rule 8-4-1'],
          demonstrationPurpose: 'Show near-perfect compliance with minor issues',
          estimatedAnalysisTime: 25
        }
      },
      {
        id: 'medium-compliance-c',
        name: 'medium_compliance.c',
        language: 'c',
        description: 'Medium compliance with common violations',
        expectedCompliance: 75,
        violationCount: 8,
        size: 3072,
        content: this.generateMediumComplianceCCode(),
        metadata: {
          difficulty: 'intermediate',
          primaryViolations: ['Rule 8-2', 'Rule 10-1', 'Rule 15-5', 'Rule 21-3'],
          demonstrationPurpose: 'Show typical real-world compliance issues',
          estimatedAnalysisTime: 35
        }
      },
      {
        id: 'low-compliance-cpp',
        name: 'problematic_code.cpp',
        language: 'cpp',
        description: 'Low compliance with multiple serious violations',
        expectedCompliance: 45,
        violationCount: 15,
        size: 4096,
        content: this.generateLowComplianceCppCode(),
        metadata: {
          difficulty: 'advanced',
          primaryViolations: ['Rule 0-1-1', 'Rule 3-1-1', 'Rule 6-4-1', 'Rule 15-0-3'],
          demonstrationPurpose: 'Show problematic code requiring significant fixes',
          estimatedAnalysisTime: 45
        }
      },
      {
        id: 'complex-violations-c',
        name: 'complex_violations.c',
        language: 'c',
        description: 'Complex code with varied violation types',
        expectedCompliance: 62,
        violationCount: 12,
        size: 3584,
        content: this.generateComplexViolationsCCode(),
        metadata: {
          difficulty: 'advanced',
          primaryViolations: ['Rule 1-1', 'Rule 9-1', 'Rule 11-3', 'Rule 17-7'],
          demonstrationPurpose: 'Demonstrate comprehensive analysis capabilities',
          estimatedAnalysisTime: 40
        }
      }
    ];
  }

  /**
   * Intelligently select a sample file based on criteria
   */
  public selectSampleFile(criteria: FileSelectionCriteria = {}): SampleFile {
    let candidates = [...this.sampleLibrary];

    // Filter by language preference
    if (criteria.preferredLanguage && criteria.preferredLanguage !== 'any') {
      candidates = candidates.filter(file => file.language === criteria.preferredLanguage);
    }

    // Filter by target compliance
    if (criteria.targetCompliance) {
      candidates = this.filterByCompliance(candidates, criteria.targetCompliance);
    }

    // Filter by analysis time
    if (criteria.maxAnalysisTime) {
      candidates = candidates.filter(
        file => file.metadata.estimatedAnalysisTime <= criteria.maxAnalysisTime
      );
    }

    // If no candidates match, fall back to medium compliance
    if (candidates.length === 0) {
      candidates = this.sampleLibrary.filter(file => 
        file.expectedCompliance >= 70 && file.expectedCompliance <= 80
      );
    }

    // Select randomly from candidates for variety in demonstrations
    const selectedIndex = Math.floor(Math.random() * candidates.length);
    const selected = candidates[selectedIndex];

    console.log(`Auto-Ingestion Agent selected: ${selected.name}`, {
      expectedCompliance: selected.expectedCompliance,
      violationCount: selected.violationCount,
      demonstrationPurpose: selected.metadata.demonstrationPurpose
    });

    return selected;
  }

  /**
   * Get all available sample files for manual selection
   */
  public getAllSampleFiles(): SampleFile[] {
    return [...this.sampleLibrary];
  }

  /**
   * Get sample file by ID
   */
  public getSampleFileById(id: string): SampleFile | null {
    return this.sampleLibrary.find(file => file.id === id) || null;
  }

  /**
   * Get sample files by language
   */
  public getSampleFilesByLanguage(language: 'c' | 'cpp'): SampleFile[] {
    return this.sampleLibrary.filter(file => file.language === language);
  }

  /**
   * Filter files by compliance level
   */
  private filterByCompliance(files: SampleFile[], target: string): SampleFile[] {
    switch (target) {
      case 'high':
        return files.filter(file => file.expectedCompliance >= 90);
      case 'medium':
        return files.filter(file => 
          file.expectedCompliance >= 60 && file.expectedCompliance < 90
        );
      case 'low':
        return files.filter(file => file.expectedCompliance < 60);
      case 'varied':
      default:
        return files;
    }
  }

  /**
   * Generate perfect MISRA C compliant code
   */
  private generatePerfectCCode(): string {
    return `/* Perfect MISRA C Compliance Example */
#include <stdio.h>
#include <stdint.h>

/* Rule 8-2: Function prototypes */
static int32_t calculate_sum(int32_t a, int32_t b);
static void print_result(int32_t result);

/* Rule 8-4: All functions have prototypes */
int32_t main(void)
{
    int32_t num1 = 10;
    int32_t num2 = 20;
    int32_t sum;
    
    sum = calculate_sum(num1, num2);
    print_result(sum);
    
    return 0;
}

/* Rule 8-1: Functions have internal linkage when possible */
static int32_t calculate_sum(int32_t a, int32_t b)
{
    return a + b;
}

static void print_result(int32_t result)
{
    printf("Result: %d\\n", result);
}`;
  }

  /**
   * Generate high compliance C++ code with minor violations
   */
  private generateHighComplianceCppCode(): string {
    return `// High Compliance C++ Example with Minor Violations
#include <iostream>
#include <cstdint>

class Calculator {
private:
    std::int32_t value;

public:
    Calculator() : value(0) {}
    
    // Rule 5-0-1 violation: implicit conversion
    void setValue(double val) { value = val; }
    
    std::int32_t getValue() const { return value; }
    
    std::int32_t add(std::int32_t a, std::int32_t b) const {
        return a + b;
    }
};

int main() {
    Calculator calc;
    calc.setValue(42.7); // Minor violation here
    
    std::int32_t result = calc.add(10, 20);
    std::cout << "Result: " << result << std::endl;
    
    return 0;
}`;
  }

  /**
   * Generate medium compliance C code with common violations
   */
  private generateMediumComplianceCCode(): string {
    return `/* Medium Compliance C Example with Common Violations */
#include <stdio.h>
#include <stdlib.h>

/* Rule 8-2 violation: missing prototype */
int global_var = 0; /* Rule 8-1 violation: global variable */

int calculate(int x, int y) /* Rule 8-4 violation: no prototype */
{
    if (x > 0) /* Rule 15-5 violation: missing else */
        return x + y;
    
    /* Rule 21-3 violation: using stdlib functions unsafely */
    char* buffer = malloc(100);
    if (!buffer)
        exit(1); /* Rule 21-6 violation: using exit */
    
    free(buffer);
    return y;
}

int main(void)
{
    int a, b; /* Rule 9-1 violation: uninitialized variables */
    int result;
    
    printf("Enter two numbers: ");
    scanf("%d %d", &a, &b); /* Rule 21-3 violation: unsafe input */
    
    result = calculate(a, b);
    printf("Result: %d\\n", result);
    
    return 0;
}`;
  }

  /**
   * Generate low compliance C++ code with multiple violations
   */
  private generateLowComplianceCppCode(): string {
    return `// Problematic C++ Code with Multiple MISRA Violations
#include <iostream>
#include <cstring>

using namespace std; // Rule 7-3-1 violation: using directive

int* global_ptr; // Rule 0-1-1 violation: global pointer

class BadClass {
public:
    int data[100]; // Rule 18-4-1 violation: C-style array
    
    BadClass() { // Rule 15-0-3 violation: no exception specification
        memset(data, 0, sizeof(data)); // Rule 18-0-5 violation: C library usage
    }
    
    ~BadClass() {} // Rule 15-0-3 violation: empty destructor
    
    void process(void* ptr) { // Rule 5-2-6 violation: void pointer
        int* iptr = (int*)ptr; // Rule 5-2-4 violation: C-style cast
        *iptr = 42;
    }
};

void dangerous_function() {
    int local_array[1000]; // Rule 1-1 violation: large stack allocation
    
    for (int i = 0; i <= 1000; i++) { // Rule 6-5-1 violation: buffer overflow
        local_array[i] = i;
    }
    
    global_ptr = local_array; // Rule 7-5-1 violation: returning local address
}

int main() {
    BadClass* obj = new BadClass(); // Rule 18-4-1 violation: raw new
    
    dangerous_function();
    
    obj->process(global_ptr);
    
    delete obj; // Rule 18-4-1 violation: raw delete
    
    return 0;
}`;
  }

  /**
   * Generate complex C code with varied violation types
   */
  private generateComplexViolationsCCode(): string {
    return `/* Complex C Code with Varied MISRA Violations */
#include <stdio.h>
#include <string.h>
#include <stdint.h>

#define MAX_SIZE 100 /* Rule 16-3 violation: function-like macro */
#define UNSAFE_MACRO(x) ((x) > 0 ? (x) : -(x))

typedef struct {
    char name[50];
    int age;
    float salary; /* Rule 1-1 violation: float usage */
} Employee;

Employee employees[MAX_SIZE]; /* Rule 8-1 violation: global array */
int employee_count = 0;

/* Rule 17-7 violation: function doesn't use return value */
int add_employee(char* name, int age, float salary) {
    if (employee_count >= MAX_SIZE) {
        return -1;
    }
    
    /* Rule 21-3 violation: unsafe string operations */
    strcpy(employees[employee_count].name, name);
    employees[employee_count].age = age;
    employees[employee_count].salary = salary;
    
    employee_count++;
    return 0;
}

void print_employees() /* Rule 8-4 violation: no prototype */
{
    int i;
    
    for (i = 0; i < employee_count; i++) { /* Rule 14-4 violation: for loop style */
        printf("Employee %d: %s, Age: %d, Salary: %.2f\\n",
               i + 1,
               employees[i].name,
               employees[i].age,
               employees[i].salary);
    }
}

int main(void)
{
    char name_buffer[100];
    int age;
    float salary;
    
    printf("Enter employee details:\\n");
    
    /* Rule 21-3 violation: unsafe input */
    printf("Name: ");
    gets(name_buffer); /* Rule 21-3 violation: dangerous function */
    
    printf("Age: ");
    scanf("%d", &age);
    
    printf("Salary: ");
    scanf("%f", &salary);
    
    add_employee(name_buffer, age, salary); /* Rule 17-7 violation: ignoring return */
    
    print_employees();
    
    return 0;
}`;
  }
}

// Export singleton instance
export const autoIngestionAgent = new AutoIngestionAgent();
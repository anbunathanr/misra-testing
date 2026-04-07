"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_9_3_3 = void 0;
/**
 * MISRA C++:2008 Rule 9-3-3
 * If a member function can be made static then it shall be made static, otherwise if it can be made const then it shall be made const
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_9_3_3 {
    id = 'MISRA-CPP-9.3.3';
    description = 'If a member function can be made static then it shall be made static, otherwise if it can be made const then it shall be made const';
    severity = 'required';
    category = 'Classes';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_9_3_3 = Rule_CPP_9_3_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS05LTMtMy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtOS0zLTMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyxxSUFBcUksQ0FBQztJQUNwSixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQ3JCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsOENBQThDO1FBQzlDLDJDQUEyQztRQUMzQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XG5cbi8qKlxuICogTUlTUkEgQysrOjIwMDggUnVsZSA5LTMtM1xuICogSWYgYSBtZW1iZXIgZnVuY3Rpb24gY2FuIGJlIG1hZGUgc3RhdGljIHRoZW4gaXQgc2hhbGwgYmUgbWFkZSBzdGF0aWMsIG90aGVyd2lzZSBpZiBpdCBjYW4gYmUgbWFkZSBjb25zdCB0aGVuIGl0IHNoYWxsIGJlIG1hZGUgY29uc3RcbiAqIFxuICogTk9URTogVGhpcyBpcyBhIHN0dWIgaW1wbGVtZW50YXRpb24uIEZ1bGwgaW1wbGVtZW50YXRpb24gcmVxdWlyZXM6XG4gKiAtIERldGFpbGVkIEFTVCBhbmFseXNpcyBmb3IgdGhpcyBzcGVjaWZpYyBydWxlXG4gKiAtIENvbXByZWhlbnNpdmUgdGVzdCBjYXNlc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHRoZSBydWxlIGVuZ2luZVxuICovXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfOV8zXzMgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xuICBpZCA9ICdNSVNSQS1DUFAtOS4zLjMnO1xuICBkZXNjcmlwdGlvbiA9ICdJZiBhIG1lbWJlciBmdW5jdGlvbiBjYW4gYmUgbWFkZSBzdGF0aWMgdGhlbiBpdCBzaGFsbCBiZSBtYWRlIHN0YXRpYywgb3RoZXJ3aXNlIGlmIGl0IGNhbiBiZSBtYWRlIGNvbnN0IHRoZW4gaXQgc2hhbGwgYmUgbWFkZSBjb25zdCc7XG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcbiAgY2F0ZWdvcnkgPSAnQ2xhc3Nlcyc7XG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XG5cbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gcmV0dXJucyBubyB2aW9sYXRpb25zXG4gICAgLy8gVE9ETzogSW1wbGVtZW50IGZ1bGwgcnVsZSBjaGVja2luZyBsb2dpY1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuIl19